// expo-sqlite web sürümü wa-sqlite.wasm dosyasını içe aktarır; Metro'nun bunu varlık (asset) olarak tanıması gerekir.
// Bu olmadan `expo export --platform all` (EAS Update / Expo Go önizlemesi) web paketinde durur.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');

module.exports = config;
