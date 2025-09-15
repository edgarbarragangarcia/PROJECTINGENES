'use server';
/**
 * @fileOverview A flow to securely fetch all application users from the profiles table.
 *
 * - getUsers - A function that returns a list of all users.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';

const UserSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
});

const GetUsersOutputSchema = z.object({
  users: z.array(UserSchema),
});
export type GetUsersOutput = z.infer<typeof GetUsersOutputSchema>;

export async function getUsers(): Promise<GetUsersOutput> {
  return getUsersFlow();
}

const getUsersFlow = ai.defineFlow(
  {
    name: 'getUsersFlow',
    inputSchema: z.void(),
    outputSchema: GetUsersOutputSchema,
  },
  async () => {
    // Note: It's important that the 'profiles' table exists for this to work.
    // If you see a "table not found" error, it means the SQL script to create
    // the 'profiles' table and its associated trigger was not run in the Supabase SQL Editor.
    const supabase = createClient();
    
    const { data, error } = await supabase.from('profiles').select('id, email');
    
    if (error) {
      console.error('Error fetching users from profiles table:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    const filteredUsers = (data || []).map(u => ({
        id: u.id,
        email: u.email || '',
    }));

    return { users: filteredUsers };
  }
);
