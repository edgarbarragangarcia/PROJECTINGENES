'use server';
/**
 * @fileOverview A flow to send document data to a webhook.
 *
 * - sendDocumentWebhook - A function that sends a POST request with data to a specified webhook.
 * - WebhookInput - The input type for the sendDocumentWebhook function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WebhookInputSchema = z.object({
  content: z.string().describe('The content to send to the webhook.'),
});
export type WebhookInput = z.infer<typeof WebhookInputSchema>;

export async function sendDocumentWebhook(input: WebhookInput): Promise<void> {
  await sendDocumentWebhookFlow(input);
}

const sendDocumentWebhookFlow = ai.defineFlow(
  {
    name: 'sendDocumentWebhookFlow',
    inputSchema: WebhookInputSchema,
    outputSchema: z.void(),
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
          message: input.content,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Webhook failed with status ${response.status}:`, errorBody);
        // We don't throw an error to the user, just log it.
      } else {
        console.log('Successfully sent message to webhook.');
      }
    } catch (error: any) {
      console.error('Error sending to webhook:', error.message);
      // We don't throw an error to the user, just log it.
    }
  }
);
