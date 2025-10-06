# Reorganización del Proyecto

## Estructura Actual
```
src/
  ├── lib/
  │   ├── types.ts              ❌ (mover)
  │   ├── utils.ts              ❌ (mover)
  │   ├── use-data-hooks.ts     ❌ (mover)
  │   └── ...
  ├── components/
  │   ├── dashboard/
  │   │   └── page.tsx          ❌ (eliminar)
  │   └── ...
  └── hooks/
      ├── use-tasks.tsx         ❌ (consolidar)
      └── use-projects.tsx      ❌ (consolidar)
```

## Estructura Propuesta
```
src/
  ├── lib/
  │   ├── supabase/            ✅ (mantener)
  │   └── ...
  ├── types/
  │   └── index.ts             ✅ (consolidar tipos aquí)
  ├── utils/
  │   └── index.ts             ✅ (mover utils.ts aquí)
  ├── hooks/
  │   ├── index.ts             ✅ (nuevo archivo para exportaciones)
  │   └── use-data.ts          ✅ (consolidar hooks aquí)
  └── app/
      └── dashboard/
          └── page.tsx         ✅ (mantener solo aquí)
```

## Pasos para la Reorganización

1. Consolidar Tipos:
   - Mover todo el contenido de `/src/lib/types.ts` a `/src/types/index.ts`
   - Actualizar importaciones

2. Mover Utilidades:
   - Crear directorio `/src/utils/`
   - Mover `/src/lib/utils.ts` a `/src/utils/index.ts`
   - Actualizar importaciones

3. Consolidar Hooks:
   - Crear nuevo archivo `/src/hooks/use-data.ts`
   - Combinar la lógica de todos los hooks relacionados
   - Actualizar importaciones

4. Limpiar Componentes:
   - Eliminar `/src/components/dashboard/page.tsx`
   - Asegurar que toda la lógica esté en `/src/app/dashboard/page.tsx`

5. Actualizar Configuración:
   - Verificar paths en tsconfig.json
   - Actualizar aliases de importación

## Beneficios
- Mejor organización del código
- Eliminación de duplicados
- Mantenimiento más fácil
- Mejor separación de responsabilidades