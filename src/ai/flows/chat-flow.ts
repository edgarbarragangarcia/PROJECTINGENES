'use server';
/**
 * @fileOverview A simple chat flow for project management assistance.
 *
 * - chat - A function that handles the chat interaction.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const ChatInputSchema = z.object({
  message: z.string().describe('The user message to the AI assistant.'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
      })
    )
    .optional()
    .describe('The history of the conversation.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

export const ChatOutputSchema = z.object({
  message: z.string().describe('The AI assistant response.'),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async input => {
    const {message, history = []} = input;
    const prompt = `You are a helpful project management assistant named PROJECTIA.
    Your goal is to provide concise and helpful advice to users about their projects.
    Keep your answers friendly and to the point.`;

    const {output} = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: message,
      system: prompt,
      history: history.map(h => ({
        role: h.role,
        content: [{text: h.content}],
      })),
    });

    return {message: output?.text || 'Lo siento, no pude procesar esa respuesta.'};
  }
);
