'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { MessageSquare, Send, Bot, User as UserIcon, Loader } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
  status: 'sending' | 'sent' | 'error';
};

interface ChatWidgetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}


export function ChatWidget({ isOpen, onOpenChange }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (messagesEndRef.current) {
      // cast to any to avoid TypeScript declaration mismatch in some environments
      (messagesEndRef.current as any).scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleSend = async () => {
    if (!input.trim()) return;

    const currentInput = input.trim();
    setInput('');

  // Snapshot of sent messages to include in the request (avoid stale closure)
  const historySnapshot = messages
    .filter(m => m.status === 'sent')
    .slice(-10) // Take only the last 10 messages
    .map(m => ({ role: m.role, content: m.content }));

  // Crear y añadir el mensaje del usuario
    const userMessageId = generateMessageId();
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: currentInput,
      status: 'sent'
    };
    setMessages(prev => [...prev, userMessage]);

    // Crear un mensaje temporal para el bot mientras esperamos la respuesta
    const botMessageId = generateMessageId();
    const pendingMessage: Message = {
      id: botMessageId,
      role: 'model',
      content: '',
      status: 'sending'
    };
  setMessages(prev => [...prev, pendingMessage]);
    setIsLoading(true);

    try {
      // fetch authenticated user from Supabase client
      const supabase = createClient();
      let authUser: any = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        authUser = user ?? null;
      } catch (e) {
        authUser = null;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          user: authUser ? { id: authUser.id, email: authUser.email } : null,
          // include snapshot + current input
          history: [
            ...historySnapshot,
            { role: 'user', content: currentInput }
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // Attempt to read text first, then parse JSON if possible. Many webhooks return
      // different shapes (plain text, { message }, { response }, nested objects, etc.).
      const text = await response.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        parsed = null;
      }

      // Determine reply string from parsed JSON or raw text
      const extractFromObject = (obj: any): string | null => {
        if (!obj || typeof obj !== 'object') return null;
        // prefer common keys
        const keys = ['output', 'message', 'response', 'text', 'content', 'reply', 'result'];
        for (const k of keys) {
          if (obj[k] && typeof obj[k] === 'string') return obj[k];
        }
        // if values contain strings, return first string
        for (const v of Object.values(obj)) {
          if (typeof v === 'string') return v;
        }
        return null;
      };

      const extractReply = (parsedObj: any, rawText: string): string | null => {
        if (parsedObj == null) return rawText && rawText.length > 0 ? rawText : null;

        if (typeof parsedObj === 'string') return parsedObj;

        if (Array.isArray(parsedObj)) {
          // If it's an array of strings, join them. If array of objects, try to extract
          const stringItems: string[] = [];
          for (const item of parsedObj) {
            if (typeof item === 'string') stringItems.push(item);
            else if (typeof item === 'object') {
              const s = extractFromObject(item);
              if (s) stringItems.push(s);
              else stringItems.push(JSON.stringify(item));
            } else {
              stringItems.push(String(item));
            }
          }
          return stringItems.join('\n');
        }

        if (typeof parsedObj === 'object') {
          const fromObj = extractFromObject(parsedObj);
          if (fromObj) return fromObj;

          // fallback: stringify
          try {
            return JSON.stringify(parsedObj);
          } catch (e) {
            return String(parsedObj);
          }
        }

        return rawText && rawText.length > 0 ? rawText : null;
      };

      let reply: string | null = extractReply(parsed, text);

      // Clean reply: trim and normalize newlines
      if (reply) {
        reply = reply.trim();
        // replace CRLF and multiple blank lines with single newline
        reply = reply.replace(/\r\n/g, '\n').replace(/\n{2,}/g, '\n\n');
      }

      // Update the pending bot message with the reply (or fallback)
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId
          ? {
              ...msg,
              content: reply || 'No se recibió respuesta',
              status: 'sent'
            }
          : msg
      ));
    } catch (error) {
      console.error('Chat error:', error);
      
      // Actualizar el mensaje pendiente con el error
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId
          ? {
              ...msg,
              content: 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.',
              status: 'error'
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    // Reset chat when closing
    if (!open) {
      setMessages([]);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent 
        side="right" 
        className="flex flex-col right-6 bottom-24 h-[60vh] w-[90vw] max-w-md rounded-xl"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 font-headline">
            <Bot className="size-6 text-primary" />
            Asistente PROJECTIA
          </SheetTitle>
          <SheetDescription>
            Hazme una pregunta sobre gestión de proyectos, tareas o productividad.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 my-4 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex items-start gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'model' && (
                  <Avatar className="size-8">
                    <AvatarFallback className='bg-primary text-primary-foreground'><Bot className="size-5" /></AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'max-w-xs md:max-w-md lg:max-w-lg rounded-xl p-3 text-sm',
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                    message.status === 'error' && 'bg-destructive text-destructive-foreground'
                  )}
                >
                  {message.status === 'sending' ? (
                    <Loader className="size-5 animate-spin text-primary" />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                 {message.role === 'user' && (
                  <Avatar className="size-8">
                    <AvatarFallback><UserIcon className="size-5" /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <SheetFooter>
          <div className="flex w-full items-center gap-2">
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Escribe tu mensaje..."
              value={input}
              onChange={(e: any) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={messages.some(m => m.status === 'sending') || !input.trim()} size="icon">
              <Send />
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
