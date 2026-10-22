import { StyleSheet, View } from 'react-native';

import { Button } from '@/ui/Button';

import { FormError } from './AuthForm';
import { useSignOut } from './useSignOut';

/** Çıkış düğmesi + açık hata metni. Hata varsa düğme "Çıkışı tekrar dene" olur (oturum hâlâ açıktır). */
export function SignOutButton({ onDark = false, testID = 'sign-out' }: { onDark?: boolean; testID?: string }) {
  const { signOut, signingOut, failure } = useSignOut();
  return (
    <View style={styles.root}>
      <FormError message={failure ? `Çıkış yapılamadı. ${failure.message ?? ''}`.trim() : null} testID={`${testID}-error`} />
      <Button
        title={failure ? 'Çıkışı tekrar dene' : 'Çıkış yap'}
        variant={onDark ? 'outlineDark' : 'outline'}
        icon="log-out"
        onPress={() => void signOut()}
        loading={signingOut}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({ root: { alignSelf: 'stretch', gap: 12 } });
