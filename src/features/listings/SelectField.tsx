import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Fonts, Radius, Spacing } from '@/ui/theme';

type Props = {
  /** Erişilebilirlik ve modal başlığı: "Marka". */
  label: string;
  /** Alan kutusunda boşken görünen metin ("Tüm markalar"). */
  placeholder: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  /** Listede olmayan değerin elle girilmesi (`number-pad` sayı için, `default` marka için). */
  customInput?: { placeholder: string; numeric?: boolean };
  /** Modal başlığı (verilmezse `label`). */
  title?: string;
  /** Seçimi kaldıran satırın metni. */
  clearLabel?: string;
  invalid?: boolean;
  /** Geriye uyumluluk: görünüm her zaman main'deki seçim satırıdır. */
  compact?: boolean;
  appearance?: 'box' | 'row';
  leadingIcon?: IconName;
  testID: string;
};

/**
 * Main'deki marka seçimi: açık zeminli satır (solda simge, seçiliyken sağda temizle, değilse ok) ve alttan açılan `OptionSheet` görünümlü liste.
 * Ek olarak listede olmayan değer elle yazılabilir; mevcut değer listede olmasa da en üstte seçili görünür, asla sessizce silinmez.
 */
export function SelectField({ label, placeholder, value, options, onChange, customInput, title, clearLabel = 'Seçimi kaldır', invalid = false, leadingIcon, testID }: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const insets = useSafeAreaInsets();

  const close = () => setOpen(false);
  const pick = (next: string) => {
    onChange(next);
    close();
  };
  const openModal = () => {
    setCustom('');
    setOpen(true);
  };
  const current = value.trim();
  const hasValue = current !== '';
  const extra = hasValue && !options.includes(current) ? [current] : [];
  const rows = [{ value: '', label: clearLabel }, ...[...extra, ...options].map((option) => ({ value: option, label: option }))];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}${hasValue ? `, ${current}` : ', seçilmedi'}${invalid ? ', hata' : ''}`}
        accessibilityHint="Seçenekleri açar"
        onPress={openModal}
        style={[styles.selectRow, invalid && styles.invalid]}
        testID={testID}>
        <Icon name={leadingIcon ?? 'tag'} size={20} color="textSecondary" />
        <Text variant="bodyMedium" style={styles.flex} color={hasValue ? 'text' : 'textSecondary'} numberOfLines={1}>
          {hasValue ? current : placeholder}
        </Text>
        {hasValue ? (
          <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel={`${label} seçimini temizle`} onPress={() => onChange('')} testID={`${testID}-reset`}>
            <Icon name="x-circle" size={20} color="textTertiary" />
          </Pressable>
        ) : (
          <Icon name="chevron-right" size={22} color="textTertiary" />
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex} accessibilityViewIsModal testID={`${testID}-modal`}>
          <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" accessibilityLabel="Kapat" testID={`${testID}-scrim`} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.two }]}>
            <View style={styles.grabber} />
            <View style={styles.titleRow}>
              <Text variant="subheading" style={styles.flex} accessibilityRole="header">
                {title ?? label}
              </Text>
              <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Kapat" onPress={close} testID={`${testID}-close`}>
                <Icon name="x" size={24} />
              </Pressable>
            </View>

            {customInput ? (
              <View style={styles.customRow}>
                <TextInput
                  value={custom}
                  onChangeText={setCustom}
                  placeholder={customInput.placeholder}
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType={customInput.numeric ? 'number-pad' : 'default'}
                  autoCapitalize={customInput.numeric ? 'none' : 'words'}
                  autoCorrect={false}
                  accessibilityLabel={customInput.placeholder}
                  onSubmitEditing={() => custom.trim() && pick(custom.trim())}
                  style={styles.customInput}
                  testID={`${testID}-custom`}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Yazılan değeri kullan"
                  accessibilityState={{ disabled: custom.trim() === '' }}
                  disabled={custom.trim() === ''}
                  onPress={() => pick(custom.trim())}
                  style={[styles.customApply, custom.trim() === '' && styles.customApplyDisabled]}
                  testID={`${testID}-custom-apply`}>
                  <Text variant="bodySemibold" style={{ color: custom.trim() === '' ? Colors.onDisabled : Colors.white }}>
                    Kullan
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <FlatList
              data={rows}
              keyExtractor={(row) => row.value || '__clear'}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={24}
              renderItem={({ item }) => {
                const isSelected = item.value === current;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                    onPress={() => pick(item.value)}
                    testID={item.value ? `${testID}-option-${item.value}` : `${testID}-clear`}>
                    <Text variant={isSelected ? 'bodySemibold' : 'body'} style={styles.flex}>
                      {item.label}
                    </Text>
                    {isSelected ? <Icon name="check" size={20} color="green" /> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.three,
  },
  invalid: { borderWidth: 1.5, borderColor: Colors.danger },
  backdrop: { flex: 1, backgroundColor: 'rgba(10,33,63,0.45)' },
  sheet: {
    maxHeight: '70%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.two,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: Radius.pill,
    backgroundColor: Colors.disabled,
    marginBottom: Spacing.two,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  customInput: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.three,
    paddingVertical: 0,
    fontFamily: Fonts.medium,
    fontSize: 16,
    // Android: yazı tipi payı sıfırlanır, metin dikeyde ortalanır (kesilmez)
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: Colors.text,
  },
  customApply: { height: 48, paddingHorizontal: Spacing.three, borderRadius: Radius.md, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center' },
  customApplyDisabled: { backgroundColor: Colors.disabled },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  pressed: { backgroundColor: Colors.background },
});
