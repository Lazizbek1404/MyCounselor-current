import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_INPUT = 2000;

const SUGGESTED_PROMPTS = [
  'Help me write my college essay',
  'What careers match my interests?',
  'How do I manage school stress?',
  'Tips for scholarship applications',
  'How to choose the right major?',
  'I need help with time management',
];

// Animated three-dot typing indicator
function TypingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - i * 150),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.dotsRow}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[styles.dot, { opacity: dot, transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]}
        />
      ))}
    </View>
  );
}

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    if (!API_URL) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'API URL is not configured. Add EXPO_PUBLIC_API_URL to mobile/.env.',
        isError: true,
      }]);
      return;
    }

    const userMessage: Message = { role: 'user', content };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput('');
    setStreaming(true);
    setIsTyping(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      let token: string | undefined;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      } catch { /* no-op */ }

      const response = await fetch(`${API_URL}/api/ai-counselor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: updated.map(({ role, content: c }) => ({ role, content: c })),
          userContext: { firstName: user?.firstName, gradeLevel: user?.gradeLevel },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        setMessages(prev => [...prev, { role: 'assistant', content: err.error ?? 'Something went wrong.', isError: true }]);
        return;
      }

      if (!response.body) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'No response received.', isError: true }]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      setIsTyping(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant') {
            copy[copy.length - 1] = { role: 'assistant', content: assistantContent };
          }
          return copy;
        });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      setIsTyping(false);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: isAbort ? 'Request timed out. Please try again.' : 'Failed to connect. Make sure the API URL is configured.',
        isError: true,
      }]);
    } finally {
      setStreaming(false);
      setIsTyping(false);
    }
  }, [input, messages, streaming, user]);

  function clearChat() {
    Alert.alert('Clear Chat', 'Start a new conversation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setMessages([]) },
    ]);
  }

  function renderItem({ item }: { item: Message }) {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAI]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>AI</Text>
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble,
          item.isError && styles.errorBubble,
        ]}>
          {!isUser && (
            <Text style={styles.aiLabel}>AI Counselor</Text>
          )}
          <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  }

  const charsLeft = MAX_INPUT - input.length;
  const charsNearLimit = charsLeft < 200;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>AI</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Counselor</Text>
            <View style={styles.headerStatusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.headerStatus}>Online · Powered by Claude</Text>
            </View>
          </View>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          contentContainerStyle={[styles.messageList, messages.length === 0 && styles.messageListEmpty]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyAvatar}>
                <Text style={styles.emptyAvatarText}>AI</Text>
              </View>
              <Text style={styles.emptyTitle}>
                Hi{user?.firstName ? `, ${user.firstName}` : ''}! 👋
              </Text>
              <Text style={styles.emptySubtitle}>
                I'm your AI school counselor. Ask me anything about college planning, careers, or school life.
              </Text>
              <Text style={styles.suggestedLabel}>Suggested questions</Text>
              <View style={styles.promptsGrid}>
                {SUGGESTED_PROMPTS.map(prompt => (
                  <TouchableOpacity
                    key={prompt}
                    style={styles.promptChip}
                    onPress={() => sendMessage(prompt)}
                  >
                    <Text style={styles.promptChipText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={
            isTyping ? (
              <View style={styles.messageRow}>
                <View style={styles.aiAvatar}>
                  <Text style={styles.aiAvatarText}>AI</Text>
                </View>
                <View style={[styles.bubble, styles.aiBubble, styles.typingBubble]}>
                  <TypingDots />
                </View>
              </View>
            ) : null
          }
        />

        {/* Input area */}
        <View style={styles.inputWrapper}>
          {charsNearLimit && (
            <Text style={[styles.charCount, charsLeft < 50 && styles.charCountRed]}>
              {charsLeft} characters left
            </Text>
          )}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Ask your AI counselor…"
              placeholderTextColor="#95A2B6"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={MAX_INPUT}
              blurOnSubmit={false}
              onKeyPress={(e: any) => {
                const { key, ctrlKey, shiftKey } = e.nativeEvent;
                if (key === 'Enter' && !ctrlKey && !shiftKey) {
                  e.preventDefault?.();
                  sendMessage();
                } else if (key === 'Enter' && ctrlKey) {
                  e.preventDefault?.();
                  setInput(prev => prev + '\n');
                }
              }}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!input.trim() || streaming) && styles.sendButtonDisabled]}
              onPress={() => sendMessage()}
              disabled={!input.trim() || streaming}
            >
              <Ionicons name="paper-plane" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.inputHint}>Enter to send · Ctrl+Enter for new line</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EBF2',
    shadowColor: '#142850',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E73CE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 14 },
  headerTitle: { fontSize: 16, fontFamily: 'Manrope_700Bold', color: '#17233D' },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#27A869' },
  headerStatus: { fontSize: 12, fontFamily: 'PublicSans_400Regular', color: '#64728A' },
  clearButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6EBF2',
  },
  clearButtonText: { fontSize: 13, fontFamily: 'PublicSans_500Medium', color: '#64728A' },

  // Messages
  messageList: { padding: 16, paddingBottom: 8 },
  messageListEmpty: { flexGrow: 1 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAI: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E73CE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    flexShrink: 0,
  },
  aiAvatarText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 10 },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#1E73CE',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#142850',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  errorBubble: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  typingBubble: { paddingVertical: 14, paddingHorizontal: 16 },
  aiLabel: {
    fontSize: 10,
    fontFamily: 'PublicSans_700Bold',
    color: '#1E73CE',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bubbleText: { fontSize: 15, fontFamily: 'PublicSans_400Regular', color: '#17233D', lineHeight: 22 },
  userBubbleText: { color: '#fff' },

  // Typing dots
  dotsRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8FBDEC' },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  emptyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E73CE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#1E73CE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyAvatarText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 20 },
  emptyTitle: { fontSize: 22, fontFamily: 'Manrope_700Bold', color: '#17233D', marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'PublicSans_400Regular',
    color: '#64728A',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  suggestedLabel: {
    fontSize: 12,
    fontFamily: 'PublicSans_700Bold',
    color: '#95A2B6',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  promptsGrid: { width: '100%', gap: 8 },
  promptChip: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E6EBF2',
    shadowColor: '#142850',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  promptChipText: { fontSize: 14, fontFamily: 'PublicSans_500Medium', color: '#2C7FD6' },

  // Input
  inputWrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E6EBF2',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  charCount: { fontSize: 11, fontFamily: 'PublicSans_500Medium', color: '#95A2B6', textAlign: 'right', marginBottom: 4 },
  charCountRed: { color: '#E5483B' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  textInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E6EBF2',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'PublicSans_400Regular',
    color: '#17233D',
    backgroundColor: '#F4F7FB',
    maxHeight: 120,
    lineHeight: 22,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E73CE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E73CE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 8,
  },
  sendButtonDisabled: { opacity: 0.35 },
  inputHint: { fontSize: 11, fontFamily: 'PublicSans_500Medium', color: '#c3c8d4', textAlign: 'center', marginTop: 5 },
});
