import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { MessageCircle, X, Send, Bot, User as UserIcon } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useRorkAgent } from '@rork/toolkit-sdk';

const { height } = Dimensions.get('window');

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AISupportChatProps {
  userTier?: 'free' | 'starter' | 'professional' | 'premium';
}

export default function AISupportChat({ userTier = 'free' }: AISupportChatProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const { messages, sendMessage, error } = useRorkAgent({
    tools: {},
  });

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

  const handleEscalate = () => {
    const canEscalate = userTier === 'professional' || userTier === 'premium';
    
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

    setLocalMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: '✅ Escalating to live human support... A support specialist will join this chat within 2-3 minutes. Please describe your issue in detail.',
        timestamp: new Date(),
      },
    ]);
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
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.floatingButtonInner}
            onPress={() => setIsOpen(true)}
            activeOpacity={0.8}
          >
            <MessageCircle color={Colors.Colors.text.inverse} size={28} />
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
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsOpen(false)}
              >
                <X color={Colors.Colors.text.primary} size={24} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
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
                  onPress={handleEscalate}
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
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !inputMessage.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!inputMessage.trim()}
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
    backgroundColor: Colors.Colors.cyan.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
});
