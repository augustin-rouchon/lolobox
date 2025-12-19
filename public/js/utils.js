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
