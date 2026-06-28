import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { useNavigation } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';

const AVATAR_PALETTE = ['#2C7FD6','#199FB0','#E0785A','#7C6CD6','#27A869','#E2A437','#5C6B82'];
function getAvatarBg(name: string) {
  let h = 0; for (let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))>>>0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Counselor {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
}

interface Message {
  id: number;
  conversation_key: string;
  sender_role: string;
  sender_id: string;
  content: string;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function conversationKey(a: string, b: string) {
  return [a, b].sort().join('__');
}

function computeUnread(messages: Message[]) {
  const reversed = [...messages].reverse();
  const lastTeacherIdx = reversed.findIndex(m => m.sender_role === 'teacher');
  if (lastTeacherIdx === -1) return messages.filter(m => m.sender_role === 'counselor').length;
  return lastTeacherIdx;
}

function formatTime(v: string) {
  return new Date(v).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDay(v: string) {
  const d = new Date(v);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function TeacherMessagesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);

  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [messagesByKey, setMessagesByKey] = useState<Record<string, Message[]>>({});
  const [selectedCounselorId, setSelectedCounselorId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const totalUnread = Object.entries(messagesByKey).reduce(
    (sum, [, msgs]) => sum + computeUnread(msgs), 0
  );

  useEffect(() => {
    navigation.setOptions({ tabBarBadge: totalUnread > 0 ? totalUnread : undefined });
  }, [totalUnread, navigation]);

  const load = useCallback(async () => {
    if (!user?.id || !user?.schoolId) return;

    const { data: counselorData } = await supabase
      .from('profiles')
      .select('id,first_name,last_name,title')
      .eq('school_id', user.schoolId)
      .eq('role', 'counselor')
      .eq('approved', true);

    const list: Counselor[] = (counselorData ?? []).map(p => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      title: p.title ?? undefined,
    }));
    setCounselors(list);

    if (list.length === 0) { setLoading(false); return; }

    const keys = list.map(c => conversationKey(user.id, c.id));
    const { data: msgData } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_key', keys)
      .order('created_at', { ascending: true });

    const grouped: Record<string, Message[]> = {};
    keys.forEach(k => { grouped[k] = []; });
    (msgData ?? []).forEach(m => {
      if (grouped[m.conversation_key]) grouped[m.conversation_key].push(m as Message);
    });
    setMessagesByKey(grouped);
    setLoading(false);
  }, [user?.id, user?.schoolId]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription for selected thread
  useEffect(() => {
    if (!selectedCounselorId || !user?.id) return;

    const key = conversationKey(user.id, selectedCounselorId);

    channelRef.current = supabase
      .channel(`teacher_msgs_${key}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_key=eq.${key}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessagesByKey(prev => ({
            ...prev,
            [key]: [...(prev[key] ?? []), msg],
          }));
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedCounselorId, user?.id]);

  async function sendMessage() {
    if (!input.trim() || !selectedCounselorId || !user?.id || sending) return;
    const key = conversationKey(user.id, selectedCounselorId);
    const content = input.trim();
    setInput('');
    setSending(true);

    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_key: key, sender_id: user.id, sender_role: 'teacher', content })
      .select()
      .single();

    if (!error && data) {
      setMessagesByKey(prev => ({ ...prev, [key]: [...(prev[key] ?? []), data as Message] }));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
    setSending(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <Tabs.Screen options={{ tabBarBadge: undefined }} />
        <ActivityIndicator size="large" color="#1E73CE" />
      </SafeAreaView>
    );
  }

  // ── Thread view ──────────────────────────────────────────────────────────────
  if (selectedCounselorId) {
    const counselor = counselors.find(c => c.id === selectedCounselorId)!;
    const key = conversationKey(user!.id, selectedCounselorId);
    const messages = messagesByKey[key] ?? [];
    const counselorFullName = `${counselor.firstName} ${counselor.lastName}`;

    return (
      <SafeAreaView style={s.container}>
        <Tabs.Screen options={{ tabBarBadge: totalUnread > 0 ? totalUnread : undefined }} />

        <View style={s.threadHeader}>
          <TouchableOpacity onPress={() => setSelectedCounselorId(null)} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={[s.threadAvatar, { backgroundColor: getAvatarBg(counselorFullName) }]}>
            <Text style={s.threadAvatarText}>{counselor.firstName[0]}{counselor.lastName[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.threadName}>{counselorFullName}</Text>
            {counselor.title && <Text style={s.threadSub}>{counselor.title}</Text>}
          </View>
        </View>

        <KeyboardAvoidingView style={s.flex} behavior="padding">
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={m => String(m.id)}
            contentContainerStyle={s.messageList}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={s.emptyThread}>
                <Text style={s.muted}>No messages yet. Start the conversation!</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.sender_role === 'teacher';
              return (
                <View style={[s.msgRow, isMe ? s.msgRowRight : s.msgRowLeft]}>
                  <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
                    <Text style={[s.bubbleText, isMe && { color: '#fff' }]}>{item.content}</Text>
                    <Text style={[s.bubbleTime, isMe && { color: 'rgba(255,255,255,0.7)' }]}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

          <View style={s.inputBar}>
            <TextInput
              style={s.inputField}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message…"
              placeholderTextColor="#95A2B6"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!input.trim() || sending}
            >
              <Ionicons name="paper-plane" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Conversation list ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <Tabs.Screen options={{ tabBarBadge: totalUnread > 0 ? totalUnread : undefined }} />

      <View style={s.listHeader}>
        <Text style={s.listHeaderTitle}>Messages</Text>
        <Text style={s.listHeaderSub}>Counselors at your school</Text>
      </View>

      {counselors.length === 0 ? (
        <View style={s.center}>
          <Text style={s.muted}>No counselors registered at your school yet.</Text>
        </View>
      ) : (
        <FlatList
          data={counselors}
          keyExtractor={c => c.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const key = conversationKey(user!.id, item.id);
            const msgs = messagesByKey[key] ?? [];
            const lastMsg = msgs[msgs.length - 1];
            const unread = computeUnread(msgs);
            const fullName = `${item.firstName} ${item.lastName}`;

            return (
              <TouchableOpacity
                style={s.convCard}
                onPress={() => setSelectedCounselorId(item.id)}
              >
                <View style={[s.avatar, { backgroundColor: getAvatarBg(fullName) }]}>
                  <Text style={s.avatarText}>{item.firstName[0]}{item.lastName[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.convRow}>
                    <Text style={s.convName}>{fullName}</Text>
                    {lastMsg && <Text style={s.convTime}>{formatDay(lastMsg.created_at)}</Text>}
                  </View>
                  {item.title && (
                    <Text style={[s.muted, { fontSize: 12 }]}>{item.title}</Text>
                  )}
                  {lastMsg && (
                    <Text style={s.lastMsg} numberOfLines={1}>
                      {lastMsg.sender_role === 'teacher' ? 'You: ' : ''}{lastMsg.content}
                    </Text>
                  )}
                </View>
                {unread > 0 && (
                  <View style={s.unreadBadge}>
                    <Text style={s.unreadText}>{unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7FB' },
  muted: { fontSize: 13, fontFamily: 'PublicSans_500Medium', color: '#64728A' },
  listHeader: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  listHeaderTitle: { fontSize: 18, fontFamily: 'Manrope_700Bold', color: '#17233D' },
  listHeaderSub: { fontSize: 12, fontFamily: 'PublicSans_500Medium', color: '#64728A', marginTop: 2 },
  convCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E6EBF2',
    shadowColor: '#142850', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 15 },
  convRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  convName: { fontSize: 15, fontFamily: 'PublicSans_600SemiBold', color: '#17233D' },
  convTime: { fontSize: 12, fontFamily: 'PublicSans_500Medium', color: '#95A2B6' },
  lastMsg: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: '#64728A', marginTop: 2 },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 999, paddingHorizontal: 5, backgroundColor: '#E0785A',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 2, borderColor: '#fff',
  },
  unreadText: { color: '#fff', fontFamily: 'PublicSans_700Bold', fontSize: 10 },
  threadHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  backBtn: { paddingRight: 4 },
  backText: { fontSize: 15, fontFamily: 'PublicSans_600SemiBold', color: '#1E73CE' },
  threadAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  threadAvatarText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 13 },
  threadName: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: '#17233D' },
  threadSub: { fontSize: 12, fontFamily: 'PublicSans_400Regular', color: '#64728A' },
  messageList: { padding: 16, paddingBottom: 8 },
  emptyThread: { flex: 1, alignItems: 'center', paddingTop: 40 },
  msgRow: { marginBottom: 10, flexDirection: 'row' },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: '#1E73CE', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E6EBF2' },
  bubbleText: { fontSize: 15, fontFamily: 'PublicSans_400Regular', color: '#17233D', lineHeight: 21 },
  bubbleTime: { fontSize: 11, fontFamily: 'PublicSans_500Medium', color: '#64728A', marginTop: 4, textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E6EBF2' },
  inputField: { flex: 1, borderWidth: 1, borderColor: '#E6EBF2', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: 'PublicSans_400Regular', color: '#17233D', maxHeight: 100, backgroundColor: '#F4F7FB' },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#1E73CE', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1E73CE', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.34, shadowRadius: 18, elevation: 8,
  },
  sendBtnDisabled: { opacity: 0.35 },
});
