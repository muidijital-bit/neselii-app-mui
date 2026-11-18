import { useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { AppError, userMessage, type BankRate } from '@/domain';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Card } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';

import { useBankMutations, useBanks } from './useFinance';

const parseDecimal = (text: string) => Number(text.replace(',', '.').replace(/[^\d.]/g, ''));

/**
 * Madde 20 (yönetici): anlaşmalı bankalar. Her banka için ad, aylık faiz ve aktiflik; kaydet / sil. Aktif bankalar ilan detayındaki hesaplayıcıda
 * aynı peşinat ve vadeyle yan yana karşılaştırılır (en uygun vurgulanır).
 */
export function BankRatesEditor() {
  const banks = useBanks(true);
  const [adding, setAdding] = useState(false);
  return (
    <View style={styles.group}>
      <Text variant="subheading">Anlaşmalı bankalar</Text>
      <Text variant="small">Aktif bankalar ilan detayındaki hesaplayıcıda yan yana karşılaştırılır.</Text>
      {(banks.data ?? []).map((bank) => (
        <BankRow key={bank.id} bank={bank} />
      ))}
      {adding ? <BankRow bank={null} onDone={() => setAdding(false)} /> : null}
      {!adding ? <Button title="Banka Ekle" icon="plus" variant="outline" onPress={() => setAdding(true)} testID="bank-add" /> : null}
    </View>
  );
}

function BankRow({ bank, onDone }: { bank: BankRate | null; onDone?: () => void }) {
  const { save, remove } = useBankMutations();
  const [name, setName] = useState(bank?.name ?? '');
  const [rate, setRate] = useState(bank ? String(bank.monthlyRatePercent).replace('.', ',') : '');
  const [active, setActive] = useState(bank?.active ?? true);
  const errors = save.error instanceof AppError ? save.error.fieldErrors : undefined;
  const dirty = !bank || name !== bank.name || parseDecimal(rate) !== bank.monthlyRatePercent || active !== bank.active;

  return (
    <Card style={styles.card}>
      <View style={styles.pair}>
        <View style={styles.name}>
          <TextField label="Banka" value={name} onChangeText={setName} maxLength={60} error={errors?.name} testID="bank-name" />
        </View>
        <View style={styles.rate}>
          <TextField label="Aylık %" value={rate} onChangeText={setRate} keyboardType="decimal-pad" error={errors?.rate} testID="bank-rate" />
        </View>
      </View>
      <View style={styles.footer}>
        <Switch value={active} onValueChange={setActive} trackColor={{ false: Colors.disabled, true: Colors.green }} thumbColor={Colors.white} ios_backgroundColor={Colors.disabled} />
        <Text variant="small" style={styles.flex}>
          {active ? 'Aktif' : 'Pasif'}
        </Text>
        {bank ? (
          <Button
            title="Sil"
            variant="outline"
            style={styles.small}
            disabled={remove.isPending}
            onPress={() =>
              Alert.alert('Banka silinsin mi?', `${bank.name} karşılaştırmadan kaldırılacak.`, [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: () => remove.mutate(bank.id) },
              ])
            }
          />
        ) : (
          <Button title="Vazgeç" variant="outline" style={styles.small} onPress={onDone} />
        )}
        <Button
          title="Kaydet"
          style={styles.small}
          disabled={!dirty}
          loading={save.isPending}
          onPress={() => save.mutate({ id: bank?.id ?? null, name, monthlyRatePercent: parseDecimal(rate), active }, { onSuccess: () => onDone?.() })}
          testID="bank-save"
        />
      </View>
      {save.isError && !errors ? (
        <Text variant="small" color="danger">
          {userMessage(save.error)}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  card: { padding: Spacing.three, gap: Spacing.two },
  pair: { flexDirection: 'row', gap: Spacing.two },
  name: { flex: 2 },
  rate: { flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  small: { minHeight: 40, paddingHorizontal: Spacing.three },
});
