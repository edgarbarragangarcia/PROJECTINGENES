-- Script para hacer admin al usuario
-- Ejecuta esto en el SQL Editor de Supabase

UPDATE profiles 
SET role = 'admin' 
WHERE email = 'ebarragan@ingenes.com';

-- Verifica el cambio
SELECT id, email, full_name, role FROM profiles WHERE email = 'ebarragan@ingenes.com';
