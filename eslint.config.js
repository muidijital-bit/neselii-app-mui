// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'ios/*', 'android/*'],
  },
  {
    // eslint-config-expo 58 ile gelen React Compiler kuralları. Eski uygulamadan taşınan ve test edilmiş desenler (render'da `Date.now()`,
    // "son değer" ref'leri, effect içinde durum eşitleme) bu kurallara takılıyor. React Compiler bu bileşenleri derlemeden atladığı için
    // çalışma davranışı değişmez. Yeniden yazım 2. aşamada yapılacak; o zamana kadar hata yerine uyarı olarak görünür kalırlar.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
]);
