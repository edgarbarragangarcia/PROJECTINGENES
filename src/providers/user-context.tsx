'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/domain';

interface UserContextType {
    user: any | null;
    profile: Profile | null;
    isAdmin: boolean;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const supabase = createClient();

    const refreshProfile = async () => {
        if (!session?.user?.email) {
            setProfile(null);
            return;
        }

        try {
            setIsLoadingProfile(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', session.user.email)
                .single();

            if (error) {
                console.warn('Error fetching profile:', error);
                // If profile doesn't exist, we might want to create it or just wait for the auth callback to handle it
            }

            if (data) {
                setProfile(data as Profile);
            }
        } catch (error) {
            console.error('Exception fetching profile:', error);
        } finally {
            setIsLoadingProfile(false);
        }
    };

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.email) {
            refreshProfile();
        } else if (status === 'unauthenticated') {
            setProfile(null);
        }
    }, [session, status]);

    const value = {
        user: session?.user || null,
        profile,
        isAdmin: profile?.role === 'admin',
        isLoading: status === 'loading' || isLoadingProfile,
        refreshProfile
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
