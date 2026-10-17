import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StateView } from '@/components/state-view';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useMessages, useSendMessage } from '@/features/messages/api';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { userId } = useAuth();
  const [draft, setDraft] = useState('');

  const messages = useMessages(id);
  const sendMessage = useSendMessage(id);
  // inverted liste en yeni mesajı altta gösterir
  const items = [...(messages.data ?? [])].reverse();

  const onSend = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    sendMessage.mutate(body, {
      onError: (e) => {
        setDraft(body);
        Alert.alert('Mesaj gönderilemedi', e.message);
      },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}>
        {messages.isLoading ? (
          <StateView loading />
        ) : (
          <FlatList
            inverted
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const mine = item.sender_id === userId;
              return (
                <View
                  style={[
                    styles.bubble,
                    mine
                      ? [styles.mine, { backgroundColor: theme.primary }]
                      : [styles.theirs, { backgroundColor: theme.backgroundElement }],
                  ]}>
                  <ThemedText style={mine ? { color: theme.onPrimary } : undefined}>{item.body}</ThemedText>
                  <ThemedText
                    type="small"
                    style={[styles.time, { color: mine ? theme.onPrimary : theme.textSecondary }]}>
                    {formatTime(item.created_at)}
                  </ThemedText>
                </View>
              );
            }}
          />
        )}
        <SafeAreaView edges={['bottom']} style={[styles.composer, { borderTopColor: theme.border }]}>
          <TextField
            value={draft}
            onChangeText={setDraft}
            placeholder="Mesaj yazın"
            multiline
            style={styles.input}
          />
          <Pressable
            onPress={onSend}
            disabled={!draft.trim()}
            style={[styles.send, { backgroundColor: theme.primary, opacity: draft.trim() ? 1 : 0.5 }]}>
            <Ionicons name="send" size={18} color={theme.onPrimary} />
          </Pressable>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.two },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  mine: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  time: { fontSize: 11, lineHeight: 14, opacity: 0.8, alignSelf: 'flex-end' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, maxHeight: 120, paddingTop: 12 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
