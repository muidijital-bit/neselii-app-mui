/**
 * expo-notifications config plugin'i Expo tarafından otomatik uygulanır ve iOS'a `aps-environment` (push) yetkisi yazar.
 * Bu uygulamada gerçek push yoktur (yalnızca yerel izin/uygulama içi bildirim); yetki, fiziksel cihaz imzalamada gereksiz bir
 * "Push Notifications" yeteneği şartı doğurur. Bu plugin yetkiyi kaldırır. Gerçek push eklenirken (backend sonrası) silinmelidir.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

/** Saf dönüşüm (test edilebilir): `aps-environment` anahtarını çıkarır, girdiyi değiştirmez. */
function removePushEntitlement(entitlements) {
  const { 'aps-environment': _removed, ...rest } = entitlements;
  return rest;
}

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (c) => {
    c.modResults = removePushEntitlement(c.modResults);
    return c;
  });
};
module.exports.removePushEntitlement = removePushEntitlement;
