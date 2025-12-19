import { supabase, initAuth, getUser, hasFamily } from './supabase.js';

// Connexion avec Google
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });

  if (error) throw error;
  return data;
}

// Déconnexion
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.href = '/';
}

// Gérer le callback d'auth
export async function handleAuthCallback() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Auth callback error:', error);
    return null;
  }

  return session;
}

// Vérifier l'état d'auth et rediriger si nécessaire
export async function requireAuth() {
  const user = await initAuth();

  if (!user) {
    // Pas connecté → page de connexion
    window.location.hash = '#/login';
    return false;
  }

  if (!hasFamily()) {
    // Connecté mais pas de famille → onboarding
    window.location.hash = '#/onboarding';
    return false;
  }

  return true;
}
