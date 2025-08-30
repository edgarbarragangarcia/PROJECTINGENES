

'use client';

import { ProjectsContext, initialProjectsState, type ProjectsContextType } from '@/hooks/use-projects';
import { TasksContext, initialTasksState, type TasksContextType } from '@/hooks/use-tasks';
import { DailyNotesContext, initialDailyNotesState, type DailyNotesState, type DailyNotesContextType } from '@/hooks/use-daily-notes';
import { createClient } from '@/lib/supabase/client';
import type { Project, ProjectWithProgress, Task, DailyNote, User, Subtask, UserStory } from '@/lib/types';
import { useState, useCallback, useEffect, type ReactNode, useMemo } from 'react';
import { format } from 'date-fns';
import { GoogleCalendarProvider } from './google-calendar-provider';
import type { Session } from '@supabase/supabase-js';
import { UserStoriesContext, initialUserStoriesState, type UserStoriesContextType } from '@/hooks/use-user-stories';
import { sendAssignmentNotification } from '@/ai/flows/send-assignment-notification';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const SendAssignmentNotificationSchema = z.object({
  assigneeEmail: z.string().email().describe('The email of the user assigned to the task.'),
  taskTitle: z.string().describe('The title of the task.'),
  projectName: z.string().describe('The name of the project the task belongs to.'),
  assignedBy: z.string().describe('The email of the user who assigned the task.'),
});
type SendAssignmentNotificationInput = z.infer<typeof SendAssignmentNotificationSchema>;

export const adminEmails = ['edgarbarragangarcia@gmail.com', 'eabarragang@ingenes.com', 'ntorres@ingenes.com'];

