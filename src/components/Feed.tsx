import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/PostCard";
import { Filter, Plus, Search as SearchIcon, Loader2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { CreatePost } from "./CreatePost";
import { Input } from "@/components/ui/input";
import { SEO } from "@/components/SEO";
import { generateWebSiteSchema } from "@/utils/seo";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { getFeed } from "@/services/feed";
import { formatTimeAgo } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function Feed() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["feed", activeFilter],
    queryFn: ({ pageParam = 1 }) =>
      getFeed({ category: activeFilter, page: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? lastPage.pagination.page + 1
        : undefined,
    initialPageParam: 1,
  });

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
  };

  const handlePostCreated = (newPost: any) => {
    // Optimistically add to top of feed
    queryClient.setQueryData(["feed", activeFilter], (oldData: any) => {
      if (!oldData) return oldData;
      const firstPage = oldData.pages[0];
      return {
        ...oldData,
        pages: [
          {
            ...firstPage,
            posts: [
              {
                ...newPost,
                upvotes: 0,
                downvotes: 0,
                userVote: null,
              },
              ...firstPage.posts,
            ],
          },
          ...oldData.pages.slice(1),
        ],
      };
    });
    // Refetch in background to get real server state                  
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["feed", activeFilter] });
    }, 1500);
  };

  const handlePostDeleted = (postId: string) => {
    // Remove post from cache immediately without full refetch
    queryClient.setQueryData(["feed", activeFilter], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          posts: page.posts.filter((p: any) => p.id !== postId),
        })),
      };
    });
  };

  // Flatten all pages into single posts array
  const posts = data?.pages.flatMap((page) => page.posts) || [];

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.username.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <>
      <SEO structuredData={generateWebSiteSchema()} />
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur p-4 border-b md:border-none z-10">
          <h1 className="text-xl font-bold text-foreground md:hidden">Camply</h1>
          <div className="flex items-center gap-2 ml-auto mr-12 md:mr-0">
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setShowCreatePost(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search posts, users, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 px-4 overflow-x-auto pb-1">
          {["all", "queries", "solutions", "jobs", "discussions"].map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => handleFilterClick(filter)}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>

        {/* Posts */}
        <div className="space-y-4 px-4 pb-20 md:pb-4">
          {isLoading && (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {isError && (
            <div className="text-center p-8 text-destructive">
              Failed to load feed. Please try again.
            </div>
          )}
          {!isLoading && !isError && filteredPosts.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
              No posts found. Be the first to post!
            </div>
          )}
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              id={post.id}
              username={post.author.username}
              trustLevel={post.author.trustLevel.toLowerCase() as "bronze" | "silver" | "gold" | "platinum"}
              timeAgo={formatTimeAgo(new Date(post.createdAt))}
              content={post.content}
              upvotes={post.upvotes}
              downvotes={post.downvotes}
              comments={post._count.comments}
              category={post.category.toLowerCase() as "query" | "solution" | "job" | "discussion"}
              userVote={post.userVote}
              isFlagged={(post as any).isFlagged}
              onDelete={handlePostDeleted}
            />
          ))}

          {/* Load More Button */}
          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full max-w-xs"
              >
                {isFetchingNextPage ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-2" />
                )}
                {isFetchingNextPage ? "Loading..." : "Load More Posts"}
              </Button>
            </div>
          )}

          {/* All posts loaded */}
          {!hasNextPage && posts.length > 0 && !searchQuery && (
            <p className="text-center text-sm text-muted-foreground py-4">
              You've seen all posts ✓
            </p>
          )}
        </div>

        {showCreatePost && (
          <CreatePost
            onClose={() => setShowCreatePost(false)}
            onPostCreated={handlePostCreated}
          />
        )}
      </div>
    </>
  );
}