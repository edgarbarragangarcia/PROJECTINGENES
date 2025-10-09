'use client';
import React, { useEffect, useRef } from 'react';
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import { useTasks } from '@/hooks/use-tasks';
import { useProjects } from '@/hooks/use-projects';

interface GanttChartProps {
  projectId: string;
}

const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const ganttContainer = useRef<HTMLDivElement>(null);
  const { tasks, allUsers } = useTasks();
  const { projects } = useProjects();

  const getInitials = (name: string | undefined | null, email: string | undefined | null): string => {
    if (name) {
      const names = name.split(' ');
      return names.map(n => n[0]).join('').toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return '';
  };

  useEffect(() => {
    if (ganttContainer.current) {
      // Basic configuration
      gantt.config.date_format = '%Y-%m-%d %H:%i';
      gantt.config.scale_unit = 'day';
      gantt.config.date_scale = '%d %M';
      gantt.config.subscales = [{ unit: 'month', step: 1, date: '%F %Y' }];
      gantt.config.scale_height = 50;
      gantt.config.task_height = 32; // Increase task bar height

      // Columns configuration
      gantt.config.columns = [
        { name: 'text', label: 'Task name', tree: true, width: '*' },
        { name: 'start_date', label: 'Start time', align: 'center' },
        { name: 'duration', label: 'Duration', align: 'center' },
      ];

      // Template for task text to include assignee initials
      gantt.templates.task_text = (start, end, task) => {
        const taskData = tasks.find(t => t.id === task.id);
        let initialsEl = '';
        if (taskData?.assignees && taskData.assignees.length > 0) {
          const firstAssigneeEmail = taskData.assignees[0];
          const user = allUsers.find(u => u.email === firstAssigneeEmail);
          const initials = getInitials(user?.full_name, user?.email);
          if (initials) {
            initialsEl = `<div class="gantt_task_initials">${initials}</div>`;
          }
        }
        return `${task.text} ${initialsEl}`;
      };

      // Apply dark theme
      gantt.config.layout = {
        css: 'gantt_container',
        rows: [
          {
            cols: [
              { view: 'grid', scrollX: 'gridScroll', scrollable: true, scrollY: 'scrollVer' },
              { resizer: true, width: 1 },
              { view: 'timeline', scrollX: 'scrollHor', scrollable: true, scrollY: 'scrollVer' },
              { view: 'scrollbar', id: 'scrollVer' },
            ],
          },
          { view: 'scrollbar', id: 'scrollHor' },
        ],
      };
      gantt.templates.grid_header_class = () => 'gantt_grid_header';
      gantt.templates.task_class = () => 'gantt_task';
      gantt.templates.grid_row_class = () => 'gantt_grid_row';
      gantt.templates.timeline_cell_class = () => 'gantt_timeline_cell';
      gantt.templates.marker_class = () => 'gantt_marker';

      gantt.init(ganttContainer.current);

      const project = projects.find(p => p.id === projectId);
      const projectTasks = tasks
        .filter(task => task.project_id === projectId && task.start_date && task.due_date)
        .map(task => {
          const startDate = new Date(task.start_date!);
          const endDate = new Date(task.due_date!);
          const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: task.id,
            text: task.title,
            start_date: startDate.toISOString().slice(0, 10),
            duration: duration > 0 ? duration : 1,
            progress: 0,
            assignees: task.assignees, // Pass assignees to gantt task object
          };
        });

      const ganttData = {
        data: [
          // Add the project itself as a root task
          ...(project ? [{
            id: project.id,
            text: project.name,
            start_date: projectTasks.length > 0 ? projectTasks[0].start_date : new Date().toISOString().slice(0, 10),
            duration: 1,
            progress: 0,
            open: true,
            type: gantt.config.types.project,
          }] : []),
          // Add tasks as children
          ...projectTasks.map(t => ({ ...t, parent: projectId })),
        ],
        links: [],
      };

      gantt.parse(ganttData);
    }

    return () => {
      gantt.clearAll();
    };
  }, [tasks, projects, projectId, allUsers]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
      <style>{`
        /* Modern Theme Overrides */
        .gantt_container {
          font-family: 'Inter', sans-serif;
        }
        .gantt_task .gantt_task_content {
          /* Using a gradient for a more modern feel */
          background-image: linear-gradient(45deg, #3b82f6, #60a5fa);
          color: #ffffff;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transition: all 0.2s ease-in-out;
        }
        .gantt_task_line:hover .gantt_task_content {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
        }
        .gantt_task_line.gantt_project {
            background-image: linear-gradient(45deg, #a3e635, #bef264);
        }
        .gantt_task_line, .gantt_task_content {
            border-radius: 8px; /* Slightly more rounded */
            border: none; /* Remove border for a cleaner look */
        }
        .gantt_task_progress {
            background-color: rgba(255, 255, 255, 0.3);
        }
        .gantt_grid_header {
          background-color: #f0f9ff; /* Lighter header */
          border-bottom: 2px solid #dbeafe;
        }
        .gantt_scale_cell {
            color: #334155;
            background-color: #f0f9ff;
        }
        .gantt_task_initials {
          background-color: rgba(0, 0, 0, 0.1);
          font-weight: 500;
        }
        /* Combine with previous styles */
        .gantt_container {
          background-color: #f0f9ff;
          color: #0f172a;
        }
        .gantt_grid, .gantt_timeline {
          background-color: #f0f9ff;
        }
        .gantt_grid_header, .gantt_task, .gantt_grid_row, .gantt_timeline_cell, .gantt_marker {
          border-color: #e2e8f0;
        }
        .gantt_grid_header {
          color: #1e293b;
        }
        .gantt_grid_row, .gantt_timeline_cell {
            background-color: #f0f9ff;
        }
        .gantt_grid_data .gantt_cell {
            color: #0f172a;
        }
        .gantt_task_row, .gantt_grid_data {
            border-bottom: 1px solid #e2e8f0;
        }
        .gantt_timeline {
            border-top: 1px solid #e2e8f0;
        }
        .gantt_scale_cell {
            border-right: 1px solid #e2e8f0;
        }
      `}</style>
      <div ref={ganttContainer} style={{ width: '100%', height: '500px' }}></div>
    </>
  );
};

export default GanttChart;
