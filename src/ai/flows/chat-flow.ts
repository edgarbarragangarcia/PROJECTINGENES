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
    const {message} = input;

    // Step 1: Call the webhook and wait for its response. This is the only source of truth.
    const webhookResponse = await sendDocumentWebhook({ content: message });

    // Step 2: Check if the webhook provided a valid response. If so, use it and STOP.
    if (webhookResponse && webhookResponse.output) {
      console.log('Using response from webhook:', webhookResponse.output);
      return { message: webhookResponse.output };
    }

    // Step 3: If the webhook fails or does not provide a valid response, return an error message.
    console.log('Webhook did not provide a valid response. Returning error message.');
    return {message: 'Lo siento, no pude procesar esa respuesta.'};
  }
);
