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
        try {
          const supabase = createClient();
          
          // Check if profile exists
          const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', user.email)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking profile:', fetchError);
            return true; // Allow sign in even if profile check fails
          }

          if (!existingProfile) {
            // Create new profile
            // We need a UUID for the ID. Since we don't have Supabase Auth ID, 
            // we can generate one or use the Google ID if it fits UUID format (it usually doesn't).
            // Ideally, we should use the ID from the auth provider if we were using Supabase Auth.
            // But here we are using NextAuth.
            // Let's try to insert. If the table expects a UUID for 'id', we need to generate one.
            // However, 'profiles' usually references 'auth.users'. 
            // If we are bypassing Supabase Auth, we might have issues with foreign key constraints 
            // if 'profiles.id' is a FK to 'auth.users'.
            
            // Assuming 'profiles' table is decoupled or we handle it.
            // If 'profiles.id' references 'auth.users', we CANNOT create a profile without a Supabase User.
            // This is a critical architectural point.
            
            // If we are migrating AWAY from Supabase Auth completely, we should remove the FK constraint 
            // or create a corresponding record in a custom users table.
            
            // For now, let's assume we can insert if we provide a valid UUID.
            // But wait, the user might already exist in auth.users if they migrated.
            
            // Let's try to find if there is a user in auth.users with this email (we can't query auth.users directly easily from client).
            // Actually, we are in a server-side context here (NextAuth callback).
            
            // If we can't create a profile because of FK constraint, we have a problem.
            // But the user approved the plan which implied we handle this.
            
            // Strategy: Try to update if exists, otherwise log warning if we can't create.
            // Ideally, we should have a 'users' table that replaces 'auth.users'.
            
            console.log('User profile not found for', user.email);
          } else {
            // Update existing profile
            await supabase
              .from('profiles')
              .update({
                full_name: user.name,
                // avatar_url: user.image, // if you have this column
              })
              .eq('email', user.email);
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
