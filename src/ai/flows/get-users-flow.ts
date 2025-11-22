'use server';
/**
 * @fileOverview A flow to securely fetch all application users from the profiles table.
 *
 * - getUsers - A function that returns a list of all users.
 */

import { ai } from '@/ai/genkit';
// import { createClient } from '@/lib/supabase/server';
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
    // TODO: Replace with proper user fetching from new auth system
    // const supabase = createClient();
    // const { data, error } = await supabase.from('profiles').select('id, email');
    
    // Temporarily return empty array until new user system is in place
    return { users: [] };
  }
);
