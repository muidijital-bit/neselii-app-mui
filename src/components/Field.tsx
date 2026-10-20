import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radii, sizes, textStyles } from '@/theme';

import { Icon, type IconName } from './icons/Icon';

type FieldType = 'text' | 'password' | 'tel' | 'email';

const inputTraits: Record<FieldType, Pick<TextInputProps, 'keyboardType' | 'autoCapitalize' | 'autoCorrect' | 'textContentType'>> = {
  text: {},
  password: { autoCapitalize: 'none', autoCorrect: false, textContentType: 'password' },
  tel: { keyboardType: 'phone-pad', textContentType: 'telephoneNumber' },
  email: { keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false, textContentType: 'emailAddress' },
};

type Props = Pick<
  TextInputProps,
  'value' | 'defaultValue' | 'onChangeText' | 'onBlur' | 'onFocus' | 'onSubmitEditing' | 'returnKeyType' | 'editable' | 'maxLength' | 'autoComplete'
> & {
  label?: string;
  placeholder?: string;
  type?: FieldType;
  /** `error`: kırmızı kenarlık + hata metni (ekran okuyucuya anında duyurulur) · `ok`: onay ikonu + yeşil ipucu. */
  status?: 'ok' | 'error';
  hint?: string;
  trailingIcon?: IconName;
  testID?: string;
};

export function Field({ label, placeholder, type = 'text', status, hint, trailingIcon, editable = true, testID, ...inputProps }: Props) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  const isError = status === 'error';
  const hintColor = isError ? colors.danger : status === 'ok' ? colors.greenPressed : colors.slateLight;

  return (
    <View style={styles.root}>
      {label ? <Text style={[textStyles.label, styles.label]}>{label}</Text> : null}
      <View style={[styles.box, { borderColor: isError ? colors.danger : colors.line }, !editable && styles.readOnly]}>
        <TextInput
          {...inputProps}
          {...inputTraits[type]}
          editable={editable}
          secureTextEntry={isPassword && !revealed}
          placeholder={placeholder}
          placeholderTextColor={colors.slatePale}
          accessibilityLabel={label ? (isError ? `${label}, hata` : label) : undefined}
          accessibilityHint={!isError ? hint : undefined}
          style={[textStyles.body, styles.input]}
          testID={testID}
        />
        {status === 'ok' ? <Icon name="circle-check" size={18} color={colors.green} style={styles.trailing} /> : null}
        {trailingIcon ? <Icon name={trailingIcon} size={18} color={colors.slate} style={styles.trailing} /> : null}
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Şifreyi gizle' : 'Şifreyi göster'}
            onPress={() => setRevealed((value) => !value)}
            style={styles.toggle}
            testID={testID ? `${testID}-toggle` : undefined}>
            <Icon name={revealed ? 'eye-off' : 'eye'} size={20} color={colors.slate} />
          </Pressable>
        ) : null}
      </View>
      {hint ? (
        <Text
          style={[textStyles.caption, { color: hintColor }]}
          accessibilityRole={isError ? 'alert' : undefined}
          accessibilityLiveRegion={isError ? 'polite' : 'none'}
          testID={testID ? `${testID}-hint` : undefined}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', gap: 6 },
  label: { color: colors.inkMuted },
  box: {
    minHeight: sizes.fieldHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderRadius: radii.xl,
  },
  readOnly: { backgroundColor: colors.surface },
  input: { flex: 1, minWidth: 0, alignSelf: 'stretch', padding: 0, color: colors.ink, includeFontPadding: false },
  trailing: { marginRight: 8 },
  toggle: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
