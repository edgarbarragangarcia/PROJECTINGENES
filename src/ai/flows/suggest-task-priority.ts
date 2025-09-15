'use server';

/**
 * @fileOverview This file contains the Genkit flow for suggesting task priorities based on task descriptions.
 *
 * - suggestTaskPriority - A function that takes a task description and returns a suggested priority level.
 * - SuggestTaskPriorityInput - The input type for the suggestTaskPriority function.
 * - SuggestTaskPriorityOutput - The return type for the suggestTaskPriority function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTaskPriorityInputSchema = z.object({
  description: z
    .string()
    .describe('The description of the task for which to suggest a priority.'),
});
export type SuggestTaskPriorityInput = z.infer<typeof SuggestTaskPriorityInputSchema>;

const SuggestTaskPriorityOutputSchema = z.object({
  priority: z
    .enum(['High', 'Medium', 'Low'])
    .describe('The suggested priority level for the task.'),
  reasoning: z
    .string()
    .describe('The reasoning behind the suggested priority level.'),
});
export type SuggestTaskPriorityOutput = z.infer<typeof SuggestTaskPriorityOutputSchema>;

export async function suggestTaskPriority(
  input: SuggestTaskPriorityInput
): Promise<SuggestTaskPriorityOutput> {
  return suggestTaskPriorityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTaskPriorityPrompt',
  input: {schema: SuggestTaskPriorityInputSchema},
  output: {schema: SuggestTaskPriorityOutputSchema},
  prompt: `You are an AI assistant designed to suggest task priorities based on task descriptions.

  Analyze the following task description and determine whether the task should be of "High", "Medium", or "Low" priority.

  Provide a brief reasoning for your suggestion.

  Task Description: {{{description}}}
  `,
});

const suggestTaskPriorityFlow = ai.defineFlow(
  {
    name: 'suggestTaskPriorityFlow',
    inputSchema: SuggestTaskPriorityInputSchema,
    outputSchema: SuggestTaskPriorityOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
