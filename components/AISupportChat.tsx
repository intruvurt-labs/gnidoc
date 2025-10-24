import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
  Easing,
} from 'react-native';
import { X, Send, Bot, User as UserIcon, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useRorkAgent } from '@rork/toolkit-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height } = Dimensions.get("window");

const uid = (p = "") => {
  try {
    // @ts-ignore
    if (globalThis?.crypto?.randomUUID) return p + globalThis.crypto.randomUUID();
  } catch {}
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `${p}${t}-${r}`;
};

const HISTORY_CAP = 400 as const;
const SAVE_DEBOUNCE_MS = 350 as const;
const MAX_TOPICS_PER_SESSION = 12 as const;
const MAX_MESSAGES = HISTORY_CAP as const;

const safeJSONParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
};

async function enqueueEscalation(payload: { sessionId: string; lastMessage?: string; tier: string }) {
  try {
    await fetch('https://your.api/support/escalate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SessionMemory {
  sessionId: string;
  startTime: string | Date;
  endTime?: string | Date;
  messageCount: number;
  topics: string[];
  resolvedIssues: string[];
  pendingIssues: string[];
}

interface ExtendedMemory {
  sessions: SessionMemory[];
  userPreferences: Record<string, any>;
  commonIssues: string[];
  lastInteraction: string | Date;
}

interface AISupportChatProps {
  userTier?: 'free' | 'starter' | 'professional' | 'premium';
}

const STORAGE_KEYS = {
  CHAT: 'ai-support-chat-history',
  MEMORY: 'ai-support-extended-memory',
} as const;

export default function AISupportChat({ userTier = 'free' }: AISupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [escalated, setEscalated] = useState(false);
  const [assistantReplies, setAssistantReplies] = useState(0);
  const [extendedMemory, setExtendedMemory] = useState<ExtendedMemory | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [bootstrappedFromMemory, setBootstrappedFromMemory] = useState(false);
  const [sending, setSending] = useState(false);

  const currentSessionId = useMemo(() => `session-${Date.now()}`, []);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { messages, sendMessage, error, setMessages } = useRorkAgent({ tools: {} });

  const isPaidTier = useMemo(
    () => userTier === 'professional' || userTier === 'premium',
    [userTier]
  );

  const buildContextFromMemory = useCallback((memory: ExtendedMemory): string => {
    const recentSessions = memory.sessions.slice(-3);
    let context = 'Context from previous sessions:\n';
    recentSessions.forEach((session, idx) => {
      const startedAt = new Date(session.startTime).toLocaleDateString();
      context += `\nSession ${idx + 1} (${startedAt}):\n`;
      if (session.topics?.length) context += `- Topics discussed: ${session.topics.join(', ')}\n`;
      if (session.resolvedIssues?.length) context += `- Resolved: ${session.resolvedIssues.join(', ')}\n`;
      if (session.pendingIssues?.length) context += `- Still pending: ${session.pendingIssues.join(', ')}\n`;
    });
    if (memory.commonIssues?.length) {
      context += `\nCommon issues: ${memory.commonIssues.join(', ')}\n`;
    }
    return context;
  }, []);

  const extractTopics = (content: string): string[] => {
    const topics: string[] = [];
    const keywords = [
      'deployment', 'error', 'bug', 'feature', 'authentication', 'database',
      'api', 'ui', 'performance', 'security', 'testing', 'build', 'configuration',
    ];
    const lower = content.toLowerCase();
    for (const k of keywords) if (lower.includes(k)) topics.push(k);
    return topics;
  };

  const loadConversationHistory = useCallback(async () => {
    let mounted = true;
    try {
      const [stored, memoryStored] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CHAT),
        AsyncStorage.getItem(STORAGE_KEYS.MEMORY),
      ]);

      const history = safeJSONParse<any[]>(stored, []);
      const normalized = Array.isArray(history) ? history.slice(-MAX_MESSAGES) : [];

      const memory = safeJSONParse<ExtendedMemory>(memoryStored, {
        sessions: [],
        userPreferences: {},
        commonIssues: [],
        lastInteraction: new Date().toISOString(),
      });

      if (!mounted) return;
      setMessages(normalized);
      setExtendedMemory(memory);
      setSessionCount(memory.sessions?.length ?? 0);
    } catch (err) {
      console.error('[AISupportChat] Failed to load history/memory:', err);
    }
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    loadConversationHistory();
  }, [loadConversationHistory]);

  // Bootstrap a short context message once memory is loaded and we have prior sessions
  useEffect(() => {
    const maybeBootstrap = async () => {
      if (!extendedMemory || bootstrappedFromMemory) return;
      if ((extendedMemory.sessions?.length ?? 0) < 2) return;
      try {
        const ctx = buildContextFromMemory(extendedMemory);
        await sendMessage(`(context)\n${ctx}`);
        setBootstrappedFromMemory(true);
      } catch (e) {
        console.error('[AISupportChat] Failed to send memory context:', e);
      }
    };
    void maybeBootstrap();
  }, [extendedMemory, bootstrappedFromMemory, buildContextFromMemory, sendMessage]);

  const debouncedSave = useRef<NodeJS.Timeout | null>(null);
  const saveConversationHistory = useCallback(async (msgs: any[]) => {
    try {
      if (debouncedSave.current) clearTimeout(debouncedSave.current);
      const trimmed = msgs.slice(-HISTORY_CAP);
      debouncedSave.current = setTimeout(() => {
        AsyncStorage.setItem(STORAGE_KEYS.CHAT, JSON.stringify(trimmed)).catch(() => {});
      }, SAVE_DEBOUNCE_MS);
    } catch (err) {
      console.error('[AISupportChat] Persist chat failed:', err);
    }
  }, []);
  useEffect(() => () => { if (debouncedSave.current) clearTimeout(debouncedSave.current); }, []);

  const clearConversationHistory = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CHAT);
      setMessages([]);
      setLocalMessages([]);
    } catch (err) {
      console.error('[AISupportChat] Clear chat failed:', err);
    }
  }, [setMessages]);

  const updateExtendedMemory = useCallback(
    async (newMessage: Message) => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.MEMORY);
        const memory: ExtendedMemory =
          stored
            ? JSON.parse(stored)
            : { sessions: [], userPreferences: {}, commonIssues: [], lastInteraction: new Date().toISOString() };

        let current = memory.sessions.find(s => s.sessionId === currentSessionId);
        if (!current) {
          current = {
            sessionId: currentSessionId,
            startTime: new Date().toISOString(),
            messageCount: 0,
            topics: [],
            resolvedIssues: [],
            pendingIssues: [],
          };
          memory.sessions.push(current);
        }

        current.messageCount += 1;
        current.endTime = new Date().toISOString();

        for (const t of extractTopics(newMessage.content)) {
          if (!current.topics.includes(t)) current.topics.push(t);
        }
        if (current.topics.length > MAX_TOPICS_PER_SESSION) {
          current.topics = current.topics.slice(-MAX_TOPICS_PER_SESSION);
        }

        memory.lastInteraction = new Date().toISOString();
        await AsyncStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(memory));
        setExtendedMemory(memory);
      } catch (err) {
        console.error('[AISupportChat] Update memory failed:', err);
      }
    },
    [currentSessionId]
  );

  const isUnsolvable = useCallback((text: string) => {
    const lower = text.toLowerCase();
    const hints = [
      'cannot assist', "can\'t assist", 'unsure', 'not sure', 'cannot help',
      'need a human', 'contact support', 'do not have enough information',
      'unable to', 'cannot perform', 'requires human',
    ];
    return hints.some(h => lower.includes(h));
  }, []);

  // Convert SDK messages -> renderable local messages; track escalation trigger
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const converted: Message[] = messages.map((m: any) => ({
      id: m.id,
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: (m.parts || [])
        .filter((p: any) => p?.type === 'text')
        .map((p: any) => p.text)
        .join('\n'),
      timestamp: new Date(),
    }));

    setLocalMessages(converted);
    saveConversationHistory(messages);

    const latest = converted[converted.length - 1];
    if (latest) {
      void updateExtendedMemory(latest);
      if (latest.role === 'assistant') {
        setAssistantReplies(prev => {
          const next = prev + 1;
          if (!escalated && isPaidTier && prev === 0 && isUnsolvable(latest.content)) {
            handleEscalate(true);
          }
          return next;
        });
      }
    }
  }, [messages, saveConversationHistory, updateExtendedMemory, isPaidTier, escalated, isUnsolvable]);

  // Animations for FAB / sheet
  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: height, duration: 300, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen, slideAnim, scaleAnim]);

  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);
