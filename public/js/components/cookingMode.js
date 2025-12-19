// Composant Mode Cuisine
import { markRecipeCooked } from '../db.js';
import { showToast } from '../utils.js';

export function openCookingMode(recipe) {
  let currentStep = 0;
  const steps = recipe.steps || [];
  const totalSteps = steps.length;

  // Créer le container plein écran
  const cookingContainer = document.createElement('div');
  cookingContainer.className = 'cooking-mode';
  cookingContainer.id = 'cooking-mode';

  function render() {
    const step = steps[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === totalSteps - 1;

    cookingContainer.innerHTML = `
      <div class="cooking-header">
        <h1>🍳 ${recipe.name}</h1>
        <div class="cooking-step-indicator">Étape ${currentStep + 1} / ${totalSteps}</div>
      </div>

      <div class="cooking-content">
        <div class="cooking-instruction">
          ${step.instruction}
        </div>

        ${step.tip ? `
          <div class="cooking-tip">
            <div class="cooking-tip-label">💡 Astuce</div>
            <div>${step.tip}</div>
          </div>
        ` : ''}

        ${step.duration ? `
          <div class="cooking-duration">⏱️ ~${step.duration} min</div>
        ` : ''}
      </div>

      <div class="cooking-nav">
        <button class="btn btn-secondary btn-lg" id="prev-step" ${isFirst ? 'disabled' : ''}>
          ← Précédent
        </button>
        <button class="btn btn-secondary" id="show-ingredients">
          📋 Ingrédients
        </button>
        ${isLast ? `
          <button class="btn btn-success btn-lg" id="finish-cooking">
            ✅ Terminer
          </button>
        ` : `
          <button class="btn btn-primary btn-lg" id="next-step">
            Suivant →
          </button>
        `}
      </div>

      <button class="btn btn-secondary" id="exit-cooking" style="position: absolute; top: 1rem; right: 1rem;">
        ✕ Quitter
      </button>
    `;

    // Event listeners
    cookingContainer.querySelector('#prev-step')?.addEventListener('click', () => {
      if (currentStep > 0) {
        currentStep--;
        render();
      }
    });

    cookingContainer.querySelector('#next-step')?.addEventListener('click', () => {
      if (currentStep < totalSteps - 1) {
        currentStep++;
        render();
      }
    });

    cookingContainer.querySelector('#finish-cooking')?.addEventListener('click', async () => {
      await markRecipeCooked(recipe.id);
      showToast('Bravo ! Recette terminée 🎉', 'success');
      closeCookingMode();
    });

    cookingContainer.querySelector('#show-ingredients').addEventListener('click', showIngredients);

    // Bouton Quitter - avec confirm natif pour éviter les problèmes de z-index
    cookingContainer.querySelector('#exit-cooking').addEventListener('click', () => {
      if (confirm('Quitter le mode cuisine ?')) {
        closeCookingMode();
      }
    });

    // Navigation clavier
    document.removeEventListener('keydown', handleKeyboard);
    document.addEventListener('keydown', handleKeyboard);
  }

  function handleKeyboard(e) {
    // Ignorer si une modal est ouverte
    if (document.querySelector('.modal-overlay.active')) return;

    if (e.key === 'ArrowRight' && currentStep < totalSteps - 1) {
      currentStep++;
      render();
    } else if (e.key === 'ArrowLeft' && currentStep > 0) {
      currentStep--;
      render();
    } else if (e.key === 'Escape') {
      if (confirm('Quitter le mode cuisine ?')) {
        closeCookingMode();
      }
    }
  }

  function showIngredients() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.zIndex = '3000'; // Au-dessus du cooking mode
    overlay.innerHTML = `
      <div class="modal" style="max-width: 400px;">
        <div class="modal-header">
          <h2>📋 Ingrédients</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <ul style="list-style: none; padding: 0;">
            ${recipe.ingredients.map(ing => `
              <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--color-border);">
                <strong>${ing.quantity} ${ing.unit}</strong> ${ing.name}
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;

    overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  function closeCookingMode() {
    document.removeEventListener('keydown', handleKeyboard);
    cookingContainer.remove();
  }

  // Démarrer
  render();
  document.body.appendChild(cookingContainer);
}
