/**
 * Crear usuario de prueba para PROJECTINGENES
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ytljrvcjstbuhrdothhf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bGpydmNqc3RidWhyZG90aGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDgzNDgsImV4cCI6MjA3MTcyNDM0OH0.jCHe5wpfu3JP7ujJsGinOHcRt7HVaG2lv5OHUsKkK00';

async function createTestUser() {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  const testEmail = 'demo@projectingenes.test';
  const testPassword = 'Demo@12345';

  console.log('Creando usuario de prueba...\n');

  try {
    // Verificar si el usuario ya existe intentando login primero
    const { data: existingSession } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (existingSession.session) {
      console.log('✅ El usuario ya existe');
      console.log('\n📝 Credenciales:');
      console.log('   Email: ' + testEmail);
      console.log('   Contraseña: ' + testPassword);
      return;
    }
  } catch (e) {
    // El usuario no existe, crear uno nuevo
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }

    console.log('✅ Usuario creado exitosamente\n');
    console.log('📝 Credenciales para iniciar sesión:');
    console.log('━'.repeat(50));
    console.log('   Email:      ' + testEmail);
    console.log('   Contraseña: ' + testPassword);
    console.log('━'.repeat(50));
    console.log('\n💾 Guárdalo en un lugar seguro');
    console.log('🌐 Accede a: http://localhost:3000/login');

  } catch (err) {
    console.error('Error:', err);
  }
}

createTestUser();
