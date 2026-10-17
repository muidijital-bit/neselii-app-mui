import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { PasswordStrengthBar, TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/providers/auth-provider';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const mismatch = passwordAgain.length > 0 && password !== passwordAgain;
  const valid =
    fullName.trim().length >= 2 &&
    EMAIL_RE.test(email.trim()) &&
    password.length >= 8 &&
    password === passwordAgain &&
    accepted;

  const onSubmit = async () => {
    setLoading(true);
    try {
      const signedIn = await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      if (!signedIn) {
        Alert.alert(
          'E-postanızı doğrulayın',
          `${email.trim()} adresine bir doğrulama bağlantısı gönderdik. Bağlantıya telefonunuzdan dokunduğunuzda hesabınız açılacak.`,
          [{ text: 'Tamam', onPress: () => router.back() }],
        );
      }
    } catch (e) {
      Alert.alert('Kayıt olunamadı', authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScreenHeader title="Hesap Oluştur" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField label="Ad Soyad" value={fullName} onChangeText={setFullName} autoComplete="name" />
        <TextField
          label="E-posta"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <TextField
          label="Telefon (isteğe bağlı)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        <TextField
          label="Şifre"
          value={password}
          onChangeText={setPassword}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          helper="En az 8 karakter; büyük harf, rakam ve sembol şifrenizi güçlendirir."
        />
        <PasswordStrengthBar password={password} />
        <TextField
          label="Şifre (Tekrar)"
          value={passwordAgain}
          onChangeText={setPasswordAgain}
          password
          autoComplete="new-password"
          error={mismatch ? 'Şifreler eşleşmiyor.' : undefined}
        />

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          style={styles.checkRow}
          onPress={() => setAccepted((v) => !v)}>
          <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
            {accepted ? <Icon name="check" size={18} color="white" /> : null}
          </View>
          <Text variant="body" style={styles.flex}>
            Kullanım koşullarını ve KVKK aydınlatma metnini okudum, kabul ediyorum.
          </Text>
        </Pressable>

        <Button title="Kayıt Ol" disabled={!valid} loading={loading} onPress={onSubmit} />
        <Text variant="small" align="center">
          Kayıt sonrası e-posta adresinize bir doğrulama bağlantısı gönderilir.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  flex: { flex: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, marginVertical: Spacing.two },
  checkbox: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: Colors.green, borderColor: Colors.green },
});
