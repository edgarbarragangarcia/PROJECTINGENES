/**
 * Script de diagnóstico para problemas de autenticación
 * Verifica si el login funciona y si hay redirección al dashboard
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ytljrvcjstbuhrdothhf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bGpydmNqc3RidWhyZG90aGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDgzNDgsImV4cCI6MjA3MTcyNDM0OH0.jCHe5wpfu3JP7ujJsGinOHcRt7HVaG2lv5OHUsKkK00';

async function diagnose() {
  console.log('🔍 DIAGNÓSTICO DE AUTENTICACIÓN');
  console.log('═'.repeat(60));

  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  try {
    // 1. Verificar sesión actual
    console.log('\n1️⃣  Verificando sesión actual...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Error obteniendo sesión:', sessionError.message);
    } else if (sessionData.session) {
      console.log('✅ Sesión activa encontrada');
      console.log('   Email:', sessionData.session.user.email);
      console.log('   Usuario ID:', sessionData.session.user.id);
      return;
    } else {
      console.log('⚠️  No hay sesión activa');
    }

    // 2. Crear usuario de prueba
    console.log('\n2️⃣  Creando usuario de prueba...');
    const testEmail = `test-diag-${Date.now()}@test.com`;
    const testPassword = 'TestPassword123!@#';

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      console.log('❌ Error en registro:', signUpError.message);
      return;
    }

    console.log('✅ Usuario creado');
    console.log('   Email:', testEmail);
    console.log('   Usuario ID:', signUpData.user?.id);

    // 3. Intentar login
    console.log('\n3️⃣  Intentando login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (loginError) {
      console.log('❌ Error en login:', loginError.message);
      return;
    }

    console.log('✅ Login exitoso');
    console.log('   Token presente:', !!loginData.session?.access_token);
    console.log('   Token tipo:', loginData.session?.token_type);
    console.log('   Expires:', loginData.session?.expires_at);

    // 4. Verificar sesión después de login
    console.log('\n4️⃣  Verificando sesión después de login...');
    const { data: postLoginSession } = await supabase.auth.getSession();

    if (postLoginSession.session) {
      console.log('✅ Sesión confirmada');
      console.log('   Usuario:', postLoginSession.session.user.email);
    } else {
      console.log('❌ ¡Error! Sesión no se estableció después del login');
      console.log('   Esto es el problema - el cliente no está guardando la sesión');
    }

    // 5. Verificar usuario actual
    console.log('\n5️⃣  Obteniendo usuario actual...');
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.log('❌ Error obteniendo usuario:', userError.message);
    } else if (userData.user) {
      console.log('✅ Usuario obtenido');
      console.log('   Email:', userData.user.email);
      console.log('   Confirmado:', userData.user.email_confirmed_at ? 'Sí' : 'No');
    }

    // 6. Limpiar
    console.log('\n6️⃣  Limpiando datos de prueba...');
    await supabase.auth.admin.deleteUser(signUpData.user?.id!);
    console.log('✅ Usuario de prueba eliminado');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ DIAGNÓSTICO COMPLETADO');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

diagnose();
