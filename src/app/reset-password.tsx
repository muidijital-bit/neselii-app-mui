import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { PasswordStrengthBar, TextField } from '@/components/text-field';
import { Colors, Spacing } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/providers/auth-provider';

export default function ResetPasswordScreen() {
  const { session, updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [loading, setLoading] = useState(false);

  const mismatch = passwordAgain.length > 0 && password !== passwordAgain;
  const valid = password.length >= 8 && password === passwordAgain;

  const onSubmit = async () => {
    setLoading(true);
    try {
      // Başarılı olunca kurtarma modu kapanır ve ana sayfa açılır
      await updatePassword(password);
      Alert.alert('Şifreniz güncellendi', 'Yeni şifrenizle giriş yapabilirsiniz.');
    } catch (e) {
      Alert.alert('Şifre güncellenemedi', authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScreenHeader title="Yeni Şifre" back={false} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="body" color="textSecondary" style={styles.lead}>
          {session?.user.email} için yeni bir şifre belirleyin.
        </Text>
        <TextField
          label="Yeni Şifre"
          value={password}
          onChangeText={setPassword}
          password
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <PasswordStrengthBar password={password} />
        <TextField
          label="Yeni Şifre (Tekrar)"
          value={passwordAgain}
          onChangeText={setPasswordAgain}
          password
          autoComplete="new-password"
          error={mismatch ? 'Şifreler eşleşmiyor.' : undefined}
        />
        <Button title="Şifreyi Güncelle" disabled={!valid} loading={loading} onPress={onSubmit} />
        <Button title="Vazgeç ve çıkış yap" variant="outline" onPress={() => void signOut()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.three },
  lead: { fontSize: 18, lineHeight: 27 },
});
