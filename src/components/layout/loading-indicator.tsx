'use client';

import { useProjects } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import { LoadingOverlay } from '../ui/loading-overlay';

export function LoadingIndicator() {
  const { loading: projectsLoading } = useProjects();
  const { loading: tasksLoading } = useTasks();

  const isLoading = projectsLoading || tasksLoading;

  return <LoadingOverlay loading={isLoading} />;
}