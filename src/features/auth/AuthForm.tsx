import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { Field } from '@/components/Field';
import { colors, fontFamily, spacing, textStyles } from '@/theme';

import { useScrollFocusedIntoView } from './FormScroll';

type TextFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  type?: 'text' | 'password' | 'tel' | 'email';
  placeholder?: string;
  /** Hata yokken gösterilen onay ipucu (ör. "Şifreler eşleşiyor"); verilirse alan `ok` görünür. */
  okHint?: string | null;
  autoComplete?: 'email' | 'name' | 'tel' | 'password' | 'new-password' | 'off';
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  testID: string;
};

/**
 * React Hook Form alanı → ortak `Field`. Değer RHF belleğinde durur (kalıcı depoya yazılmaz); hata iletisi şemadan gelen sabit
 * metindir.
 */
export function TextField<T extends FieldValues>({ control, name, label, type = 'text', placeholder, okHint, autoComplete, returnKeyType, onSubmitEditing, testID }: TextFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const error = fieldState.error?.message;
  const scrollIntoView = useScrollFocusedIntoView();
  return (
    <Field
      label={label}
      type={type}
      placeholder={placeholder}
      value={field.value as string}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      onFocus={scrollIntoView}
      autoComplete={autoComplete}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      status={error ? 'error' : okHint ? 'ok' : undefined}
      hint={error ?? okHint ?? undefined}
      testID={testID}
    />
  );
}

/** Formun genel hata bandı (alan altı hata dışındaki: yanlış bilgi, çevrimdışı, servis hatası). */
export function FormError({ message, testID = 'form-error' }: { message: string | null; testID?: string }) {
  if (!message) return null;
  return (
    <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive" testID={testID}>
      <Text style={[textStyles.bodySmall, styles.errorText]}>{message}</Text>
    </View>
  );
}

/** Dört çubuklu şifre gücü göstergesi (tasarım ekran 02). */
export function StrengthMeter({ level, label }: { level: number; label: string }) {
  return (
    <View style={styles.meterRow} accessible accessibilityLabel={label ? `Şifre gücü: ${label}` : 'Şifre gücü'} testID="password-strength">
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((step) => (
          <View key={step} style={[styles.bar, { backgroundColor: step <= level ? colors.green : colors.line }]} />
        ))}
      </View>
      {label ? <Text style={[textStyles.tag, styles.meterLabel]}>{`Şifre gücü: ${label}`}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bars: { flex: 1, flexDirection: 'row', gap: spacing.xs },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  meterLabel: { fontFamily: fontFamily.inter500, fontSize: 12, color: colors.greenPressed },
  error: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.white },
  errorText: { color: colors.danger },
});
