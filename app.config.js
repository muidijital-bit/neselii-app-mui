// app.json'daki yapılandırmayı olduğu gibi kullanır; tek istisna Expo Go önizlemesi.
// Expo Go, EAS Update'ten "exposdk:<sürüm>" runtime numarasıyla güncelleme ister.
// Gerçek derlemeler (TestFlight/App Store) app.json'daki runtimeVersion politikasını kullanır.
//
// Expo Go önizlemesi yayınlamak için: EXPO_GO_PREVIEW=1 eas update --channel preview ...
module.exports = ({ config }) => {
  if (process.env.EXPO_GO_PREVIEW !== '1') return config;
  const sdkMajor = require('expo/package.json').version.split('.')[0];
  return { ...config, runtimeVersion: `exposdk:${sdkMajor}.0.0` };
};
