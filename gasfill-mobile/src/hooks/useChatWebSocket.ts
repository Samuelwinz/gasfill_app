/**
 * Chat WebSocket Hook
 * Provides real-time chat functionality using WebSocket
 */

import { useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { ChatMessage, TypingIndicator } from '../types';

interface UseChatWebSocketProps {
  chatRoomId: string;
  userId: number;
  userType: 'customer' | 'rider';
  userName?: string; // Add userName
  onNewMessage?: (message: ChatMessage) => void;
  onTypingStatus?: (isTyping: boolean, participantName: string) => void;
  onMessageRead?: (messageIds: string[]) => void;
  onMessageDelivered?: (messageIds: string[]) => void;
  onParticipantStatusChange?: (isOnline: boolean) => void;
}

export const useChatWebSocket = ({
  chatRoomId,
  userId,
  userType,
  userName,
  onNewMessage,
  onTypingStatus,
  onMessageRead,
  onMessageDelivered,
  onParticipantStatusChange,
}: UseChatWebSocketProps) => {
  const { isConnected, subscribe, send, connect } = useWebSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  /**
   * Join chat room on mount
   */
  useEffect(() => {
    if (isConnected && chatRoomId) {
      send('chat_join_room', { chat_room_id: chatRoomId, user_id: userId, user_type: userType });
      console.log('[useChatWebSocket] Joined chat room:', chatRoomId);

      // Leave room on unmount
      return () => {
        send('chat_leave_room', { chat_room_id: chatRoomId, user_id: userId });
        console.log('[useChatWebSocket] Left chat room:', chatRoomId);
      };
    } else if (!isConnected) {
      console.log('[useChatWebSocket] Waiting for WebSocket connection...');
    }
  }, [isConnected, chatRoomId, userId, userType, send]);

  /**
   * Subscribe to new messages
   */
  useEffect(() => {
    if (!onNewMessage) return;

    console.log('[useChatWebSocket] Subscribing to chat_message events for room:', chatRoomId);

    const unsubscribe = subscribe('chat_message', (data: ChatMessage) => {
      console.log('[useChatWebSocket] Received chat_message event:', data);
      console.log('[useChatWebSocket] Checking: data.chat_room_id =', data.chat_room_id, 'vs chatRoomId =', chatRoomId);
      console.log('[useChatWebSocket] Checking: data.sender_id =', data.sender_id, 'vs userId =', userId);
      
      // Only handle messages for this chat room from other participant
      if (data.chat_room_id === chatRoomId && data.sender_id !== userId) {
        console.log('[useChatWebSocket] ✅ Message accepted - calling onNewMessage');
        onNewMessage(data);

        // Send delivery receipt
        send('chat_message_delivered', {
          chat_room_id: chatRoomId,
          message_id: data.id,
          user_id: userId,
        });
      } else {
        console.log('[useChatWebSocket] ❌ Message rejected - not for this user/room');
      }
    });

    return unsubscribe;
  }, [chatRoomId, userId, onNewMessage, subscribe, send]);

  /**
   * Subscribe to typing indicators
   */
  useEffect(() => {
    if (!onTypingStatus) return;

    const unsubscribe = subscribe('chat_typing', (data: TypingIndicator) => {
      // Only handle typing for this chat room from other participant
      if (data.chat_room_id === chatRoomId && data.user_id !== userId) {
        console.log('[useChatWebSocket] Typing status changed:', data.is_typing);
        onTypingStatus(data.is_typing, ''); // Name will be filled from participant data
      }
    });

    return unsubscribe;
  }, [chatRoomId, userId, onTypingStatus, subscribe]);

  /**
   * Subscribe to read receipts
   */
  useEffect(() => {
    if (!onMessageRead) return;

    const unsubscribe = subscribe('chat_messages_read', (data: { message_ids: string[] }) => {
      console.log('[useChatWebSocket] Messages read:', data.message_ids);
      onMessageRead(data.message_ids);
    });

    return unsubscribe;
  }, [onMessageRead, subscribe]);

  /**
   * Subscribe to delivery receipts
   */
  useEffect(() => {
    if (!onMessageDelivered) return;

    const unsubscribe = subscribe('chat_messages_delivered', (data: { message_ids: string[] }) => {
      console.log('[useChatWebSocket] Messages delivered:', data.message_ids);
      onMessageDelivered(data.message_ids);
    });

    return unsubscribe;
  }, [onMessageDelivered, subscribe]);

  /**
   * Subscribe to participant status changes
   */
  useEffect(() => {
    if (!onParticipantStatusChange) return;

    const unsubscribe = subscribe('chat_user_status', (data: { user_id: number; is_online: boolean }) => {
      // Only handle status for the other participant
      if (data.user_id !== userId) {
        console.log('[useChatWebSocket] Participant status changed:', data.is_online);
        onParticipantStatusChange(data.is_online);
      }
    });

    return unsubscribe;
  }, [userId, onParticipantStatusChange, subscribe]);

  /**
   * Send a chat message
   */
  const sendMessage = useCallback(
    (message: string, messageType: 'text' | 'image' | 'location' = 'text', extraData?: any) => {
      if (!isConnected) {
        console.warn('[useChatWebSocket] Cannot send message - not connected');
        return;
      }

      console.log('[useChatWebSocket] Sending message:', { message, messageType, userName, extraData });

      send('chat_send_message', {
        chat_room_id: chatRoomId,
        sender_id: userId,
        sender_type: userType,
        sender_name: userName || 'User',
        message,
        message_type: messageType,
        ...extraData,
      });

      // Stop typing indicator when message is sent
      if (isTypingRef.current) {
        stopTyping();
      }
    },
    [isConnected, chatRoomId, userId, userType, userName, send]
  );

  /**
   * Send typing indicator
   */
  const startTyping = useCallback(() => {
    if (!isConnected || isTypingRef.current) return;

    isTypingRef.current = true;
    send('chat_typing_start', {
      chat_room_id: chatRoomId,
      user_id: userId,
      user_type: userType,
    });

    // Auto-stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [isConnected, chatRoomId, userId, userType, send]);

  /**
   * Stop typing indicator
   */
  const stopTyping = useCallback(() => {
    if (!isConnected || !isTypingRef.current) return;

    isTypingRef.current = false;
    send('chat_typing_stop', {
      chat_room_id: chatRoomId,
      user_id: userId,
      user_type: userType,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [isConnected, chatRoomId, userId, userType, send]);

  /**
   * Mark messages as read
   */
  const markMessagesAsRead = useCallback(
    (messageIds: string[]) => {
      if (!isConnected || messageIds.length === 0) return;

      send('chat_mark_read', {
        chat_room_id: chatRoomId,
        message_ids: messageIds,
        user_id: userId,
      });
    },
    [isConnected, chatRoomId, userId, send]
  );

  /**
   * Ensure WebSocket connection
   */
  useEffect(() => {
    if (!isConnected) {
      console.log('[useChatWebSocket] Not connected, attempting to connect...');
      connect().catch((error) => {
        console.error('[useChatWebSocket] Connection failed:', error);
      });
    }
  }, [isConnected, connect]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    sendMessage,
    startTyping,
    stopTyping,
    markMessagesAsRead,
  };
};
