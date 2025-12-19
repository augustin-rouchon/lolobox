// LoloBox V1 - Main App
import { initAuth, getUser, hasFamily, getFamily, getMember } from './supabase.js';
import { signOut } from './auth.js';
import { renderLoginPage } from './pages/auth.js';
import { renderOnboardingPage } from './pages/onboarding.js';
import { renderCreateRecipePage } from './pages/createRecipe.js';
import { renderRecipeIndexPage } from './pages/recipeIndex.js';
import { renderWeekPlannerPage } from './pages/weekPlanner.js';
import { renderShoppingPage } from './pages/shoppingPage.js';
import { createInvitation } from './db.js';
import { showToast } from './utils.js';

// État de l'app
let isInitialized = false;

// Initialisation
async function init() {
  // Détecter si c'est un callback OAuth
  const isOAuthCallback = window.location.hash.includes('access_token');

  // Initialiser l'auth (Supabase récupère le token automatiquement)
  await initAuth();
  isInitialized = true;

  // Nettoyer l'URL après que Supabase a récupéré le token
  if (isOAuthCallback) {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl + '#/');
  }

  // Router
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

// Router
async function handleRoute() {
  if (!isInitialized) return;

  const hash = window.location.hash || '#/';
  const path = hash.slice(1); // Remove #

  const user = getUser();
  const family = getFamily();

  // Routes publiques (pas besoin d'auth)
  if (path === '/login') {
    hideHeader();
    renderLoginPage(getContent());
    return;
  }

  // Callback auth
  if (path === '/auth/callback') {
    // Supabase gère ça automatiquement, on redirige
    window.location.hash = '#/';
    return;
  }

  // Route pour rejoindre une famille
  if (path.startsWith('/join/')) {
    const inviteCode = path.split('/')[2];
    if (!user) {
      // Stocker le code d'invitation et rediriger vers login
      sessionStorage.setItem('pendingInvite', inviteCode);
      window.location.hash = '#/login';
      return;
    }
    hideHeader();
    renderOnboardingPage(getContent(), inviteCode);
    return;
  }

  // Routes protégées - vérifier auth
  if (!user) {
    window.location.hash = '#/login';
    return;
  }

  // Vérifier s'il y a une invitation en attente après login
  const pendingInvite = sessionStorage.getItem('pendingInvite');
  if (pendingInvite && !family) {
    sessionStorage.removeItem('pendingInvite');
    window.location.hash = `#/join/${pendingInvite}`;
    return;
  }

  // Pas de famille → onboarding
  if (!family && path !== '/onboarding') {
    window.location.hash = '#/onboarding';
    return;
  }

  if (path === '/onboarding') {
    hideHeader();
    renderOnboardingPage(getContent());
    return;
  }

  // Routes avec famille
  showHeader();

  switch (path) {
    case '/':
      setActiveNav('create');
      renderCreateRecipePage(getContent());
      break;
    case '/recipes':
      setActiveNav('recipes');
      renderRecipeIndexPage(getContent());
      break;
    case '/week':
      setActiveNav('week');
      renderWeekPlannerPage(getContent());
      break;
    case '/shopping':
      setActiveNav('shopping');
      renderShoppingPage(getContent());
      break;
    default:
      // Route inconnue → accueil
      window.location.hash = '#/';
  }
}

// Helpers DOM
function getContent() {
  return document.getElementById('app-content');
}

function hideHeader() {
  document.getElementById('app-header').style.display = 'none';
  document.getElementById('app-content').style.minHeight = '100vh';
}

function showHeader() {
  document.getElementById('app-header').style.display = 'flex';
  document.getElementById('app-content').style.minHeight = 'calc(100vh - 80px)';
  updateUserMenu();
}

function setActiveNav(page) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.page === page) {
      link.classList.add('active');
    }
  });
}

function updateUserMenu() {
  const userMenuContainer = document.getElementById('user-menu-container');
  const member = getMember();
  const family = getFamily();
  const user = getUser();

  if (!userMenuContainer || !user) return;

  const initial = (member?.name || user.email || 'U').charAt(0).toUpperCase();

  userMenuContainer.innerHTML = `
    <div class="user-menu">
      <button class="user-avatar" id="user-avatar-btn">${initial}</button>
      <div class="user-dropdown" id="user-dropdown">
        <div class="family-info">
          <div class="family-name">${family?.name || 'Ma famille'}</div>
          <div class="family-code">Code: ${family?.code || '---'}</div>
        </div>
        <button class="user-dropdown-item" id="invite-btn">
          <span>📨</span> Inviter quelqu'un
        </button>
        <div class="user-dropdown-divider"></div>
        <button class="user-dropdown-item danger" id="logout-btn">
          <span>🚪</span> Déconnexion
        </button>
      </div>
    </div>
  `;

  // Event listeners
  const avatarBtn = document.getElementById('user-avatar-btn');
  const dropdown = document.getElementById('user-dropdown');

  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('active');
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('active');
  });

  document.getElementById('invite-btn').addEventListener('click', async () => {
    try {
      const invitation = await createInvitation();
      await navigator.clipboard.writeText(invitation.link);
      showToast('Lien d\'invitation copié !', 'success');
    } catch (error) {
      console.error('Error creating invitation:', error);
      showToast('Erreur lors de la création de l\'invitation', 'error');
    }
    dropdown.classList.remove('active');
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await signOut();
  });
}

// Démarrer l'app
init();
