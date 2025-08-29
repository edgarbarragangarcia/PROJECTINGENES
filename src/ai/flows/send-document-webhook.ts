
'use server';
/**
 * @fileOverview A flow to send a document to a webhook.
 *
 * - sendDocumentToWebhook - A function that sends a document to a specified webhook URL.
 * - SendDocumentInput - The input type for the sendDocumentToWebhook function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SendDocumentInputSchema = z.object({
  fileName: z.string().describe('The name of the file.'),
  mimeType: z.string().describe('The MIME type of the file.'),
  fileData: z
    .string()
    .describe(
      "The file content, as a Base64 encoded string. Expected format: '<encoded_data>'."
    ),
});
export type SendDocumentInput = z.infer<typeof SendDocumentInputSchema>;

export async function sendDocumentToWebhook(input: SendDocumentInput): Promise<{ success: boolean; message: string }> {
  return sendDocumentFlow(input);
}

const sendDocumentFlow = ai.defineFlow(
  {
    name: 'sendDocumentFlow',
    inputSchema: SendDocumentInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async (input) => {
    const webhookUrl = 'https://n8nqa.ingenes.com:5689/webhook-test/historiaUsuario';

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: input.fileName,
          mimeType: input.mimeType,
          fileData: input.fileData,
        }),
      });

      if (!response.ok) {
        if (response.status === 413) {
            return {
                success: false,
                message: 'El archivo es demasiado grande. El servidor del webhook no puede procesar archivos de este tamaño.',
            };
        }
        const errorBody = await response.text();
        throw new Error(
          `Webhook failed with status ${response.status}: ${errorBody}`
        );
      }

      const responseData = await response.json();
      return {
        success: true,
        message: 'Document sent successfully to webhook.',
      };
    } catch (error: any) {
      console.error('Failed to send document to webhook:', error);
      return {
        success: false,
        message: error.message || 'An unknown error occurred.',
      };
    }
  }
);
