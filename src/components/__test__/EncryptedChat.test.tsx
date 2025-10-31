import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EncryptedChatIcon } from '../EncryptedChatIcon';
import { EncryptedChatModal } from '../EncryptedChatModal';
import { TestApp } from '@/test/TestApp';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useEncryptedChat hook
vi.mock('@/hooks/useEncryptedChat', () => ({
  useEncryptedChat: () => ({
    messages: [],
    isLoading: false,
    isLoadingMore: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    sendMessage: vi.fn(),
    unreadCount: 3,
    markAsRead: vi.fn(),
  }),
}));

// Mock the useCurrentUser hook
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      pubkey: 'test-pubkey',
      signer: {
        nip44: {
          encrypt: vi.fn(),
          decrypt: vi.fn(),
        },
      },
    },
  }),
}));

// Mock the useAuthor hook
vi.mock('@/hooks/useAuthor', () => ({
  useAuthor: () => ({
    data: {
      metadata: {
        name: 'Test User',
        picture: 'test-avatar.jpg',
      },
    },
  }),
}));

describe('EncryptedChat Components', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  describe('EncryptedChatIcon', () => {
    it('renders chat icon with unread count', () => {
      render(
        <TestApp>
          <EncryptedChatIcon />
        </TestApp>
      );

      const chatIcon = screen.getByLabelText('Open encrypted chat');
      expect(chatIcon).toBeInTheDocument();
      expect(chatIcon).toHaveClass('bg-purple-600');

      // Check for unread count badge
      const unreadBadge = screen.getByText('3');
      expect(unreadBadge).toBeInTheDocument();
      expect(unreadBadge).toHaveClass('bg-red-500');
    });

    it('does not render when user is not logged in', () => {
      vi.mock('@/hooks/useCurrentUser', () => ({
        useCurrentUser: () => ({
          user: null,
        }),
      }));

      const { container } = render(
        <TestApp>
          <EncryptedChatIcon />
        </TestApp>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('EncryptedChatModal', () => {
    it('renders modal with correct structure', () => {
      render(
        <TestApp>
          <EncryptedChatModal isOpen={true} onClose={vi.fn()} />
        </TestApp>
      );

      expect(screen.getByText('Spookstr Encrypted Chat')).toBeInTheDocument();
      expect(screen.getByText('End-to-end encrypted chat for Spookstr community members')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type your encrypted message...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('shows encryption indicators', () => {
      render(
        <TestApp>
          <EncryptedChatModal isOpen={true} onClose={vi.fn()} />
        </TestApp>
      );

      // Check for lock icon indicating encryption
      const lockIcon = screen.getByText('Messages are end-to-end encrypted').previousElementSibling;
      expect(lockIcon).toBeInTheDocument();
      
      // Check for users icon
      const usersIcon = screen.getByText('Messages are end-to-end encrypted').parentElement?.querySelector('.text-blue-400');
      expect(usersIcon).toBeInTheDocument();
    });

    it('allows sending messages', async () => {
      const mockSendMessage = vi.fn();
      vi.mock('@/hooks/useEncryptedChat', () => ({
        useEncryptedChat: () => ({
          messages: [],
          isLoading: false,
          isLoadingMore: false,
          hasNextPage: false,
          fetchNextPage: vi.fn(),
          sendMessage: mockSendMessage,
          unreadCount: 0,
          markAsRead: vi.fn(),
        }),
      }));

      render(
        <TestApp>
          <EncryptedChatModal isOpen={true} onClose={vi.fn()} />
        </TestApp>
      );

      const input = screen.getByPlaceholderText('Type your encrypted message...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Type a message
      fireEvent.change(input, { target: { value: 'Hello, Spookstr!' } });
      expect(input).toHaveValue('Hello, Spookstr!');

      // Send the message
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Hello, Spookstr!');
      });

      // Input should be cleared
      expect(input).toHaveValue('');
    });

    it('disables send button when input is empty', () => {
      render(
        <TestApp>
          <EncryptedChatModal isOpen={true} onClose={vi.fn()} />
        </TestApp>
      );

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();

      const input = screen.getByPlaceholderText('Type your encrypted message...');
      fireEvent.change(input, { target: { value: 'Test message' } });

      expect(sendButton).not.toBeDisabled();
    });

    it('supports Enter key to send message', () => {
      const mockSendMessage = vi.fn();
      vi.mock('@/hooks/useEncryptedChat', () => ({
        useEncryptedChat: () => ({
          messages: [],
          isLoading: false,
          isLoadingMore: false,
          hasNextPage: false,
          fetchNextPage: vi.fn(),
          sendMessage: mockSendMessage,
          unreadCount: 0,
          markAsRead: vi.fn(),
        }),
      }));

      render(
        <TestApp>
          <EncryptedChatModal isOpen={true} onClose={vi.fn()} />
        </TestApp>
      );

      const input = screen.getByPlaceholderText('Type your encrypted message...');
      
      // Type a message and press Enter
      fireEvent.change(input, { target: { value: 'Enter key test' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(mockSendMessage).toHaveBeenCalledWith('Enter key test');
    });
  });
});