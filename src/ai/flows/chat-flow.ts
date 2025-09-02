'use server';
/**
 * @fileOverview A simple chat flow for project management assistance.
 *
 * - chat - A function that handles the chat interaction.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { sendDocumentWebhook } from './send-document-webhook';

const ChatInputSchema = z.object({
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
type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  message: z.string().describe('The AI assistant response.'),
});
type ChatOutput = z.infer<typeof ChatOutputSchema>;

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

    // First, send the user's message to the webhook and wait for a potential response.
    const webhookResponse = await sendDocumentWebhook({ content: message });

    // If the webhook provides a direct answer, use it and finish the flow.
    if (webhookResponse && webhookResponse.output) {
      return { message: webhookResponse.output };
    }

    // If the webhook did not provide an answer, proceed to the GenAI model.
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
