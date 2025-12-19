// Composant Chat réutilisable
import { sendChatMessage } from '../api.js';

export function createChat(container, options = {}) {
  const {
    onRecipeReady = null,
    systemPrompt = null,
    initialMessage = "Qu'est-ce qui te ferait plaisir aujourd'hui ? 🍽️"
  } = options;

  let messages = [];
  let isLoading = false;

  // Rendu initial
  function render() {
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
      </div>
    `;

    // Event listeners
    const input = container.querySelector('#chat-input');
    const sendBtn = container.querySelector('#chat-send');

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !isLoading) {
        handleSend();
      }
    });

    sendBtn.addEventListener('click', () => {
      if (!isLoading) handleSend();
    });

    // Focus sur l'input
    input.focus();
  }

  // Ajouter un message à l'affichage
  function addMessageToUI(role, content) {
    const messagesContainer = container.querySelector('#chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = `<div class="message-content">${formatMessage(content)}</div>`;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
