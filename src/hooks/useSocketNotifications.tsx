import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/lib/api';

/**
 * Connects to the backend Socket.IO server and listens for real-time
 * events relevant to the current user.
 *
 * Events handled:
 *  - `match`      → shows an in-app toast "It's a match! 🎉"
 *  - `new-comment` → notifies author of a new comment
 *  - `new-vote`   → notifies author of an upvote
 *  - `team-invite` → notifies of a team invitation
 *
 * The socket joins the room `user:<userId>` so the backend can target it.
 */
export function useSocketNotifications() {
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user || !accessToken) return;

    const socketUrl = API_BASE_URL || window.location.origin;
    const newSocket = io(socketUrl, {
      path: '/socket.io',
      auth: { token: accessToken },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket.IO connected');
    });

    newSocket.on('match', ({ matchedUserId }: { matchedUserId: string }) => {
      toast({
        title: "It's a match! 🎉",
        description: `You and another user are now connected! Start a conversation.`,
        duration: 6000,
      });
    });

    newSocket.on('new-comment', ({ postId }: { commenterId: string; postId: string }) => {
      toast({
        title: "New comment 💬",
        description: `Someone commented on your post.`,
      });
    });

    newSocket.on('new-vote', ({ value }: { voterId: string; postId: string; value: number }) => {
      toast({
        title: value === 1 ? "Someone upvoted your post 👍" : "Someone downvoted your post 👎",
        description: "Your trust score may be updated.",
      });
    });

    newSocket.on('team-invite', ({ teamName }: { teamId: string; teamName: string }) => {
      toast({
        title: `Team invite 🏆`,
        description: `You've been invited to join "${teamName}"!`,
        duration: 8000,
      });
    });

    newSocket.on('pro:activated', () => {
      toast({
        title: "Camply Pro Activated! ⚡",
        description: "Welcome to the elite tier. All premium features are now available.",
        variant: "default",
      });
      window.dispatchEvent(new CustomEvent('pro-status-update'));
    });

    newSocket.on('mention', ({ senderName, content, postId }: { senderName: string; content: string; postId: string }) => {
      toast({
        title: `@${senderName} mentioned you`,
        description: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        duration: 5000,
      });
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [user?.id, accessToken]);

  return socket;
}
