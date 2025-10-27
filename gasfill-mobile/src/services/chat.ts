import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, ChatRoom } from '../types';

const API_BASE_URL = 'http://192.168.1.25:8000';
const TOKEN_KEY = 'gasfill_token_v1';

class ChatService {
  /**
   * Get auth headers for API requests
   */
  private async getAuthHeaders() {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Get or create a chat room for an order
   */
  async getChatRoom(orderId: number, userId: number, userType: 'customer' | 'rider'): Promise<ChatRoom> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/chat/rooms`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ order_id: orderId, user_id: userId, user_type: userType }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.log('[ChatService] Chat API not available, using mock chat room');
      
      // Fallback to mock data
      const mockRoom: ChatRoom = {
        id: `room_${orderId}`,
        order_id: orderId,
        customer_id: userType === 'customer' ? userId : 1,
        customer_name: 'John Doe',
        rider_id: userType === 'rider' ? userId : 101,
        rider_name: 'Rider Mike',
        last_message: 'Hello! I\'m on my way to deliver your gas cylinder.',
        last_message_time: new Date().toISOString(),
        unread_count: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return mockRoom;
    }
  }

  /**
   * Get messages for a chat room
   */
  async getMessages(chatRoomId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/chat/rooms/${chatRoomId}/messages?limit=${limit}&offset=${offset}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.log('[ChatService] Messages API not available, using mock data');
      
      // Fallback to mock data
      return [
        {
          id: '1',
          chat_room_id: chatRoomId,
          sender_id: 100,
          sender_type: 'customer',
          sender_name: 'John Doe',
          message: 'Hi! I just placed an order for gas delivery.',
          message_type: 'text',
          is_read: true,
          is_delivered: true,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '2',
          chat_room_id: chatRoomId,
          sender_id: 101,
          sender_type: 'rider',
          sender_name: 'Mike Rider',
          message: 'Hello! I\'ve picked up your order and I\'m on my way.',
          message_type: 'text',
          is_read: true,
          is_delivered: true,
          created_at: new Date(Date.now() - 3000000).toISOString(),
        },
        {
          id: '3',
          chat_room_id: chatRoomId,
          sender_id: 100,
          sender_type: 'customer',
          sender_name: 'John Doe',
          message: 'Great! How long will it take?',
          message_type: 'text',
          is_read: true,
          is_delivered: true,
          created_at: new Date(Date.now() - 2400000).toISOString(),
        },
        {
          id: '4',
          chat_room_id: chatRoomId,
          sender_id: 101,
          sender_type: 'rider',
          sender_name: 'Mike Rider',
          message: 'I\'ll be there in about 15 minutes.',
          message_type: 'text',
          is_read: false,
          is_delivered: true,
          created_at: new Date(Date.now() - 1800000).toISOString(),
        },
      ];
    }
  }

  /**
   * Send a message in a chat room (via HTTP - WebSocket will handle real-time)
   */
  async sendMessage(message: Omit<ChatMessage, 'id' | 'created_at' | 'is_delivered'>): Promise<ChatMessage> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/chat/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[ChatService] Error sending message:', error);
      
      // Fallback mock response
      const newMessage: ChatMessage = {
        ...message,
        id: `msg_${Date.now()}`,
        is_delivered: false,
        created_at: new Date().toISOString(),
      };

      return newMessage;
    }
  }

  /**
   * Upload image for chat
   */
  async uploadChatImage(uri: string, chatRoomId: string): Promise<string> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri,
        name: filename,
        type,
      } as any);
      formData.append('chat_room_id', chatRoomId);

      const response = await fetch(`${API_BASE_URL}/api/chat/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload image: ${response.statusText}`);
      }

      const data = await response.json();
      return data.image_url;
    } catch (error) {
      console.error('[ChatService] Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(chatRoomId: string, messageIds: string[]): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      await fetch(`${API_BASE_URL}/api/chat/rooms/${chatRoomId}/read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message_ids: messageIds }),
      });
    } catch (error) {
      console.error('[ChatService] Error marking messages as read:', error);
    }
  }

  /**
   * Get all chat rooms for a user
   */
  async getChatRooms(): Promise<ChatRoom[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/chat/rooms`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to get chat rooms: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.log('[ChatService] Chat rooms API not available:', error instanceof Error ? error.message : error);
      console.log('[ChatService] Using mock chat rooms (API not available)');
      
      // Return mock chat rooms
      return [
        {
          id: 'room_ORD-1',
          order_id: 1,
          customer_id: 1,
          customer_name: 'John Doe',
          rider_id: 5,
          rider_name: 'Mike Rider',
          last_message: 'I\'m on my way to pick up your order',
          last_message_time: new Date(Date.now() - 300000).toISOString(), // 5 mins ago
          unread_count: 2,
          status: 'active' as const,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          updated_at: new Date(Date.now() - 300000).toISOString(),
          participants: [
            {
              id: 5,
              name: 'Mike Rider',
              user_type: 'rider' as const,
              is_online: true,
            },
          ],
        },
        {
          id: 'room_ORD-2',
          order_id: 2,
          customer_id: 1,
          customer_name: 'John Doe',
          rider_id: 6,
          rider_name: 'Sarah Delivery',
          last_message: 'Order delivered successfully. Thank you!',
          last_message_time: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          unread_count: 0,
          status: 'closed' as const,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 7200000).toISOString(),
          participants: [
            {
              id: 6,
              name: 'Sarah Delivery',
              user_type: 'rider' as const,
              is_online: false,
            },
          ],
        },
        {
          id: 'room_SUPPORT-1',
          order_id: 3,
          customer_id: 1,
          customer_name: 'John Doe',
          last_message: 'How can I help you today?',
          last_message_time: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
          unread_count: 1,
          status: 'active' as const,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          updated_at: new Date(Date.now() - 1800000).toISOString(),
          participants: [
            {
              id: 100,
              name: 'Support Team',
              user_type: 'support' as const,
              is_online: true,
            },
          ],
        },
      ];
    }
  }

  /**
   * Close a chat room
   */
  async closeChatRoom(chatRoomId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      await fetch(`${API_BASE_URL}/api/chat/rooms/${chatRoomId}/close`, {
        method: 'POST',
        headers,
      });
    } catch (error) {
      console.error('[ChatService] Error closing chat room:', error);
    }
  }
}

export const chatService = new ChatService();
export default chatService;
