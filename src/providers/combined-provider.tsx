

'use client';

import { ProjectsContext, initialProjectsState, type ProjectsContextType } from '@/hooks/use-projects';
import { TasksContext, initialTasksState, type TasksContextType } from '@/hooks/use-tasks';
import { DailyNotesContext, initialDailyNotesState, type DailyNotesState, type DailyNotesContextType } from '@/hooks/use-daily-notes';
import { createClient } from '@/lib/supabase/client';
import type { Project, ProjectWithProgress, Task, DailyNote, User, Subtask } from '@/lib/types';
import { useState, useCallback, useEffect, type ReactNode, useMemo } from 'react';
import { format } from 'date-fns';
import { GoogleCalendarProvider } from './google-calendar-provider';
import type { Session } from '@supabase/supabase-js';

export const adminEmails = ['edgarbarragangarcia@gmail.com', 'eabarragang@ingenes.com', 'ntorres@ingenes.com'];

export const CombinedProvider = ({ children }: { children: ReactNode }) => {
  const [projectsState, setProjectsState] = useState(initialProjectsState);
  const [tasksState, setTasksState] = useState(initialTasksState);
  const [dailyNotesState, setDailyNotesState] = useState<DailyNotesState>(initialDailyNotesState);
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);

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
        
        setProjectsState(prevState => ({ ...prevState, loading: false, projects: data || [] }));
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

  const fetchAllData = useCallback(async (user: User) => {
    await Promise.all([
      fetchProjects(user),
      fetchTasks(user),
      fetchDailyNotes(user)
    ]);
  }, [fetchProjects, fetchTasks, fetchDailyNotes]);


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

  const addProject = async (projectData: Omit<Project, 'id' | 'created_at' | 'user_id' | 'progress' | 'creator_email'> & { imageFile?: File, onUploadProgress?: (progress: number) => void, documentFile?: File, onDocUploadProgress?: (progress: number) => void }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { imageFile, onUploadProgress, documentFile, onDocUploadProgress, ...restOfProjectData } = projectData;

    const dataToInsert: Record<string, any> = { ...restOfProjectData, user_id: user.id, creator_email: user.email };

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
    
    if (documentFile) {
        const sanitizedName = documentFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const fileName = `${user.id}/${Date.now()}_${sanitizedName}`;
        
        const { error: uploadError } = await uploadFileWithProgress(
          'project_documents',
          fileName,
          documentFile,
          onDocUploadProgress
        );
        
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('project_documents')
            .getPublicUrl(fileName);
            
        dataToInsert.document_url = publicUrlData.publicUrl;
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

  const updateProject = async (id: string, data: Partial<Omit<Project, 'id' | 'created_at' | 'user_id' | 'progress'>> & { imageFile?: File, onUploadProgress?: (progress: number) => void, documentFile?: File, onDocUploadProgress?: (progress: number) => void }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { imageFile, onUploadProgress, documentFile, onDocUploadProgress, ...restOfProjectData } = data;
    const dataToUpdate: Record<string, any> = { ...restOfProjectData };
    
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
    
    if (documentFile) {
        if (existingProject?.document_url) {
            const oldFileName = existingProject.document_url.split(`${user.id}/`).pop();
            if (oldFileName) {
              await supabase.storage.from('project_documents').remove([`${user.id}/${oldFileName}`]);
            }
        }

        const sanitizedName = documentFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const fileName = `${user.id}/${Date.now()}_${sanitizedName}`;
        
        const { error: uploadError } = await uploadFileWithProgress(
          'project_documents',
          fileName,
          documentFile,
          onDocUploadProgress
        );

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('project_documents')
            .getPublicUrl(fileName);
            
        dataToUpdate.document_url = publicUrlData.publicUrl;
    } else if (dataToUpdate.document_url === null) {
      if (existingProject?.document_url) {
        const oldFileName = existingProject.document_url.split(`${user.id}/`).pop();
        if (oldFileName) {
          await supabase.storage.from('project_documents').remove([`${user.id}/${oldFileName}`]);
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
    if (projectToDelete?.document_url) {
        const fileName = projectToDelete.document_url.split('/').pop();
        if (fileName) {
            try {
                await supabase.storage.from('project_documents').remove([`${user.id}/${fileName}`]);
            } catch(e) {
                console.error("Failed to delete stale storage object:", e);
            }
        }
    }

    const { error: tasksError } = await supabase.from('tasks').delete().eq('project_id', id);
    if(tasksError) throw tasksError;
    
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    
    setTasksState(prevState => ({ 
      ...prevState, 
      tasks: prevState.tasks.filter((t) => t.projectId !== id)
    }));
    setProjectsState(prevState => ({ 
      ...prevState, 
      projects: prevState.projects.filter((p) => p.id !== id) 
    }));
  };

const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'user_id'> & { subtasks?: { title: string; is_completed: boolean }[], imageFile?: File, onUploadProgress?: (progress: number) => void }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { startDate, dueDate, projectId, subtasks, imageFile, onUploadProgress, ...restOfTaskData } = taskData;
    
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
};

  const updateTask = async (id: string, taskData: Partial<Omit<Task, 'id' | 'created_at' | 'user_id'>> & { subtasks?: { title: string; is_completed: boolean }[], imageFile?: File, onUploadProgress?: (progress: number) => void }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { imageFile, onUploadProgress, subtasks, ...restOfTaskData } = taskData;
    const dataToUpdate: Record<string, any> = { ...restOfTaskData };
    
    const existingTask = tasksState.tasks.find(t => t.id === id);

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
    
    // Handle subtasks
    if (subtasks) {
      // 1. Delete existing subtasks
      const { error: deleteError } = await supabase.from('subtasks').delete().eq('task_id', id);
      if (deleteError) throw deleteError;

      // 2. Insert new subtasks if any
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
    
    // Delete associated subtasks first
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

  return (
    <GoogleCalendarProvider session={session}>
      <ProjectsContext.Provider value={projectsContextValue}>
        <TasksContext.Provider value={tasksContextValue}>
          <DailyNotesContext.Provider value={dailyNotesContextValue}>
            {children}
          </DailyNotesContext.Provider>
        </TasksContext.Provider>
      </ProjectsContext.Provider>
    </GoogleCalendarProvider>
  );
};
