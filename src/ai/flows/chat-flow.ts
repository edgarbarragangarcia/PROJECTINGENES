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

    // Step 1: Call the webhook and wait for its response.
    const webhookResponse = await sendDocumentWebhook({ content: message });

    // Step 2: Check if the webhook provided a valid response.
    if (webhookResponse && webhookResponse.output) {
      // If yes, use the webhook's response and finish the flow.
      return { message: webhookResponse.output };
    }

    // Step 3: If webhook did not respond, proceed to the GenAI model as a fallback.
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

    const modelMessage = output?.text;

    // Step 4: Check if the GenAI model provided a response.
    if (modelMessage) {
        return { message: modelMessage };
    }

    // Step 5: If both the webhook and the model fail, return a generic error.
    return {message: 'Lo siento, no pude procesar esa respuesta.'};
  }
);
