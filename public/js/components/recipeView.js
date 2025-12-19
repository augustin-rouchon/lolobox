// Composant Vue Détaillée Recette
import { formatTime, formatDifficulty, renderStars, getCategoryEmoji, createModal, confirmDialog, showToast } from '../utils.js';
import { updateRecipe, deleteRecipe, rateRecipe } from '../db.js';
import { router } from '../app.js';

export function renderRecipeView(container, recipe, options = {}) {
  const { onClose = null, onDelete = null, onUpdate = null } = options;
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  container.innerHTML = `
    <div class="recipe-view">
      <div class="recipe-view-header">
        <div class="flex justify-between items-center mb-2">
          <h1 class="recipe-view-title">${recipe.name}</h1>
          ${onClose ? '<button class="btn btn-secondary" id="close-view">← Retour</button>' : ''}
        </div>
        <p style="opacity: 0.9; margin-bottom: 1rem;">${recipe.description || ''}</p>
        <div class="recipe-view-meta">
          <div class="recipe-view-meta-item">
            <span>⏱️</span>
            <span>Prépa: ${formatTime(recipe.prepTime || 0)}</span>
          </div>
          <div class="recipe-view-meta-item">
            <span>🔥</span>
            <span>Cuisson: ${formatTime(recipe.cookTime || 0)}</span>
          </div>
          <div class="recipe-view-meta-item">
            <span>⏰</span>
            <span>Total: ${formatTime(totalTime)}</span>
          </div>
          <div class="recipe-view-meta-item">
            <span>📊</span>
            <span>${formatDifficulty(recipe.difficulty || 'facile')}</span>
          </div>
        </div>
      </div>

      <div class="recipe-view-body">
        <!-- Tags -->
        <div class="recipe-section">
          <div class="tags-container" id="tags-container">
            ${(recipe.tags || []).map(tag => `
              <span class="tag ${tag === 'batch-cooking' ? 'tag-batch-cooking' : ''} ${tag === 'rapide' ? 'tag-rapide' : ''}">${tag}</span>
            `).join('')}
            <button class="btn btn-sm btn-secondary" id="add-tag-btn">+ Tag</button>
          </div>
        </div>

        <!-- Note -->
        <div class="recipe-section">
          <h2 class="recipe-section-title">Ma note</h2>
          <div id="rating-container" class="flex items-center gap-2">
            ${renderStars(recipe.rating, true)}
            <span class="ml-1">${recipe.rating ? `(${recipe.rating}/5)` : 'Non noté'}</span>
          </div>
          ${recipe.timesCooked > 0 ? `<p class="mt-1" style="color: var(--color-text-light);">Réalisée ${recipe.timesCooked} fois</p>` : ''}
        </div>

        <!-- Ingrédients -->
        <div class="recipe-section">
          <h2 class="recipe-section-title">Ingrédients</h2>
          <p style="color: var(--color-text-light); margin-bottom: 1rem;">Pour 3 adultes + 3 enfants</p>
          <ul class="ingredient-list">
            ${(recipe.ingredients || []).map(ing => `
              <li class="ingredient-item">
                <span>${getCategoryEmoji(ing.category)} ${ing.name}</span>
                <span><strong>${ing.quantity} ${ing.unit}</strong></span>
              </li>
            `).join('')}
          </ul>
        </div>

        <!-- Étapes -->
        <div class="recipe-section">
          <h2 class="recipe-section-title">Étapes</h2>
          <ul class="step-list">
            ${(recipe.steps || []).map(step => `
              <li class="step-item">
                <div class="step-number">${step.order}</div>
                <div class="step-content">
                  <p>${step.instruction}</p>
                  ${step.duration ? `<span style="color: var(--color-text-light);">⏱️ ~${step.duration} min</span>` : ''}
                  ${step.tip ? `<div class="step-tip">💡 ${step.tip}</div>` : ''}
                </div>
              </li>
            `).join('')}
          </ul>
        </div>

        <!-- Conseils -->
        ${recipe.tips && recipe.tips.length > 0 ? `
          <div class="recipe-section">
            <h2 class="recipe-section-title">Conseils</h2>
            <div class="recipe-tips">
              <ul>
                ${recipe.tips.map(tip => `<li>${tip}</li>`).join('')}
              </ul>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="recipe-actions">
        <button class="btn btn-primary btn-lg" id="cooking-mode-btn">👨‍🍳 Mode Cuisine</button>
        <button class="btn btn-secondary" id="print-btn">🖨️ Imprimer</button>
        <button class="btn btn-danger" id="delete-btn">🗑️ Supprimer</button>
      </div>
    </div>
  `;

  // Event listeners
  if (onClose) {
    container.querySelector('#close-view')?.addEventListener('click', onClose);
  }

  // Rating
  const ratingContainer = container.querySelector('#rating-container');
  ratingContainer.addEventListener('click', async (e) => {
    if (e.target.classList.contains('star')) {
      const rating = parseInt(e.target.dataset.rating);
      await rateRecipe(recipe.id, rating);
      showToast(`Note enregistrée : ${rating}/5`, 'success');
      if (onUpdate) onUpdate();
    }
  });

  // Add tag
  container.querySelector('#add-tag-btn').addEventListener('click', () => {
    const { overlay, close } = createModal('Ajouter un tag', `
      <input type="text" id="new-tag" placeholder="Nom du tag" class="mb-2">
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancel-tag">Annuler</button>
        <button class="btn btn-primary" id="save-tag">Ajouter</button>
      </div>
    `);

    overlay.querySelector('#cancel-tag').addEventListener('click', close);
    overlay.querySelector('#save-tag').addEventListener('click', async () => {
      const tag = overlay.querySelector('#new-tag').value.trim().toLowerCase();
      if (tag && !recipe.tags.includes(tag)) {
        await updateRecipe(recipe.id, { tags: [...recipe.tags, tag] });
        showToast('Tag ajouté', 'success');
        if (onUpdate) onUpdate();
      }
      close();
    });
  });

  // Cooking mode
  container.querySelector('#cooking-mode-btn').addEventListener('click', () => {
    import('./cookingMode.js').then(({ openCookingMode }) => {
      openCookingMode(recipe);
    });
  });

  // Print
  container.querySelector('#print-btn').addEventListener('click', () => {
    printRecipe(recipe);
  });

  // Delete
  container.querySelector('#delete-btn').addEventListener('click', async () => {
    const confirmed = await confirmDialog(`Supprimer la recette "${recipe.name}" ?`);
    if (confirmed) {
      await deleteRecipe(recipe.id);
      showToast('Recette supprimée', 'success');
      if (onDelete) onDelete();
      else router.navigate('/recipes');
    }
  });
}

// Impression simple (sans PDF pour l'instant)
function printRecipe(recipe) {
  const printWindow = window.open('', '_blank');
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${recipe.name}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
        h1 { color: #D4A574; }
        .meta { display: flex; gap: 2rem; margin: 1rem 0; color: #666; }
        .section { margin: 2rem 0; }
        .section h2 { color: #B8956A; border-bottom: 2px solid #E5DDD5; padding-bottom: 0.5rem; }
        ul { padding-left: 1.5rem; }
        li { margin: 0.5rem 0; }
        .step { display: flex; gap: 1rem; margin: 1rem 0; }
        .step-num { background: #D4A574; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .tip { background: #FDF8F3; padding: 0.5rem; margin-top: 0.5rem; border-left: 3px solid #D4A574; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>🍳 ${recipe.name}</h1>
      <p>${recipe.description || ''}</p>
      <div class="meta">
        <span>⏱️ Prépa: ${recipe.prepTime} min</span>
        <span>🔥 Cuisson: ${recipe.cookTime} min</span>
        <span>⏰ Total: ${totalTime} min</span>
        <span>📊 ${recipe.difficulty}</span>
      </div>

      <div class="section">
        <h2>Ingrédients (3 adultes + 3 enfants)</h2>
        <ul>
          ${recipe.ingredients.map(ing => `<li>${ing.quantity} ${ing.unit} ${ing.name}</li>`).join('')}
        </ul>
      </div>

      <div class="section">
        <h2>Étapes</h2>
        ${recipe.steps.map(step => `
          <div class="step">
            <div class="step-num">${step.order}</div>
            <div>
              <p>${step.instruction}</p>
              ${step.tip ? `<div class="tip">💡 ${step.tip}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      ${recipe.tips?.length ? `
        <div class="section">
          <h2>Conseils</h2>
          <ul>
            ${recipe.tips.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.print();
}
