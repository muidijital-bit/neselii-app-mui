import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';

export type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  visible: boolean;
  title: string;
  options: Option<T>[];
  selected?: T | null;
  /** Seçimi kaldırma satırı (ör. "Tüm markalar") */
  clearLabel?: string;
  onSelect: (value: T | null) => void;
  onClose: () => void;
};

/** Alttan açılan seçim listesi */
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  clearLabel,
  onSelect,
  onClose,
}: Props<T>) {
  const insets = useSafeAreaInsets();
  const rows: Option<T | ''>[] = clearLabel ? [{ value: '', label: clearLabel }, ...options] : options;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Kapat" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.two }]}>
        <View style={styles.grabber} />
        <Text variant="subheading" style={styles.title}>
          {title}
        </Text>
        <FlatList
          data={rows}
          keyExtractor={(o) => o.value || '__clear'}
          renderItem={({ item }) => {
            const isSelected = (item.value || null) === (selected ?? null);
            return (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => {
                  onSelect((item.value || null) as T | null);
                  onClose();
                }}>
                <Text variant={isSelected ? 'bodySemibold' : 'body'} style={styles.flex}>
                  {item.label}
                </Text>
                {isSelected ? <Icon name="check" size={20} color="green" /> : null}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  title: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
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
