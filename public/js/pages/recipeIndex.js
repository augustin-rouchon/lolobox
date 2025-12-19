// Page Index des Recettes
import { getAllRecipes, searchRecipes } from '../db.js';
import { recipeCardHTML } from '../components/recipeCard.js';
import { renderRecipeView } from '../components/recipeView.js';
import { debounce } from '../utils.js';

// Tags par défaut
const DEFAULT_TAGS = ['rapide', 'batch-cooking', 'enfants-adorent', 'végétarien', 'sans-gluten'];


export async function renderRecipeIndexPage(container) {
  let recipes = [];
  let filteredRecipes = [];
  let currentFilter = { tag: '', rating: '', sort: 'createdAt' };
  let selectedRecipe = null;

  // Charger les recettes
  async function loadRecipes() {
    recipes = await getAllRecipes();
    applyFilters();
  }

  function applyFilters() {
    filteredRecipes = [...recipes];

    // Filter by tag
    if (currentFilter.tag) {
      filteredRecipes = filteredRecipes.filter(r =>
        r.tags?.includes(currentFilter.tag)
      );
    }

    // Filter by rating
    if (currentFilter.rating) {
      const minRating = parseInt(currentFilter.rating);
      filteredRecipes = filteredRecipes.filter(r =>
        r.rating && r.rating >= minRating
      );
    }

    // Sort
    filteredRecipes.sort((a, b) => {
      switch (currentFilter.sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'timesCooked':
          return (b.timesCooked || 0) - (a.timesCooked || 0);
        case 'createdAt':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    renderList();
  }

  async function handleSearch(query) {
    if (query.trim()) {
      filteredRecipes = await searchRecipes(query);
    } else {
      filteredRecipes = [...recipes];
    }
    applyFilters();
  }

  function renderList() {
    const listContainer = container.querySelector('#recipes-list');
    if (!listContainer) return;

    if (filteredRecipes.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📖</div>
          <h3>Aucune recette</h3>
          <p>${recipes.length === 0
            ? 'Commence par créer ta première recette !'
            : 'Aucune recette ne correspond à tes critères.'}</p>
          ${recipes.length === 0 ? `
            <button class="btn btn-primary mt-2" id="create-first">
              + Créer une recette
            </button>
          ` : ''}
        </div>
      `;

      listContainer.querySelector('#create-first')?.addEventListener('click', () => {
        window.location.hash = '#/';
      });
      return;
    }

    listContainer.innerHTML = `
      <div class="recipes-grid">
        ${filteredRecipes.map(recipe => recipeCardHTML(recipe)).join('')}
      </div>
    `;

    // Click handlers
    listContainer.querySelectorAll('.recipe-card').forEach(card => {
      card.addEventListener('click', () => {
        const recipeId = card.dataset.recipeId;
        const recipe = recipes.find(r => r.id === recipeId);
        if (recipe) {
          showRecipeDetail(recipe);
        }
      });
    });
  }

  function showRecipeDetail(recipe) {
    selectedRecipe = recipe;
    const mainContent = container.querySelector('#main-content');
    const detailContent = container.querySelector('#detail-content');

    mainContent.classList.add('hidden');
    detailContent.classList.remove('hidden');

    renderRecipeView(detailContent, recipe, {
      onClose: () => {
        detailContent.classList.add('hidden');
        mainContent.classList.remove('hidden');
        selectedRecipe = null;
      },
      onDelete: () => {
        detailContent.classList.add('hidden');
        mainContent.classList.remove('hidden');
        selectedRecipe = null;
        loadRecipes();
      },
      onUpdate: async () => {
        await loadRecipes();
        const updated = recipes.find(r => r.id === recipe.id);
        if (updated) {
          renderRecipeView(detailContent, updated, {
            onClose: () => {
              detailContent.classList.add('hidden');
              mainContent.classList.remove('hidden');
              selectedRecipe = null;
            },
            onDelete: () => {
              detailContent.classList.add('hidden');
              mainContent.classList.remove('hidden');
              selectedRecipe = null;
              loadRecipes();
            },
            onUpdate: () => loadRecipes()
          });
        }
      }
    });
  }

  // Rendu initial
  const allTags = DEFAULT_TAGS;

  container.innerHTML = `
    <div id="main-content">
      <div class="flex justify-between items-center mb-3">
        <h1 class="page-title">📖 Mes Recettes</h1>
        <button class="btn btn-primary" id="add-recipe-btn">+ Nouvelle</button>
      </div>

      <div class="search-bar">
        <div class="search-input">
          <input type="text" id="search-input" placeholder="Rechercher une recette...">
        </div>
      </div>

      <div class="filters">
        <select class="filter-select" id="filter-tag">
          <option value="">Tous les tags</option>
          ${allTags.map(tag => `<option value="${tag}">${tag}</option>`).join('')}
        </select>
        <select class="filter-select" id="filter-rating">
          <option value="">Toutes les notes</option>
          <option value="5">⭐⭐⭐⭐⭐ (5)</option>
          <option value="4">⭐⭐⭐⭐ (4+)</option>
          <option value="3">⭐⭐⭐ (3+)</option>
        </select>
        <select class="filter-select" id="filter-sort">
          <option value="createdAt">Plus récentes</option>
          <option value="name">Alphabétique</option>
          <option value="rating">Meilleures notes</option>
          <option value="timesCooked">Plus cuisinées</option>
        </select>
      </div>

      <div id="recipes-list">
        <div class="loading">Chargement...</div>
      </div>
    </div>

    <div id="detail-content" class="hidden">
      <!-- Détail de la recette -->
    </div>
  `;

  // Event listeners
  container.querySelector('#add-recipe-btn').addEventListener('click', () => {
    window.location.hash = '#/';
  });

  const searchInput = container.querySelector('#search-input');
  searchInput.addEventListener('input', debounce((e) => {
    handleSearch(e.target.value);
  }, 300));

  container.querySelector('#filter-tag').addEventListener('change', (e) => {
    currentFilter.tag = e.target.value;
    applyFilters();
  });

  container.querySelector('#filter-rating').addEventListener('change', (e) => {
    currentFilter.rating = e.target.value;
    applyFilters();
  });

  container.querySelector('#filter-sort').addEventListener('change', (e) => {
    currentFilter.sort = e.target.value;
    applyFilters();
  });

  // Charger les données
  await loadRecipes();
}
