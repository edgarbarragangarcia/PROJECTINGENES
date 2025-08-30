'use server';

/**
 * @fileOverview A flow to send an email notification when a user is assigned to a task.
 *
 * - sendAssignmentNotification - A function that handles sending the notification.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SendAssignmentNotificationSchema = z.object({
  assigneeEmail: z.string().email().describe('The email of the user assigned to the task.'),
  taskTitle: z.string().describe('The title of the task.'),
  projectName: z.string().describe('The name of the project the task belongs to.'),
  assignedBy: z.string().describe('The email of the user who assigned the task.'),
});
export type SendAssignmentNotificationInput = z.infer<typeof SendAssignmentNotificationSchema>;

export async function sendAssignmentNotification(input: SendAssignmentNotificationInput) {
  return sendAssignmentNotificationFlow(input);
}

const sendAssignmentNotificationFlow = ai.defineFlow(
  {
    name: 'sendAssignmentNotificationFlow',
    inputSchema: SendAssignmentNotificationSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async (input) => {
    const { assigneeEmail, taskTitle, projectName, assignedBy } = input;
    
    // IMPORTANT: To make this work, you need a Resend account and an API key.
    // Get one at https://resend.com and add the key to your .env file.
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey || apiKey.startsWith("re_xxx")) {
      const message = `Skipping email notification because RESEND_API_KEY is not configured. Would have sent to ${assigneeEmail}.`;
      console.warn(message);
      return { success: false, message };
    }

    const emailHtml = `
      <html>
        <body>
          <h1>Has sido asignado a una nueva tarea</h1>
          <p>Hola,</p>
          <p>Has sido asignado a la tarea "<strong>${taskTitle}</strong>" en el proyecto "<strong>${projectName}</strong>" por ${assignedBy}.</p>
          <p>Puedes ver los detalles en tu panel de PROJECTIA.</p>
          <p>¡Que tengas un día productivo!</p>
          <p>El equipo de PROJECTIA</p>
        </body>
      </html>
    `;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'PROJECTIA <onboarding@resend.dev>', // You must configure a verified domain in Resend
          to: [assigneeEmail],
          subject: `Nueva tarea asignada en PROJECTIA: ${taskTitle}`,
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Failed to send email: ${errorBody.message || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Email sent successfully:', data);
      return { success: true, message: `Email sent to ${assigneeEmail}.` };

    } catch (error: any) {
      console.error("Error sending notification email:", error);
      return { success: false, message: error.message || 'An unknown error occurred.' };
    }
  }
);
