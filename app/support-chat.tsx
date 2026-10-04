import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api-fetch';
import { useTheme } from '@/lib/theme-context';

const RED = '#D62828';
const POLL_MS = 5000;

type Message = { id: number; sender: 'user' | 'admin'; body: string; image_url: string | null; created_at: string };
type Attachment = { uri: string; base64: string; ext: string };

// One screen, two roles. A regular user chats with the admin on /support-chat.
// The admin opens it from the inbox with ?userId=… to reply to that user's thread.
export default function SupportChatScreen() {
  const { userId, name } = useLocalSearchParams<{ userId?: string; name?: string }>();
  const isAdminView = !!userId;
  const endpoint = isAdminView ? `/api/admin/support/${userId}` : '/api/support';
  const mine: Message['sender'] = isAdminView ? 'admin' : 'user';

  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(endpoint);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages((prev) =>
          prev.length === data.length && prev[prev.length - 1]?.id === data[data.length - 1]?.id ? prev : data
        );
      }
    } catch {
      // Keep whatever is on screen; the next poll will retry.
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('profile_screen.avatar_permission_title'), t('profile_screen.avatar_permission_message'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;
    const asset = result.assets[0];
    setAttachment({ uri: asset.uri, base64: asset.base64!, ext: asset.uri.split('.').pop()?.toLowerCase() || 'jpg' });
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && !attachment) || sending) return;
    setSending(true);
    try {
      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ body, base64: attachment?.base64, fileExt: attachment?.ext }),
      });
      if (!res.ok) {
        Alert.alert(t('common.failed'), t('support_screen.send_failed'));
        return;
      }
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setText('');
      setAttachment(null);
    } catch {
      Alert.alert(t('common.failed'), t('common.connection_error'));
    } finally {
      setSending(false);
    }
  };

  const title = isAdminView ? name || t('support_screen.user') : t('support_screen.title');

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 14, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={RED} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="chatbubbles-outline" size={44} color={colors.subtext} />
              <Text style={[styles.emptyText, { color: colors.subtext }]}>
                {isAdminView ? t('support_screen.empty_admin') : t('support_screen.empty')}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.sender === mine;
            return (
              <View style={[styles.bubble, isMine ? styles.bubbleMine : [styles.bubbleTheirs, { backgroundColor: colors.card }]]}>
                {item.image_url && (
                  <Image source={{ uri: item.image_url }} style={styles.bubbleImage} contentFit="cover" />
                )}
                {!!item.body && (
                  <Text style={[styles.bubbleText, { color: isMine ? '#fff' : colors.text }]}>{item.body}</Text>
                )}
                <Text style={[styles.bubbleTime, { color: isMine ? 'rgba(255,255,255,0.75)' : colors.subtext }]}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />
      )}

      {attachment && (
        <View style={[styles.previewRow, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Image source={{ uri: attachment.uri }} style={styles.previewImg} contentFit="cover" />
          <TouchableOpacity style={styles.previewRemove} onPress={() => setAttachment(null)}>
            <Ionicons name="close" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 10, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.photoBtn} onPress={pickImage} disabled={sending}>
          <Ionicons name="image-outline" size={24} color={RED} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
          value={text}
          onChangeText={setText}
          placeholder={t('support_screen.placeholder')}
          placeholderTextColor={colors.subtext}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, ((!text.trim() && !attachment) || sending) && { opacity: 0.5 }]}
          onPress={send}
          disabled={(!text.trim() && !attachment) || sending}
        >
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40, paddingTop: 80 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  list: { padding: 16, gap: 8, flexGrow: 1 },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: RED, borderBottomRightRadius: 4 },
  bubbleTheirs: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 4 },
  previewRow: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  previewImg: { width: 72, height: 72, borderRadius: 10 },
  previewRemove: { position: 'absolute', top: 4, left: 78, width: 20, height: 20, borderRadius: 10, backgroundColor: '#444', alignItems: 'center', justifyContent: 'center' },
  photoBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTime: { fontSize: 10, marginTop: 3, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 110, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' },
});
