import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const REQUEST_TIMEOUT_MS = 30_000;

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    if (!API_URL) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'API URL is not configured. Add EXPO_PUBLIC_API_URL to mobile/.env.',
      }]);
      return;
    }

    const userMessage: Message = { role: 'user', content: text };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput('');
    setStreaming(true);

    // Cancel any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      // Attach Supabase session token so the API can verify the request
      let token: string | undefined;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      } catch { /* no-op — request will be rejected as unauthorized */ }

      const response = await fetch(`${API_URL}/api/ai-counselor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: updated,
          userContext: {
            firstName: user?.firstName,
            gradeLevel: user?.gradeLevel,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        setMessages(prev => [...prev, { role: 'assistant', content: err.error ?? 'Something went wrong.' }]);
        return;
      }

      if (!response.body) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'No response received.' }]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

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
      const isAbort = err instanceof Error && err.name === 'AbortError';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: isAbort
          ? 'Request timed out. Please try again.'
          : 'Failed to connect. Make sure the API URL is configured.',
      }]);
    } finally {
      setStreaming(false);
    }
  }, [input, messages, streaming, user]);

  function renderItem({ item }: { item: Message }) {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && <Text style={styles.aiLabel}>AI Counselor</Text>}
        <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
          {item.content}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>AI Counselor</Text>
        <Text style={styles.topBarSub}>Powered by Claude</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Ask me anything</Text>
              <Text style={styles.emptyText}>
                I can help with college planning, course selection, career exploration, and more.
              </Text>
            </View>
          }
        />

        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder="Type a message…"
            placeholderTextColor="#9ca3af"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
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
              // Shift+Enter: browser inserts newline natively
            }}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || streaming) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || streaming}
          >
            {streaming ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  flex: {
    flex: 1,
  },
  topBar: {
    backgroundColor: '#1e40af',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  topBarSub: {
    fontSize: 12,
    color: '#bfdbfe',
    marginTop: 1,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1e40af',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  aiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bubbleText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
  },
  userBubbleText: {
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: '#1e40af',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
