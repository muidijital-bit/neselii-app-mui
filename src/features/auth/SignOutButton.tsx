import { StyleSheet, View } from 'react-native';

import { Btn } from '@/components/Btn';

import { FormError } from './AuthForm';
import { useSignOut } from './useSignOut';

/** Çıkış düğmesi + açık hata bandı. Hata varsa düğme "Tekrar dene" olur (oturum hâlâ açıktır). */
export function SignOutButton({ onDark = false, testID = 'sign-out' }: { onDark?: boolean; testID?: string }) {
  const { signOut, signingOut, failure } = useSignOut();
  return (
    <View style={styles.root}>
      <FormError message={failure ? `Çıkış yapılamadı. ${failure.message ?? ''}`.trim() : null} testID={`${testID}-error`} />
      <Btn
        label={failure ? 'Çıkışı tekrar dene' : 'Çıkış yap'}
        variant={onDark ? 'onDark' : 'secondary'}
        icon="log-out"
        onPress={signOut}
        loading={signingOut}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({ root: { alignSelf: 'stretch', gap: 12 } });
