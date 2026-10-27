#!/usr/bin/env node
// Idempotent post-`cap add/sync` patches to the generated ios/ project. Safe to run any number of times (CI runs it every build).
//   node scripts/patch-ios.mjs            patches ios/App in the current project
// Env: BUNDLE_ID (default: appId in capacitor.config.ts)  ADMOB_APP_ID_IOS (default: Google's public test app id)
// What it does, and why:
//   Info.plist       export-compliance flag, ATT + AdMob keys, arm64 requirement
//   App.entitlements iCloud key-value store (the save follows the Apple ID)
//   project.pbxproj  points both App configurations at the entitlements file, sets the bundle id
//   AppIcon          the 1024 icon, flattened (no alpha: App Store Connect rejects it otherwise)
//   Splash           plain game-colour launch image instead of the Capacitor logo
//   Deployment       iOS 15.0 in the Podfile and the project (StoreKit 2 starts at 15; Capacitor's template says 14)
//   Scheme           shared "App" scheme whose Run action (Debug only) uses ios/App/GraveGoods.storekit; Archive/Release never does
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { flattenToRGB, solidPng } from './png-flatten.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GOOGLE_TEST_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
export const ATT_TEXT = 'Grave Goods can ask once to use your device identifier so the optional rewarded videos are relevant. You can say no and the game plays exactly the same.';
export const ENTITLEMENTS = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.ubiquity-kvstore-identifier</key>
	<string>$(TeamIdentifierPrefix)$(CFBundleIdentifier)</string>
</dict>
</plist>
`;

export function readAppId(root = ROOT) {
  const ts = fs.readFileSync(path.join(root, 'capacitor.config.ts'), 'utf8');
  const m = /appId:\s*['"]([^'"]+)['"]/.exec(ts);
  if (!m) throw new Error('appId not found in capacitor.config.ts');
  return m[1];
}

// Insert a <key>/<value> pair before the final </dict> unless the key is already there. Returns [plist, changed].
export function plistEnsure(plist, key, valueXml) {
  if (plist.includes(`<key>${key}</key>`)) return [plist, false];
  const i = plist.lastIndexOf('</dict>');
  return [plist.slice(0, i) + `\t<key>${key}</key>\n\t${valueXml}\n` + plist.slice(i), true];
}

export function patchInfoPlist(plist, { admobAppId = GOOGLE_TEST_APP_ID } = {}) {
  let changed = 0, c;
  const set = (k, v) => { [plist, c] = plistEnsure(plist, k, v); if (c) changed++; };
  set('ITSAppUsesNonExemptEncryption', '<false/>');
  set('NSUserTrackingUsageDescription', `<string>${ATT_TEXT}</string>`);
  set('GADApplicationIdentifier', `<string>${admobAppId}</string>`);
  set('SKAdNetworkItems', '<array>\n\t\t<dict><key>SKAdNetworkIdentifier</key><string>cstr6suwn9.skadnetwork</string></dict>\n\t</array>');
  // the shipped Capacitor template requires armv7; the App Store wants arm64
  if (plist.includes('<string>armv7</string>')) { plist = plist.replace('<string>armv7</string>', '<string>arm64</string>'); changed++; }
  // keep the AdMob id in step with the env value on later runs
  const re = /(<key>GADApplicationIdentifier<\/key>\s*<string>)([^<]*)(<\/string>)/;
  const cur = re.exec(plist);
  if (cur && cur[2] !== admobAppId) { plist = plist.replace(re, `$1${admobAppId}$3`); changed++; }
  return { plist, changed };
}

export function patchPbxproj(pbx, bundleId) {
  let ent = 0, bid = 0;
  // every build configuration of the App target is the one that carries PRODUCT_BUNDLE_IDENTIFIER
  pbx = pbx.replace(/(\t+)PRODUCT_BUNDLE_IDENTIFIER = [^;]*;/g, (m, tabs) => { bid++; return `${tabs}PRODUCT_BUNDLE_IDENTIFIER = ${bundleId};`; });
  pbx = pbx.replace(/(\t+)(CODE_SIGN_ENTITLEMENTS = [^;]*;\n\t+)?(?=PRODUCT_BUNDLE_IDENTIFIER)/g, (m, tabs) => { ent++; return `${tabs}CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n${tabs}`; });
  return { pbx, bundleCount: bid, entCount: ent };
}

export const MIN_IOS = '15.0';

export function patchDeploymentTarget(pbx, podfile) {
  let n = 0;
  pbx = pbx.replace(/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]+;/g, () => { n++; return `IPHONEOS_DEPLOYMENT_TARGET = ${MIN_IOS};`; });
  let pf = 0;
  podfile = podfile.replace(/platform :ios, '[0-9.]+'/, () => { pf++; return `platform :ios, '${MIN_IOS}'`; });
  return { pbx, podfile, projectCount: n, podfileCount: pf };
}

// The App target's id inside project.pbxproj (needed to write a scheme that points at it).
export function appTargetId(pbx) {
  const m = /([0-9A-F]{24}) \/\* App \*\/ = \{\s*isa = PBXNativeTarget;/.exec(pbx);
  if (!m) throw new Error('App target not found in project.pbxproj');
  return m[1];
}

export function schemeXml(targetId) {
  const ref = `<BuildableReference BuildableIdentifier = "primary" BlueprintIdentifier = "${targetId}" BuildableName = "App.app" BlueprintName = "App" ReferencedContainer = "container:App.xcodeproj"></BuildableReference>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion = "1500" version = "1.7">
   <BuildAction parallelizeBuildables = "YES" buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry buildForTesting = "YES" buildForRunning = "YES" buildForProfiling = "YES" buildForArchiving = "YES" buildForAnalyzing = "YES">
            ${ref}
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction buildConfiguration = "Debug" selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv = "YES">
      <Testables></Testables>
   </TestAction>
   <LaunchAction buildConfiguration = "Debug" selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB" launchStyle = "0" useCustomWorkingDirectory = "NO" ignoresPersistentStateOnLaunch = "NO" debugDocumentVersioning = "YES" debugServiceExtension = "internal" allowLocationSimulation = "YES">
      <BuildableProductRunnable runnableDebuggingMode = "0">
         ${ref}
      </BuildableProductRunnable>
      <StoreKitConfigurationFileReference identifier = "../GraveGoods.storekit"></StoreKitConfigurationFileReference>
   </LaunchAction>
   <ProfileAction buildConfiguration = "Release" shouldUseLaunchSchemeArgsEnv = "YES" savedToolIdentifier = "" useCustomWorkingDirectory = "NO" debugDocumentVersioning = "YES">
      <BuildableProductRunnable runnableDebuggingMode = "0">
         ${ref}
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction buildConfiguration = "Debug"></AnalyzeAction>
   <ArchiveAction buildConfiguration = "Release" revealArchiveInOrganizer = "YES"></ArchiveAction>
