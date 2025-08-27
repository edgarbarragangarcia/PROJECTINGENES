'use client';

import { useState } from 'react';
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
import { chat } from '@/ai/flows/chat-flow';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

type Message = {
  role: 'user' | 'model';
  content: string;
};

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chat({
        message: input,
        history: messages.map(m => ({ role: m.role, content: m.content })),
      });
      const modelMessage: Message = { role: 'model', content: response.message };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'model',
        content: 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.',
      };
      setMessages(prev => [...prev, errorMessage]);
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
    setIsOpen(open);
    // Reset chat when closing
    if (!open) {
      setMessages([]);
    }
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <MessageSquare className="size-6" />
      </Button>
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
              {messages.map((message, index) => (
                <div
                  key={index}
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
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                   {message.role === 'user' && (
                    <Avatar className="size-8">
                      <AvatarFallback><UserIcon className="size-5" /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                 <div className="flex items-start gap-3 justify-start">
                    <Avatar className="size-8">
                        <AvatarFallback className='bg-primary text-primary-foreground'><Bot className="size-5" /></AvatarFallback>
                    </Avatar>
                     <div className="bg-muted rounded-xl p-3">
                        <Loader className="size-5 animate-spin text-primary" />
                    </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <SheetFooter>
            <div className="flex w-full items-center gap-2">
              <Input
                type="text"
                placeholder="Escribe tu mensaje..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon">
                <Send />
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
