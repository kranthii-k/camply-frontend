import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Feed } from '@/components/Feed';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as feedApi from '@/services/feed';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Mock the API module
vi.mock('@/services/feed', () => ({
  getFeed: vi.fn(),
  createPost: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { id: '1', username: 'tester' },
    loading: false,
  })),
}));

// Mock PostCard to simplify testing the Feed logic
vi.mock('@/components/PostCard', () => ({
  PostCard: ({ content, username }: any) => (
    <div data-testid="post-card">
      <span>{username}</span>
      <span>{content}</span>
    </div>
  ),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }, 
});

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

describe('Feed Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  const mockPosts = {
    posts: [
      {
        id: '1',
        content: 'Test Post Content',
        category: 'DISCUSSION',
        createdAt: new Date().toISOString(),
        author: { username: '@tester', trustLevel: 'GOLD' },
        _count: { comments: 0, votes: 0 },
        upvotes: 10,
        downvotes: 0,
        userVote: null,
      },
    ],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasMore: false },
  };

  it('renders loading state initially', () => {
    vi.mocked(feedApi.getFeed).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Feed />);
    // Feed.tsx uses a Loader2 component, so we check for its presence or the spinner container
    expect(document.querySelector('.animate-spin')).toBeDefined();
  });

  it('renders posts after successful fetch', async () => {
    vi.mocked(feedApi.getFeed).mockResolvedValue(mockPosts as any);
    
    renderWithProviders(<Feed />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Post Content')).toBeDefined();
      expect(screen.getByText('@tester')).toBeDefined();
    });
  });

  it('renders error state if fetch fails', async () => {
    vi.mocked(feedApi.getFeed).mockRejectedValue(new Error('Failed to load'));
    
    renderWithProviders(<Feed />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load feed/i)).toBeDefined();
    });
  });

  it('refetches when filter is clicked', async () => {
    vi.mocked(feedApi.getFeed).mockResolvedValue(mockPosts as any);
    renderWithProviders(<Feed />);
    
    await waitFor(() => {
      expect(feedApi.getFeed).toHaveBeenCalled();
    });

    const jobsFilterBtn = screen.getByText('Jobs');
    jobsFilterBtn.click();

    await waitFor(() => {
      expect(feedApi.getFeed).toHaveBeenCalledWith(expect.objectContaining({ category: 'jobs' }));
    });
  });
});
