import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrustBadge } from "@/components/TrustBadge";
import { ChevronUp, ChevronDown, MessageCircle, Share, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { votePost, deletePost } from "@/services/feed";
import { useAuth } from "@/contexts/AuthContext";
import { CommentSection } from "@/components/CommentSection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PostCardProps {
  id: string;
  username: string;
  trustLevel: "bronze" | "silver" | "gold" | "platinum";
  timeAgo: string;
  content: string;
  upvotes: number;
  downvotes: number;
  comments: number;
  category: "query" | "solution" | "job" | "discussion";
  userVote?: 1 | -1 | null;
  className?: string;
  isFlagged?: boolean;
  onDelete?: (postId: string) => void;
}

const categoryColors = {
  query: "bg-blue-100 text-blue-800",
  solution: "bg-green-100 text-green-800", 
  job: "bg-purple-100 text-purple-800",
  discussion: "bg-orange-100 text-orange-800"
};

export function PostCard({ 
  id,
  username, 
  trustLevel, 
  timeAgo, 
  content, 
  upvotes, 
  downvotes, 
  comments, 
  category,
  userVote: initialUserVote,
  className,
  isFlagged,
  onDelete
}: PostCardProps) {
  const [userVote, setUserVote] = useState<1 | -1 | null>(initialUserVote ?? null);
  const [currentUpvotes, setCurrentUpvotes] = useState(upvotes);
  const [currentDownvotes, setCurrentDownvotes] = useState(downvotes);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [currentComments, setCurrentComments] = useState(comments);
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const isOwner = user?.username === username;

  const handleVote = async (type: 1 | -1) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to vote on posts.",
      });
      return;
    }

    // Save previous state for rollback
    const prevVote = userVote;
    const prevUpvotes = currentUpvotes;
    const prevDownvotes = currentDownvotes;

    // Optimistic update
    if (userVote === type) {
      // Toggle off
      if (type === 1) setCurrentUpvotes(prev => prev - 1);
      else setCurrentDownvotes(prev => prev - 1);
      setUserVote(null);
    } else {
      // Switch or new vote
      if (userVote === 1 && type === -1) {
        setCurrentUpvotes(prev => prev - 1);
        setCurrentDownvotes(prev => prev + 1);
      } else if (userVote === -1 && type === 1) {
        setCurrentDownvotes(prev => prev - 1);
        setCurrentUpvotes(prev => prev + 1);
      } else {
        if (type === 1) setCurrentUpvotes(prev => prev + 1);
        else setCurrentDownvotes(prev => prev + 1);
      }
      setUserVote(type);
    }

    try {
      // API call — now returns real counts from backend
      const result = await votePost(id, type);
      // Sync with real server counts
      if (result.upvotes !== undefined) setCurrentUpvotes(result.upvotes);
      if (result.downvotes !== undefined) setCurrentDownvotes(result.downvotes);
      if (result.userVote !== undefined) setUserVote(result.userVote);
    } catch (error) {
      // Revert to previous state on failure
      setCurrentUpvotes(prevUpvotes);
      setCurrentDownvotes(prevDownvotes);
      setUserVote(prevVote);
      toast({
        title: "Vote Failed",
        description: error instanceof Error ? error.message : "Could not record vote.",
        variant: "destructive",
      });
    }
  };

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deletePost(id);
      toast({ title: "Post deleted", description: "Your post has been removed." });
      onDelete?.(id);
    } catch (error) {
      toast({
        title: "Failed to delete",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  return (
    <Card className={cn(
      "relative p-6 hover:shadow-medium transition-all duration-300 animate-fade-in",
      isFlagged && isOwner && "border-2 border-destructive/60 ring-1 ring-destructive/20",
      className
    )}>
      {/* Flagged badge — shown only to the post owner */}
      {isFlagged && isOwner && (
        <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-1.5 bg-destructive/10 text-destructive text-xs font-semibold py-1 px-3 rounded-t-lg border-b border-destructive/20">
          <span>⚠️</span>
          <span>Under Review · This post has been flagged by AI moderation</span>
        </div>
      )}
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 text-xs text-muted-foreground">
        {timeAgo}
      </div>
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", categoryColors[category])}>
          {category}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                const postUrl = `${window.location.origin}/posts/${id}`;
                if (navigator.share) {
                  navigator.share({
                    title: `Post by @${username} on Camply`,
                    text: content.slice(0, 100) + (content.length > 100 ? "..." : ""),
                    url: postUrl,
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(postUrl);
                  toast({
                    title: "Link Copied! 🔗",
                    description: "Post link copied to clipboard.",
                  });
                }
              }}
            >
              <Share className="h-4 w-4 mr-2" />
              Share Post
            </DropdownMenuItem>
            {isOwner && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Post
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Voting Section */}
        <div className="flex flex-row sm:flex-col items-center gap-2 pt-1">
          <Button
            variant="upvote"
            size="icon"
            onClick={() => handleVote(1)}
            className={cn(
              "h-8 w-8",
              userVote === 1 && "text-accent bg-accent/20"
            )}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-foreground">
            {currentUpvotes - currentDownvotes}
          </span>
          <Button
            variant="downvote"
            size="icon"
            onClick={() => handleVote(-1)}
            className={cn(
              "h-8 w-8",
              userVote === -1 && "text-destructive bg-destructive/20"
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Section */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-y-2 group pr-20 sm:pr-28">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{username}</span>
                <TrustBadge level={trustLevel} />
              </div>
            </div>
          </div>

          {/* Content */}
          <p className="text-foreground leading-relaxed">{content}</p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 pt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setShowComments(prev => !prev)}
            >
              <MessageCircle className="h-4 w-4" />
              {currentComments} {showComments ? "▲ hide" : "▼ comments"}
            </Button>
          </div>
        </div>
      </div>

      {showComments && (
        <CommentSection
          postId={id}
          postAuthorUsername={username}
          onCommentCountChange={setCurrentComments}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your post will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}