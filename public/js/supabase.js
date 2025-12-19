// Configuration Supabase
const SUPABASE_URL = 'https://tjnmnnmsdmmtckwuqums.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_bDYAqEs1jua-KQ4BVytOwg_JK55sfuN';

// Import Supabase depuis CDN
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Créer le client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// État de l'utilisateur courant
let currentUser = null;
let currentFamily = null;
let currentMember = null;

// Getters
export function getUser() { return currentUser; }
export function getFamily() { return currentFamily; }
export function getMember() { return currentMember; }

// Initialiser l'état auth
export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    currentUser = session.user;
    await loadFamilyData();
  }

  // Écouter les changements d'auth
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user;
      await loadFamilyData();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentFamily = null;
      currentMember = null;
    }
  });

  return currentUser;
}

// Charger les données famille de l'utilisateur
async function loadFamilyData() {
  if (!currentUser) return;

  // Récupérer le membership
  const { data: membership } = await supabase
    .from('family_members')
    .select(`
      *,
      family:families(*)
    `)
    .eq('user_id', currentUser.id)
    .single();

  if (membership) {
    currentMember = membership;
    currentFamily = membership.family;
  }
}

// Vérifier si l'utilisateur a une famille
export function hasFamily() {
  return currentFamily !== null;
}

// Rafraîchir les données famille
export async function refreshFamilyData() {
  await loadFamilyData();
  return { family: currentFamily, member: currentMember };
}
