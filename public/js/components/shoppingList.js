// Composant Liste de Courses
import { getCategoryEmoji } from '../utils.js';

export function renderShoppingList(container, items, options = {}) {
  const { onItemCheck = null, weekStartDate = '' } = options;

  // Grouper par catégorie
  const byCategory = {};
  items.forEach(item => {
    const cat = item.category || 'Autre';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });

  const categories = Object.keys(byCategory).sort();

  container.innerHTML = `
    <div class="shopping-list">
      ${categories.map(category => `
        <div class="shopping-category">
          <div class="shopping-category-title">
            ${getCategoryEmoji(category)} ${category.charAt(0).toUpperCase() + category.slice(1)}
          </div>
          ${byCategory[category].map(item => `
            <div class="shopping-item ${item.checked ? 'checked' : ''}" data-item-name="${item.name}">
              <input type="checkbox" ${item.checked ? 'checked' : ''}>
              <span class="shopping-item-name">
                <strong>${item.quantity} ${item.unit}</strong> ${item.name}
              </span>
              <span class="shopping-item-recipes">${item.fromRecipes?.join(', ') || ''}</span>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;

  // Event listeners
  container.querySelectorAll('.shopping-item input').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const itemName = e.target.closest('.shopping-item').dataset.itemName;
      const checked = e.target.checked;

      // Update UI immediately
      e.target.closest('.shopping-item').classList.toggle('checked', checked);

      if (onItemCheck) {
        onItemCheck(itemName, checked);
      }
    });
  });
}

// Générer le texte pour copie
export function generateShoppingText(items, weekLabel = '') {
  const byCategory = {};
  items.filter(item => !item.checked).forEach(item => {
    const cat = item.category || 'Autre';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });

  let text = `🛒 Liste de courses${weekLabel ? ` - ${weekLabel}` : ''}\n\n`;

  Object.keys(byCategory).sort().forEach(category => {
    text += `${getCategoryEmoji(category)} ${category.toUpperCase()}\n`;
    byCategory[category].forEach(item => {
      text += `  □ ${item.quantity} ${item.unit} ${item.name}\n`;
    });
    text += '\n';
  });

  return text;
}
