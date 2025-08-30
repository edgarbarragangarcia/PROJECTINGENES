import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-task-priority.ts';
import '@/ai/flows/chat-flow.ts';
import '@/ai/flows/send-document-webhook.ts';
