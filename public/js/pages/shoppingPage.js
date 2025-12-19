// Page Liste de Courses
import { renderShoppingList, generateShoppingText } from '../components/shoppingList.js';
import { getShoppingList, updateShoppingItemCheck, getWeekStartDate, generateShoppingListFromPlan, getWeekPlan, saveShoppingList } from '../db.js';
import { getAdjacentWeek, showToast } from '../utils.js';


export async function renderShoppingPage(container) {
  let currentWeekStart = getWeekStartDate();
  let shoppingList = null;

  async function loadList() {
    shoppingList = await getShoppingList(currentWeekStart);
    renderPage();
  }

  function renderPage() {
    const startDate = new Date(currentWeekStart);
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);

    const weekLabel = `Semaine du ${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;

    container.innerHTML = `
      <div class="flex justify-between items-center mb-3">
        <h1 class="page-title">🛒 Liste de Courses</h1>
        <div class="flex gap-1">
          <button class="btn btn-secondary btn-sm" id="prev-week">←</button>
          <button class="btn btn-secondary btn-sm" id="today-btn">Aujourd'hui</button>
          <button class="btn btn-secondary btn-sm" id="next-week">→</button>
        </div>
      </div>

      <p class="mb-3" style="color: var(--color-text-light);">${weekLabel}</p>

      <div id="shopping-content">
        <!-- Liste injectée ici -->
      </div>

      ${shoppingList?.items?.length > 0 ? `
        <div class="flex gap-2 mt-3 justify-center">
          <button class="btn btn-secondary" id="copy-list">📋 Copier le texte</button>
          <button class="btn btn-secondary" id="print-list">🖨️ Imprimer</button>
          <button class="btn btn-primary" id="refresh-list">🔄 Régénérer</button>
        </div>
      ` : ''}
    `;

    // Navigation
    container.querySelector('#prev-week').addEventListener('click', () => {
      currentWeekStart = getAdjacentWeek(currentWeekStart, -1);
      loadList();
    });

    container.querySelector('#next-week').addEventListener('click', () => {
      currentWeekStart = getAdjacentWeek(currentWeekStart, 1);
      loadList();
    });

    container.querySelector('#today-btn').addEventListener('click', () => {
      currentWeekStart = getWeekStartDate();
      loadList();
    });

    // Content
    const content = container.querySelector('#shopping-content');

    if (!shoppingList || !shoppingList.items || shoppingList.items.length === 0) {
      content.innerHTML = `
        <div class="empty-state card">
          <div class="empty-state-icon">🛒</div>
          <h3>Pas de liste pour cette semaine</h3>
          <p>Planifie d'abord tes repas, puis génère la liste de courses.</p>
          <div class="flex gap-2 justify-center mt-3">
            <button class="btn btn-primary" id="go-planning">📅 Planifier la semaine</button>
            <button class="btn btn-secondary" id="generate-now">🔄 Générer maintenant</button>
          </div>
        </div>
      `;

      content.querySelector('#go-planning').addEventListener('click', () => {
        window.location.hash = '#/week';
      });

      content.querySelector('#generate-now').addEventListener('click', async () => {
        const items = await generateShoppingListFromPlan(currentWeekStart);
        if (items.length === 0) {
          showToast('Aucune recette planifiée cette semaine', 'error');
          return;
        }
        const weekPlan = await getWeekPlan(currentWeekStart);
        await saveShoppingList(currentWeekStart, weekPlan?.id || '', items);
        showToast('Liste générée !', 'success');
        loadList();
      });

      return;
    }

    // Render list
    renderShoppingList(content, shoppingList.items, {
      weekStartDate: currentWeekStart,
      onItemCheck: async (itemName, checked) => {
        await updateShoppingItemCheck(currentWeekStart, itemName, checked);
      }
    });

    // Actions
    container.querySelector('#copy-list')?.addEventListener('click', () => {
      const text = generateShoppingText(shoppingList.items, weekLabel);
      navigator.clipboard.writeText(text).then(() => {
        showToast('Liste copiée !', 'success');
      });
    });

    container.querySelector('#print-list')?.addEventListener('click', () => {
      printShoppingList(shoppingList.items, weekLabel);
    });

    container.querySelector('#refresh-list')?.addEventListener('click', async () => {
      const items = await generateShoppingListFromPlan(currentWeekStart);
      if (items.length === 0) {
        showToast('Aucune recette planifiée', 'error');
        return;
      }
      // Preserve checked status
      const checkedItems = new Set(
        shoppingList.items.filter(i => i.checked).map(i => i.name.toLowerCase())
      );
      items.forEach(item => {
        item.checked = checkedItems.has(item.name.toLowerCase());
      });
      await saveShoppingList(currentWeekStart, shoppingList.weekPlanId, items);
      showToast('Liste mise à jour !', 'success');
      loadList();
    });
  }

  function printShoppingList(items, weekLabel) {
    const printWindow = window.open('', '_blank');

    // Group by category
    const byCategory = {};
    items.forEach(item => {
      const cat = item.category || 'Autre';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(item);
    });

    const categoryEmojis = {
      'légumes': '🥬',
      'fruits': '🍎',
      'viandes': '🍖',
      'poissons': '🐟',
      'épicerie': '🛒',
      'crèmerie-sans-lactose': '🥛',
      'surgelés': '🧊',
      'condiments': '🧂'
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Liste de courses</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; }
          h1 { color: #D4A574; font-size: 1.5rem; }
          .category { margin: 1.5rem 0; }
          .category h2 { font-size: 1.1rem; color: #B8956A; border-bottom: 1px solid #E5DDD5; padding-bottom: 0.5rem; }
          .item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0; }
          .checkbox { width: 18px; height: 18px; border: 2px solid #ccc; border-radius: 3px; }
          .checked { text-decoration: line-through; color: #999; }
          .recipes { font-size: 0.8rem; color: #999; margin-left: auto; }
          @media print { body { padding: 1rem; } }
        </style>
      </head>
      <body>
        <h1>🛒 Liste de courses</h1>
        <p style="color: #666;">${weekLabel}</p>

        ${Object.keys(byCategory).sort().map(category => `
          <div class="category">
            <h2>${categoryEmojis[category] || '📦'} ${category.charAt(0).toUpperCase() + category.slice(1)}</h2>
            ${byCategory[category].map(item => `
              <div class="item ${item.checked ? 'checked' : ''}">
                <div class="checkbox"></div>
                <span><strong>${item.quantity} ${item.unit}</strong> ${item.name}</span>
                <span class="recipes">${item.fromRecipes?.join(', ') || ''}</span>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  }

  // Charger la liste initiale
  await loadList();
}
