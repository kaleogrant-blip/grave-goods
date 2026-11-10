/* consent.js: the one-time analytics question, and its switch in Settings. Shell layer only: the game file is not edited.
 *
 *   "Help improve the game: share anonymous play statistics?"   [No thanks]  [Yes]
 *
 * Shown to every player, in every country, the first time the app opens (only in a build that can send statistics at all, i.e.
 * one with a PostHog key). Until it is answered the answer is "no": telemetry.js queues nothing, sends nothing and creates no ID.
 * Both buttons are the same size and neither is pre-selected. The choice can be changed at any time in Settings > Privacy >
 * "Share play statistics", which this file adds by wrapping the game's showSettings (the same way adfree.js adds Purchases).
 *
 * The game's own Settings switch "Play log" (localStorage rw_tel_off) is a different thing: it controls whether the game keeps a
 * log on the device at all. Statistics leave the device only when BOTH are on.
 */
(function (root) {
  'use strict';

  var DIALOG_ID = 'ggConsent', ROW_ID = 'ggPrivacy';
  var QUESTION = 'Help improve the game: share anonymous play statistics?';
  var DETAIL = 'What was dug, sealed and bought in the game, and the app version. No name, no account, never used for ads. You can change this any time in Settings.';

  /* deps: { telemetry, doc, emit(name,data) } */
  function createConsent(deps) {
    var T = deps.telemetry, asked = false;
    function doc() { return deps.doc || root.document; }

    async function answer(yes) {
      var d = doc(), el = d && d.getElementById(DIALOG_ID);
      if (el && el.parentNode) el.parentNode.removeChild(el);
      await T.setConsent(!!yes);
      try { deps.emit && deps.emit('consent_analytics', { value: !!yes }); } catch (e) {} // reaches PostHog only after a "yes"
      try { paintSettings(); } catch (e) {}
      return !!yes;
    }

    /* Show the question if it has never been answered. Returns 'shown' | 'answered' | 'not_needed'. */
    async function maybeAsk() {
      if (!T || !T.configured || !T.configured()) return 'not_needed'; // this build cannot send anything: nothing to ask
      await T.init();
      if (T.consent()) return 'answered';
      var d = doc();
      if (!d || !d.body) return 'not_needed';
      if (asked || d.getElementById(DIALOG_ID)) return 'shown';
      asked = true;
      var wrap = d.createElement('div');
      wrap.id = DIALOG_ID; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', DIALOG_ID + 'Q');
      wrap.innerHTML = '<div class="ggc-card"><p class="ggc-q" id="' + DIALOG_ID + 'Q">' + QUESTION + '</p><p class="ggc-d">' + DETAIL + '</p>' +
        '<div class="ggc-row"><button type="button" id="ggConsentNo">No thanks</button><button type="button" id="ggConsentYes">Yes</button></div></div>';
      d.body.appendChild(wrap);
      wrap.querySelector('#ggConsentNo').onclick = function () { answer(false); };
      wrap.querySelector('#ggConsentYes').onclick = function () { answer(true); };
      return 'shown';
    }

    function rowHtml() {
      var on = T.consent() === 'yes', logOff = T.gameLogOff && T.gameLogOff();
      return '<div class="st-row"><div class="lb"><b>Share play statistics</b><small>Anonymous: what was dug, sealed and bought in the game, and the app version. No name, no account, never used for ads.' +
        (on && logOff ? ' Play log is off, so nothing is recorded or sent right now.' : '') + '</small></div>' +
        '<button type="button" class="st-act" id="ggShareStats" role="switch" aria-checked="' + (on ? 'true' : 'false') + '">' + (on ? 'On' : 'Off') + '</button></div>';
    }

    /* Draw (or redraw) the Privacy section inside an open Settings card. Returns true if something was drawn. */
    function paintSettings(card) {
      var d = doc();
      card = card || (d && d.querySelector('.pg-set'));
      if (!card || !T || !T.configured || !T.configured()) return false;
      var old = card.querySelector('#' + ROW_ID); if (old) old.remove();
      var wrap = d.createElement('div'); wrap.id = ROW_ID;
      wrap.innerHTML = '<div class="sec">Privacy</div>' + rowHtml();
      var secs = [].slice.call(card.querySelectorAll('.sec')), about = secs.filter(function (e) { return /^About$/i.test(e.textContent.trim()); })[0];
      if (about && about.parentNode) about.parentNode.insertBefore(wrap, about);
      else { var back = card.querySelector('#pgback'); if (back && back.parentNode) back.parentNode.insertBefore(wrap, back); else card.appendChild(wrap); }
      var b = wrap.querySelector('#ggShareStats');
      b.onclick = function () { b.disabled = true; answer(T.consent() !== 'yes'); };
      return true;
    }

    function wrapSettings(target) {
      target = target || root;
      var orig = target.showSettings;
      if (typeof orig !== 'function' || orig.__ggConsent) return false;
      var w = function () {
        var r = orig.apply(this, arguments);
        try { if (T && T.init) T.init().then(function () { paintSettings(); }); } catch (e) {}
        return r;
      };
      w.__ggConsent = true; if (orig.__ggAdfree) w.__ggAdfree = true;
      target.showSettings = w;
      return true;
    }

    return { maybeAsk: maybeAsk, answer: answer, paintSettings: paintSettings, wrapSettings: wrapSettings, rowHtml: rowHtml };
  }

  var api = { createConsent: createConsent, DIALOG_ID: DIALOG_ID, ROW_ID: ROW_ID, QUESTION: QUESTION };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.GGConsent = api;
})(typeof self !== 'undefined' ? self : globalThis);
