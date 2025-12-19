// Page Planning Semaine
import { renderCalendar } from '../components/calendar.js';
import { getWeekPlan, createOrUpdateWeekPlan, setMealSlot, getAllRecipes, getRecipe, getWeekStartDate, generateShoppingListFromPlan, saveShoppingList, rateRecipe } from '../db.js';
import { getAdjacentWeek, formatDate, createModal, showToast, renderStars, getDayName } from '../utils.js';


export async function renderWeekPlannerPage(container) {
  let currentWeekStart = getWeekStartDate();
  let weekPlan = null;
  let allRecipes = [];

  async function loadWeek() {
    weekPlan = await getWeekPlan(currentWeekStart);
    if (!weekPlan) {
      weekPlan = await createOrUpdateWeekPlan(currentWeekStart);
    }
    allRecipes = await getAllRecipes();
    renderPage();
  }

  function renderPage() {
    const startDate = new Date(currentWeekStart);
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);

    const weekLabel = `Semaine du ${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;

    container.innerHTML = `
      <div class="calendar-container">
        <div class="calendar-header">
          <div class="calendar-nav">
            <button id="prev-week">← Précédent</button>
          </div>
          <h2>${weekLabel}</h2>
          <div class="calendar-nav">
            <button id="next-week">Suivant →</button>
          </div>
        </div>

        <div id="calendar-grid">
          <!-- Calendrier injecté ici -->
        </div>
      </div>

      <div class="flex justify-center gap-2 mt-3">
        <button class="btn btn-primary btn-lg" id="generate-shopping">
          🛒 Générer la liste de courses
        </button>
        <button class="btn btn-secondary" id="today-btn">
          📅 Aujourd'hui
        </button>
      </div>
    `;

    // Navigation
    container.querySelector('#prev-week').addEventListener('click', () => {
      currentWeekStart = getAdjacentWeek(currentWeekStart, -1);
      loadWeek();
    });

    container.querySelector('#next-week').addEventListener('click', () => {
      currentWeekStart = getAdjacentWeek(currentWeekStart, 1);
      loadWeek();
    });

    container.querySelector('#today-btn').addEventListener('click', () => {
      currentWeekStart = getWeekStartDate();
      loadWeek();
    });

    // Générer liste de courses
    container.querySelector('#generate-shopping').addEventListener('click', async () => {
      const items = await generateShoppingListFromPlan(currentWeekStart);
      if (items.length === 0) {
        showToast('Aucune recette planifiée cette semaine', 'error');
        return;
      }
      await saveShoppingList(currentWeekStart, weekPlan.id, items);
      showToast('Liste de courses générée !', 'success');
      window.location.hash = '#/shopping';
    });

    // Render calendar
    const calendarGrid = container.querySelector('#calendar-grid');
    renderCalendar(calendarGrid, weekPlan, currentWeekStart, {
      onSlotClick: (day, meal) => openRecipeSelector(day, meal),
      onRecipeClick: (day, meal, recipeId) => openRecipeActions(day, meal, recipeId)
    });
  }

  function openRecipeSelector(day, meal) {
    const { overlay, close } = createModal(`Choisir une recette - ${getDayName(day)} ${meal === 'lunch' ? 'midi' : 'soir'}`, `
      <input type="text" id="recipe-search" placeholder="Rechercher..." class="mb-2">
      <div id="recipe-list" style="max-height: 300px; overflow-y: auto;">
        ${allRecipes.length === 0 ? `
          <div class="empty-state">
            <p>Aucune recette disponible</p>
            <button class="btn btn-primary btn-sm mt-2" id="create-new">+ Créer une recette</button>
          </div>
        ` : `
          ${allRecipes.map(recipe => `
            <div class="recipe-select-item" data-recipe-id="${recipe.id}" style="padding: 0.75rem; border-bottom: 1px solid var(--color-border); cursor: pointer;">
              <strong>${recipe.name}</strong>
              <div style="font-size: 0.85rem; color: var(--color-text-light);">
                ${recipe.tags?.slice(0, 3).join(', ') || ''}
              </div>
            </div>
          `).join('')}
        `}
      </div>
      <div class="modal-footer mt-2">
        <button class="btn btn-secondary" id="cancel-select">Annuler</button>
        <button class="btn btn-primary" id="create-new-recipe">+ Nouvelle recette</button>
      </div>
    `);

    // Search
    const searchInput = overlay.querySelector('#recipe-search');
    const recipeList = overlay.querySelector('#recipe-list');

    searchInput?.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const items = recipeList.querySelectorAll('.recipe-select-item');
      items.forEach(item => {
        const name = item.querySelector('strong').textContent.toLowerCase();
        item.style.display = name.includes(query) ? 'block' : 'none';
      });
    });

    // Select recipe
    recipeList.querySelectorAll('.recipe-select-item').forEach(item => {
      item.addEventListener('click', async () => {
        const recipeId = item.dataset.recipeId;
        await setMealSlot(currentWeekStart, day, meal, recipeId);
        close();
        loadWeek();
        showToast('Recette ajoutée au planning', 'success');
      });
    });

    // Buttons
    overlay.querySelector('#cancel-select')?.addEventListener('click', close);
    overlay.querySelector('#create-new')?.addEventListener('click', () => {
      close();
      window.location.hash = '#/';
    });
    overlay.querySelector('#create-new-recipe')?.addEventListener('click', () => {
      close();
      window.location.hash = '#/';
    });
  }

  async function openRecipeActions(day, meal, recipeId) {
    const recipe = await getRecipe(recipeId);
    if (!recipe) return;

    const { overlay, close } = createModal(recipe.name, `
      <p style="color: var(--color-text-light); margin-bottom: 1rem;">
        ${getDayName(day)} ${meal === 'lunch' ? 'midi' : 'soir'}
      </p>

      <div class="flex flex-col gap-1">
        <button class="btn btn-primary w-full" id="start-cooking">
          👨‍🍳 Mode Cuisine
        </button>
        <button class="btn btn-secondary w-full" id="view-recipe">
          📖 Voir la fiche
        </button>
        <button class="btn btn-secondary w-full" id="give-feedback">
          ⭐ Donner mon avis
        </button>
        <button class="btn btn-danger w-full" id="remove-recipe">
          🗑️ Retirer du planning
        </button>
      </div>
    `);

    overlay.querySelector('#start-cooking').addEventListener('click', () => {
      close();
      import('../components/cookingMode.js').then(({ openCookingMode }) => {
        openCookingMode(recipe);
      });
    });

    overlay.querySelector('#view-recipe').addEventListener('click', () => {
      close();
      window.location.hash = '#/recipes';
      // TODO: ouvrir directement la fiche de cette recette
    });

    overlay.querySelector('#give-feedback').addEventListener('click', () => {
      close();
      openFeedbackModal(recipe);
    });

    overlay.querySelector('#remove-recipe').addEventListener('click', async () => {
      await setMealSlot(currentWeekStart, day, meal, null);
      close();
      loadWeek();
      showToast('Recette retirée du planning', 'success');
    });
  }

  function openFeedbackModal(recipe) {
    let selectedRating = recipe.rating || 0;

    const { overlay, close } = createModal(`Noter "${recipe.name}"`, `
      <div class="text-center mb-3">
        <div id="rating-stars" class="mb-2">
          ${[1, 2, 3, 4, 5].map(i => `
            <span class="star ${i <= selectedRating ? 'filled' : ''}" data-rating="${i}" style="font-size: 2rem; cursor: pointer;">★</span>
          `).join('')}
        </div>
        <p id="rating-text" style="color: var(--color-text-light);">
          ${selectedRating ? `${selectedRating}/5` : 'Clique sur les étoiles'}
        </p>
      </div>

      <textarea id="comment" placeholder="Un commentaire ? (optionnel)" rows="3" class="mb-2"></textarea>

      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancel-feedback">Annuler</button>
        <button class="btn btn-primary" id="save-feedback">Enregistrer</button>
      </div>
    `);

    // Rating stars
    overlay.querySelectorAll('#rating-stars .star').forEach(star => {
      star.addEventListener('click', () => {
        selectedRating = parseInt(star.dataset.rating);
        overlay.querySelectorAll('#rating-stars .star').forEach((s, i) => {
          s.classList.toggle('filled', i < selectedRating);
        });
        overlay.querySelector('#rating-text').textContent = `${selectedRating}/5`;
      });
    });

    overlay.querySelector('#cancel-feedback').addEventListener('click', close);

    overlay.querySelector('#save-feedback').addEventListener('click', async () => {
      if (selectedRating > 0) {
        const comment = overlay.querySelector('#comment').value.trim();
        await rateRecipe(recipe.id, selectedRating, comment || null);
        showToast('Merci pour ton avis !', 'success');
      }
      close();
    });
  }

  // Charger la semaine initiale
  await loadWeek();
}
