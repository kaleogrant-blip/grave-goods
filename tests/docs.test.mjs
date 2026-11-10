// The store text, the review notes and the owner's checklist must describe the build that the other tests prove.
// These are word checks, not legal review: they stop the old claims (an interstitial, "removes all ads", a tracking prompt,
// Android in v1, the listing overclaims of C-6) from coming back, and keep the placeholder list complete.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.mjs';
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const listing = rd('store/listing.md'), notes = rd('store/review-notes.md'), policy = rd('store/privacy-policy.md'), play = rd('store/play-listing.md'), todo = rd('docs/OWNER-TODO.md'), adsui = rd('docs/ADS-UI.md'), readme = rd('README.md');
const fenced = s => [...s.matchAll(/```\n([\s\S]*?)```/g)].map(m => m[1]);
const description = fenced(listing).find(b => b.startsWith('The wall hides the hoard.'));
const reviewBlock = fenced(notes)[0];

test('App Store description: within Apple\'s limit, does not lead with "Finders keepers.", and carries none of the withdrawn claims', () => {
  assert.ok(description, 'the description block exists'); assert.ok(description.length <= 4000, `${description.length} characters`);
  assert.ok(!/finders keepers/i.test(listing.split('**Tagline**')[1].split('\n')[0]), 'the proposed tagline is not the old one');
  assert.ok(!/finders keepers/i.test(description));
  for (const [re, why] of [[/or a friend's/i, 'no way to compare with a friend'], [/rigged/i, 'no absolutes about rigging'], [/nothing is hidden/i, 'no absolutes'], [/VoiceOver/i, 'VoiceOver is unverified'],
    [/iCloud|Apple ID/i, 'cloud sync is untested'], [/fact-checked/i, 'withdrawn'], [/between runs|interstitial/i, 'there is no ad between runs'], [/removes? (every|all) ads?/i, 'Ad-free does not "remove ads"'], [/android|google play/i, 'Android is not in v1'], [/honest odds/i, 'blanket odds claim']])
    assert.ok(!re.test(description), `description must not say ${re} (${why})`);
  assert.match(description, /stakes that seal's points/, 'the knucklebone is described by what it really stakes');
  assert.match(description, /same tomb, raider, kit and seed for everyone/); assert.match(description, /Nothing plays unless you tap it/);
  assert.match(description, /asks once whether you want to share anonymous play statistics/);
});

test('review notes: rewarded only, no interstitial, no tracking prompt, the three prompts and when they appear, what Ad-free really does', () => {
  assert.match(reviewBlock, /rewarded video only/i); assert.match(reviewBlock, /There is no interstitial, no banner, no ad between runs/);
  assert.match(reviewBlock, /does NOT show the App Tracking Transparency prompt/);
  assert.match(reviewBlock, /First launch, before anything else: one question from the app itself, "Help improve the game: share anonymous play\s+statistics\?"/);
  assert.match(reviewBlock, /become free claims/); assert.ok(!/removes all advertising|Remove ads/i.test(reviewBlock));
  assert.ok(!/reroll|re-pick|second chest/i.test(reviewBlock), 'the retired video offers are not described');
  assert.ok(!/after the player's first completed tomb/i.test(reviewBlock), 'no prompt is tied to a tomb clear any more');
  assert.match(reviewBlock, /It stakes that seal's\s+points/); assert.ok(!/use only Gold/i.test(reviewBlock));
  // the words in the notes are the words the app draws
  assert.ok(rd('www/consent.js').includes("'Help improve the game: share anonymous play statistics?'"));
  assert.ok(rd('www/adfree.js').includes("'Ad-free · '") && reviewBlock.includes('"Ad-free · [price]"'));
  assert.ok(reviewBlock.includes('"Claim · +1 Memory"') && rd('www/adfree.js').includes("'Claim \\u00b7 '"));
});

test('privacy: labels say Tracking No; the policy covers the consent choice, time-zone offset, Android as planned, bundled fonts, and no tracking', () => {
  assert.match(listing, /Tracking: \*\*No\*\*/); assert.ok(!/Tracking becomes \*\*Yes\*\*/.test(listing));
  assert.match(listing, /time-zone offset/);
  assert.match(policy, /Help improve the game: share anonymous play statistics\?/); assert.match(policy, /No thanks/);
  assert.match(policy, /time-zone offset from UTC/); assert.match(policy, /An Android version is planned and is not available yet/);
  assert.match(policy, /does not contact Google Fonts/); assert.ok(!/loads two typefaces/.test(policy));
  assert.match(policy, /never asks for Apple's App Tracking Transparency permission/); assert.ok(!/asks your permission once/.test(policy));
  assert.ok(!/between runs|after a finished run|interstitial/i.test(policy.replace(/no ads between levels/i, '')), 'the policy describes no ad that the app cannot show');
  assert.ok(!/it is on by default/i.test(policy), 'statistics are off until the player says yes');
});

test('Android is marked as not in v1, and the ad docs describe two slips and no interstitial', () => {
  assert.match(play.split('\n').slice(0, 4).join('\n'), /NOT IN v1/);
  assert.ok(!/removes all ads/i.test(play));
  assert.match(adsui, /two slips and no other advertising/); assert.match(adsui, /There is no interstitial/);
  assert.ok(!/\| `reroll` \||\| `chestpick` \|/.test(adsui), 'the retired slips are not offered as things to build');
  assert.match(readme, /\*\*No interstitial\*\*/); assert.match(readme, /v1 is iPhone\/iPad only/);
  assert.ok(!/one interstitial rule|ATT on iOS once/.test(readme));
});

test('owner checklist: every bracketed blank in store/ is listed, and the app-ads.txt rule is stated in full', () => {
  const blanks = new Set();
  for (const f of ['store/listing.md', 'store/review-notes.md', 'store/privacy-policy.md', 'store/play-listing.md'])
    for (const m of rd(f).matchAll(/\[[A-Z][A-Za-z0-9 /:.,'()-]*\]/g)) blanks.add(m[0]);
  assert.ok(blanks.size >= 12, 'found the placeholders: ' + [...blanks].join(' '));
  for (const b of blanks) assert.ok(todo.includes(b), `docs/OWNER-TODO.md does not list ${b}`);
  for (const n of ['ADMOB_APP_ID_IOS', 'ADMOB_REWARDED_ID_IOS', 'POSTHOG_KEY', 'CONFIG_URL', 'APPLE_TEAM_ID', 'APP_STORE_CONNECT_PRIVATE_KEY', 'com.gravegoods.app']) assert.ok(todo.includes(n), n);
  assert.ok(!/INTERSTITIAL/.test(todo), 'no interstitial unit is asked for');
  assert.match(todo, /must be served from the root of the developer website named in the store listing/);
  assert.match(todo, /GitHub Pages \*\*project\*\* site will \*\*not\*\* do/); assert.match(todo, /\*\*user or organisation\*\* site \*\*will\*\* do/); assert.match(todo, /\*\*custom domain\*\* you control \*\*will\*\* do/);
});

test('the public repo carries no email address and no key material in its docs, config or shell code', () => {
  const files = ['README.md', 'release_notes.json', 'capacitor.config.ts', 'codemagic.yaml', ...['docs', 'store', 'config', 'www', 'scripts', '.github/workflows'].flatMap(d => fs.readdirSync(path.join(ROOT, d)).filter(n => /\.(md|json|js|mjs|yml|yaml|ts)$/.test(n)).map(n => d + '/' + n))];
  for (const f of files) {
    const t = rd(f);
    const mails = (t.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/g) || []).filter(m => !/^(noreply@anthropic\.com|git@github\.com)$/.test(m) && !/@(capacitor|capacitor-community|fontsource|v?\d)/.test(m) && !/\.(png|jpg|mjs|js)$/.test(m) && !/@[0-9]/.test(m));
    assert.deepEqual(mails, [], `${f} contains an email-like string`);
    assert.ok(!/BEGIN (EC |RSA )?PRIVATE KEY/.test(t) || /BEGIN and END lines|-----BEGIN PRIVATE KEY-----\\n|fake|test/i.test(t), `${f} must not contain key material`);
  }
});
