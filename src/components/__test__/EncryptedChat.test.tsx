import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EncryptedChatModal } from '@/components/EncryptedChatModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useEncryptedChat hook
jest.mock('@/hooks/useEncryptedChat', () => ({
  useEncryptedChat: () => ({
    messages: [
      {
        id: 'test1',
        pubkey: 'test-pubkey-1',
        content: 'Hello from encrypted chat!',
        created_at: Date.now() / 1000 - 3600,
      },
      {
        id: 'test2',
        pubkey: 'test-pubkey-2',
        content: 'This is a test message',
        created_at: Date.now() / 1000 - 1800,
      },
    ],
    isLoading: false,
    isLoadingMore: false,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    sendMessage: jest.fn().mockResolvedValue(undefined),
    unreadCount: 2,
    markAsRead: jest.fn(),
  }),
}));

// Mock the useCurrentUser hook
jest.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      pubkey: 'test-user-pubkey',
      name: 'Test User',
    },
    isLoading: false,
  }),
}));

// Mock the useAuthor hook
jest.mock('@/hooks/useAuthor', () => ({
  useAuthor: () => ({
    data: {
      metadata: {
        name: 'Test Author',
        picture: 'test-avatar.jpg',
      },
    },
  }),
}));

describe('EncryptedChatModal', () => {
  const queryClient = new QueryClient();

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('renders encrypted chat modal with messages', () => {
    renderWithProviders(<EncryptedChatModal isOpen={true} onClose={jest.fn()} />);

    // Check if modal is open
    expect(screen.getByText('Spookstr Encrypted Chat')).toBeInTheDocument();

    // Check if messages are displayed
    expect(screen.getByText('Hello from encrypted chat!')).toBeInTheDocument();
    expect(screen.getByText('This is a test message')).toBeInTheDocument();

    // Check if input field is present
    expect(screen.getByPlaceholderText('Type your encrypted message...')).toBeInTheDocument();

    // Check if send button is present
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('allows sending messages', async () => {
    const { useEncryptedChat } = require('@/hooks/useEncryptedChat');
    const mockSendMessage = useEncryptedChat().sendMessage;

    renderWithProviders(<EncryptedChatModal isOpen={true} onClose={jest.fn()} />);

    const input = screen.getByPlaceholderText('Type your encrypted message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    // Type a message
    fireEvent.change(input, { target: { value: 'Test message' } });

    // Click send button
    fireEvent.click(sendButton);

    // Check if sendMessage was called
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    });

    // Check if input is cleared
    expect(input).toHaveValue('');
  });

  it('shows message count', () => {
    renderWithProviders(<EncryptedChatModal isOpen={true} onClose={jest.fn()} />);

    // Check if message count is displayed
    expect(screen.getByText('2 messages')).toBeInTheDocument();
  });

  it('shows encryption notice', () => {
    renderWithProviders(<EncryptedChatModal isOpen={true} onClose={jest.fn()} />);

    // Check if encryption notice is displayed
    expect(screen.getByText('Messages are end-to-end encrypted')).toBeInTheDocument();
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
  });
});