import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * 🔍 ENDPOINT DE DIAGNÓSTICO
 * 
 * Accede a: http://localhost:9003/api/debug-oauth
 * 
 * Muestra:
 * - Variables de entorno cargadas
 * - Configuración de Supabase
 * - Estado de los providers
 */
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Obtener info del proyecto
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const projectRef = projectUrl?.split('.')[0]?.replace('https://', '')

    // Información disponible
    const info = {
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseRef: projectRef,
        googleClientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
        googleClientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
      },
      instructions: {
        step1: "Verifica Google Cloud Console",
        step1Url: "https://console.cloud.google.com/apis/credentials",
        step2: "Verifica Supabase Dashboard",
        step2Url: "https://app.supabase.com/",
        requiredRedirectUris: [
          "https://ytljrvcjstbuhrdothhf.supabase.co/auth/v1/callback",
          "https://projectingenes.vercel.app/auth/callback",
          "http://localhost:9003/auth/callback"
        ]
      },
      debugging: {
        openDevTools: "Press F12 when clicking Google Sign In",
        checkBrowser: "Check the browser console for detailed error logs",
        checkNetworkTab: "Check Network tab to see OAuth redirect flow"
      }
    }

    return NextResponse.json(info, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check environment variables in .env.local'
      },
      { status: 500 }
    )
  }
}
