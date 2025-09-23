# PROJECTINGENES

Una aplicación moderna de gestión de proyectos construida con Next.js, TypeScript, y Supabase.

## 🏗 Arquitectura

La aplicación sigue una arquitectura moderna basada en componentes utilizando Next.js 13+ con App Router y está organizada en las siguientes capas principales:

### 1. Capa de Presentación (Frontend)
- `src/app/*`: Rutas y páginas de la aplicación usando Next.js App Router
- `src/components/*`: Componentes reutilizables organizados por funcionalidad
- `src/providers/*`: Proveedores de contexto para estado global y funcionalidades compartidas

### 2. Capa de Lógica de Negocio
- `src/hooks/*`: Hooks personalizados para lógica reutilizable
- `src/lib/*`: Utilidades, tipos y funciones auxiliares
- `src/ai/*`: Funcionalidades relacionadas con IA y flujos automatizados

### 3. Capa de Datos
- `supabase/*`: Migraciones y configuración de la base de datos
- `src/lib/supabase/*`: Cliente y utilidades de Supabase

## 📁 Estructura de Archivos

```
├── src/
│   ├── ai/                    # Funcionalidades de IA
│   │   ├── flows/            # Flujos automatizados de IA
│   │   ├── dev.ts           # Configuración de desarrollo para IA
│   │   └── genkit.ts        # Utilidades para generación de IA
│   │
│   ├── app/                  # Rutas de Next.js App Router
│   │   ├── auth/            # Autenticación
│   │   ├── calendar/        # Calendario
│   │   ├── dashboard/       # Panel principal
│   │   ├── gantt/          # Vista Gantt
│   │   ├── projects/       # Gestión de proyectos
│   │   └── user-management/ # Gestión de usuarios
│   │
│   ├── components/          # Componentes React
│   │   ├── chat/           # Componentes de chat
│   │   ├── dashboard/      # Componentes del panel
│   │   ├── kanban/        # Tablero Kanban
│   │   ├── layout/        # Componentes de diseño
│   │   ├── note/          # Notas y resúmenes
│   │   ├── project/       # Componentes de proyecto
│   │   ├── pwa/          # Componentes PWA
│   │   ├── task/         # Gestión de tareas
│   │   └── ui/           # Componentes UI base
│   │
│   ├── hooks/             # Hooks personalizados
│   ├── lib/              # Utilidades y tipos
│   └── providers/        # Proveedores de contexto
│
├── supabase/             # Configuración de base de datos
│   └── migrations/       # Migraciones SQL
│
├── public/              # Archivos estáticos
└── docs/               # Documentación adicional
```

## 🔄 Workflow de la Aplicación

### 1. Autenticación y Autorización
- Los usuarios acceden a través de `/login`
- Autenticación manejada por Supabase
- Middleware de protección de rutas en `src/middleware.ts`

### 2. Gestión de Proyectos
1. **Panel Principal** (`/dashboard`)
   - Vista general de proyectos y tareas
   - Métricas y KPIs importantes
   - Acceso rápido a funcionalidades principales

2. **Gestión de Proyectos** (`/projects`)
   - Creación y edición de proyectos
   - Vista de lista y detalles
   - Integración con diagrama de Gantt

3. **Kanban y Tareas**
   - Tablero Kanban para gestión visual
   - Formularios de tareas con priorización
   - Integración con IA para sugerencias

4. **Calendario y Planificación**
   - Integración con Google Calendar
   - Vista de eventos y fechas límite
   - Planificación de recursos

### 3. Características Especiales

#### PWA (Aplicación Web Progresiva)
- Instalable como aplicación nativa
- Funcionalidad sin conexión
- Sincronización en segundo plano

#### Integración con IA
- Sugerencias de prioridad de tareas
- Análisis de documentos
- Chatbot de asistencia

#### Notas y Documentación
- Notas diarias automatizadas
- Resúmenes generados por IA
- Gestión de documentos del proyecto

## 🛠 Tecnologías Principales

- **Frontend**: Next.js 13+, React, TypeScript
- **Estilos**: Tailwind CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **IA**: Modelos personalizados y flujos automatizados
- **PWA**: Service Workers, Manifest
- **Componentes UI**: Shadcn/ui

## 🚀 Inicio Rápido

1. Clonar el repositorio
2. Instalar dependencias: `pnpm install`
3. Configurar variables de entorno
4. Iniciar el servidor de desarrollo: `pnpm dev`

## 📱 Características PWA

La aplicación está optimizada como PWA con:
- Service Worker (`public/sw.js`)
- Manifest (`public/manifest.json`)
- Instalación con un clic (`components/pwa/install-pwa-button.tsx`)

## 🔄 Integración Continua

El proyecto utiliza:
- TypeScript para tipo seguro
- ESLint para linting
- Prettier para formateo de código
- GitHub Actions para CI/CD

## 📊 Base de Datos

Supabase proporciona:
- Autenticación de usuarios
- Almacenamiento de datos en tiempo real
- RLS (Seguridad a Nivel de Fila)
- Migraciones automáticas

Las migraciones principales incluyen:
- Habilitación de RLS y políticas
- Creación de notas diarias
- Soporte para múltiples notas por día
