

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

const safeParseJson = (jsonString: any, defaultValue: any) => {
  if (Array.isArray(jsonString)) {
    return jsonString;
  }
  if (typeof jsonString === 'string') {
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }
  return jsonString || defaultValue;
};

const processTask = (task: any): Task => {
  return {
    ...task,
    startDate: task.start_date ? parseISO(task.start_date) : undefined,
    dueDate: task.due_date ? parseISO(task.due_date) : undefined,
    assignees: safeParseJson(task.assignees, []),
  };
};

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
  const setDailyNotesLoading = (loading: boolean) => setDailyNotesState(prevState => ({ ...prevState, loading: false }));

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

  const updateUserRole = useCallback(async (userId: string, role: 'admin' | 'user') => {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      throw error;
    } else {
      // Update global state
      setTasksState(prev => ({
        ...prev,
        allUsers: prev.allUsers.map(user => 
          user.id === userId ? { ...user, role } : user
        ),
      }));
    }
  }, [supabase]);
  
  const calculateProjectsProgress = useCallback((projects: Project[], tasks: Task[]): ProjectWithProgress[] => {
    return projects.map(p => {
        const relevantTasks = tasks.filter(t => t.project_id === p.id);
        const totalTasks = relevantTasks.length;
        const doneTasks = relevantTasks.filter(t => t.status === 'Done').length;
        const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
        return { ...p, progress };
    });
  }, []);
  
  const fetchProjects = useCallback(async (user: User, allTasks: Task[]) => {
    let query;

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'admin';

    if (isAdmin) {
        query = supabase.from('projects').select('*');
    } else {
        const { data: projectData, error: projectError } = await supabase.rpc('get_projects_for_user', {
             p_user_id: user.id,
             p_user_email: user.email || ''
        });

        if (projectError) {
          console.error("Error fetching user's projects:", projectError);
          setProjectsError(projectError);
          setProjects([]);
          return;
        }

        const projectsWithProgress = calculateProjectsProgress(projectData || [], allTasks);
        setProjects(projectsWithProgress.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        return;
    }

    const { data: projectsData, error } = await query;

    if (error) {
        console.error("Error fetching projects:", error);
        setProjectsError(error);
        setProjects([]);
    } else {
        const projectsWithProgress = calculateProjectsProgress(projectsData || [], allTasks);
        setProjects(projectsWithProgress.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }
  }, [supabase, calculateProjectsProgress]);


  const addProject = useCallback(async (projectData: Omit<Project, 'id' | 'created_at' | 'user_id'> & { imageFile?: File, onUploadProgress?: (p: number) => void }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Debes iniciar sesión para crear un proyecto.");
    }
    
    let imageUrl = '';
    if (projectData.imageFile) {
        const file = projectData.imageFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('project_images')
            .upload(filePath, file);

        if (uploadError) {
            console.error("Error al subir la imagen del proyecto:", uploadError);
            throw new Error("No se pudo subir la imagen del proyecto.");
        }

        const { data: { publicUrl } } = supabase.storage.from('project_images').getPublicUrl(filePath);
        imageUrl = publicUrl;
    }

    const { imageFile, onUploadProgress, ...restOfProjectData } = projectData;

    const { data, error } = await supabase
      .from('projects')
      .insert([{ 
        ...restOfProjectData, 
        user_id: user.id, 
        image_url: imageUrl,
        creator_email: user.email,
        creator_name: user.user_metadata?.full_name || user.email,
      }])
      .select()
      .single();

    if (error) throw error;
    
    const newProjectWithProgress: ProjectWithProgress = { ...data, progress: 0 };
    setProjectsState(prev => ({
        ...prev,
        projects: [newProjectWithProgress, ...prev.projects],
    }));
  }, [supabase]);

  const updateProject = useCallback(async (id: string, data: Partial<Project> & { imageFile?: File, onUploadProgress?: (p: number) => void }) => {
    
    let imageUrl = data.image_url;

    if (data.imageFile) {
      const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("Usuario no autenticado");

       const file = data.imageFile;
       const fileExt = file.name.split('.').pop();
       const fileName = `${user.id}/${Date.now()}.${fileExt}`;
       const filePath = `${fileName}`;
       
       const { error: uploadError } = await supabase.storage
          .from('project_images')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('project_images').getPublicUrl(filePath);
        imageUrl = publicUrl;
    }

    const { imageFile, onUploadProgress, ...restOfData } = data;
    const updateData = { ...restOfData, image_url: imageUrl };

    const { data: updatedProject, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    setProjectsState(prev => ({
      ...prev,
      projects: prev.projects.map((p: ProjectWithProgress) => 
        p.id === id ? { ...p, ...updatedProject, progress: p.progress } : p
      ),
    }));
  }, [supabase]);

  const deleteProject = useCallback(async (id: string) => {
    // 1. Delete user stories associated with the project
    const { error: storyError } = await supabase.from('user_stories').delete().eq('project_id', id);
    if (storyError) {
        console.error("Error deleting user stories:", storyError);
        throw storyError;
    }

    // 2. Get tasks to delete subtasks
    const { data: tasksToDelete, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', id);

    if (tasksError) {
        console.error("Error fetching tasks for deletion:", tasksError);
        throw tasksError;
    }

    if (tasksToDelete && tasksToDelete.length > 0) {
        const taskIds = tasksToDelete.map(t => t.id);
        
        // 3. Delete subtasks
        const { error: subtaskError } = await supabase.from('subtasks').delete().in('task_id', taskIds);
        if (subtaskError) {
            console.error("Error deleting subtasks:", subtaskError);
            throw subtaskError;
        }

        // 4. Delete tasks
        const { error: taskDeleteError } = await supabase.from('tasks').delete().in('id', taskIds);
        if (taskDeleteError) {
            console.error("Error deleting tasks:", taskDeleteError);
            throw taskDeleteError;
        }
    }

    // 5. Delete the project itself
    const { error: projectDeleteError } = await supabase.from('projects').delete().eq('id', id);
    if (projectDeleteError) {
        console.error("Error deleting project:", projectDeleteError);
        throw projectDeleteError;
    }
    
    // Update local state
    setProjectsState(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id),
    }));
  }, [supabase]);


  const fetchTasks = useCallback(async (user: User): Promise<Task[]> => {
    let query;
    
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'admin';
    
    if (isAdmin) {
       query = supabase.from('tasks').select('*, subtasks(*)');
    } else {
       const userEmail = user.email || '';
       query = supabase
        .from('tasks')
        .select('*, subtasks(*)')
        .or(`user_id.eq.${user.id},assignees.cs.["${userEmail}"]`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching user's tasks:", error);
      return [];
    } else {
      const processedTasks = data.map(processTask);
      setTasks(processedTasks);
      return processedTasks;
    }
  }, [supabase]);

  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'created_at' | 'user_id'> & { imageFile?: File, onUploadProgress?: (p: number) => void }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Debes iniciar sesión para crear una tarea.");

    let imageUrl = '';
    if (taskData.imageFile) {
        const file = taskData.imageFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${taskData.project_id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('task_attachments')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('task_attachments').getPublicUrl(fileName);
        imageUrl = publicUrl;
    }
    
    const { subtasks, imageFile, onUploadProgress, ...restOfTaskData } = taskData;
    
    const dataToInsert = {
      title: restOfTaskData.title,
      description: restOfTaskData.description,
      status: restOfTaskData.status,
      priority: restOfTaskData.priority,
      project_id: restOfTaskData.project_id,
      image_url: imageUrl,
      user_id: user.id,
      start_date: restOfTaskData.startDate ? formatISO(restOfTaskData.startDate) : undefined,
      due_date: restOfTaskData.dueDate ? formatISO(restOfTaskData.dueDate) : undefined,
      assignees: restOfTaskData.assignees || [],
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
    
    setTasksState(prev => ({
      ...prev,
      tasks: [processTask(newTask), ...prev.tasks],
    }));
  }, [supabase]);

  const updateTask = useCallback(async (id: string, data: Partial<Task> & { imageFile?: File, onUploadProgress?: (p: number) => void }) => {
    
    const { subtasks, imageFile, onUploadProgress, ...restOfData } = data;
    
    const updateData: { [key: string]: any } = { ...restOfData };
    
    if (imageFile) {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("Usuario no autenticado");

       const file = imageFile;
       const fileExt = file.name.split('.').pop();
       const originalTask = tasksState.tasks.find(t => t.id === id);
       if (!originalTask) throw new Error("Tarea original no encontrada para actualizar");

       const fileName = `${user.id}/${originalTask.project_id}/${Date.now()}.${fileExt}`;
       
       const { error: uploadError } = await supabase.storage
        .from('task_attachments')
        .upload(fileName, file, { upsert: true });

       if (uploadError) throw uploadError;

       const { data: { publicUrl } } = supabase.storage.from('task_attachments').getPublicUrl(fileName);
       updateData.image_url = publicUrl;
    } else if (data.image_url === null) {
      updateData.image_url = null;
    }
    
    updateData.start_date = updateData.startDate ? formatISO(updateData.startDate) : undefined;
    updateData.due_date = updateData.dueDate ? formatISO(updateData.dueDate) : undefined;
    
    delete updateData.startDate;
    delete updateData.dueDate;
    
    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select('*, subtasks(*)')
      .single();
      
    if (error) throw error;
    
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

    const {data: finalTaskWithSubtasks, error: fetchError} = await supabase.from('tasks').select('*, subtasks(*)').eq('id', id).single();
    if(fetchError) throw fetchError;

    setTasksState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => (t.id === id ? processTask(finalTaskWithSubtasks) : t)),
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
        const projectIds = projectData.map((p: any) => p.id);
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
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      const user = session?.user;
      if (user) {
        setProjectsLoading(true);
        setTasksLoading(true);
        await fetchAllUsers();
        const tasks = await fetchTasks(user);
        await fetchProjects(user, tasks);
        await fetchDailyNotes(user);
        await fetchUserStories(user);
        setProjectsLoading(false);
        setTasksLoading(false);
      } else {
        setProjects([]);
        setTasks([]);
        setDailyNotes([]);
        setUserStories([]);
        setTasksState(prev => ({ ...prev, allUsers: [] }));
        setProjectsLoading(false);
        setTasksLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, fetchProjects, fetchTasks, fetchAllUsers, fetchDailyNotes, fetchUserStories]);

  useEffect(() => {
    if (projectsState.projects.length > 0 || tasksState.tasks.length > 0) {
        const projectsWithProgress = calculateProjectsProgress(projectsState.projects, tasksState.tasks);
        const sortedProjects = projectsWithProgress.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        if (JSON.stringify(sortedProjects) !== JSON.stringify(projectsState.projects)) {
           setProjects(sortedProjects);
        }
    }
}, [tasksState.tasks, projectsState.projects, calculateProjectsProgress]);


  const projectsContextValue: ProjectsContextType = useMemo(() => ({
    ...projectsState,
    addProject,
    updateProject,
    deleteProject,
    fetchProjects: (user: User) => fetchProjects(user, tasksState.tasks),
    setProjects,
    setProjectsLoading,
    setProjectsError,
  }), [projectsState, addProject, updateProject, deleteProject, fetchProjects, tasksState.tasks]);

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
    fetchAllUsers,
    updateUserRole,
  }), [tasksState, addTask, updateTask, deleteTask, getTasksByStatus, getTasksByProject, fetchTasks, fetchAllUsers, updateUserRole]);

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
