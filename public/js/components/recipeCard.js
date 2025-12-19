// Composant Carte Recette
import { renderStars, formatTime } from '../utils.js';

export function createRecipeCard(recipe, onClick = null) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  const hasRating = recipe.rating !== null && recipe.rating !== undefined;
  const hasBatchCooking = recipe.tags?.includes('batch-cooking');

  const card = document.createElement('div');
  card.className = 'recipe-card';
  card.innerHTML = `
    <div class="recipe-card-header">
      <h3 class="recipe-card-title">${recipe.name}</h3>
      ${hasRating ? renderStars(recipe.rating) : '<span class="tag">Pas encore noté</span>'}
    </div>
    <div class="recipe-card-meta">
      <span>⏱️ ${formatTime(totalTime)}</span>
      <span>👨‍🍳 ${recipe.difficulty || 'facile'}</span>
      ${recipe.timesCooked > 0 ? `<span>✅ ${recipe.timesCooked}x</span>` : ''}
    </div>
    <div class="tags-container">
      ${(recipe.tags || []).map(tag => `
        <span class="tag ${tag === 'batch-cooking' ? 'tag-batch-cooking' : ''} ${tag === 'rapide' ? 'tag-rapide' : ''} ${tag === 'enfants-adorent' ? 'tag-enfants-adorent' : ''}">${tag}</span>
      `).join('')}
    </div>
  `;

  if (onClick) {
    card.addEventListener('click', () => onClick(recipe));
  }

  return card;
}

// Version HTML string pour insertion directe
export function recipeCardHTML(recipe) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  const hasRating = recipe.rating !== null && recipe.rating !== undefined;

  return `
    <div class="recipe-card" data-recipe-id="${recipe.id}">
      <div class="recipe-card-header">
        <h3 class="recipe-card-title">${recipe.name}</h3>
        ${hasRating ? renderStars(recipe.rating) : '<span class="tag">Pas encore noté</span>'}
      </div>
      <div class="recipe-card-meta">
        <span>⏱️ ${formatTime(totalTime)}</span>
        <span>👨‍🍳 ${recipe.difficulty || 'facile'}</span>
        ${recipe.timesCooked > 0 ? `<span>✅ ${recipe.timesCooked}x</span>` : ''}
      </div>
      <div class="tags-container">
        ${(recipe.tags || []).map(tag => `
          <span class="tag ${tag === 'batch-cooking' ? 'tag-batch-cooking' : ''} ${tag === 'rapide' ? 'tag-rapide' : ''} ${tag === 'enfants-adorent' ? 'tag-enfants-adorent' : ''}">${tag}</span>
        `).join('')}
      </div>
    </div>
  `;
}
