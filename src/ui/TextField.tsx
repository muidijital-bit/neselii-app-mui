import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInput as TextInputInstance, type TextInputProps } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Fonts, Radius, Spacing } from '@/ui/theme';

type Props = TextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
  /** Şifre alanı: göz simgesiyle göster/gizle */
  password?: boolean;
  /** Giriş kutusunun kendisi (ör. klavyedeki "İleri" ile sonraki alana `focus()`). React 19: ref düz prop olarak gelir. */
  ref?: Ref<TextInputInstance>;
};

export function TextField({ label, helper, error, password, editable = true, style, ref, ...rest }: Props) {
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrapper}>
      {label ? <Text variant="smallMedium" color="textSecondary">{label}</Text> : null}
      <View
        style={[
          styles.field,
          !editable && styles.readOnly,
          error ? { borderColor: Colors.danger } : null,
        ]}>
        <TextInput
          ref={ref}
          placeholderTextColor={Colors.textTertiary}
          secureTextEntry={password && hidden}
          editable={editable}
          style={[styles.input, !editable && { color: Colors.text }, style]}
          {...rest}
        />
        {password ? (
          <Pressable
            hitSlop={12}
            accessibilityLabel={hidden ? 'Şifreyi göster' : 'Şifreyi gizle'}
            onPress={() => setHidden((v) => !v)}>
            <Icon name={hidden ? 'eye' : 'eye-off'} size={22} color="textSecondary" />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption">{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.two },
  field: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.three,
  },
  readOnly: { backgroundColor: Colors.background },
  // Android TextInput varsayılan dikey iç boşluk ve yazı tipi payı ekler (dar kutularda rakam/harf alt kısmı kesilir): sıfırlanır, metin
  // dikeyde ortalanır. `includeFontPadding`/`textAlignVertical` yalnız Android'de etkilidir; iOS görünümü değişmez.
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    paddingVertical: 0,
    fontFamily: Fonts.regular,
    fontSize: 17,
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: Colors.text,
  },
});

/** Şifre gücü: 0-4 (uzunluk, büyük harf, rakam, sembol) */
export function passwordStrength(password: string) {
  if (!password) return 0;
  let score = password.length >= 8 ? 1 : 0;
  if (/[A-ZĞÜŞİÖÇ]/.test(password) && /[a-zğüşıöç]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9ğüşıöçĞÜŞİÖÇ]/.test(password)) score++;
  return score;
}

const strengthColors = [Colors.danger, Colors.danger, Colors.warning, Colors.green, Colors.green];

export function PasswordStrengthBar({ password }: { password: string }) {
  const score = passwordStrength(password);
  return (
    <View style={strengthStyles.row}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            strengthStyles.segment,
            { backgroundColor: i < score ? strengthColors[score] : Colors.disabled },
          ]}
        />
      ))}
    </View>
  );
}

const strengthStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, marginTop: -Spacing.one },
  segment: { flex: 1, height: 5, borderRadius: Radius.pill },
});
