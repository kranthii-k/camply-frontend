import { apiFetch } from '@/lib/api';

export interface MatchProfile {
  id: string;
  username: string;
  name: string | null;
  avatar: string | null;
  bio: string | null;
  college: string | null;
  skills: string[];
  trustLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  trustScore: number;
}

export interface ProfilesResponse {
  profiles: MatchProfile[];
}

export interface SwipeResponse {
  matched: boolean;
  toUserId?: string;
}

export const matchApi = {
  /** Fetch batch of profiles the user hasn't swiped yet */
  getProfiles: async (skills?: string): Promise<ProfilesResponse> => {
    const params = new URLSearchParams({ limit: '20' });
    if (skills) params.append('skills', skills);
    const response = await apiFetch<ProfilesResponse>(`/api/v1/match/profiles?${params}`);
    return response.data!;
  },

  /** Send a swipe — action: 'like' (right) | 'pass' (left) */
  swipe: async (toUserId: string, action: 'like' | 'pass'): Promise<SwipeResponse> => {
    const response = await apiFetch<SwipeResponse>('/api/v1/match/like', {
      method: 'POST',
      body: JSON.stringify({ toUserId, action }),
    });
    return response.data!;
  },

  /** Fetch mutual matches */
  getMatches: async (): Promise<{ matches: MatchProfile[] }> => {
    const response = await apiFetch<{ matches: MatchProfile[] }>('/api/v1/match/matches');
    return response.data!;
  },
};
