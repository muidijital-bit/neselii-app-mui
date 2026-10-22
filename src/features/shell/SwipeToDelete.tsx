import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Spacing } from '@/ui/theme';

const ACTION_WIDTH = 88;

type Props = {
  children: ReactNode;
  /** "Sil" düğmesine basılınca; `close` satırı kapatır (ör. onay penceresinde "Vazgeç"). */
  onDelete: (close: () => void) => void;
  /** Kaydırınca çıkan "Sil" düğmesinin test kimliği (`conversation-delete-<id>` vb.). */
  deleteTestID: string;
  /** Ekran okuyucu etiketi (ör. "Görüşmeyi sil"). */
  deleteLabel: string;
};

/**
 * Liste satırı: sola kaydırınca sağda kırmızı "Sil" eylemi (main tasarım dili: `Colors.danger` zemin, beyaz `trash-2` + "Sil").
 * Uzun basma ve erişilebilirlik "Sil" eylemi satırın kendisinde tanımlanır (bkz. ekranlar); bu bileşen yalnız kaydırma eylemini sağlar.
 */
export function SwipeToDelete({ children, onDelete, deleteTestID, deleteLabel }: Props) {
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      childrenContainerStyle={styles.children}
      renderRightActions={(progress, _translation, methods) => (
        <DeleteAction progress={progress} methods={methods} onDelete={onDelete} testID={deleteTestID} label={deleteLabel} />
      )}>
      {children}
    </ReanimatedSwipeable>
  );
}

type ActionProps = {
  progress: SharedValue<number>;
  methods: SwipeableMethods;
  onDelete: Props['onDelete'];
  testID: string;
  label: string;
};

function DeleteAction({ progress, methods, onDelete, testID, label }: ActionProps) {
  // İçerik kaydırma ilerledikçe belirginleşir (abartısız: hafif ölçek + saydamlık).
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6, 1], [0, 0.6, 1], 'clamp'),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.85, 1], 'clamp') }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onDelete(methods.close)}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      testID={testID}>
      <Animated.View style={[styles.actionContent, contentStyle]}>
        <Icon name="trash-2" size={20} color="white" />
        <Text variant="smallSemibold" style={styles.actionLabel}>
          Sil
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Satır zemini opak: kaydırırken arkadaki eylem satır içeriğinin altından görünmez.
  children: { backgroundColor: Colors.surface },
  action: { width: ACTION_WIDTH, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.danger },
  pressed: { opacity: 0.85 },
  actionContent: { alignItems: 'center', gap: Spacing.one },
  actionLabel: { color: Colors.white },
});
