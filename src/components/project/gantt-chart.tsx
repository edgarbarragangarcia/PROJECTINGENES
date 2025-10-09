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
  const { tasks } = useTasks();
  const { projects } = useProjects();

  useEffect(() => {
    if (ganttContainer.current) {
      // Basic configuration
      gantt.config.date_format = '%Y-%m-%d %H:%i';
      gantt.config.scale_unit = 'day';
      gantt.config.date_scale = '%d %M';
      gantt.config.subscales = [{ unit: 'month', step: 1, date: '%F %Y' }];
      gantt.config.scale_height = 50;
      gantt.config.readonly = true; // Make it non-editable for now

      // Columns configuration
      gantt.config.columns = [
        { name: 'text', label: 'Task name', tree: true, width: '*' },
        { name: 'start_date', label: 'Start time', align: 'center' },
        { name: 'duration', label: 'Duration', align: 'center' },
      ];

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
            progress: 0, // You can calculate this based on task status if needed
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
  }, [tasks, projects, projectId]);

  return (
    <>
      <style>{`
        /* Pastel Blue Theme */
        .gantt_container {
          background-color: #f0f9ff; /* Pastel Blue Background */
          color: #0f172a; /* Dark Slate Text for contrast */
        }
        .gantt_grid, .gantt_timeline {
          background-color: #f0f9ff;
        }
        .gantt_grid_header, .gantt_task, .gantt_grid_row, .gantt_timeline_cell, .gantt_marker {
          border-color: #e2e8f0; /* Light Gray Border */
        }
        .gantt_grid_header {
          background-color: #dbeafe; /* Slightly darker pastel blue for header */
          color: #1e293b; /* Dark Slate Text */
        }
        .gantt_task .gantt_task_content {
          background-color: #3b82f6; /* A vibrant blue for tasks */
          color: #ffffff;
        }
        .gantt_task_line.gantt_project {
            background-color: #60a5fa; /* A lighter vibrant blue for projects */
        }
        .gantt_grid_row, .gantt_timeline_cell {
            background-color: #f0f9ff; /* Solid pastel blue background */
        }
        .gantt_grid_data .gantt_cell {
            color: #0f172a; /* Dark Slate Text */
        }
        .gantt_task_row, .gantt_grid_data {
            border-bottom: 1px solid #e2e8f0; /* Light Gray Border */
        }
        .gantt_timeline {
            border-top: 1px solid #e2e8f0; /* Light Gray Border */
        }
        .gantt_scale_cell {
            color: #334155; /* Medium Slate Text */
            background-color: #dbeafe; /* Match header */
            border-right: 1px solid #e2e8f0; /* Light Gray Border */
        }
      `}</style>
      <div ref={ganttContainer} style={{ width: '100%', height: '500px' }}></div>
    </>
  );
};

export default GanttChart;
