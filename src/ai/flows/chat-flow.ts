'use server';
/**
 * @fileOverview A simple chat flow for project management assistance.
 *
 * - chat - A function that handles the chat interaction.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  async (input) => {
    const webhookUrl = 'https://n8nqa.ingenes.com:5689/webhook-test/projectBot';

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.message,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Webhook failed with status ${response.status}:`, errorBody);
        return { message: 'Lo siento, no pude procesar esa respuesta.' };
      }
      
      const responseData = await response.json();
      console.log('Webhook Response Data:', JSON.stringify(responseData, null, 2));
      
      // The webhook returns an array, e.g., [{ "output": "..." }]
      if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].output) {
        console.log('Successfully received message from webhook:', responseData[0].output);
        return { message: responseData[0].output };
      }
      
      console.log('Webhook responded, but with an unexpected format or no output.');
      return { message: 'Lo siento, no pude procesar esa respuesta.' };

    } catch (error: any) {
      console.error('Error sending to webhook:', error.message);
      return { message: 'Lo siento, ha ocurrido un error al contactar el servicio.' };
    }
  }
);
