import { initDB } from './db.js';

// Router simple basé sur le hash
class Router {
  constructor() {
    this.routes = {};
    this.currentPage = null;

    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  register(path, handler) {
    this.routes[path] = handler;
  }

  handleRoute() {
    const hash = window.location.hash || '#/';
    const path = hash.slice(1) || '/';

    // Mettre à jour la navigation active
    document.querySelectorAll('.nav-link').forEach(link => {
      const linkPath = link.getAttribute('href').slice(1);
      link.classList.toggle('active', linkPath === path);
    });

    // Trouver et exécuter le handler
    const handler = this.routes[path];
    if (handler) {
      this.currentPage = path;
      handler();
    } else {
      // Route par défaut
      this.routes['/']?.();
    }
  }

  navigate(path) {
    window.location.hash = path;
  }
}

// Instance globale du router
const router = new Router();

// Contenu principal
const appContent = document.getElementById('app-content');

// Initialiser la DB au démarrage
initDB().then(() => {
  console.log('✅ Database initialized');
}).catch(err => {
  console.error('❌ Database error:', err);
});

// Import des pages
import { renderCreateRecipePage } from './pages/createRecipe.js';
import { renderRecipeIndexPage } from './pages/recipeIndex.js';
import { renderWeekPlannerPage } from './pages/weekPlanner.js';
import { renderShoppingPage } from './pages/shoppingPage.js';

// Enregistrement des routes
router.register('/', () => {
  renderCreateRecipePage(appContent);
});

router.register('/recipes', () => {
  renderRecipeIndexPage(appContent);
});

router.register('/week', () => {
  renderWeekPlannerPage(appContent);
});

router.register('/shopping', () => {
  renderShoppingPage(appContent);
});

// Export pour utilisation dans d'autres modules
export { router };
