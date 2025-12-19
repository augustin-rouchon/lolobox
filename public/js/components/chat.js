// Composant Chat réutilisable
import { sendChatMessage } from '../api.js';

// Clé pour sessionStorage
const CHAT_STORAGE_KEY = 'lolobox_chat_messages';
const CHAT_PENDING_RECIPE_KEY = 'lolobox_pending_recipe';

// Fonctions de persistance
function saveToSession(messages, pendingRecipe = null) {
  try {
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    if (pendingRecipe) {
      sessionStorage.setItem(CHAT_PENDING_RECIPE_KEY, JSON.stringify(pendingRecipe));
    }
  } catch (e) {
    console.warn('Could not save to sessionStorage:', e);
  }
}

function loadFromSession() {
  try {
    const messages = sessionStorage.getItem(CHAT_STORAGE_KEY);
    const pendingRecipe = sessionStorage.getItem(CHAT_PENDING_RECIPE_KEY);
    return {
      messages: messages ? JSON.parse(messages) : [],
      pendingRecipe: pendingRecipe ? JSON.parse(pendingRecipe) : null
    };
  } catch (e) {
    console.warn('Could not load from sessionStorage:', e);
    return { messages: [], pendingRecipe: null };
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(CHAT_STORAGE_KEY);
    sessionStorage.removeItem(CHAT_PENDING_RECIPE_KEY);
  } catch (e) {
    console.warn('Could not clear sessionStorage:', e);
  }
}

export function createChat(container, options = {}) {
  const {
    onRecipeReady = null,
    systemPrompt = null,
    initialMessage = "Qu'est-ce qui te ferait plaisir aujourd'hui ? 🍽️"
  } = options;

  // Charger l'état précédent depuis sessionStorage
  const savedState = loadFromSession();
  let messages = savedState.messages;
  let isLoading = false;

  // Rendu initial
  function render() {
    const hasHistory = messages.length > 0;

    container.innerHTML = `
      <div class="chat-container">
        <div class="chat-messages" id="chat-messages">
          <div class="message assistant">
            <div class="message-content">${initialMessage}</div>
          </div>
        </div>
        <div class="chat-input-container">
          <input
            type="text"
            id="chat-input"
            class="chat-input"
            placeholder="Tape ton message..."
            ${isLoading ? 'disabled' : ''}
          >
          <button id="chat-send" class="btn btn-primary chat-send" ${isLoading ? 'disabled' : ''}>
            ${isLoading ? '⏳' : '➤'}
          </button>
        </div>
        ${hasHistory ? `
          <button id="chat-reset" class="btn btn-sm btn-secondary mt-2" style="align-self: center;">
            🔄 Nouvelle conversation
          </button>
        ` : ''}
      </div>
    `;

    // Restaurer l'historique des messages dans l'UI
    if (hasHistory) {
      messages.forEach(msg => {
        addMessageToUI(msg.role, msg.content, false);
      });
    }

    // Vérifier s'il y a une recette en attente
    if (savedState.pendingRecipe && onRecipeReady) {
      onRecipeReady(savedState.pendingRecipe, messages);
    }

    // Event listeners
    const input = container.querySelector('#chat-input');
    const sendBtn = container.querySelector('#chat-send');
    const resetBtn = container.querySelector('#chat-reset');

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !isLoading) {
        handleSend();
      }
    });

    sendBtn.addEventListener('click', () => {
      if (!isLoading) handleSend();
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        reset();
      });
    }

    // Focus sur l'input
    input.focus();
  }

  // Ajouter un message à l'affichage
  function addMessageToUI(role, content, scroll = true) {
    const messagesContainer = container.querySelector('#chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = `<div class="message-content">${formatMessage(content)}</div>`;
    messagesContainer.appendChild(messageDiv);
    if (scroll) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Formater le message (markdown léger)
  function formatMessage(content) {
    // Ne pas formater si c'est du JSON
    if (content.trim().startsWith('{')) {
      return '<em>Recette générée ! ✨</em>';
    }

    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  // Afficher l'indicateur de chargement
  function showLoading() {
    const messagesContainer = container.querySelector('#chat-messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant loading';
    loadingDiv.id = 'loading-indicator';
    loadingDiv.innerHTML = '<div class="message-content typing">Claude réfléchit<span class="dots">...</span></div>';
    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Retirer l'indicateur de chargement
  function hideLoading() {
    const loading = container.querySelector('#loading-indicator');
    if (loading) loading.remove();
  }

  // Envoyer un message
  async function handleSend() {
    const input = container.querySelector('#chat-input');
    const userMessage = input.value.trim();

    if (!userMessage) return;

    // Ajouter le message utilisateur
    messages.push({ role: 'user', content: userMessage });
    addMessageToUI('user', userMessage);
    input.value = '';

    // Désactiver l'input
    isLoading = true;
    input.disabled = true;
    container.querySelector('#chat-send').disabled = true;
    showLoading();

    try {
      // Appeler l'API
      const response = await sendChatMessage(messages, systemPrompt);

      hideLoading();

      // Ajouter la réponse
      messages.push({ role: 'assistant', content: response.content });
      addMessageToUI('assistant', response.content);

      // Sauvegarder dans sessionStorage
      saveToSession(messages, response.recipe || null);

      // Vérifier si une recette est prête
      if (response.recipe && onRecipeReady) {
        onRecipeReady(response.recipe, messages);
      }

    } catch (error) {
      hideLoading();
      addMessageToUI('assistant', "Oups, une erreur s'est produite. Réessaie ! 😅");
      console.error('Chat error:', error);
    }

    // Réactiver l'input
    isLoading = false;
    input.disabled = false;
    container.querySelector('#chat-send').disabled = false;
    input.focus();
  }

  // Réinitialiser le chat
  function reset() {
    messages = [];
    clearSession();
    render();
  }

  // Obtenir l'historique
  function getMessages() {
    return messages;
  }

  // Premier rendu
  render();

  // API publique
  return {
    reset,
    getMessages,
    addMessageToUI
  };
}
