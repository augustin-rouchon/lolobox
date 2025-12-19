// Helpers et utilitaires

// Formater une date en français
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

// Formater une date courte
export function formatDateShort(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  });
}

// Obtenir le nom du jour
export function getDayName(dayKey) {
  const days = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche'
  };
  return days[dayKey] || dayKey;
}

// Formater le temps (minutes)
export function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
}

// Formater la difficulté
export function formatDifficulty(difficulty) {
  const levels = {
    facile: '🟢 Facile',
    moyen: '🟡 Moyen',
    difficile: '🔴 Difficile'
  };
  return levels[difficulty] || difficulty;
}

// Obtenir l'emoji de catégorie
export function getCategoryEmoji(category) {
  const emojis = {
    'légumes': '🥬',
    'fruits': '🍎',
    'viandes': '🍖',
    'poissons': '🐟',
    'épicerie': '🛒',
    'crèmerie-sans-lactose': '🥛',
    'surgelés': '🧊',
    'condiments': '🧂'
  };
  return emojis[category] || '📦';
}

// Calculer les dates de la semaine
export function getWeekDates(weekStartDate) {
  const start = new Date(weekStartDate);
  const dates = {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  days.forEach((day, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    dates[day] = date.toISOString().split('T')[0];
  });

  return dates;
}

// Naviguer à la semaine précédente/suivante
export function getAdjacentWeek(weekStartDate, direction) {
  const date = new Date(weekStartDate);
  date.setDate(date.getDate() + (direction * 7));
  return date.toISOString().split('T')[0];
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Générer les étoiles de notation
export function renderStars(rating, interactive = false, onRate = null) {
  const stars = [];
  const currentRating = rating || 0;

  for (let i = 1; i <= 5; i++) {
    const filled = i <= currentRating;
    const starClass = `star ${filled ? 'filled' : ''}`;
    const star = interactive
      ? `<span class="${starClass}" data-rating="${i}" style="cursor: pointer;">★</span>`
      : `<span class="${starClass}">★</span>`;
    stars.push(star);
  }

  return `<div class="stars" ${interactive ? 'data-interactive="true"' : ''}>${stars.join('')}</div>`;
}

// Créer une modal
export function createModal(title, content, onClose = null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
    </div>
  `;

  const closeModal = () => {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
    if (onClose) onClose();
  };

  overlay.querySelector('.modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.body.appendChild(overlay);
  return { overlay, close: closeModal };
}

// Confirmation dialog
export function confirmDialog(message) {
  return new Promise((resolve) => {
    const { overlay, close } = createModal('Confirmation', `
      <p class="mb-3">${message}</p>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancel-btn">Annuler</button>
        <button class="btn btn-danger" id="confirm-btn">Confirmer</button>
      </div>
    `);

    overlay.querySelector('#cancel-btn').addEventListener('click', () => {
      close();
      resolve(false);
    });

    overlay.querySelector('#confirm-btn').addEventListener('click', () => {
      close();
      resolve(true);
    });
  });
}

// ==================== SMART QUANTITY ROUNDING ====================

/**
 * Arrondit une quantité de manière intelligente selon l'unité
 * @param {number} quantity - La quantité brute
 * @param {string} unit - L'unité de mesure
 * @returns {number} - La quantité arrondie de manière pratique
 */
export function smartRoundQuantity(quantity, unit) {
  // Unités qui doivent toujours être entières
  const wholeUnits = ['pièces', 'pièce', 'boîte', 'boîtes', 'brique', 'briques',
                      'tranche', 'tranches', 'gousse', 'gousses', 'branche',
                      'branches', 'bouquet', 'bouquets', 'sachet', 'sachets'];

  // Unités où on arrondit au 0.5 près
  const halfUnits = ['càs', 'càc'];

  // Unités où on arrondit à des valeurs pratiques
  const practicalUnits = {
    'g': [5, 10, 25, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000],
    'kg': [0.5, 1, 1.5, 2, 2.5, 3],
    'ml': [10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000],
    'cl': [5, 10, 15, 20, 25, 33, 50, 75, 100],
    'L': [0.5, 1, 1.5, 2, 2.5, 3]
  };

  const unitLower = unit.toLowerCase();

  // Unités entières
  if (wholeUnits.includes(unitLower)) {
    return Math.ceil(quantity);
  }

  // Unités au demi
  if (halfUnits.includes(unitLower)) {
    return Math.ceil(quantity * 2) / 2;
  }

  // Unités pratiques
  if (practicalUnits[unitLower]) {
    const values = practicalUnits[unitLower];
    // Trouve la valeur pratique la plus proche (en arrondissant vers le haut)
    for (const val of values) {
      if (val >= quantity) {
        return val;
      }
    }
    // Si on dépasse toutes les valeurs, arrondir à la dizaine/centaine supérieure
    if (unitLower === 'g') {
      return Math.ceil(quantity / 50) * 50;
    }
    return Math.ceil(quantity);
  }

  // Par défaut, arrondir au supérieur
  return Math.ceil(quantity);
}

/**
 * Formate une quantité avec son unité de manière lisible
 * @param {number} quantity
 * @param {string} unit
 * @returns {string}
 */
export function formatQuantity(quantity, unit) {
  const rounded = smartRoundQuantity(quantity, unit);

  // Gestion du singulier/pluriel
  const pluralMap = {
    'pièce': 'pièces',
    'boîte': 'boîtes',
    'brique': 'briques',
    'tranche': 'tranches',
    'gousse': 'gousses',
    'branche': 'branches',
    'bouquet': 'bouquets',
    'sachet': 'sachets'
  };

  let displayUnit = unit;
  if (rounded === 1) {
    // Mettre au singulier si nécessaire
    for (const [singular, plural] of Object.entries(pluralMap)) {
      if (unit === plural) {
        displayUnit = singular;
        break;
      }
    }
  } else if (rounded > 1) {
    // Mettre au pluriel si nécessaire
    for (const [singular, plural] of Object.entries(pluralMap)) {
      if (unit === singular) {
        displayUnit = plural;
        break;
      }
    }
  }

  // Formatage du nombre
  let displayQuantity;
  if (Number.isInteger(rounded)) {
    displayQuantity = rounded.toString();
  } else {
    displayQuantity = rounded.toFixed(1).replace('.0', '');
  }

  return `${displayQuantity} ${displayUnit}`;
}

/**
 * Fusionne intelligemment des ingrédients identiques
 * @param {Array} ingredientsList - Liste d'ingrédients de plusieurs recettes
 * @returns {Array} - Liste fusionnée et arrondie
 */
export function mergeIngredients(ingredientsList) {
  const merged = {};

  for (const ing of ingredientsList) {
    // Clé de fusion : nom normalisé + unité
    const key = `${ing.name.toLowerCase().trim()}_${ing.unit.toLowerCase()}`;

    if (merged[key]) {
      merged[key].quantity += ing.quantity;
      if (ing.fromRecipe && !merged[key].fromRecipes.includes(ing.fromRecipe)) {
        merged[key].fromRecipes.push(ing.fromRecipe);
      }
    } else {
      merged[key] = {
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        category: ing.category,
        checked: false,
        fromRecipes: ing.fromRecipe ? [ing.fromRecipe] : []
      };
    }
  }

  // Arrondir les quantités et retourner
  return Object.values(merged).map(ing => ({
    ...ing,
    quantity: smartRoundQuantity(ing.quantity, ing.unit),
    displayQuantity: formatQuantity(ing.quantity, ing.unit)
  }));
}

// Toast notification
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? 'var(--color-success)' : type === 'error' ? 'var(--color-error)' : 'var(--color-primary)'};
    color: white;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 3000;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;

  // Add animation keyframes if not exists
  if (!document.querySelector('#toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
