'use server';
/**
 * @fileOverview A simple chat flow for project management assistance.
 *
 * - chat - A function that handles the chat interaction.
 */

import {ai} from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
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
    const webhookUrl = 'https://n8nqa.ingenes.com:5689/webhook/projectBot';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 segundos de timeout

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || 'unknown';

    try {
      console.log(`Enviando al webhook desde ${userEmail}:`, input.message);
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.message,
          user: userEmail,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Webhook falló con estado ${response.status}:`, errorBody);
        return { message: 'Lo siento, no pude procesar esa respuesta.' };
      }
      
      const responseData = await response.json();
      console.log('Respuesta del Webhook (raw):', JSON.stringify(responseData, null, 2));
      
      // La respuesta esperada es un array, ej: [{ "output": "..." }]
      if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].output) {
        const webhookMessage = responseData[0].output;
        console.log('Mensaje extraído del webhook:', webhookMessage);
        return { message: webhookMessage };
      }
      
      console.log('El webhook respondió, pero con un formato inesperado o sin el campo "output".');
      return { message: 'Lo siento, no pude procesar esa respuesta.' };

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('La solicitud al webhook expiró después de 50 segundos.');
        return { message: 'Lo siento, la solicitud al servicio externo ha tardado demasiado en responder. Por favor, inténtalo de nuevo.' };
      }
      console.error('Error al enviar al webhook:', error.message);
      return { message: 'Lo siento, ha ocurrido un error al contactar el servicio.' };
    }
  }
);