</Scheme>
`;
}

export function patchIos({ root = ROOT, env = process.env, log = console.log } = {}) {
  const ios = path.join(root, 'ios/App');
  if (!fs.existsSync(ios)) throw new Error('ios/App not found: run `npx cap add ios` first');
  const appId = readAppId(root);
  const bundleId = env.BUNDLE_ID || appId;
  if (bundleId !== appId) throw new Error(`BUNDLE_ID (${bundleId}) differs from appId in capacitor.config.ts (${appId}): change both, they must match`);
  const res = {};

  const plistPath = path.join(ios, 'App/Info.plist');
  const p = patchInfoPlist(fs.readFileSync(plistPath, 'utf8'), { admobAppId: env.ADMOB_APP_ID_IOS || GOOGLE_TEST_APP_ID });
  fs.writeFileSync(plistPath, p.plist); res.plistChanges = p.changed; log(`patch-ios: Info.plist ${p.changed} change(s)`);

  fs.writeFileSync(path.join(ios, 'App/App.entitlements'), ENTITLEMENTS); log('patch-ios: App.entitlements written');

  const pbxPath = path.join(ios, 'App.xcodeproj/project.pbxproj');
  const x = patchPbxproj(fs.readFileSync(pbxPath, 'utf8'), bundleId);
  if (x.bundleCount < 2) throw new Error(`expected PRODUCT_BUNDLE_IDENTIFIER in 2 configurations, found ${x.bundleCount}`);
  fs.writeFileSync(pbxPath, x.pbx); res.pbx = x; log(`patch-ios: project.pbxproj bundle id ${bundleId} x${x.bundleCount}, entitlements x${x.entCount}`);

  const podPath = path.join(ios, 'Podfile');
  const d = patchDeploymentTarget(fs.readFileSync(pbxPath, 'utf8'), fs.readFileSync(podPath, 'utf8'));
  if (d.projectCount < 2 || d.podfileCount !== 1) throw new Error(`deployment target patch matched project x${d.projectCount}, Podfile x${d.podfileCount}`);
  fs.writeFileSync(pbxPath, d.pbx); fs.writeFileSync(podPath, d.podfile); log(`patch-ios: iOS ${MIN_IOS} (project x${d.projectCount}, Podfile x${d.podfileCount})`);

  if (!fs.existsSync(path.join(ios, 'GraveGoods.storekit'))) throw new Error('ios/App/GraveGoods.storekit is missing: run node scripts/gen-storekit.mjs');
  const schemeDir = path.join(ios, 'App.xcodeproj/xcshareddata/xcschemes');
  fs.mkdirSync(schemeDir, { recursive: true });
  fs.writeFileSync(path.join(schemeDir, 'App.xcscheme'), schemeXml(appTargetId(fs.readFileSync(pbxPath, 'utf8')))); log('patch-ios: shared scheme App (StoreKit config on Run/Debug only)');

  const iconSrc = path.join(root, 'assets/app-icon-1024.png');
  const iconDst = path.join(ios, 'App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
  fs.writeFileSync(iconDst, flattenToRGB(fs.readFileSync(iconSrc))); log('patch-ios: AppIcon-512@2x.png written (alpha removed)');

  const splash = solidPng(2732, 2732, [23, 22, 27]);
  const sdir = path.join(ios, 'App/Assets.xcassets/Splash.imageset');
  for (const f of fs.readdirSync(sdir).filter(f => f.endsWith('.png'))) fs.writeFileSync(path.join(sdir, f), splash);
  log('patch-ios: Splash images replaced with solid #17161b');
  return res;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { patchIos(); } catch (e) { console.error('patch-ios FAILED: ' + e.message); process.exit(1); }
}
