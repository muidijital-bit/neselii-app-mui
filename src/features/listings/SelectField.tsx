import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icons/Icon';
import { colors, radii, sizes, textStyles } from '@/theme';

type Props = {
  /** Erişilebilirlik ve modal başlığı: "Marka", "Model yılı, en az". */
  label: string;
  /** Alan kutusunda boşken görünen metin ("En az", "Marka seçin"). */
  placeholder: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  /** Listede olmayan değerin elle girilmesi (`number-pad` yıl için, `default` marka için). */
  customInput?: { placeholder: string; numeric?: boolean };
  /** Modal başlığı (verilmezse `label`). */
  title?: string;
  /** Seçimi kaldıran satırın metni. */
  clearLabel?: string;
  invalid?: boolean;
  compact?: boolean;
  /** `row`: 2. aşama filtre görünümü — açık zeminli satır, solda simge, sağda ok. */
  appearance?: 'box' | 'row';
  leadingIcon?: IconName;
  testID: string;
};

/**
 * Tasarımdaki açılır seçim (ekran 05: 52px kutu + chevron-down). Dokununca alttan açılan erişilebilir seçim modalı: seçenekler,
 * seçimi kaldırma ve (isteğe bağlı) elle giriş. Mevcut değer listede olmasa da en üstte seçili görünür; asla sessizce silinmez.
 */
export function SelectField({ label, placeholder, value, options, onChange, customInput, title, clearLabel = 'Seçimi kaldır', invalid = false, compact = false, appearance = 'box', leadingIcon, testID }: Props) {
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
  const hasValue = value.trim() !== '';
  const extra = hasValue && !options.includes(value.trim()) ? [value.trim()] : [];
  const data = [...extra, ...options];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}${hasValue ? `, ${value.trim()}` : ', seçilmedi'}${invalid ? ', hata' : ''}`}
        accessibilityHint="Seçenekleri açar"
        onPress={openModal}
        style={[styles.box, appearance === 'row' && styles.row, compact && styles.boxCompact, invalid && styles.boxInvalid]}
        testID={testID}>
        {leadingIcon ? <Icon name={leadingIcon} size={22} color={colors.slate} /> : null}
        <Text style={[textStyles.body, appearance === 'row' && styles.rowText, { color: hasValue ? colors.ink : colors.slateLight }, styles.valueText]} numberOfLines={1}>
          {hasValue ? value.trim() : placeholder}
        </Text>
        <Icon name={appearance === 'row' ? 'chevron-right' : 'chevron-down'} size={18} color={colors.slate} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.backdrop} accessibilityViewIsModal testID={`${testID}-modal`}>
          <Pressable style={styles.scrim} onPress={close} accessibilityRole="button" accessibilityLabel="Kapat" testID={`${testID}-scrim`} />
          <View style={[styles.sheet, { paddingBottom: 12 + insets.bottom }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} accessibilityRole="header">
                {title ?? label}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={close} style={styles.closeButton} testID={`${testID}-close`}>
                <Icon name="x" size={22} color={colors.navy} />
              </Pressable>
            </View>

            {customInput ? (
              <View style={styles.customRow}>
                <TextInput
                  value={custom}
                  onChangeText={setCustom}
                  placeholder={customInput.placeholder}
                  placeholderTextColor={colors.slateFaint}
                  keyboardType={customInput.numeric ? 'number-pad' : 'default'}
                  autoCapitalize={customInput.numeric ? 'none' : 'words'}
                  autoCorrect={false}
                  accessibilityLabel={customInput.placeholder}
                  onSubmitEditing={() => custom.trim() && pick(custom.trim())}
                  style={[textStyles.body, styles.customInput]}
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
                  <Text style={styles.customApplyLabel}>Kullan</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable accessibilityRole="button" onPress={() => pick('')} style={styles.option} accessibilityState={{ selected: !hasValue }} testID={`${testID}-clear`}>
              <Text style={[textStyles.body, styles.clearText]}>{clearLabel}</Text>
              {!hasValue ? <Icon name="check" size={18} color={colors.green} /> : null}
            </Pressable>

            <FlatList
              data={data}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              initialNumToRender={24}
              renderItem={({ item }) => {
                const selected = item === value.trim();
                return (
                  <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={() => pick(item)} style={styles.option} testID={`${testID}-option-${item}`}>
                    <Text style={[textStyles.body, { color: colors.ink }, selected && styles.optionSelected]}>{item}</Text>
                    {selected ? <Icon name="check" size={18} color={colors.green} /> : null}
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
  box: {
    minHeight: sizes.fieldHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
  },
  boxCompact: { minHeight: 48 },
  row: { minHeight: 56, borderWidth: 0, borderRadius: 16, backgroundColor: colors.blueTint, paddingHorizontal: 16, gap: 12 },
  rowText: { fontSize: 16 },
  boxInvalid: { borderColor: colors.danger },
  valueText: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(7,24,43,0.5)' },
  sheet: { maxHeight: '75%', backgroundColor: colors.white, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, paddingTop: 8 },
  sheetHeader: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  sheetTitle: { ...textStyles.titleSection, fontSize: 17, color: colors.navy },
  closeButton: { width: sizes.minTouchTarget, height: sizes.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12 },
  customInput: { flex: 1, height: 48, paddingHorizontal: 14, paddingVertical: 0, borderWidth: 1, borderColor: colors.line, borderRadius: radii.xl, color: colors.ink, includeFontPadding: false },
  customApply: { height: 48, paddingHorizontal: 16, borderRadius: radii.xl, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  customApplyDisabled: { backgroundColor: colors.line },
  customApplyLabel: { ...textStyles.button, color: colors.white },
  list: { flexGrow: 0 },
  option: { minHeight: sizes.minTouchTarget + 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  optionSelected: { fontFamily: textStyles.button.fontFamily },
  clearText: { color: colors.blue },
});
