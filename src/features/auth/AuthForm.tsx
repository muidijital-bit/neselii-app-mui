import { useEffect, type Ref } from 'react';
import { useController, type Control, type FieldPath, type FieldValues, type UseFormSubscribe } from 'react-hook-form';
import { StyleSheet, View, type TextInput as TextInputInstance, type TextInputProps } from 'react-native';

import { passwordStrength } from '@/domain';
import { Text } from '@/ui/Text';
import { TextField as UiTextField } from '@/ui/TextField';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { useScrollFocusedIntoView } from './FormScroll';

type FieldType = 'text' | 'password' | 'tel' | 'email';

type TextFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  type?: FieldType;
  placeholder?: string;
  /** Hata yokken gösterilen onay ipucu (ör. "Şifreler eşleşiyor"); yardımcı metin yerine geçer. */
  okHint?: string | null;
  /** Hata ve onay ipucu yokken alanın altında duran nötr bilgi metni. */
  hint?: string;
  /** Şema hatası yokken gösterilen anlık hata (ör. tasarımdaki gibi yazarken "Şifreler eşleşmiyor."). */
  liveError?: string;
  autoComplete?: 'email' | 'name' | 'tel' | 'password' | 'new-password' | 'off';
  returnKeyType?: 'next' | 'done';
  /** "İleri" alanında sonraki alana `focus()`, son alanda gönderim. */
  onSubmitEditing?: () => void;
  /** Giriş kutusu (önceki alanın "İleri" tuşu buna odaklanır). */
  ref?: Ref<TextInputInstance>;
  testID: string;
};

/** Alan türüne göre klavye/otomatik doldurma özellikleri. */
function inputTraits(type: FieldType, autoComplete: TextFieldProps<FieldValues>['autoComplete']): TextInputProps {
  switch (type) {
    case 'email':
      return { keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false, textContentType: 'emailAddress' };
    case 'password':
      return { autoCapitalize: 'none', autoCorrect: false, textContentType: autoComplete === 'new-password' ? 'newPassword' : 'password' };
    case 'tel':
      return { keyboardType: 'phone-pad', textContentType: 'telephoneNumber' };
    default:
      return {};
  }
}

/**
 * React Hook Form alanı → ortak `@/ui/TextField`. Değer RHF belleğinde durur (kalıcı depoya yazılmaz); hata iletisi şemadan gelen sabit
 * metindir. `testID` giriş kutusuna verilir.
 */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  type = 'text',
  placeholder,
  okHint,
  hint,
  liveError,
  autoComplete,
  returnKeyType,
  onSubmitEditing,
  ref,
  testID,
}: TextFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const error = fieldState.error?.message ?? liveError;
  const scrollIntoView = useScrollFocusedIntoView();
  return (
    <UiTextField
      {...inputTraits(type, autoComplete)}
      ref={ref}
      label={label}
      password={type === 'password'}
      placeholder={placeholder}
      value={field.value as string}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      onFocus={scrollIntoView}
      autoComplete={autoComplete}
      returnKeyType={returnKeyType}
      // "İleri"de klavye kapanmasın (odak sonraki alana geçer); son alanda varsayılan: klavye kapanır + gönderim.
      submitBehavior={returnKeyType === 'next' ? 'submit' : undefined}
      onSubmitEditing={onSubmitEditing}
      error={error}
      helper={okHint ?? hint}
      accessibilityLabel={error ? `${label}, hata` : label}
      testID={testID}
    />
  );
}

/**
 * Kullanıcı herhangi bir alanı değiştirdiği anda formun genel hatası (ör. "E-posta veya şifre hatalı.") kalkar. Alan boşalınca buton
 * pasifleştiği için `handleSubmit(…, clearFailure)` yolu çalışmaz; bu yüzden değer aboneliği kullanılır (effect içinde türetilmiş durum yok).
 * Yalnız kullanıcı girişi (`type: 'change'`) sayılır; `reset`/`setValue` hatayı silmez.
 */
export function useClearFailureOnEdit<T extends FieldValues>(subscribe: UseFormSubscribe<T>, clearFailure: () => void) {
  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: ({ type }) => {
          if (type === 'change') clearFailure();
        },
      }),
    [subscribe, clearFailure],
  );
}

/** Formun genel hata metni (alan altı hata dışındaki: yanlış bilgi, çevrimdışı, servis hatası). */
export function FormError({ message, testID = 'form-error' }: { message: string | null; testID?: string }) {
  if (!message) return null;
  return (
    <Text variant="small" color="danger" accessibilityRole="alert" accessibilityLiveRegion="assertive" testID={testID}>
      {message}
    </Text>
  );
}

// Seviye (0-4) → dolu çubuk rengi; main'deki `PasswordStrengthBar` ile aynı eşleme.
const STRENGTH_COLORS = [Colors.danger, Colors.danger, Colors.warning, Colors.green, Colors.green];

/** Dört çubuklu şifre gücü göstergesi. Seviye `@/domain` kuralından gelir; görünüm `@/ui/TextField` içindeki çubukla aynıdır. */
export function StrengthMeter({ password }: { password: string }) {
  const { level, label } = passwordStrength(password);
  return (
    <View style={styles.row} accessible accessibilityLabel={label ? `Şifre gücü: ${label}` : 'Şifre gücü'} testID="password-strength">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.segment, { backgroundColor: i < level ? STRENGTH_COLORS[level] : Colors.disabled }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, marginTop: -Spacing.one },
  segment: { flex: 1, height: 5, borderRadius: Radius.pill },
});
