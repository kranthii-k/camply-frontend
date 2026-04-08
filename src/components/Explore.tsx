import React, { useState } from "react";
import { DailyProblem } from "@/components/DailyProblem";
import { CreateTeamDialog } from "@/components/CreateTeamDialog";
import { CommunityChats } from "@/components/CommunityChats";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Users, Trophy, Zap, MessageCircle, ExternalLink, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useProStatus } from "@/hooks/useProStatus";
import { ProPaywall } from "@/components/ProPaywall";
import { HostEventModal } from "@/components/HostEventModal";
import { motion, AnimatePresence } from "framer-motion";

export function Explore() {
  const { toast } = useToast();
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [hostEventOpen, setHostEventOpen] = useState(false);
  const { data: pro } = useProStatus();

  // Fetch Hackathons
  const { data: hackathonsData, isLoading: loadingHackathons } = useQuery({
    queryKey: ['hackathons'],
    queryFn: async () => {
      const res = await apiFetch<{ hackathons: any[] }>('/api/v1/hackathons');
      return res.data?.hackathons || [];
    }
  });

  // Fetch Events
  const { data: eventsData, isLoading: loadingEvents } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await apiFetch<{ events: any[] }>('/api/v1/events');
      return res.data?.events || [];
    }
  });

  const handleQuickAction = (action: string) => {
    if (action === "Create Team") {
      setCreateTeamOpen(true);
    } else if (action === "Host Event") {
      if (!pro?.isPro) {
        toast({
          title: "Pro Feature",
          description: "Hosting events is exclusive to Camply Pro members.",
          variant: "destructive"
        });
      } else {
        setHostEventOpen(true);
      }
    } else {
      toast({
        title: action,
        description: `${action} feature coming soon...`,
      });
    }
  };

  return (
    <>
      <SEO />
      <div className="space-y-6">
        <div className="sticky top-0 bg-background/95 backdrop-blur p-4 border-b md:border-none z-10">
          <h1 className="text-xl font-bold text-foreground md:hidden">Explore</h1>
        </div>

        <div className="px-4 space-y-6 pb-20 md:pb-4">
          <Tabs defaultValue="featured" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
              <TabsTrigger value="featured" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Featured</span>
              </TabsTrigger>
              <TabsTrigger value="community" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Community</span>
              </TabsTrigger>
              <TabsTrigger value="hackathons" className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">Hackathons</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Events</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="featured" className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold text-foreground">Featured Content</h2>
                </div>
                <DailyProblem />
              </div>

              <Card className="p-6 bg-card">
                <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <QuickActionButton onClick={() => handleQuickAction("Create Team")} icon={<Users />} label="Create Team" />
                  <QuickActionButton onClick={() => handleQuickAction("Host Event")} icon={<Calendar />} label="Host Event" />
                  <QuickActionButton onClick={() => handleQuickAction("Submit Project")} icon={<Trophy />} label="Submit Project" />
                  <QuickActionButton onClick={() => handleQuickAction("Find Mentor")} icon={<Zap />} label="Find Mentor" />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="community" className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold text-foreground">Community Chats</h2>
                </div>
                <CommunityChats />
              </div>
            </TabsContent>

            <TabsContent value="hackathons" className="space-y-6">
              {!pro?.isPro ? (
                <ProPaywall />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary fill-current" />
                      <h2 className="text-xl font-bold">Live Hackathons</h2>
                    </div>
                    <Badge variant="outline">{hackathonsData?.length || 0} Total</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence mode="popLayout">
                      {loadingHackathons ? (
                        Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
                      ) : (
                        hackathonsData?.map((h: any) => (
                          <motion.div key={h.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <Card className="p-5 hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary group">
                              <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{h.title}</h3>
                                  <Badge className="bg-primary/10 text-primary border-none">{h.source}</Badge>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1"><Users className="w-4 h-4" /> {h.organizer}</div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <Button asChild variant="outline" size="sm" className="w-full">
                                    <a href={h.learnMoreUrl} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-3 h-3 mr-2" /> Learn More
                                    </a>
                                  </Button>
                                  <Button size="sm" className="w-full" onClick={() => setCreateTeamOpen(true)}>
                                    <Plus className="w-3 h-3 mr-2" /> Team Up
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="events" className="space-y-6">
              {!pro?.isPro ? (
                <ProPaywall />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-accent" />
                      <h2 className="text-xl font-bold">Hosted Events</h2>
                    </div>
                    <Button size="sm" onClick={() => handleQuickAction("Host Event")}>
                      <Plus className="w-4 h-4 mr-2" /> Post Event
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loadingEvents ? (
                      Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)
                    ) : eventsData?.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-muted-foreground">
                        No upcoming events. Be the first to host one!
                      </div>
                    ) : (
                      eventsData?.map((e: any) => (
                        <Card key={e.id} className="overflow-hidden hover:shadow-lg transition-all">
                          {e.bannerUrl && (
                            <img src={e.bannerUrl} alt={e.title} className="w-full h-40 object-cover" />
                          )}
                          <div className="p-5 space-y-3">
                            <h3 className="font-bold text-lg">{e.title}</h3>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {e.location}</div>
                              <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(e.date).toLocaleString()}</div>
                              <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Hosted by {e.user.username}</div>
                            </div>
                            <Button asChild className="w-full mt-2" variant="accent">
                              <a href={e.registrationUrl} target="_blank" rel="noopener noreferrer">Register Now</a>
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <CreateTeamDialog open={createTeamOpen} onOpenChange={setCreateTeamOpen} />
        <HostEventModal open={hostEventOpen} onOpenChange={setHostEventOpen} />
      </div>
    </>
  );
}

const QuickActionButton = ({ onClick, icon, label }: { onClick: () => void, icon: React.ReactNode, label: string }) => (
  <Button variant="outline" className="h-20 flex-col gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all" onClick={onClick}>
    {React.cloneElement(icon as React.ReactElement, { className: "h-6 w-6" })}
    <span className="text-sm font-medium">{label}</span>
  </Button>
);

const CardSkeleton = () => (
  <div className="h-40 bg-muted animate-pulse rounded-lg bg-gradient-to-r from-muted to-muted/50" />
);