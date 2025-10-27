import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ChatMessage, ChatParticipant } from '../types';
import chatService from '../services/chat';
import { useChatWebSocket } from '../hooks/useChatWebSocket';

interface ChatScreenProps {
  navigation: any;
  route: any;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const { user, rider, userRole } = useAuth();
  const { orderId, chatRoomId: initialChatRoomId, participant } = route.params || {};
  
  const [chatRoomId, setChatRoomId] = useState<string>(initialChatRoomId || '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [participantTyping, setParticipantTyping] = useState(false);
  const [participantOnline, setParticipantOnline] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine current user info
  const currentUserId = userRole === 'rider' ? rider?.id : user?.id;
  const currentUserType = userRole === 'rider' ? 'rider' : 'customer';
  const currentUserName = userRole === 'rider' ? rider?.username : user?.username;

  // Participant info
  const otherParticipant: ChatParticipant = participant || {
    id: userRole === 'rider' ? 1 : 101,
    name: userRole === 'rider' ? 'Customer Name' : 'Rider Name',
    type: userRole === 'rider' ? 'customer' : 'rider',
    is_online: true,
    is_typing: false,
    avatar: undefined,
  };

  // WebSocket integration for real-time chat
  const {
    isConnected,
    sendMessage: sendWebSocketMessage,
    startTyping,
    stopTyping,
    markMessagesAsRead,
  } = useChatWebSocket({
    chatRoomId: chatRoomId || '',
    userId: currentUserId || 0,
    userType: currentUserType,
    onNewMessage: useCallback((message: ChatMessage) => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, []),
    onTypingStatus: useCallback((isTyping: boolean) => {
      setParticipantTyping(isTyping);
    }, []),
    onMessageRead: useCallback((messageIds: string[]) => {
      setMessages(prev => prev.map(msg => 
        messageIds.includes(msg.id) ? { ...msg, is_read: true, read_at: new Date().toISOString() } : msg
      ));
    }, []),
    onMessageDelivered: useCallback((messageIds: string[]) => {
      setMessages(prev => prev.map(msg => 
        messageIds.includes(msg.id) ? { ...msg, is_delivered: true } : msg
      ));
    }, []),
    onParticipantStatusChange: useCallback((isOnline: boolean) => {
      setParticipantOnline(isOnline);
    }, []),
  });

  // Initialize chat room and load messages
  useEffect(() => {
    if (orderId && currentUserId) {
      initializeChat();
    }
  }, [orderId, currentUserId]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      
      // Get or create chat room (will use mock data if API not available)
      const room = await chatService.getChatRoom(orderId, currentUserId || 0, currentUserType);
      setChatRoomId(room.id);
      
      console.log('[ChatScreen] Chat room initialized:', room.id);
      
      // Load messages (will use mock data if API not available)
      const loadedMessages = await chatService.getMessages(room.id);
      setMessages(loadedMessages);

      console.log('[ChatScreen] Loaded', loadedMessages.length, 'messages');

      // Mark existing unread messages as read
      const unreadMessageIds = loadedMessages
        .filter(msg => !msg.is_read && msg.sender_id !== currentUserId)
        .map(msg => msg.id);
      
      if (unreadMessageIds.length > 0 && isConnected) {
        markMessagesAsRead(unreadMessageIds);
      }
    } catch (error) {
      console.error('[ChatScreen] Error initializing chat:', error);
      // Set a fallback chat room ID so chat can still work
      setChatRoomId(initialChatRoomId || `room_${orderId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !chatRoomId) return;

    try {
      setIsSending(true);
      
      const newMessage: ChatMessage = {
        id: `temp_${Date.now()}`,
        chat_room_id: chatRoomId,
        sender_id: currentUserId || 0,
        sender_type: currentUserType,
        sender_name: currentUserName || 'You',
        message: inputMessage.trim(),
        message_type: 'text',
        is_read: false,
        is_delivered: false,
        created_at: new Date().toISOString(),
      };

      // Optimistically add message to UI
      setMessages(prev => [...prev, newMessage]);
      const messageText = inputMessage.trim();
      setInputMessage('');

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Send via WebSocket for real-time delivery
      if (isConnected) {
        sendWebSocketMessage(messageText, 'text');
      } else {
        // Fallback to HTTP if WebSocket not connected
        await chatService.sendMessage({
          chat_room_id: chatRoomId,
          sender_id: currentUserId || 0,
          sender_type: currentUserType,
          sender_name: currentUserName || 'You',
          message: messageText,
          message_type: 'text',
          is_read: false,
        });
      }

    } catch (error) {
      console.error('[ChatScreen] Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle typing indicator
  const handleInputChange = (text: string) => {
    setInputMessage(text);
    
    if (text.length > 0) {
      startTyping();
      
      // Reset typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 3000);
    } else {
      stopTyping();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMyMessage = item.sender_id === currentUserId && item.sender_type === currentUserType;

    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer,
      ]}>
        {!isMyMessage && (
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons 
                name={otherParticipant.user_type === 'rider' ? 'bicycle' : 'person'} 
                size={20} 
                color="#ffffff" 
              />
            </View>
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble,
        ]}>
          {!isMyMessage && (
            <Text style={styles.senderName}>{item.sender_name}</Text>
          )}
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.theirMessageText,
          ]}>
            {item.message}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.theirMessageTime,
            ]}>
              {formatTime(item.created_at)}
            </Text>
            {isMyMessage && (
              <View style={styles.receiptContainer}>
                {item.is_read ? (
                  <Ionicons name="checkmark-done" size={14} color="#0ea5e9" />
                ) : item.is_delivered ? (
                  <Ionicons name="checkmark-done" size={14} color="#9ca3af" />
                ) : (
                  <Ionicons name="checkmark" size={14} color="#9ca3af" />
                )}
              </View>
            )}
          </View>
        </View>

        {isMyMessage && <View style={styles.avatarPlaceholder} />}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Ionicons 
              name={otherParticipant.user_type === 'rider' ? 'bicycle' : 'person'} 
              size={16} 
              color="#6b7280" 
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{otherParticipant.name}</Text>
            <View style={styles.statusContainer}>
              {participantTyping ? (
                <Text style={styles.typingText}>typing...</Text>
              ) : participantOnline ? (
                <>
                  <View style={styles.onlineDot} />
                  <Text style={styles.statusText}>Online</Text>
                </>
              ) : (
                <Text style={styles.statusText}>Offline</Text>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="call-outline" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle-outline" size={28} color="#6b7280" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            value={inputMessage}
            onChangeText={handleInputChange}
            multiline
            maxLength={500}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, (!inputMessage.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputMessage.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
  },
  typingText: {
    fontSize: 12,
    color: '#3b82f6',
    fontStyle: 'italic',
  },
  headerButton: {
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: 32,
    marginLeft: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  myMessageBubble: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#1F2937',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
  },
  myMessageTime: {
    color: '#dbeafe',
  },
  theirMessageTime: {
    color: '#9ca3af',
  },
  receiptContainer: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  attachButton: {
    marginRight: 8,
    marginBottom: 6,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.5,
  },
});

export default ChatScreen;
