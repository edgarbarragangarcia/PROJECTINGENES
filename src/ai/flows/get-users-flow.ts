'use server';
/**
 * @fileOverview A flow to securely fetch all application users.
 *
 * - getUsers - A function that returns a list of all users.
 */

import { ai } from '@/ai/genkit';
import { supabase } from '@/lib/supabase/admin';
import { z } from 'genkit';

const UserSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    // Add other user properties you might need from user_metadata
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
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users from admin client:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    const filteredUsers = users.map(u => ({
        id: u.id,
        email: u.email,
    }));

    return { users: filteredUsers };
  }
);
