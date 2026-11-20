/**
 * iOS 27 SDK ile derlenen uygulamalar UIScene yaşam döngüsünü benimsemezse açılışta çöker
 * (`_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`, EXC_BREAKPOINT). Expo 57 bunun için
 * `ExpoAppSceneDelegate` sınıfını içerir ama şablon onu açmaz. Bu plugin:
 *  - Info.plist'e sahne yapılandırmasını (tek pencere, `EXExpoAppSceneDelegate`) ekler,
 *  - AppDelegate'i `ExpoReactNativeFactoryProvider` yapar ve pencere oluşturmayı sahne delegesine bırakır
 *    (React Native'i artık `ExpoAppSceneDelegate` başlatır; derin bağlantılar da oradan iletilir).
 */
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
      },
    ],
  },
};

const LEGACY_WINDOW_BLOCK =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif\n/;

/** Saf dönüşüm (test edilebilir): Swift AppDelegate'i sahne yaşam döngüsüne uyarlar; tekrar uygulanırsa değiştirmez. */
function adoptSceneLifecycle(source) {
  let out = source;
  if (!out.includes('ExpoReactNativeFactoryProvider')) {
    out = out.replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
  }
  out = out.replace(LEGACY_WINDOW_BLOCK, '\n    // Pencere ve React Native, Info.plist\'teki sahne delegesinde (ExpoAppSceneDelegate) başlatılır.\n');
  if (!out.includes('ExpoReactNativeFactoryProvider') || LEGACY_WINDOW_BLOCK.test(out)) {
    throw new Error('withSceneLifecycle: AppDelegate.swift beklenen şablonla eşleşmedi; sahne yaşam döngüsü uygulanamadı.');
  }
  return out;
}

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = SCENE_MANIFEST;
    return c;
  });
  return withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') throw new Error('withSceneLifecycle: yalnızca Swift AppDelegate desteklenir.');
    c.modResults.contents = adoptSceneLifecycle(c.modResults.contents);
    return c;
  });
};
module.exports.adoptSceneLifecycle = adoptSceneLifecycle;
