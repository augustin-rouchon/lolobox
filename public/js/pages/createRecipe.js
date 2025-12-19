// Page Création de Recette
import { createChat } from '../components/chat.js';
import { addRecipe } from '../db.js';
import { showToast, formatTime } from '../utils.js';
import { router } from '../app.js';

export function renderCreateRecipePage(container) {
  let pendingRecipe = null;
  let conversationHistory = [];
  let servingsConfig = {
    adults: 3,
    children: 3
  };

  container.innerHTML = `
    <div class="page-create-recipe">
      <h1 class="page-title">🍳 Nouvelle Recette</h1>
      <p class="mb-3" style="color: var(--color-text-light);">
        Discute avec l'assistant pour créer ta recette idéale !
      </p>

      <div id="chat-container"></div>

      <div id="recipe-preview" class="hidden mt-3">
        <!-- Preview sera injecté ici -->
      </div>
    </div>
  `;

  const chatContainer = container.querySelector('#chat-container');
  const previewContainer = container.querySelector('#recipe-preview');

  // Créer le chat
  const chat = createChat(chatContainer, {
    onRecipeReady: (recipe, messages) => {
      pendingRecipe = recipe;
      conversationHistory = messages;
      showRecipePreview(recipe);
    }
  });

  function showRecipePreview(recipe) {
    const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

    previewContainer.classList.remove('hidden');
    previewContainer.innerHTML = `
      <div class="recipe-preview card">
        <h3>✨ Recette prête : ${recipe.name}</h3>
        <p class="mt-1" style="color: var(--color-text-light);">${recipe.description || ''}</p>

        <div class="flex gap-2 mt-2 mb-2 flex-wrap">
          <span class="tag">⏱️ ${formatTime(totalTime)}</span>
          <span class="tag">👨‍🍳 ${recipe.difficulty}</span>
          ${recipe.tags?.map(tag => `<span class="tag">${tag}</span>`).join('') || ''}
        </div>

        <!-- Sélecteur de portions -->
        <div class="servings-selector card mt-3" style="background: var(--color-background); padding: 1rem;">
          <h4 style="margin-bottom: 0.75rem;">👥 Nombre de personnes</h4>
          <div class="flex gap-3 items-center flex-wrap">
            <div class="flex items-center gap-2">
              <label for="adults-count" style="min-width: 70px;">Adultes :</label>
              <button class="btn btn-sm btn-secondary" data-action="adults-minus">−</button>
              <input type="number" id="adults-count" value="${servingsConfig.adults}" min="0" max="10"
                     style="width: 60px; text-align: center;">
              <button class="btn btn-sm btn-secondary" data-action="adults-plus">+</button>
            </div>
            <div class="flex items-center gap-2">
              <label for="children-count" style="min-width: 70px;">Enfants :</label>
              <button class="btn btn-sm btn-secondary" data-action="children-minus">−</button>
              <input type="number" id="children-count" value="${servingsConfig.children}" min="0" max="10"
                     style="width: 60px; text-align: center;">
              <button class="btn btn-sm btn-secondary" data-action="children-plus">+</button>
            </div>
          </div>
          <p class="mt-2" style="font-size: 0.85rem; color: var(--color-text-light);">
            💡 Les quantités seront ajustées automatiquement (enfant = 60% d'un adulte)
          </p>
        </div>

        <details class="mt-3">
          <summary style="cursor: pointer; font-weight: 500;">Voir les ingrédients (${recipe.ingredients?.length || 0})</summary>
          <ul class="mt-1" style="padding-left: 1.5rem;" id="ingredients-list">
            ${renderIngredientsList(recipe.ingredients, servingsConfig)}
          </ul>
        </details>

        <details class="mt-2">
          <summary style="cursor: pointer; font-weight: 500;">Voir les étapes (${recipe.steps?.length || 0})</summary>
          <ol class="mt-1" style="padding-left: 1.5rem;">
            ${recipe.steps?.map(step => `
              <li style="margin-bottom: 0.5rem;">${step.instruction}</li>
            `).join('') || ''}
          </ol>
        </details>

        <div class="flex gap-2 mt-3">
          <button class="btn btn-primary" id="save-recipe">💾 Sauvegarder</button>
          <button class="btn btn-secondary" id="continue-chat">💬 Modifier avec l'IA</button>
        </div>
      </div>
    `;

    // Event listeners pour le sélecteur de portions
    const adultsInput = previewContainer.querySelector('#adults-count');
    const childrenInput = previewContainer.querySelector('#children-count');

    // Boutons +/-
    previewContainer.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'adults-plus' && servingsConfig.adults < 10) {
          servingsConfig.adults++;
          adultsInput.value = servingsConfig.adults;
        } else if (action === 'adults-minus' && servingsConfig.adults > 0) {
          servingsConfig.adults--;
          adultsInput.value = servingsConfig.adults;
        } else if (action === 'children-plus' && servingsConfig.children < 10) {
          servingsConfig.children++;
          childrenInput.value = servingsConfig.children;
        } else if (action === 'children-minus' && servingsConfig.children > 0) {
          servingsConfig.children--;
          childrenInput.value = servingsConfig.children;
        }
        updateIngredientsDisplay();
      });
    });

    // Inputs directs
    adultsInput.addEventListener('change', (e) => {
      servingsConfig.adults = Math.max(0, Math.min(10, parseInt(e.target.value) || 0));
      e.target.value = servingsConfig.adults;
      updateIngredientsDisplay();
    });

    childrenInput.addEventListener('change', (e) => {
      servingsConfig.children = Math.max(0, Math.min(10, parseInt(e.target.value) || 0));
      e.target.value = servingsConfig.children;
      updateIngredientsDisplay();
    });

    function updateIngredientsDisplay() {
      const ingredientsList = previewContainer.querySelector('#ingredients-list');
      if (ingredientsList) {
        ingredientsList.innerHTML = renderIngredientsList(pendingRecipe.ingredients, servingsConfig);
      }
    }

    // Event listeners
    previewContainer.querySelector('#save-recipe').addEventListener('click', saveRecipe);
    previewContainer.querySelector('#continue-chat').addEventListener('click', () => {
      previewContainer.classList.add('hidden');
      pendingRecipe = null;
    });

    // Scroll vers la preview
    previewContainer.scrollIntoView({ behavior: 'smooth' });
  }

  // Calculer et afficher les ingrédients ajustés
  function renderIngredientsList(ingredients, servings) {
    if (!ingredients) return '';

    // La recette de base est pour 3 adultes + 3 enfants = 4.8 équivalent adultes
    const baseEquivalent = 3 + (3 * 0.6); // 4.8
    const newEquivalent = servings.adults + (servings.children * 0.6);
    const ratio = newEquivalent / baseEquivalent;

    return ingredients.map(ing => {
      const adjustedQty = Math.round(ing.quantity * ratio * 10) / 10; // Arrondi à 1 décimale
      return `<li>${adjustedQty} ${ing.unit} ${ing.name}</li>`;
    }).join('');
  }

  // Ajuster les ingrédients pour la sauvegarde
  function adjustIngredientsForServings(ingredients, servings) {
    const baseEquivalent = 3 + (3 * 0.6); // 4.8
    const newEquivalent = servings.adults + (servings.children * 0.6);
    const ratio = newEquivalent / baseEquivalent;

    return ingredients.map(ing => ({
      ...ing,
      quantity: Math.round(ing.quantity * ratio * 10) / 10
    }));
  }

  async function saveRecipe() {
    if (!pendingRecipe) return;

    try {
      // Ajuster les ingrédients selon le nombre de personnes choisi
      const adjustedIngredients = adjustIngredientsForServings(
        pendingRecipe.ingredients,
        servingsConfig
      );

      const saved = await addRecipe({
        ...pendingRecipe,
        ingredients: adjustedIngredients,
        servings: {
          adults: servingsConfig.adults,
          children: servingsConfig.children,
          adultPortion: 1,
          childPortion: 0.6
        },
        conversationHistory
      });

      showToast(`Recette "${saved.name}" sauvegardée !`, 'success');

      // Afficher les options après sauvegarde
      previewContainer.innerHTML = `
        <div class="card text-center">
          <h3>✅ Recette sauvegardée !</h3>
          <p class="mt-2 mb-3" style="color: var(--color-text-light);">
            "${pendingRecipe.name}" a été ajoutée à ton carnet de recettes.
            <br><small>Pour ${servingsConfig.adults} adultes et ${servingsConfig.children} enfants</small>
          </p>
          <div class="flex gap-2 justify-center flex-wrap">
            <button class="btn btn-primary" id="view-recipe">📖 Voir la fiche</button>
            <button class="btn btn-secondary" id="new-recipe">➕ Nouvelle recette</button>
            <button class="btn btn-secondary" id="go-planning">📅 Planifier</button>
          </div>
        </div>
      `;

      previewContainer.querySelector('#view-recipe').addEventListener('click', () => {
        router.navigate('/recipes');
      });

      previewContainer.querySelector('#new-recipe').addEventListener('click', () => {
        pendingRecipe = null;
        conversationHistory = [];
        servingsConfig = { adults: 3, children: 3 }; // Reset
        previewContainer.classList.add('hidden');
        chat.reset();
      });

      previewContainer.querySelector('#go-planning').addEventListener('click', () => {
        router.navigate('/week');
      });

    } catch (error) {
      console.error('Error saving recipe:', error);
      showToast('Erreur lors de la sauvegarde', 'error');
    }
  }
}
