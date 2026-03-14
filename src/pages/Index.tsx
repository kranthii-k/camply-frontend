import { Navigation } from "@/components/Navigation";
import { CreatePost } from "@/components/CreatePost";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Breadcrumbs from "@/components/ui/breadcrumb";
import { useQueryClient } from "@tanstack/react-query";

import { useSocketNotifications } from "@/hooks/useSocketNotifications";

const Index = () => {
  useSocketNotifications();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const queryClient = useQueryClient();

  const handlePostCreated = (newPost: any) => {
    queryClient.setQueryData(["feed", "all"], (oldData: any) => {
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

    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["feed", "all"] });
    }, 1500);
  };

  const handleTabChange = (tab: string) => {
    if (tab === "post") {
      setShowCreatePost(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Navigation onTabChange={handleTabChange} />
      
      {/* Main Content */}
      <main className="md:ml-64 p-4">
        <div className="max-w-2xl mx-auto">
          <Breadcrumbs />
          <Outlet />
        </div>
      </main>

      {/* Create Post Modal */}
      {showCreatePost && (
        <CreatePost onClose={() => setShowCreatePost(false)} onPostCreated={handlePostCreated} />
      )}
    </div>
  );
};

export default Index;
