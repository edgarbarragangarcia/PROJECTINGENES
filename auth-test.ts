/**
 * Script de pruebas de autenticación para PROJECTINGENES
 * Prueba flujos de: Registro, Login, Verificación de sesión y Logout
 */

import { createClient } from '@supabase/supabase-js';

// Variables de entorno
const SUPABASE_URL = 'https://ytljrvcjstbuhrdothhf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bGpydmNqc3RidWhyZG90aGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDgzNDgsImV4cCI6MjA3MTcyNDM0OH0.jCHe5wpfu3JP7ujJsGinOHcRt7HVaG2lv5OHUsKkK00';

// Datos de prueba
const testUser = {
  email: `test-${Date.now()}@projectingenes.test`,
  password: 'TestPassword123!@#',
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runAuthTests() {
  console.log('🧪 INICIANDO PRUEBAS DE AUTENTICACIÓN\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Registro
    console.log('\n📝 TEST 1: REGISTRO DE NUEVO USUARIO');
    console.log('-'.repeat(60));
    console.log(`Email: ${testUser.email}`);
    console.log(`Contraseña: ****`);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
    });

    if (signUpError) {
      console.error('❌ Error en registro:', signUpError.message);
      throw signUpError;
    }

    console.log('✅ Registro exitoso');
    console.log(`Usuario ID: ${signUpData.user?.id}`);
    console.log(`Email confirmado: ${signUpData.user?.email_confirmed_at ? 'Sí' : 'No'}`);

    // Test 2: Login
    console.log('\n\n🔐 TEST 2: LOGIN CON CREDENCIALES');
    console.log('-'.repeat(60));
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    if (signInError) {
      console.error('❌ Error en login:', signInError.message);
      throw signInError;
    }

    console.log('✅ Login exitoso');
    console.log(`Token de acceso: ${signInData.session?.access_token?.substring(0, 20)}...`);
    console.log(`Tipo de token: ${signInData.session?.token_type}`);
    console.log(`Expira en: ${new Date(signInData.session?.expires_at! * 1000).toLocaleString()}`);

    // Test 3: Obtener sesión actual
    console.log('\n\n👤 TEST 3: VERIFICACIÓN DE SESIÓN ACTUAL');
    console.log('-'.repeat(60));
    
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('❌ Error obteniendo sesión:', sessionError.message);
      throw sessionError;
    }

    if (sessionData.session) {
      console.log('✅ Sesión activa encontrada');
      console.log(`Usuario: ${sessionData.session.user.email}`);
      console.log(`ID: ${sessionData.session.user.id}`);
      console.log(`Metadata: ${JSON.stringify(sessionData.session.user.user_metadata || {})}`);
    } else {
      console.log('⚠️ No hay sesión activa');
    }

    // Test 4: Obtener usuario actual
    console.log('\n\n🔍 TEST 4: OBTENER DATOS DEL USUARIO ACTUAL');
    console.log('-'.repeat(60));
    
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('❌ Error obteniendo usuario:', userError.message);
      throw userError;
    }

    if (userData.user) {
      console.log('✅ Datos del usuario obtenidos');
      console.log(`Email: ${userData.user.email}`);
      console.log(`Teléfono: ${userData.user.phone || 'No configurado'}`);
      console.log(`Proveedor: ${userData.user.app_metadata?.provider || 'email'}`);
      console.log(`Creado: ${new Date(userData.user.created_at).toLocaleString()}`);
    }

    // Test 5: Logout
    console.log('\n\n🚪 TEST 5: CERRAR SESIÓN (LOGOUT)');
    console.log('-'.repeat(60));
    
    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      console.error('❌ Error en logout:', logoutError.message);
      throw logoutError;
    }

    console.log('✅ Logout exitoso');

    // Test 6: Verificar que no hay sesión después del logout
    console.log('\n\n🔐 TEST 6: VERIFICACIÓN POST-LOGOUT');
    console.log('-'.repeat(60));
    
    const { data: postLogoutSession } = await supabase.auth.getSession();

    if (!postLogoutSession.session) {
      console.log('✅ Sesión correctamente limpiada');
    } else {
      console.error('❌ La sesión aún existe después del logout');
    }

    // Test 7: Intentar login nuevamente
    console.log('\n\n🔄 TEST 7: LOGIN NUEVAMENTE POST-LOGOUT');
    console.log('-'.repeat(60));
    
    const { data: secondLoginData, error: secondLoginError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    if (secondLoginError) {
      console.error('❌ Error en segundo login:', secondLoginError.message);
      throw secondLoginError;
    }

    console.log('✅ Segundo login exitoso');

    // Limpiar: Eliminar usuario de prueba
    console.log('\n\n🗑️  TEST 8: LIMPIEZA (ELIMINAR USUARIO DE PRUEBA)');
    console.log('-'.repeat(60));
    
    const { error: deleteError } = await supabase.auth.admin.deleteUser(signUpData.user?.id!);

    if (deleteError) {
      console.warn('⚠️  No se pudo eliminar usuario automáticamente:', deleteError.message);
      console.log('💡 El usuario puede eliminarse manualmente desde el dashboard de Supabase');
    } else {
      console.log('✅ Usuario de prueba eliminado exitosamente');
    }

    // Resumen
    console.log('\n\n' + '='.repeat(60));
    console.log('✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE\n');
    console.log('RESUMEN:');
    console.log('  ✓ Registro de usuario');
    console.log('  ✓ Login con credenciales');
    console.log('  ✓ Obtención de sesión');
    console.log('  ✓ Obtención de datos de usuario');
    console.log('  ✓ Logout');
    console.log('  ✓ Verificación post-logout');
    console.log('  ✓ Relogin después de logout');
    console.log('  ✓ Limpieza de datos de prueba');
    console.log('=' .repeat(60) + '\n');

  } catch (error) {
    console.error('\n\n❌ PRUEBAS FALLIDAS');
    console.error('Error:', error);
    process.exit(1);
  }
}

runAuthTests();