const startPulse = () => {
  try { pulseRef.current?.stop(); } catch {}
  pulseRef.current = Animated.timing(pulseAnim, {
    toValue: 1.05,
    duration: 1200,
    easing: Easing.inOut(Easing.quad),
    useNativeDriver: true,
  });
  pulseRef.current.start(({ finished }) => {
    if (finished) {
      pulseAnim.setValue(1);
    }
  });
};
useEffect(() => {
  if (isOpen) return;
  const loop = Animated.loop(
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ])
  );
  loop.start();
  return () => {
    try { loop.stop(); } catch {}
    try { pulseRef.current?.stop(); } catch {}
    pulseAnim.setValue(1);
  };
}, [isOpen, pulseAnim]);

  const handleSend = useCallback(async () => {
    if (sending) return;
    const text = inputMessage.trim();
    if (!text) return;

    if (!isPaidTier) {
      const userMsgCount = localMessages.filter(m => m.role === 'user').length;
      if (userMsgCount >= 5) {
        setLocalMessages(prev => [
          ...prev,
          {
            id: uid('msg_'),
            role: 'assistant',
            content:
              '⚠️ Free tier users are limited to 5 messages per session. Upgrade to Professional or Premium to get unlimited AI support and escalate to live human help!',
            timestamp: new Date(),
          },
        ]);
        return;
      }
    }

    try {
      setSending(true);
      setInputMessage('');
      startPulse();
      await sendMessage(text);
    } finally {
      setSending(false);
    }
  }, [sending, inputMessage, isPaidTier, localMessages, sendMessage]);

  const handleEscalate = useCallback((auto?: boolean) => {
    if (!isPaidTier) {
      setLocalMessages(prev => [
        ...prev,
        {
          id: uid('msg_'),
          role: 'assistant',
          content:
            '🔒 Live human support is only available for Professional and Premium tier members. Upgrade your plan to get 24/7 priority support from our expert team!',
          timestamp: new Date(),
        },
      ]);
      return;
    }
    if (escalated) return;

    setEscalated(true);
    setLocalMessages(prev => [
      ...prev,
      {
        id: uid('msg_'),
        role: 'assistant',
        content: auto
          ? '🤖 Couldn’t confidently resolve this after the first attempt. Escalating you to a human expert now...'
          : '✅ Escalating to live human support... A support specialist will join this chat shortly. Please describe your issue in detail.',
        timestamp: new Date(),
      },
    ]);

    void enqueueEscalation({
      sessionId: currentSessionId,
      lastMessage: localMessages.at(-1)?.content,
      tier: userTier,
    });
  }, [isPaidTier, escalated, currentSessionId, localMessages, userTier]);

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        <View style={styles.messageHeader}>
          {isUser ? (
            <UserIcon color={Colors.Colors.cyan.primary} size={16} />
          ) : (
            <Bot color={Colors.Colors.red.primary} size={16} />
          )}
          <Text style={styles.messageRole}>{isUser ? 'You' : 'AI Support'}</Text>
        </View>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text
            style={[styles.messageText, isUser ? styles.userMessageText : styles.assistantMessageText]}
          >
            {message.content}
          </Text>
        </View>
        <Text style={styles.messageTime}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Animated.View
          style={[styles.floatingButton, { transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }] }]}
        >
          <TouchableOpacity
            style={styles.floatingButtonInner}
            onPress={() => setIsOpen(true)}
            activeOpacity={0.8}
            testID="ai-support-fab"
          >
            <Image
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ken0crpsd66fnl9p3xtc3' }}
              style={styles.fabImage}
              resizeMode="contain"
            />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>SUPPORT</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <Animated.View style={[styles.chatContainer, { transform: [{ translateY: slideAnim }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.chatContent}>
            {/* Header */}
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                <View style={styles.botAvatar}>
                  <Bot color={Colors.Colors.text.inverse} size={20} />
                </View>
                <View>
                  <Text style={styles.chatTitle}>AI Support</Text>
                  <Text style={styles.chatSubtitle}>
                    {isPaidTier ? '24/7 Priority Support' : 'Automated Support'}
                  </Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.iconButton} onPress={clearConversationHistory}>
                  <Trash2 color={Colors.Colors.text.muted} size={20} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeButton} onPress={() => setIsOpen(false)}>
                  <X color={Colors.Colors.text.primary} size={24} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages */}
            <FlatList
              data={[...localMessages].reverse()}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderMessage(item)}
              inverted
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.welcomeContainer}>
                  <Bot color={Colors.Colors.cyan.primary} size={48} />
                  <Text style={styles.welcomeTitle}>Hi! I&apos;m your AI Support Assistant</Text>
                  <Text style={styles.welcomeText}>
                    I can help you with:
                    {'\n'}• Troubleshooting errors
                    {'\n'}• Understanding features
                    {'\n'}• Coding best practices
                    {'\n'}• IDE and terminal guidance
                  </Text>
                  {sessionCount >= 2 && (
                    <Text style={styles.welcomeMemory}>
                      🧠 I remember our last {sessionCount} sessions and can reference previous discussions!
                    </Text>
                  )}
                  {isPaidTier && (
                    <Text style={styles.welcomePremium}>
                      ⭐ As a {userTier} member, you can escalate to live human support anytime!
                    </Text>
                  )}
                </View>
              }
              ListFooterComponent={error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠️ Connection error. Please try again.</Text>
                </View>
              ) : null}
              testID="ai-support-messages"
            />

            {/* Actions */}
            {isPaidTier && (
              <View style={styles.actionsBar}>
                <TouchableOpacity style={styles.escalateButton} onPress={() => handleEscalate()}>
                  <Text style={styles.escalateButtonText}>🆘 Escalate to Human Support</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputMessage}
                onChangeText={setInputMessage}
                placeholder="Type your message..."
                placeholderTextColor={Colors.Colors.text.muted}
                multiline
                maxLength={500}
                testID="ai-support-input"
              />
              <TouchableOpacity
                style={[styles.sendButton, (!inputMessage.trim() || sending) && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!inputMessage.trim() || sending}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                accessibilityState={{ disabled: !inputMessage.trim() || sending }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                testID="ai-support-send"
              >
                <Send
                  color={inputMessage.trim() ? Colors.Colors.text.inverse : Colors.Colors.text.muted}
                  size={20}
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: { position: 'absolute', bottom: 110, right: 20, zIndex: 9997, elevation: 10 },
  floatingButtonInner: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.Colors.background.card,
    justifyContent: 'center', alignItems: 'center', shadowColor: Colors.Colors.cyan.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.8, shadowRadius: 16, elevation: 12, overflow: 'hidden',
    borderWidth: 3, borderColor: Colors.Colors.cyan.primary,
  },
  badge: {
    position: 'absolute', bottom: -4, backgroundColor: Colors.Colors.red.primary, borderRadius: 12,
    paddingHorizontal: 6, paddingVertical: 2, borderWidth: 2, borderColor: Colors.Colors.background.primary,
    shadowColor: Colors.Colors.red.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8,
    shadowRadius: 6, elevation: 8,
  },
  badgeText: { color: Colors.Colors.text.inverse, fontSize: 8, fontWeight: 'bold', letterSpacing: 0.5 },
  chatContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.75,
    backgroundColor: Colors.Colors.background.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 20, zIndex: 10000,
  },
  chatContent: { flex: 1 },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.Colors.border.muted,
  },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  botAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.Colors.cyan.primary, justifyContent: 'center',
    alignItems: 'center', borderWidth: 2, borderColor: Colors.Colors.cyan.secondary,
    shadowColor: Colors.Colors.cyan.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 8,
    elevation: 6,
  },
  chatTitle: {
    fontSize: 16, fontWeight: 'bold', color: Colors.Colors.cyan.primary,
    textShadowColor: Colors.Colors.cyan.glow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  chatSubtitle: { fontSize: 12, color: Colors.Colors.text.muted },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { padding: 8 },
  closeButton: { padding: 8 },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, gap: 16 },
  welcomeContainer: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  welcomeTitle: {
    fontSize: 18, fontWeight: 'bold', color: Colors.Colors.cyan.primary, marginTop: 16, marginBottom: 12, textAlign: 'center',
    textShadowColor: Colors.Colors.cyan.glow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  welcomeText: { fontSize: 14, color: Colors.Colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  welcomePremium: { fontSize: 13, color: Colors.Colors.warning, textAlign: 'center', marginTop: 16, fontWeight: '600' },
  welcomeMemory: {
    fontSize: 13, color: Colors.Colors.cyan.primary, textAlign: 'center', marginTop: 12, fontWeight: '600',
    backgroundColor: Colors.Colors.cyan.primary + '15', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
  },
  messageContainer: { marginBottom: 16 },
  userMessageContainer: { alignItems: 'flex-end' },
  assistantMessageContainer: { alignItems: 'flex-start' },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  messageRole: { fontSize: 12, fontWeight: '600', color: Colors.Colors.text.secondary },
  messageBubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  userBubble: { backgroundColor: Colors.Colors.cyan.primary, borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: Colors.Colors.background.card, borderWidth: 1, borderColor: Colors.Colors.border.strong ?? Colors.Colors.border.muted, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, lineHeight: 20 },
  userMessageText: { color: Colors.Colors.text.inverse },
  assistantMessageText: { color: Colors.Colors.text.primary },
  messageTime: { fontSize: 10, color: Colors.Colors.text.muted, marginTop: 4 },
  errorContainer: { backgroundColor: Colors.Colors.error + '20', borderRadius: 8, padding: 12, marginVertical: 8 },
  errorText: { color: Colors.Colors.error, fontSize: 13, textAlign: 'center' },
  actionsBar: { paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.Colors.border.muted },
  escalateButton: {
    backgroundColor: Colors.Colors.orange.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center',
    borderWidth: 2, borderColor: Colors.Colors.orange.secondary, shadowColor: Colors.Colors.orange.primary,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  escalateButtonText: { color: Colors.Colors.text.inverse, fontSize: 14, fontWeight: '600' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: Colors.Colors.border.muted, gap: 12,
  },
  input: {
    flex: 1, backgroundColor: Colors.Colors.background.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: Colors.Colors.text.primary, maxHeight: 120, borderWidth: 1, borderColor: Colors.Colors.border.muted,
  },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.Colors.cyan.primary, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: Colors.Colors.background.secondary },
  fabImage: { width: 60, height: 60 },
});
