/* adfree.js: what the ad-free purchase (gg_adfree) changes in the app. Replaces the dormant premium.js design:
 * there is NO content gate. Every tomb, class and cosmetic is free for everyone; the purchase only removes ads.
 *
 *   effectiveFlags(flags)  the remote flags with every ad switched off when the entitlement is owned, whatever the remote config says
 *   Settings rows          "Ad-free · purchased" (owned), or "Remove ads" + store price + button (ads are on and not owned),
 *                          and, always when a store exists, "Restore purchases" (Apple and Google both require it)
 *   telemetry              unlock_prompt_shown {where:'settings', price} when the Remove ads row is shown
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
      if (P && P.ready && !P.adFree()) return flags; // until the cache is read, ads stay off: an owner never sees one at boot
      if (!P) return flags;
      var o = {}; Object.keys(flags).forEach(function (k) { o[k] = flags[k]; });
      Object.keys(o).forEach(function (k) { if (/^ad[A-Z]/.test(k)) o[k] = false; });
      o.ads = false;
      return o;
    }

    function rowsHtml() {
      var out = '', owned = P.adFree();
      if (owned) {
        out += '<div class="st-row"><div class="lb"><b>Ad-free</b><small>Purchased. Thank you. No ads, on any screen.</small></div><span class="st-badge" id="ggAdfreeBadge">Ad-free · purchased</span></div>';
      } else if (P.available() && deps.adsEnabled && deps.adsEnabled()) {
        var price = P.price(P.DEFAULT_PRODUCT);
        out += '<div class="st-row"><div class="lb"><b>Remove ads</b><small>One purchase, no subscription. Removes every ad for good. The whole game is free either way.</small></div>' +
          '<button type="button" class="st-act" id="ggRemoveAds">' + (price ? 'Remove ads · ' + esc(price) : 'Remove ads') + '</button></div>';
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

    return { effectiveFlags: effectiveFlags, paintSettings: paintSettings, wrapSettings: wrapSettings, rowsHtml: rowsHtml, ROW_ID: ROW_ID };
  }

  var api = { createAdFree: createAdFree, ROW_ID: ROW_ID };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.GGAdFree = api;
})(typeof self !== 'undefined' ? self : globalThis);
