
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, MessageSquare, PlusCircle } from 'lucide-react';
import { ChatWidget } from '../chat/chat-widget';
import { TaskFormDialog } from '../task/task-form-dialog';
import { useProjects } from '@/hooks/use-projects';

export function FloatingActionMenu() {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const { projects } = useProjects();

  const handleChatClick = () => {
    setIsPopoverOpen(false);
    setIsChatOpen(true);
  };

  const handleTaskClick = () => {
    setIsPopoverOpen(false);
    setIsTaskFormOpen(true);
  };

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg"
            size="icon"
          >
            <Plus className="size-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          className="w-auto p-2 rounded-xl mb-2"
        >
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              className="justify-start px-3"
              onClick={handleTaskClick}
            >
              <PlusCircle className="mr-2" />
              Nueva Tarea
            </Button>
            <Button
              variant="ghost"
              className="justify-start px-3"
              onClick={handleChatClick}
            >
              <MessageSquare className="mr-2" />
              Asistente AI
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <ChatWidget isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
      {isTaskFormOpen && (
        <TaskFormDialog
          open={isTaskFormOpen}
          onOpenChange={setIsTaskFormOpen}
        />
      )}
    </>
  );
}
