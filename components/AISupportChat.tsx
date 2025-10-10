import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { X, Send, Bot, User as UserIcon, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useRorkAgent } from '@rork/toolkit-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height } = Dimensions.get('window');

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SessionMemory {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  topics: string[];
  resolvedIssues: string[];
  pendingIssues: string[];
}

interface ExtendedMemory {
  sessions: SessionMemory[];
  userPreferences: Record<string, any>;
  commonIssues: string[];
  lastInteraction: Date;
}

interface AISupportChatProps {
  userTier?: 'free' | 'starter' | 'professional' | 'premium';
}

export default function AISupportChat({ userTier = 'free' }: AISupportChatProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [escalated, setEscalated] = useState<boolean>(false);
  const [assistantReplies, setAssistantReplies] = useState<number>(0);
  const [currentSessionId] = useState<string>(() => `session-${Date.now()}`);
  const [extendedMemory, setExtendedMemory] = useState<ExtendedMemory | null>(null);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const { messages, sendMessage, error, setMessages } = useRorkAgent({
    tools: {},
  });

  const loadConversationHistory = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('ai-support-chat-history');
      if (stored) {
        const history = JSON.parse(stored);
        setMessages(history);
        console.log('[AISupportChat] Loaded conversation history:', history.length, 'messages');
      }

      const memoryStored = await AsyncStorage.getItem('ai-support-extended-memory');
      if (memoryStored) {
        const memory: ExtendedMemory = JSON.parse(memoryStored);
        setExtendedMemory(memory);
        setSessionCount(memory.sessions.length);
        console.log('[AISupportChat] Loaded extended memory:', memory.sessions.length, 'sessions');

        if (memory.sessions.length >= 2) {
          const contextMessage = buildContextFromMemory(memory);
          console.log('[AISupportChat] Building context from', memory.sessions.length, 'previous sessions');
          await sendMessage(contextMessage);
        }
      }
    } catch (err) {
      console.error('[AISupportChat] Failed to load conversation history:', err);
    }
  }, [setMessages]);

  const buildContextFromMemory = (memory: ExtendedMemory): string => {
    const recentSessions = memory.sessions.slice(-3);
    let context = 'Context from previous sessions:\n';
    
    recentSessions.forEach((session, idx) => {
      context += `\nSession ${idx + 1} (${new Date(session.startTime).toLocaleDateString()}):\n`;
      context += `- Topics discussed: ${session.topics.join(', ')}\n`;
      if (session.resolvedIssues.length > 0) {
        context += `- Resolved: ${session.resolvedIssues.join(', ')}\n`;
      }
      if (session.pendingIssues.length > 0) {
        context += `- Still pending: ${session.pendingIssues.join(', ')}\n`;
      }
    });

    if (memory.commonIssues.length > 0) {
      context += `\nCommon issues: ${memory.commonIssues.join(', ')}\n`;
    }

    return context;
  };

  const updateExtendedMemory = async (newMessage: Message) => {
    try {
      const memoryStored = await AsyncStorage.getItem('ai-support-extended-memory');
      let memory: ExtendedMemory = memoryStored
        ? JSON.parse(memoryStored)
        : {
            sessions: [],
            userPreferences: {},
            commonIssues: [],
            lastInteraction: new Date(),
          };

      let currentSession = memory.sessions.find(s => s.sessionId === currentSessionId);
      if (!currentSession) {
        currentSession = {
          sessionId: currentSessionId,
          startTime: new Date(),
          messageCount: 0,
          topics: [],
          resolvedIssues: [],
          pendingIssues: [],
        };
        memory.sessions.push(currentSession);
      }

      currentSession.messageCount++;
      currentSession.endTime = new Date();

      const topics = extractTopics(newMessage.content);
      topics.forEach(topic => {
        if (!currentSession!.topics.includes(topic)) {
          currentSession!.topics.push(topic);
        }
      });

      memory.lastInteraction = new Date();

      await AsyncStorage.setItem('ai-support-extended-memory', JSON.stringify(memory));
      setExtendedMemory(memory);
      console.log('[AISupportChat] Updated extended memory');
    } catch (error) {
      console.error('[AISupportChat] Failed to update extended memory:', error);
    }
  };

  const extractTopics = (content: string): string[] => {
    const topics: string[] = [];
    const keywords = [
      'deployment', 'error', 'bug', 'feature', 'authentication', 'database',
      'api', 'ui', 'performance', 'security', 'testing', 'build', 'configuration'
    ];
    
    keywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) {
        topics.push(keyword);
      }
    });
    
    return topics;
  };

  useEffect(() => {
    loadConversationHistory();
  }, [loadConversationHistory]);

  const saveConversationHistory = async (msgs: any[]) => {
    try {
      await AsyncStorage.setItem('ai-support-chat-history', JSON.stringify(msgs));
      console.log('[AISupportChat] Saved conversation history:', msgs.length, 'messages');
    } catch (error) {
      console.error('[AISupportChat] Failed to save conversation history:', error);
    }
  };

  const clearConversationHistory = async () => {
    try {
      await AsyncStorage.removeItem('ai-support-chat-history');
      setMessages([]);
      setLocalMessages([]);
      console.log('[AISupportChat] Cleared conversation history');
    } catch (error) {
      console.error('[AISupportChat] Failed to clear conversation history:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, scaleAnim]);

  useEffect(() => {
    if (!isOpen) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isOpen, pulseAnim]);

  const isPaidTier = useMemo(() => userTier === 'professional' || userTier === 'premium', [userTier]);

  const isUnsolvable = useCallback((text: string) => {
    const lower = text.toLowerCase();
    const hints = [
      'cannot assist',
      "can't assist",
      'unsure',
      'not sure',
      'cannot help',
      'need a human',
      'contact support',
      'i do not have enough information',
      'unable to',
      'cannot perform',
      'requires human',
    ];
    return hints.some((h) => lower.includes(h));
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const convertedMessages: Message[] = messages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.parts
          .filter((part) => part.type === 'text')
          .map((part) => (part as any).text)
          .join('\n'),
        timestamp: new Date(),
      }));
      setLocalMessages(convertedMessages);
      saveConversationHistory(messages);

      const latest = convertedMessages[convertedMessages.length - 1];
      if (latest) {
        updateExtendedMemory(latest);
        
        if (latest.role === 'assistant') {
          setAssistantReplies((c) => c + 1);
          console.log('[AISupportChat] Assistant replied. Count =', assistantReplies + 1);
          if (!escalated && isPaidTier && assistantReplies === 0 && isUnsolvable(latest.content)) {
            console.log('[AISupportChat] Auto-escalating after first unsolved assistant reply');
            handleEscalate(true);
          }
        }
      }
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim()) return;

    const canEscalate = userTier === 'professional' || userTier === 'premium';
    
    if (!canEscalate && localMessages.length >= 5) {
      setLocalMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: '⚠️ Free tier users are limited to 5 messages per session. Upgrade to Professional or Premium to get unlimited AI support and escalate to live human help!',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    const userMessage = inputMessage;
    setInputMessage('');

    await sendMessage(userMessage);
  };

  const handleEscalate = (auto?: boolean) => {
    const canEscalate = isPaidTier;
    if (!canEscalate) {
      setLocalMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: '🔒 Live human support is only available for Professional and Premium tier members. Upgrade your plan to get 24/7 priority support from our expert team!',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    if (escalated) return;
    setEscalated(true);

    setLocalMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: auto
          ? '🤖 Couldn\'t confidently resolve this after the first attempt. Escalating you to a human expert now...'
          : '✅ Escalating to live human support... A support specialist will join this chat within 2-3 minutes. Please describe your issue in detail.',
        timestamp: new Date(),
      },
    ]);

    console.log('[AISupportChat] Escalation triggered', { auto });
  };

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
          <Text style={styles.messageRole}>
            {isUser ? 'You' : 'AI Support'}
          </Text>
        </View>
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.assistantMessageText,
            ]}
          >
            {message.content}
          </Text>
        </View>
        <Text style={styles.messageTime}>
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Animated.View
          style={[
            styles.floatingButton,
            {
              transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.floatingButtonInner}
            onPress={() => setIsOpen(true)}
            activeOpacity={0.8}
            testID="ai-support-fab"
          >
            <Image
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ayjdxbzel62rlgsqamitb' }}
              style={styles.fabImage}
              resizeMode="contain"
            />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>AI</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <Animated.View
          style={[
            styles.chatContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.chatContent}
          >
            {/* Header */}
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                <View style={styles.botAvatar}>
                  <Bot color={Colors.Colors.text.inverse} size={20} />
                </View>
                <View>
                  <Text style={styles.chatTitle}>AI Support</Text>
                  <Text style={styles.chatSubtitle}>
                    {userTier === 'premium' || userTier === 'professional'
                      ? '24/7 Priority Support'
                      : 'Automated Support'}
                  </Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={clearConversationHistory}
                >
                  <Trash2 color={Colors.Colors.text.muted} size={20} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsOpen(false)}
                >
                  <X color={Colors.Colors.text.primary} size={24} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              testID="ai-support-messages"
            >
              {localMessages.length === 0 && (
                <View style={styles.welcomeContainer}>
                  <Bot color={Colors.Colors.cyan.primary} size={48} />
                  <Text style={styles.welcomeTitle}>
                    Hi! I&apos;m your AI Support Assistant
                  </Text>
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
                  {(userTier === 'professional' || userTier === 'premium') && (
                    <Text style={styles.welcomePremium}>
                      ⭐ As a {userTier} member, you can escalate to live human
                      support anytime!
                    </Text>
                  )}
                </View>
              )}
              {localMessages.map(renderMessage)}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>
                    ⚠️ Connection error. Please try again.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            {(userTier === 'professional' || userTier === 'premium') && (
              <View style={styles.actionsBar}>
                <TouchableOpacity
                  style={styles.escalateButton}
                  onPress={() => handleEscalate()}
                >
                  <Text style={styles.escalateButtonText}>
                    🆘 Escalate to Human Support
                  </Text>
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
                style={[
                  styles.sendButton,
                  !inputMessage.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!inputMessage.trim()}
                testID="ai-support-send"
              >
                <Send
                  color={
                    inputMessage.trim()
                      ? Colors.Colors.text.inverse
                      : Colors.Colors.text.muted
                  }
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
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
    elevation: 10,
  },
  floatingButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.Colors.red.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: Colors.Colors.text.inverse,
    fontSize: 10,
    fontWeight: 'bold',
  },
  chatContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.75,
    backgroundColor: Colors.Colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 1001,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.Colors.red.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
  },
  chatSubtitle: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  closeButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 16,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  welcomePremium: {
    fontSize: 13,
    color: Colors.Colors.warning,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
  welcomeMemory: {
    fontSize: 13,
    color: Colors.Colors.cyan.primary,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
    backgroundColor: Colors.Colors.cyan.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  messageRole: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: Colors.Colors.text.inverse,
  },
  assistantMessageText: {
    color: Colors.Colors.text.primary,
  },
  messageTime: {
    fontSize: 10,
    color: Colors.Colors.text.muted,
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: Colors.Colors.error + '20',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  errorText: {
    color: Colors.Colors.error,
    fontSize: 13,
    textAlign: 'center',
  },
  actionsBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.Colors.border.muted,
  },
  escalateButton: {
    backgroundColor: Colors.Colors.warning,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  escalateButtonText: {
    color: Colors.Colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.Colors.border.muted,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.Colors.text.primary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.Colors.cyan.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.Colors.background.secondary,
  },
  fabImage: {
    width: 64,
    height: 64,
  },
});
