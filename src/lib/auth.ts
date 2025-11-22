import NextAuth, { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

import { createClient } from '@/lib/supabase/client';

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
        // try {
        //   const supabase = createClient();
        //   
        //   // Check if profile exists
        //   const { data: existingProfile, error: fetchError } = await supabase
        //     .from('profiles')
        //     .select('*')
        //     .eq('email', user.email)
        //     .single();

        //   if (fetchError && fetchError.code !== 'PGRST116') {
        //     console.error('Error checking profile:', fetchError);
        //     return true; // Allow sign in even if profile check fails
        //   }

        //   if (!existingProfile) {
        //     console.log('User profile not found for', user.email);
        //     // Logic to create profile would go here
        //   } else {
        //     // Update existing profile
        //     await supabase
        //       .from('profiles')
        //       .update({
        //         full_name: user.name,
        //       })
        //       .eq('email', user.email);
        //   }
        // } catch (error) {
        //   console.error('Error syncing profile:', error);
        // }
        console.log('User signed in:', user.email);
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