export const CombinedProvider = ({ children }: { children: ReactNode }) => {
  const [projectsState, setProjectsState] = useState(initialProjectsState);
  const [tasksState, setTasksState] = useState(initialTasksState);
  const [dailyNotesState, setDailyNotesState] = useState<DailyNotesState>(initialDailyNotesState);
  const [userStoriesState, setUserStoriesState] = useState(initialUserStoriesState);
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // --- Projects ---
  const setProjects = (projects: ProjectWithProgress[]) => setProjectsState(prevState => ({ ...prevState, projects }));
  const setProjectsLoading = (loading: boolean) => setProjectsState(prevState => ({ ...prevState, loading }));
  const setProjectsError = (error: Error | null) => setProjectsState(prevState => ({ ...prevState, error }));
  
  // --- Tasks ---
  const setTasks = (tasks: Task[]) => setTasksState(prevState => ({ ...prevState, tasks }));
  const setTasksLoading = (loading: boolean) => setTasksState(prevState => ({ ...prevState, loading }));
  const setDraggedTask = (id: string | null) => setTasksState(prevState => ({ ...prevState, draggedTask: id }));
  
  // --- Daily Notes ---
  const setDailyNotes = (notes: DailyNote[]) => setDailyNotesState(prevState => ({ ...prevState, notes }));
  const setDailyNotesLoading = (loading: boolean) => setDailyNotesState(prevState => ({ ...prevState, loading }));

  // --- User Stories ---
  const setUserStories = (stories: UserStory[]) => setUserStoriesState(prevState => ({ ...prevState, userStories: stories }));
  const setUserStoriesLoading = (loading: boolean) => setUserStoriesState(prevState => ({ ...prevState, loading }));

  const fetchUsers = useCallback(async () => {
    // This is a potential security risk if not handled carefully with RLS.
    // Assuming you have a policy that allows users to view other users' emails for assignment.
    // A better approach would be a dedicated 'profiles' table.
    // For now, we'll proceed assuming RLS is in place or this is acceptable.
     const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('Error fetching users:', error);
      setAllUsers([]);
    } else {
      setAllUsers(users || []);
    }
  }, [supabase.auth.admin]);

  const fetchProjects = useCallback(async (user: User) => {
    setProjectsState(prevState => ({ ...prevState, loading: true, error: null }));
    try {
        const isAdmin = user.email && adminEmails.includes(user.email);
        let query = supabase.from('projects').select('*');

        if (!isAdmin) {
            query = query.eq('user_id', user.id);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
            console.error("Supabase error fetching projects:", error);
            throw error;
        }
        
        const enrichedData = (data || []).map(p => {
          if (!p.creator_name && p.creator_email === user.email && user.user_metadata?.full_name) {
            return { ...p, creator_name: user.user_metadata.full_name };
          }
          return p;
        });

        setProjectsState(prevState => ({ ...prevState, loading: false, projects: enrichedData || [] }));
    } catch (error: any) {
        console.error('Error fetching projects:', error);
        setProjectsState(prevState => ({ ...prevState, loading: false, error }));
    }
  }, [supabase]);


  const fetchTasks = useCallback(async (user: User) => {
    setTasksState(prevState => ({ ...prevState, loading: true, error: null }));
    try {
        const isAdmin = user.email && adminEmails.includes(user.email);
        let query = supabase.from('tasks').select('*, subtasks(*)');

        if (!isAdmin) {
            query = query.eq('user_id', user.id);
        }

        const { data: tasksData, error: tasksError } = await query.order('created_at', { ascending: false });

        if (tasksError) throw tasksError;

        const formattedTasks = (tasksData || []).map(task => ({
            ...task,
            projectId: task.project_id,
            startDate: task.start_date ? new Date(task.start_date) : undefined,
            dueDate: task.due_date ? new Date(task.due_date) : undefined,
            subtasks: task.subtasks || [],
        }));

        setTasksState(prevState => ({ ...prevState, loading: false, tasks: formattedTasks as Task[] }));
    } catch (error: any) {
        console.error('Error fetching tasks:', error);
        setTasksState(prevState => ({ ...prevState, loading: false, error }));
    }
  }, [supabase]);

  const fetchDailyNotes = useCallback(async (user: User) => {
    setDailyNotesState(prevState => ({ ...prevState, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('daily_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      setDailyNotesState(prevState => ({ ...prevState, loading: false, notes: data || [] }));
    } catch (error: any) {
      console.error('Error fetching daily notes:', error);
      setDailyNotesState(prevState => ({ ...prevState, loading: false, error }));
    }
  }, [supabase]);

   const fetchUserStories = useCallback(async (user: User) => {
    setUserStoriesLoading(true);
    try {
      let query = supabase.from('user_stories').select('*');

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setUserStories(data || []);
    } catch (error: any) {
      console.error('Error fetching user stories:', error);
    } finally {
      setUserStoriesLoading(false);
    }
  }, [supabase]);

  const fetchAllData = useCallback(async (user: User) => {
    await Promise.all([
      fetchProjects(user),
      fetchTasks(user),
      fetchDailyNotes(user),
      fetchUserStories(user),
      fetchUsers(),
    ]);
  }, [fetchProjects, fetchTasks, fetchDailyNotes, fetchUserStories, fetchUsers]);


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      if (session) {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          fetchAllData(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setProjectsState(initialProjectsState);
        setTasksState(initialTasksState);
        setDailyNotesState(initialDailyNotesState);
        setUserStoriesState(initialUserStoriesState);
        setAllUsers([]);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, fetchAllData]);

  const calculateProgress = useCallback((projectId: string, allTasks: Task[]): number => {
    const projectTasks = allTasks.filter(t => t.projectId === projectId);
    if (projectTasks.length === 0) return 0;
    const completedTasks = projectTasks.filter(t => t.status === 'Done' || t.status === 'Backlog').length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  }, []);
  
  const projectsWithProgress = useMemo(() => {
    return projectsState.projects.map(p => ({
      ...p,
      progress: calculateProgress(p.id, tasksState.tasks)
    }));
  }, [projectsState.projects, tasksState.tasks, calculateProgress]);

  const uploadFileWithProgress = async (
    bucket: string,
    fileName: string,
    file: File,
    onProgress?: (progress: number) => void
  ) => {
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
        currentProgress += 10;
        if (currentProgress < 100) {
            onProgress?.(currentProgress);
        } else {
            clearInterval(progressInterval);
        }
    }, 100);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });
    
    clearInterval(progressInterval);
    onProgress?.(100);
    
    return { data, error };
  };

  const addProject = async (projectData: Omit<Project, 'id' | 'created_at' | 'user_id' | 'progress'> & { imageFile?: File, onUploadProgress?: (progress: number) => void }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { imageFile, onUploadProgress, ...restOfProjectData } = projectData;

    const dataToInsert: Record<string, any> = { 
      ...restOfProjectData, 
      user_id: user.id, 
      creator_email: user.email,
      creator_name: user.user_metadata?.full_name || user.email,
    };

    if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await uploadFileWithProgress(
          'project_images',
          fileName,
          imageFile,
          onUploadProgress
        );
        
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('project_images')
            .getPublicUrl(fileName);
            
        dataToInsert.image_url = publicUrlData.publicUrl;
    }
    
    const { data, error } = await supabase
      .from('projects')
      .insert(dataToInsert)
      .select('*')
      .single();
      
    if (error) throw error;
    
    if (data) {
      await fetchProjects(user);
    }
  };

  const updateProject = async (id: string, data: Partial<Omit<Project, 'id' | 'created_at' | 'user_id' | 'progress'>> & { imageFile?: File, onUploadProgress?: (progress: number) => void }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { imageFile, onUploadProgress, ...restOfProjectData } = data;
    const dataToUpdate: Record<string, any> = { ...restOfProjectData, creator_name: user.user_metadata?.full_name || user.email, };
    
    const existingProject = projectsState.projects.find(p => p.id === id);

    if (imageFile) {
        if (existingProject?.image_url) {
            const oldFileName = existingProject.image_url.split(`${user.id}/`).pop();
            if (oldFileName) {
              await supabase.storage.from('project_images').remove([`${user.id}/${oldFileName}`]);
            }
        }

        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await uploadFileWithProgress(
          'project_images',
          fileName,
          imageFile,
          onUploadProgress
        );

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('project_images')
            .getPublicUrl(fileName);
            
        dataToUpdate.image_url = publicUrlData.publicUrl;
    } else if (dataToUpdate.image_url === null) {
      if (existingProject?.image_url) {
        const oldFileName = existingProject.image_url.split(`${user.id}/`).pop();
        if (oldFileName) {
          await supabase.storage.from('project_images').remove([`${user.id}/${oldFileName}`]);
        }
      }
    }

    const { error } = await supabase.from('projects').update(dataToUpdate).eq('id', id);
    if (error) throw error;
    await fetchProjects(user);
  };

  const deleteProject = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");
    
    const projectToDelete = projectsState.projects.find(p => p.id === id);
    if (projectToDelete?.image_url) {
        const fileName = projectToDelete.image_url.split('/').pop();
        if (fileName) {
            try {
                await supabase.storage.from('project_images').remove([`${user.id}/${fileName}`]);
            } catch(e) {
                console.error("Failed to delete stale storage object:", e);
            }
        }
    }
    
    // RLS and CASCADE should handle deleting user stories and tasks
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    
    setTasksState(prevState => ({ 
      ...prevState, 
      tasks: prevState.tasks.filter((t) => t.projectId !== id)
    }));
    setUserStoriesState(prevState => ({
      ...prevState,
      userStories: prevState.userStories.filter((us) => us.project_id !== id)
    }));
    setProjectsState(prevState => ({ 
      ...prevState, 
      projects: prevState.projects.filter((p) => p.id !== id) 
    }));
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'user_id'> & { subtasks?: { title: string; is_completed: boolean }[], imageFile?: File, onUploadProgress?: (progress: number) => void }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { startDate, dueDate, projectId, subtasks, imageFile, onUploadProgress, assignees, ...restOfTaskData } = taskData;
      
      let imageUrl: string | undefined = undefined;
      if (imageFile) {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${user.id}/${projectId}_${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await uploadFileWithProgress(
            'task_attachments',
            fileName,
            imageFile,
            onUploadProgress
          );
          
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
              .from('task_attachments')
              .getPublicUrl(fileName);
              
          imageUrl = publicUrlData.publicUrl;
      }

      const dataToInsert: any = {
        ...restOfTaskData,
        user_id: user.id,
        project_id: projectId,
        image_url: imageUrl,
        assignees: assignees || null,
      };
      if (startDate) dataToInsert.start_date = startDate.toISOString();
      if (dueDate) dataToInsert.due_date = dueDate.toISOString();


      const { data: taskResult, error: taskError } = await supabase
          .from('tasks')
          .insert(dataToInsert)
          .select()
          .single();

      if (taskError) throw taskError;
      if (!taskResult) throw new Error("Failed to create task");

      let createdSubtasks: Subtask[] = [];
      if (subtasks && subtasks.length > 0) {
          const subtasksToInsert = subtasks.map(st => ({
              ...st,
              task_id: taskResult.id,
              user_id: user.id,
          }));
          const { data: subtasksResult, error: subtasksError } = await supabase
              .from('subtasks')
              .insert(subtasksToInsert)
              .select();

          if (subtasksError) {
              await supabase.from('tasks').delete().eq('id', taskResult.id); // Rollback
              throw subtasksError;
          }
          createdSubtasks = subtasksResult || [];
      }

      const formattedTask = {
          ...taskResult,
          projectId: taskResult.project_id,
          startDate: taskResult.start_date ? new Date(taskResult.start_date) : undefined,
          dueDate: taskResult.due_date ? new Date(taskResult.due_date) : undefined,
          subtasks: createdSubtasks,
      };
      setTasksState(prevState => ({
          ...prevState,
          tasks: [formattedTask as Task, ...prevState.tasks],
      }));
      
      if (assignees && assignees.length > 0) {
          const project = projectsWithProgress.find(p => p.id === projectId);
          assignees.forEach(assigneeEmail => {
            sendAssignmentNotification({
                assigneeEmail: assigneeEmail,
                taskTitle: taskResult.title,
                projectName: project?.name || 'Unknown Project',
                assignedBy: user.email || 'un usuario',
            }).then(result => {
                if (!result.success) {
                    console.warn("Email notification may have failed:", result.message);
                    if (result.message.includes('RESEND_API_KEY is not configured')) {
                      toast({
                        variant: 'default',
                        title: 'Notificación por correo no configurada',
                        description: 'Para notificar a los usuarios asignados, configura la API key de Resend.',
                      });
                    }
                }
            });
          });
      }
  };

  const updateTask = async (id: string, taskData: Partial<Omit<Task, 'id' | 'created_at' | 'user_id'>> & { subtasks?: { title: string; is_completed: boolean }[], imageFile?: File, onUploadProgress?: (progress: number) => void }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");
    
    const existingTask = tasksState.tasks.find(t => t.id === id);

    const { imageFile, onUploadProgress, subtasks, ...restOfTaskData } = taskData;
    const dataToUpdate: Record<string, any> = { ...restOfTaskData };

    if (imageFile) {
        if (existingTask?.image_url) {
            const oldFileName = existingTask.image_url.split(`${user.id}/`).pop();
            if (oldFileName) {
              await supabase.storage.from('task_attachments').remove([`${user.id}/${oldFileName}`]);
            }
        }

        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${dataToUpdate.projectId || existingTask?.projectId || 'unknown_project'}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await uploadFileWithProgress(
          'task_attachments',
          fileName,
          imageFile,
          onUploadProgress
        );

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('task_attachments')
            .getPublicUrl(fileName);
            
        dataToUpdate.image_url = publicUrlData.publicUrl;
    } else if (dataToUpdate.image_url === null) {
      if (existingTask?.image_url) {
        const oldFileName = existingTask.image_url.split(`${user.id}/`).pop();
        if (oldFileName) {
          await supabase.storage.from('task_attachments').remove([`${user.id}/${oldFileName}`]);
        }
      }
    }


    if (dataToUpdate.startDate) {
        dataToUpdate.start_date = dataToUpdate.startDate.toISOString();
        delete dataToUpdate.startDate;
    }
    if (dataToUpdate.dueDate) {
        dataToUpdate.due_date = dataToUpdate.dueDate.toISOString();
        delete dataToUpdate.dueDate;
    }
    if (dataToUpdate.projectId) {
        dataToUpdate.project_id = dataToUpdate.projectId;
        delete dataToUpdate.projectId;
    }
    
    const { error } = await supabase.from('tasks').update(dataToUpdate).eq('id', id);
    if (error) throw error;
    
    if (subtasks) {
      const { error: deleteError } = await supabase.from('subtasks').delete().eq('task_id', id);
      if (deleteError) throw deleteError;

      if (subtasks.length > 0) {
        const subtasksToInsert = subtasks.map(st => ({
            ...st,
            task_id: id,
            user_id: user.id,
        }));
        const { error: insertError } = await supabase.from('subtasks').insert(subtasksToInsert);
        if (insertError) throw insertError;
      }
    }
    
    const newAssignees = dataToUpdate.assignees;
    if (newAssignees) {
        const oldAssignees = existingTask?.assignees || [];
        const addedAssignees = newAssignees.filter((a: string) => !oldAssignees.includes(a));

        if (addedAssignees.length > 0) {
            const project = projectsWithProgress.find(p => p.id === (dataToUpdate.project_id || existingTask?.projectId));
            addedAssignees.forEach((assigneeEmail: string) => {
                sendAssignmentNotification({
                    assigneeEmail: assigneeEmail,
                    taskTitle: dataToUpdate.title || existingTask?.title || 'una tarea',
                    projectName: project?.name || 'un proyecto desconocido',
                    assignedBy: user.email || 'un usuario',
                }).then(result => {
                    if (!result.success) {
                        console.warn("Email notification may have failed:", result.message);
                        if (result.message.includes('RESEND_API_KEY is not configured')) {
                            toast({
                                variant: 'default',
                                title: 'Notificación por correo no configurada',
                                description: 'Para notificar a los usuarios asignados, configura la API key de Resend.',
                            });
                        }
                    }
                });
            });
        }
    }


    await fetchTasks(user);
  };

  const deleteTask = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");
    
    const taskToDelete = tasksState.tasks.find(t => t.id === id);
    if (taskToDelete?.image_url) {
      const fileName = taskToDelete.image_url.split('/').pop();
      if (fileName) {
          try {
            await supabase.storage.from('task_attachments').remove([`${user.id}/${fileName}`]);
          } catch(e) {
            console.error("Failed to delete stale storage object:", e);
          }
      }
    }
    
    const { error: subtaskError } = await supabase.from('subtasks').delete().eq('task_id', id);
    if (subtaskError) throw subtaskError;

    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    
    setTasksState(prevState => ({ 
      ...prevState, 
      tasks: prevState.tasks.filter((task) => task.id !== id) 
    }));
  };
  
  const getTasksByStatus = (status: Task['status'], projectId?: string) => {
    let filteredTasks = tasksState.tasks.filter((task) => task.status === status);
    if (projectId) filteredTasks = filteredTasks.filter(task => task.projectId === projectId);
    return filteredTasks;
  };

  const getTasksByProject = (projectId: string) => tasksState.tasks.filter(task => task.projectId === projectId);

  const addNote = async (note: string, date: Date) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const dateString = format(date, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('daily_notes')
      .insert({
        user_id: user.id,
        date: dateString,
        note: note,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    if (data) {
      setDailyNotesState(prevState => ({
        ...prevState,
        notes: [...prevState.notes, data].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      }));
    }
  };

  const updateNote = async (id: string, note: string) => {
    const { data, error } = await supabase
      .from('daily_notes')
      .update({ note })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    if (data) {
      setDailyNotesState(prevState => ({
        ...prevState,
        notes: prevState.notes.map(n => (n.id === id ? data : n)),
      }));
    }
  };
  
  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('daily_notes').delete().eq('id', id);
    if (error) throw error;

    setDailyNotesState(prevState => ({
      ...prevState,
      notes: prevState.notes.filter(n => n.id !== id),
    }));
  };

  const getNotesByDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return dailyNotesState.notes.filter(n => n.date === dateString);
  };
  
    const addUserStory = async (storyData: Omit<UserStory, 'id' | 'created_at' | 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { data, error } = await supabase
      .from('user_stories')
      .insert({ ...storyData, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    if (data) {
      setUserStoriesState(prevState => ({
        ...prevState,
        userStories: [data, ...prevState.userStories],
      }));
    }
  };

  const updateUserStory = async (id: string, storyData: Partial<Omit<UserStory, 'id' | 'created_at' | 'user_id' | 'project_id'>>) => {
    const { data, error } = await supabase
      .from('user_stories')
      .update(storyData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (data) {
      setUserStoriesState(prevState => ({
        ...prevState,
        userStories: prevState.userStories.map(s => s.id === id ? data : s),
      }));
    }
  };

  const deleteUserStory = async (id: string) => {
    const { error } = await supabase.from('user_stories').delete().eq('id', id);
    if (error) throw error;
    setUserStoriesState(prevState => ({
      ...prevState,
      userStories: prevState.userStories.filter(s => s.id !== id),
    }));
  };


  const projectsContextValue: ProjectsContextType = { 
    ...projectsState, 
    projects: projectsWithProgress, 
    addProject: addProject as any, 
    updateProject: updateProject as any, 
    deleteProject, 
    fetchProjects, 
    setProjects, 
    setProjectsLoading, 
    setProjectsError 
  };
  
  const tasksContextValue: TasksContextType = { 
    ...tasksState, 
    allUsers,
    addTask: addTask as any, 
    updateTask: updateTask as any, 
    deleteTask, 
    getTasksByStatus, 
    getTasksByProject, 
    setDraggedTask, 
    fetchTasks,
    setTasks, 
    setTasksLoading 
  };
  
  const dailyNotesContextValue: DailyNotesContextType = { 
    ...dailyNotesState, 
    fetchDailyNotes,
    setDailyNotes, 
    setDailyNotesLoading, 
    addNote, 
    updateNote, 
    deleteNote, 
    getNotesByDate 
  };
  
  const userStoriesContextValue: UserStoriesContextType = {
    ...userStoriesState,
    addUserStory,
    updateUserStory,
    deleteUserStory,
    fetchUserStories,
  };


  return (
    <GoogleCalendarProvider session={session}>
      <ProjectsContext.Provider value={projectsContextValue}>
        <TasksContext.Provider value={tasksContextValue}>
          <DailyNotesContext.Provider value={dailyNotesContextValue}>
             <UserStoriesContext.Provider value={userStoriesContextValue}>
              {children}
             </UserStoriesContext.Provider>
          </DailyNotesContext.Provider>
        </TasksContext.Provider>
      </ProjectsContext.Provider>
    </GoogleCalendarProvider>
  );
};
