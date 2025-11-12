/**
 * Test users for local development and quick demos.
 * These users do NOT require Supabase; they work entirely client-side.
 * Email/password combinations that trigger local session simulation.
 */

export const TEST_USERS = {
  demo: {
    email: 'test@local.dev',
    password: 'Test@12345',
  },
  admin: {
    email: 'admin@local.dev',
    password: 'Admin@12345',
  },
};

export function isTestUser(email: string): boolean {
  return Object.values(TEST_USERS).some(user => user.email === email);
}

export function validateTestUserPassword(email: string, password: string): boolean {
  const user = Object.values(TEST_USERS).find(u => u.email === email);
  return user ? user.password === password : false;
}

/**
 * Generate a fake Supabase session for a test user.
 * This simulates what Supabase returns for signInWithPassword.
 */
export function generateTestSession(email: string, userId?: string) {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 3600; // 1 hour
  const expiresAt = now + expiresIn;

  // Fake JWT (not valid, just for testing)
  const fakeToken = Buffer.from(
    JSON.stringify({
      sub: userId || 'test-' + email.split('@')[0],
      email,
      iat: now,
      exp: expiresAt,
    })
  ).toString('base64');

  return {
    access_token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${fakeToken}.fake_signature`,
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: expiresAt,
    refresh_token: 'fake_refresh_' + Date.now(),
    user: {
      id: userId || 'test-' + email.split('@')[0],
      email,
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'test', providers: ['test'] },
      user_metadata: { full_name: email.split('@')[0] },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_anonymous: false,
    },
  };
}
