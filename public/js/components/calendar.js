// Composant Calendrier Semaine
import { getDayName, formatDateShort, getWeekDates } from '../utils.js';
import { getRecipe } from '../db.js';

export async function renderCalendar(container, weekPlan, weekStartDate, options = {}) {
  const { onSlotClick = null, onRecipeClick = null } = options;
  const weekDates = getWeekDates(weekStartDate);
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const meals = ['lunch', 'dinner'];
  const mealLabels = { lunch: 'Déjeuner', dinner: 'Dîner' };

  // Récupérer les recettes pour chaque slot
  const slotRecipes = {};
  for (const day of days) {
    slotRecipes[day] = {};
    for (const meal of meals) {
      const recipeId = weekPlan?.slots?.[day]?.[meal];
      if (recipeId) {
        slotRecipes[day][meal] = await getRecipe(recipeId);
      }
    }
  }

  // Générer le HTML
  container.innerHTML = `
    <div class="calendar-grid">
      <!-- Header -->
      <div class="calendar-cell header"></div>
      ${days.map(day => `
        <div class="calendar-cell header">
          <div>${getDayName(day)}</div>
          <div style="font-size: 0.85rem; font-weight: normal; color: var(--color-text-light);">
            ${formatDateShort(weekDates[day])}
          </div>
        </div>
      `).join('')}

      <!-- Rows for each meal -->
      ${meals.map(meal => `
        <div class="calendar-cell label">${mealLabels[meal]}</div>
        ${days.map(day => {
          const recipe = slotRecipes[day][meal];
          const hasBatchCooking = recipe?.tags?.includes('batch-cooking');
          const isWeekday = !['saturday', 'sunday'].includes(day);
          const showWarning = hasBatchCooking && isWeekday;

          return `
            <div class="calendar-cell">
              <div class="meal-slot ${recipe ? 'filled' : 'empty'}"
                   data-day="${day}"
                   data-meal="${meal}"
                   data-recipe-id="${recipe?.id || ''}">
                ${recipe ? `
                  <div class="meal-slot-content">
                    <div class="meal-slot-name">${recipe.name}</div>
                    ${showWarning ? '<div style="color: var(--color-warning);">⚠️ BC</div>' : ''}
                  </div>
                ` : '<span style="color: var(--color-text-light);">+</span>'}
              </div>
            </div>
          `;
        }).join('')}
      `).join('')}
    </div>
  `;

  // Event listeners sur les slots
  container.querySelectorAll('.meal-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const day = slot.dataset.day;
      const meal = slot.dataset.meal;
      const recipeId = slot.dataset.recipeId;

      if (recipeId && onRecipeClick) {
        onRecipeClick(day, meal, recipeId);
      } else if (!recipeId && onSlotClick) {
        onSlotClick(day, meal);
      }
    });
  });
}
