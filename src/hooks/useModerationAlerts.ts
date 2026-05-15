import { useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Socket } from "socket.io-client";

interface ContentWarningPayload {
  postId: string;
  reason: string;
  strikes: number;
  message: string;
  autoDeleteAt: number;
}

interface PostAutoDeletedPayload {
  postId: string;
  message: string;
}

interface AccountSuspendedPayload {
  message: string;
  bannedUntil: string;
}

/**
 * Listens for AI Guardian socket events on the provided socket instance.
 */
export function useModerationAlerts(socket: Socket | null) {
  const { toast } = useToast();
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const handleContentWarning = useCallback(
    (payload: ContentWarningPayload) => {
      // 🚀 Ironclad Cache Update: Instantly update the feed UI
      queryClient.setQueriesData({ queryKey: ["feed"] }, (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: any) =>
              post.id === payload.postId
                ? { ...post, isFlagged: true, moderationReason: payload.reason }
                : post
            ),
          })),
        };
      });

      const secondsLeft = Math.max(
        0,
        Math.round((payload.autoDeleteAt - Date.now()) / 1000)
      );

      toast({
        title: `⚠️ Violation Strike ${payload.strikes}/3`,
        description: `${payload.message} (${secondsLeft}s remaining)`,
        variant: "destructive",
        duration: secondsLeft * 1000,
      });
    },
    [toast, queryClient]
  );

  const handlePostAutoDeleted = useCallback(
    (payload: PostAutoDeletedPayload) => {
      queryClient.setQueriesData({ queryKey: ["feed"] }, (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: page.posts.filter((post: any) => post.id !== payload.postId),
          })),
        };
      });

      toast({
        title: "🗑️ Post Automatically Removed",
        description: payload.message,
        variant: "destructive",
        duration: 8000,
      });
    },
    [toast, queryClient]
  );

  const handleAccountSuspended = useCallback(
    (payload: AccountSuspendedPayload) => {
      const until = new Date(payload.bannedUntil).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      window.alert(
        `🚫 Account Suspended\n\n${payload.message}\n\nYour access will be restored on ${until}.`
      );

      logout();
    },
    [logout]
  );

  useEffect(() => {
    if (!socket) return;

    socket.on("CONTENT_WARNING", handleContentWarning);
    socket.on("POST_AUTO_DELETED", handlePostAutoDeleted);
    socket.on("ACCOUNT_SUSPENDED", handleAccountSuspended);

    return () => {
      socket.off("CONTENT_WARNING", handleContentWarning);
      socket.off("POST_AUTO_DELETED", handlePostAutoDeleted);
      socket.off("ACCOUNT_SUSPENDED", handleAccountSuspended);
    };
  }, [
    socket,
    handleContentWarning,
    handlePostAutoDeleted,
    handleAccountSuspended,
  ]);
}
