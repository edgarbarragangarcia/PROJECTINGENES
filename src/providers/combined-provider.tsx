

'use client';

import { ProjectsContext, initialProjectsState, type ProjectsContextType } from '@/hooks/use-projects';
import { TasksContext, initialTasksState, type TasksContextType } from '@/hooks/use-tasks';
import { DailyNotesContext, initialDailyNotesState, type DailyNotesState, type DailyNotesContextType } from '@/hooks/use-daily-notes';
import { createClient } from '@/lib/supabase/client';
import type { Project, ProjectWithProgress, Task, DailyNote, User, Subtask, UserStory, Profile } from '@/lib/types';
import { useState, useCallback, useEffect, type ReactNode, useMemo } from 'react';
import { format, formatISO, startOfDay,parseISO } from 'date-fns';
import { GoogleCalendarProvider } from './google-calendar-provider';
import type { Session } from '@supabase/supabase-js';
import { UserStoriesContext, initialUserStoriesState, type UserStoriesContextType } from '@/hooks/use-user-stories';


const convertUTCDateToLocalDate = (date: Date) => {
  const newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
  const offset = date.getTimezoneOffset() / 60;
  const hours = date.getHours();
  newDate.setHours(hours - offset);
  return newDate;
}

export const CombinedProvider = ({ children }: { children: ReactNode }) => {
  const [projectsState, setProjectsState] = useState(initialProjectsState);
  const [tasksState, setTasksState] = useState(initialTasksState);
  const [dailyNotesState, setDailyNotesState] = useState<DailyNotesState>(initialDailyNotesState);
  const [userStoriesState, setUserStoriesState] = useState(initialUserStoriesState);
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

  // --- User Stories ---
  const setUserStories = (userStories: UserStory[]) => setUserStoriesState(prevState => ({ ...prevState, userStories }));
  
  const fetchAllUsers = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('id, email, full_name, role');
    if (error) {
      console.error('Error fetching all users:', error);
    } else {
      setTasksState(prevState => ({ ...prevState, allUsers: data || [] }));
    }
  }, [supabase]);
  
  const fetchProjects = useCallback(async (user: User) => {
    setProjectsLoading(true);

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'admin';

    let projectQuery;

    if (isAdmin) {
      const { data: adminProjects, error: adminError } = await supabase.from('projects').select('*');

      if (adminError) {
        console.error("Error fetching admin projects:", adminError);
        setProjectsError(adminError);
        setProjects([]);
        setProjectsLoading(false);
        return;
      }
      
      const { data: allTasks, error: allTasksError } = await supabase.from('tasks').select('id, project_id, status');
      if (allTasksError) {
          console.error("Error fetching all tasks for progress calculation:", allTasksError);
          // Set progress to 0 if tasks can't be fetched
          const projectsWithZeroProgress = (adminProjects || []).map(p => ({ ...p, progress: 0 }));
          setProjects(projectsWithZeroProgress.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          setProjectsLoading(false);
          return;
      }

      const projectsWithProgress = (adminProjects || []).map(project => {
        const relevantTasks = allTasks.filter(t => t.project_id === project.id);
        const totalTasks = relevantTasks.length;
        const doneTasks = relevantTasks.filter(t => t.status === 'Done').length;
        const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
        return { ...project, progress };
      });
      setProjects(projectsWithProgress.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

    } else {
        projectQuery = supabase.rpc('get_projects_for_user', {
            p_user_id: user.id,
            p_user_email: user.email || ''
        });
        const { data, error } = await projectQuery;
        if (error) {
            console.error("Error fetching projects for user:", error);
            setProjectsError(error);
            setProjects([]);
        } else if (data) {
            setProjects((data as ProjectWithProgress[]).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
    }
    setProjectsLoading(false);
  }, [supabase]);

  const addProject = useCallback(async (projectData: Omit<Project, 'id' | 'created_at' | 'user_id' | 'progress'> & { imageFile?: File, onUploadProgress?: (p: number) => void }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Debes iniciar sesión para crear un proyecto.");
    }
    
    let imageUrl = '';
    if (projectData.imageFile) {
        const file = projectData.imageFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `project-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('projectia')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type,
            });

        if (uploadError) {
            console.error("Error al subir la imagen:", uploadError);
            throw new Error("No se pudo subir la imagen del proyecto.");
        }

        const { data: { publicUrl } } = supabase.storage.from('projectia').getPublicUrl(filePath);
        imageUrl = publicUrl;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([{ 
        ...projectData, 
        user_id: user.id, 
        image_url: imageUrl,
        creator_email: user.email,
        creator_name: user.user_metadata?.full_name || user.email,
      }])
      .select()
      .single();

    if (error) throw error;
    setProjectsState(prev => ({
        ...prev,
        projects: [{ ...data, progress: 0 }, ...prev.projects],
    }));
  }, [supabase]);

  const updateProject = useCallback(async (id: string, data: Partial<Project> & { imageFile?: File, onUploadProgress?: (p: number) => void }) => {
    
    let imageUrl = data.image_url;

    if (data.imageFile) {
      const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("Usuario no autenticado");

       const file = data.imageFile;
       const fileExt = file.name.split('.').pop();
       const fileName = `${user.id}-${Date.now()}.${fileExt}`;
       const filePath = `project-images/${fileName}`;
       
       const { error: uploadError } = await supabase.storage
          .from('projectia')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('projectia').getPublicUrl(filePath);
        imageUrl = publicUrl;
    }

    const updateData = { ...data, image_url: imageUrl };
    delete updateData.imageFile;
    delete (updateData as any).onUploadProgress;


    const { data: updatedProject, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    setProjectsState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, ...updatedProject, progress: p.progress } : p),
    }));
  }, [supabase]);

  const deleteProject = useCallback(async (id: string) => {
    
    const { data: tasksToDelete, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', id);

    if (tasksError) throw tasksError;

    if (tasksToDelete && tasksToDelete.length > 0) {
        const taskIds = tasksToDelete.map(t => t.id);
        
        await supabase.from('subtasks').delete().in('task_id', taskIds);
        await supabase.from('tasks').delete().in('id', taskIds);
    }

    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    setProjectsState(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id),
    }));
  }, [supabase]);


  const fetchTasks = useCallback(async (user: User) => {
    setTasksLoading(true);
    let query;
    
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'admin';
    
    if (isAdmin) {
       query = supabase.from('tasks').select('*, subtasks(*)');
    } else {
        const { data: projectData, error: projectError } = await supabase.rpc('get_projects_for_user', {
             p_user_id: user.id,
             p_user_email: user.email || ''
        });

        if (projectError) {
            console.error("Error fetching user's projects for tasks:", projectError);
            setTasksLoading(false);
            return;
        }
        
        const projectIds = projectData.map(p => p.id);
        query = supabase.from('tasks').select('*, subtasks(*)').in('project_id', projectIds);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching user's tasks:", error);
    } else {
        const tasksWithDates = data.map(task => ({
          ...task,
          startDate: task.start_date ? parseISO(task.start_date) : undefined,
          dueDate: task.due_date ? parseISO(task.due_date) : undefined,
        }))
      setTasks(tasksWithDates);
    }
    setTasksLoading(false);
  }, [supabase]);

  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'created_at' | 'user_id'> & { imageFile?: File, onUploadProgress?: (p: number) => void }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Debes iniciar sesión para crear una tarea.");

    let imageUrl = '';
    if (taskData.imageFile) {
        const file = taskData.imageFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-task-${Date.now()}.${fileExt}`;
        const filePath = `task-images/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('projectia').upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('projectia').getPublicUrl(filePath);
        imageUrl = publicUrl;
    }
    
    const { subtasks, ...restOfTaskData } = taskData;
    delete (restOfTaskData as any).imageFile;
    delete (restOfTaskData as any).onUploadProgress;
    
    const dataToInsert = {
        ...restOfTaskData,
        image_url: imageUrl,
        user_id: user.id,
        project_id: taskData.project_id,
        start_date: taskData.startDate ? formatISO(taskData.startDate) : undefined,
        due_date: taskData.dueDate ? formatISO(taskData.dueDate) : undefined,
      };

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert([dataToInsert])
      .select('*, subtasks(*)')
      .single();

    if (error) throw error;
    
    if (subtasks && subtasks.length > 0) {
      const subtasksToInsert = subtasks.map(st => ({
        ...st,
        task_id: newTask.id,
        user_id: user.id,
      }));
       const { error: subtaskError } = await supabase.from('subtasks').insert(subtasksToInsert);
       if (subtaskError) throw subtaskError;
    }
    
    const finalTask = {
        ...newTask,
        startDate: newTask.start_date ? parseISO(newTask.start_date) : undefined,
        dueDate: newTask.due_date ? parseISO(newTask.due_date) : undefined,
    }

    setTasksState(prev => ({
      ...prev,
      tasks: [finalTask, ...prev.tasks],
    }));
  }, [supabase]);

  const updateTask = useCallback(async (id: string, data: Partial<Task> & { imageFile?: File, onUploadProgress?: (p: number) => void }) => {
    let imageUrl = data.image_url;

    if (data.imageFile) {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("Usuario no autenticado");

       const file = data.imageFile;
       const fileExt = file.name.split('.').pop();
       const fileName = `${user.id}-task-${Date.now()}.${fileExt}`;
       const filePath = `task-images/${fileName}`;
       
       const { error: uploadError } = await supabase.storage.from('projectia').upload(filePath, file, { upsert: true });

       if (uploadError) throw uploadError;

       const { data: { publicUrl } } = supabase.storage.from('projectia').getPublicUrl(filePath);
       imageUrl = publicUrl;
    }
    
    const { subtasks, ...restOfData } = data;
    delete (restOfData as any).imageFile;
    delete (restOfData as any).onUploadProgress;
    
    const updateData = {
      ...restOfData,
      image_url: imageUrl,
      project_id: data.project_id,
      start_date: data.startDate ? formatISO(data.startDate) : undefined,
      due_date: data.dueDate ? formatISO(data.dueDate) : undefined,
    }

    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select('*, subtasks(*)')
      .single();
      
    if (error) throw error;
    
    // --- Subtask Sync ---
    const existingSubtasks = subtasks || [];
    const originalSubtasks = tasksState.tasks.find(t => t.id === id)?.subtasks || [];
    
    const toDelete = originalSubtasks.filter(orig => !existingSubtasks.some(ex => ex.id === orig.id)).map(st => st.id);
    const toUpdate = existingSubtasks.filter(ex => ex.id && originalSubtasks.some(orig => orig.id === ex.id && (orig.title !== ex.title || orig.is_completed !== ex.is_completed)));
    const toInsert = existingSubtasks.filter(ex => !ex.id);

    if(toDelete.length > 0) {
      await supabase.from('subtasks').delete().in('id', toDelete);
    }
    if(toUpdate.length > 0) {
      for(const sub of toUpdate) {
          await supabase.from('subtasks').update({ title: sub.title, is_completed: sub.is_completed }).eq('id', sub.id);
      }
    }
    if(toInsert.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");
      await supabase.from('subtasks').insert(toInsert.map(st => ({ title: st.title, is_completed: st.is_completed, task_id: id, user_id: user.id })));
    }
    // --- End Subtask Sync ---


    const {data: finalTaskWithSubtasks, error: fetchError} = await supabase.from('tasks').select('*, subtasks(*)').eq('id', id).single();
    if(fetchError) throw fetchError;

    const finalTask = {
        ...finalTaskWithSubtasks,
        startDate: finalTaskWithSubtasks.start_date ? parseISO(finalTaskWithSubtasks.start_date) : undefined,
        dueDate: finalTaskWithSubtasks.due_date ? parseISO(finalTaskWithSubtasks.due_date) : undefined,
    }

    setTasksState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => (t.id === id ? finalTask : t)),
    }));
  }, [supabase, tasksState.tasks]);

  const deleteTask = useCallback(async (id: string) => {
    await supabase.from('subtasks').delete().eq('task_id', id);
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    setTasksState(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id),
    }));
  }, [supabase]);
  
  const getTasksByStatus = useCallback((status: string, projectId?: string) => {
    return tasksState.tasks.filter(task => 
      task.status === status && (projectId ? task.project_id === projectId : true)
    );
  }, [tasksState.tasks]);
  
  const getTasksByProject = useCallback((projectId: string) => {
      return tasksState.tasks.filter(task => task.project_id === projectId);
  }, [tasksState.tasks]);

  // --- Daily Notes Logic ---
  const fetchDailyNotes = useCallback(async (user: User) => {
    setDailyNotesLoading(true);
    const { data, error } = await supabase
      .from('daily_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      setDailyNotesState(prev => ({ ...prev, error, loading: false }));
    } else {
      setDailyNotes(data || []);
      setDailyNotesLoading(false);
    }
  }, [supabase]);

  const addNote = useCallback(async (note: string, date: Date) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Debes iniciar sesión para añadir una nota.");

    const formattedDate = format(date, 'yyyy-MM-dd');
    const { data: newNote, error } = await supabase
      .from('daily_notes')
      .insert({ note, date: formattedDate, user_id: user.id })
      .select()
      .single();
    
    if (error) throw error;
    setDailyNotesState(prev => ({ ...prev, notes: [...prev.notes, newNote] }));
  }, [supabase]);

  const updateNote = useCallback(async (id: string, note: string) => {
    const { data: updatedNote, error } = await supabase
      .from('daily_notes')
      .update({ note })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    setDailyNotesState(prev => ({
      ...prev,
      notes: prev.notes.map(n => n.id === id ? updatedNote : n),
    }));
  }, [supabase]);

  const deleteNote = useCallback(async (id: string) => {
    const { error } = await supabase.from('daily_notes').delete().eq('id', id);
    if (error) throw error;
    setDailyNotesState(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== id) }));
  }, [supabase]);

  const getNotesByDate = useCallback((date: Date) => {
    const formattedDate = format(startOfDay(date), 'yyyy-MM-dd');
    return dailyNotesState.notes.filter(note => note.date === formattedDate);
  }, [dailyNotesState.notes]);
  
  // --- User Stories Logic ---
  const fetchUserStories = useCallback(async (user: User) => {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const isAdmin = profile?.role === 'admin';
      
      let query = supabase.from('user_stories').select('*');
      
      if (!isAdmin) {
        const { data: projectData, error: projectError } = await supabase.rpc('get_projects_for_user', {
             p_user_id: user.id,
             p_user_email: user.email || ''
        });

        if (projectError) {
          console.error("Error fetching user's projects for stories:", projectError);
          return;
        }
        const projectIds = projectData.map(p => p.id);
        query = query.in('project_id', projectIds);
      }
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
          console.error(error);
      } else {
          setUserStories(data || []);
      }
  }, [supabase]);

  const addUserStory = useCallback(async (storyData: Omit<UserStory, 'id' | 'created_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Debes iniciar sesión para añadir una historia de usuario.");

      const { data: newStory, error } = await supabase
          .from('user_stories')
          .insert({ ...storyData, user_id: user.id })
          .select()
          .single();

      if (error) throw error;
      setUserStoriesState(prev => ({ ...prev, userStories: [newStory, ...prev.userStories] }));
  }, [supabase]);

  const updateUserStory = useCallback(async (id: string, storyData: Partial<Omit<UserStory, 'id' | 'created_at' | 'user_id' | 'project_id'>>) => {
      const { data: updatedStory, error } = await supabase
          .from('user_stories')
          .update(storyData)
          .eq('id', id)
          .select()
          .single();

      if (error) throw error;
      setUserStoriesState(prev => ({
          ...prev,
          userStories: prev.userStories.map(us => us.id === id ? updatedStory : us),
      }));
  }, [supabase]);

  const deleteUserStory = useCallback(async (id: string) => {
      const { error } = await supabase.from('user_stories').delete().eq('id', id);
      if (error) throw error;
      setUserStoriesState(prev => ({ ...prev, userStories: prev.userStories.filter(us => us.id !== id) }));
  }, [supabase]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      const user = session?.user;
      if (user) {
        fetchAllUsers();
        fetchProjects(user);
        fetchTasks(user);
        fetchDailyNotes(user);
        fetchUserStories(user);
      } else {
        setProjects([]);
        setTasks([]);
        setDailyNotes([]);
        setTasksState(prev => ({ ...prev, allUsers: [] }));
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, fetchProjects, fetchTasks, fetchAllUsers, fetchDailyNotes, fetchUserStories]);

  const projectsContextValue: ProjectsContextType = useMemo(() => ({
    ...projectsState,
    addProject,
    updateProject,
    deleteProject,
    fetchProjects,
    setProjects,
    setProjectsLoading,
    setProjectsError,
  }), [projectsState, addProject, updateProject, deleteProject, fetchProjects]);

  const tasksContextValue: TasksContextType = useMemo(() => ({
    ...tasksState,
    addTask,
    updateTask,
    deleteTask,
    getTasksByStatus,
    getTasksByProject,
    setDraggedTask,
    fetchTasks,
    setTasks,
    setTasksLoading,
  }), [tasksState, addTask, updateTask, deleteTask, getTasksByStatus, getTasksByProject, fetchTasks]);

  const dailyNotesContextValue: DailyNotesContextType = useMemo(() => ({
    ...dailyNotesState,
    fetchDailyNotes,
    setDailyNotes,
    setDailyNotesLoading,
    addNote,
    updateNote,
    deleteNote,
    getNotesByDate,
  }), [dailyNotesState, fetchDailyNotes, addNote, updateNote, deleteNote, getNotesByDate]);
  
  const userStoriesContextValue: UserStoriesContextType = useMemo(() => ({
    ...userStoriesState,
    fetchUserStories,
    addUserStory,
    updateUserStory,
    deleteUserStory,
  }), [userStoriesState, fetchUserStories, addUserStory, updateUserStory, deleteUserStory]);

  return (
    <ProjectsContext.Provider value={projectsContextValue}>
      <TasksContext.Provider value={tasksContextValue}>
        <DailyNotesContext.Provider value={dailyNotesContextValue}>
          <UserStoriesContext.Provider value={userStoriesContextValue}>
            <GoogleCalendarProvider session={session}>
              {children}
            </GoogleCalendarProvider>
          </UserStoriesContext.Provider>
        </DailyNotesContext.Provider>
      </TasksContext.Provider>
    </ProjectsContext.Provider>
  );
};
