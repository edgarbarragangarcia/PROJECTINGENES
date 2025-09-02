'use server';
/**
 * @fileOverview A flow to send document data to a webhook and get a response.
 *
 * - sendDocumentWebhook - A function that sends a POST request with data to a specified webhook.
 * - WebhookInput - The input type for the sendDocumentWebhook function.
 * - WebhookOutput - The output type for the sendDocumentWebhook function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WebhookInputSchema = z.object({
  content: z.string().describe('The content to send to the webhook.'),
});
export type WebhookInput = z.infer<typeof WebhookInputSchema>;

const WebhookOutputSchema = z.object({
  output: z.string().optional().describe('The response from the webhook.'),
});
export type WebhookOutput = z.infer<typeof WebhookOutputSchema>;


export async function sendDocumentWebhook(input: WebhookInput): Promise<WebhookOutput> {
  return await sendDocumentWebhookFlow(input);
}

const sendDocumentWebhookFlow = ai.defineFlow(
  {
    name: 'sendDocumentWebhookFlow',
    inputSchema: WebhookInputSchema,
    outputSchema: WebhookOutputSchema,
  },
  async (input) => {
    const webhookUrl = 'https://n8nqa.ingenes.com:5689/webhook/projectBot';

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.content,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Webhook failed with status ${response.status}:`, errorBody);
        return { output: undefined };
      }
      
      const responseData = await response.json();
      console.log('Webhook Response Data:', JSON.stringify(responseData, null, 2));
      
      // The webhook returns an array, e.g., [{ "output": "..." }]
      if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].output) {
        console.log('Successfully received message from webhook:', responseData[0].output);
        return { output: responseData[0].output };
      }
      
      console.log('Webhook responded, but with an unexpected format or no output.');
      return { output: undefined };

    } catch (error: any) {
      console.error('Error sending to webhook:', error.message);
      return { output: undefined };
    }
  }
);
