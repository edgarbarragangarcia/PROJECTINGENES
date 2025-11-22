import NextAuth, { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

import { createAdminClient } from '@/lib/supabase/server';

export const authConfig: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && user.email) {
        try {
          const supabase = createAdminClient();
          
          if (!supabase) {
             console.warn('Supabase admin client could not be created. Skipping profile sync.');
             return true;
          }
          
          // Check if profile exists
          const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', user.email)
            .maybeSingle(); // Use maybeSingle instead of single to avoid error when not found

          if (fetchError) {
            console.error('Error checking profile:', fetchError);
            return true; // Don't block sign in
          }

          if (!existingProfile) {
            // Create new profile with a generated UUID
            console.log('Creating new profile for', user.email);
            
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert([{
                email: user.email,
                full_name: user.name || user.email,
                role: 'user', // Default role
              }])
              .select()
              .single();

            if (insertError) {
              console.error('Error creating profile:', insertError);
              // Don't block sign in even if profile creation fails
            } else {
              console.log('Profile created successfully:', newProfile);
            }
          } else {
            // Update existing profile with latest info from Google
            await supabase
              .from('profiles')
              .update({
                full_name: user.name || existingProfile.full_name,
              })
              .eq('email', user.email);
            
            console.log('Profile updated for', user.email);
          }
        } catch (error) {
          console.error('Error syncing profile:', error);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          userId: user.id,
        };
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string,
        },
        accessToken: token.accessToken as string,
      };
    },
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnLogin = nextUrl.pathname.startsWith('/login');

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn && isOnLogin) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
