/* adfree.js: what the Ad-free purchase (gg_adfree) changes in the app.
 * There is NO content gate. Every tomb, class and cosmetic is free for everyone.
 *
 * v1's only ads are opt-in rewarded videos, so there is nothing to "remove" that a player did not choose. What Ad-free does:
 * the owner keeps both reward slips (+1 Memory, +1 free seal next chamber) and claims them WITHOUT a video, under the same caps
 * (once per run, one seal banked at a time). AdMob is never initialised for an owner. If rewarded offers are switched off for
 * everyone (flags.ads false), the claims are off too, and the purchase row is hidden so nobody can buy it while it does nothing.
 *
 *   effectiveFlags(flags)  the flags plus adFree:true when the entitlement is owned; every ad flag off until the entitlement cache is read
 *   relabel(root)          rewrites the game's slip text for owners ("Watch a short video · X" -> "Claim · X"); the game file is not edited
 *   Settings rows          "Ad-free · purchased" (owned), or "Ad-free" + store price + button (offers are on and not owned),
 *                          and, always when a store exists, "Restore purchases" (Apple and Google both require it)
 *   telemetry              unlock_prompt_shown {where:'settings', price} when the purchase row is shown
 *
 * The Settings screen is built by the game (showSettings), so the rows are added by wrapping that function after it has drawn
 * its card; nothing in the game file changes. The wrap is a no-op when the game has no such function.
 */
(function (root) {
  'use strict';

  var ROW_ID = 'ggPurchases';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* deps: { payments, doc, flags():remote flags, adsEnabled():bool (would ads run if not owned?) } */
  function createAdFree(deps) {
    var P = deps.payments;

    function effectiveFlags(flags) {
      flags = flags || {};
      if (!P) return flags;
      var o = {}; Object.keys(flags).forEach(function (k) { o[k] = flags[k]; });
      if (!P.ready) { // until the entitlement cache is read nothing is offered: an owner is never shown a video slip at boot
        Object.keys(o).forEach(function (k) { if (/^ad[A-Z]/.test(k)) o[k] = false; });
        o.ads = false;
        return o;
      }
      if (P.adFree()) o.adFree = true; // ads.js turns every slip into a free claim
      else delete o.adFree;            // only the store can set it; a remote config cannot
      return o;
    }

    /* Owners see the same slips with honest words. Idempotent; returns how many nodes it changed. */
    var WATCH = /^Watch a short video \u00b7 /, WATCH_ARIA = /^Watch a short video to /;
    function relabel(scope) {
      var doc = deps.doc || root.document, n = 0;
      scope = scope && scope.querySelectorAll ? scope : doc;
      if (!scope || !P || !P.adFree()) return 0;
      [].forEach.call(scope.querySelectorAll('[data-gg-ad]'), function (b) {
        var t = b.querySelector('.as-t b') || (b.children.length ? null : b), tag = b.querySelector('.as-t i'), al = b.getAttribute('aria-label') || '';
        if (t && WATCH.test(t.textContent)) { t.textContent = t.textContent.replace(WATCH, 'Claim \u00b7 '); n++; }
        if (tag && tag.textContent !== 'Ad-free: no video') { tag.textContent = 'Ad-free: no video'; n++; }
        if (WATCH_ARIA.test(al)) { b.setAttribute('aria-label', al.replace(WATCH_ARIA, 'Ad-free claim, no video: ')); n++; }
      });
      return n;
    }
    /* Keep the labels right as the game draws and redraws its cards. Call once; it does nothing for non-owners. */
    function watchSlips() {
      var doc = deps.doc || root.document, MO = root.MutationObserver;
      if (!doc || !doc.body || !MO || watchSlips.on) return false;
      watchSlips.on = true;
      new MO(function () { try { relabel(doc); } catch (e) {} }).observe(doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label'] });
      try { relabel(doc); } catch (e) {}
      return true;
    }

    function rowsHtml() {
      var out = '', owned = P.adFree();
      if (owned) {
        out += '<div class="st-row"><div class="lb"><b>Ad-free</b><small>Purchased. Thank you. No videos: the +1 Memory and +1 seal slips are free claims, with the same limits.</small></div><span class="st-badge" id="ggAdfreeBadge">Ad-free · purchased</span></div>';
      } else if (P.available() && deps.adsEnabled && deps.adsEnabled()) {
        var price = P.price(P.DEFAULT_PRODUCT);
        out += '<div class="st-row"><div class="lb"><b>Ad-free</b><small>One purchase, no subscription. The only ads are the optional video slips; with Ad-free you claim the same +1 Memory and +1 seal without watching, same limits. The whole game is free either way.</small></div>' +
          '<button type="button" class="st-act" id="ggRemoveAds">' + (price ? 'Ad-free · ' + esc(price) : 'Get Ad-free') + '</button></div>';
      }
      if (P.hasStore() || P.available()) {
        out += '<div class="st-row"><div class="lb"><b>Restore purchases</b><small>Bought Ad-free before, or on another device with the same account? Get it back.</small></div><button type="button" class="st-act" id="ggRestore">Restore purchases</button></div>';
      }
      return out;
    }

    /* Draw (or redraw) the Purchases section inside an open Settings card. Returns true if something was drawn. */
    function paintSettings(card) {
      var doc = deps.doc || root.document;
      card = card || (doc && doc.querySelector('.pg-set'));
      if (!card) return false;
      var old = card.querySelector('#' + ROW_ID); if (old) old.remove();
      var html = rowsHtml();
      if (!html) return false;
      var wrap = doc.createElement('div'); wrap.id = ROW_ID;
      wrap.innerHTML = '<div class="sec">Purchases</div>' + html;
      var secs = [].slice.call(card.querySelectorAll('.sec')), about = secs.filter(function (e) { return /^About$/i.test(e.textContent.trim()); })[0];
      if (about && about.parentNode) about.parentNode.insertBefore(wrap, about);
      else { var back = card.querySelector('#pgback'); if (back && back.parentNode) back.parentNode.insertBefore(wrap, back); else card.appendChild(wrap); }
      var buy = wrap.querySelector('#ggRemoveAds'), res = wrap.querySelector('#ggRestore');
      if (buy) { if (!card.__ggPrompted) { card.__ggPrompted = true; P.promptShown('settings'); } buy.onclick = function () { buy.disabled = true; P.go('buy', P.DEFAULT_PRODUCT).then(function () { buy.disabled = false; paintSettings(card); }); }; }
      if (res) res.onclick = function () { res.disabled = true; P.go('restore', P.DEFAULT_PRODUCT).then(function () { res.disabled = false; paintSettings(card); }); };
      return true;
    }

    /* Wrap the game's showSettings so the section appears whenever Settings opens. */
    function wrapSettings(target) {
      target = target || root;
      var orig = target.showSettings;
      if (typeof orig !== 'function' || orig.__ggAdfree) return false;
      var w = function () {
        var r = orig.apply(this, arguments);
        try { paintSettings(); } catch (e) {}
        return r;
      };
      w.__ggAdfree = true;
      target.showSettings = w;
      return true;
    }

    return { effectiveFlags: effectiveFlags, relabel: relabel, watchSlips: watchSlips, paintSettings: paintSettings, wrapSettings: wrapSettings, rowsHtml: rowsHtml, ROW_ID: ROW_ID };
  }

  var api = { createAdFree: createAdFree, ROW_ID: ROW_ID };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.GGAdFree = api;
})(typeof self !== 'undefined' ? self : globalThis);
