import { createFamily, joinFamily } from '../db.js';
import { getUser, refreshFamilyData } from '../supabase.js';

export function renderOnboardingPage(container, inviteCode = null) {
  if (inviteCode) {
    renderJoinFamily(container, inviteCode);
  } else {
    renderCreateFamily(container);
  }
}

function renderCreateFamily(container) {
  container.innerHTML = `
    <div class="onboarding-page">
      <div id="onboarding-chat"></div>
    </div>
  `;

  const chatContainer = document.getElementById('onboarding-chat');

  let familyData = {
    name: null,
    servings: { adults: 2, children: 0 },
    constraints: {}
  };

  let step = 0;
  const steps = [
    {
      message: "Bienvenue sur LoloBox ! 🍳\n\nJe vais t'aider à créer l'espace cuisine de ta famille. C'est rapide, promis !\n\nC'est quoi le nom de ta famille ?",
      process: (answer) => {
        familyData.name = answer.trim();
        return true;
      }
    },
    {
      message: "Super, la famille {name} ! 👨‍👩‍👧‍👦\n\nVous êtes combien à table généralement ?\n(ex: \"2 adultes et 3 enfants\" ou juste \"4\")",
      process: (answer) => {
        const nums = answer.match(/\d+/g);
        if (nums) {
          if (answer.toLowerCase().includes('enfant')) {
            familyData.servings.adults = parseInt(nums[0]) || 2;
            familyData.servings.children = parseInt(nums[1]) || 0;
          } else if (nums.length >= 2) {
            familyData.servings.adults = parseInt(nums[0]) || 2;
            familyData.servings.children = parseInt(nums[1]) || 0;
          } else {
            familyData.servings.adults = parseInt(nums[0]) || 2;
            familyData.servings.children = 0;
          }
        }
        return true;
      }
    },
    {
      message: "Noté ! 📝\n\nDes allergies ou contraintes alimentaires ?\n(ex: \"sans lactose\", \"végétarien\", ou \"non rien de spécial\")",
      process: (answer) => {
        const lower = answer.toLowerCase();
        if (lower.includes('lactose')) familyData.constraints.lactose_free = true;
        if (lower.includes('gluten')) familyData.constraints.gluten_free = true;
        if (lower.includes('végétarien') || lower.includes('vegetarien')) familyData.constraints.vegetarian = true;
        if (lower.includes('vegan') || lower.includes('végan')) familyData.constraints.vegan = true;
        return true;
      }
    }
  ];

  // Chat personnalisé pour l'onboarding
  createOnboardingChat(chatContainer, {
    initialMessage: steps[0].message,
    onUserMessage: async (message) => {
      const currentStep = steps[step];
      currentStep.process(message);
      step++;

      if (step < steps.length) {
        // Prochaine question
        let nextMessage = steps[step].message;
        nextMessage = nextMessage.replace('{name}', familyData.name);
        return { text: nextMessage };
      } else {
        // Création de la famille
        try {
          await createFamily(
            familyData.name,
            familyData.constraints,
            familyData.servings
          );
          await refreshFamilyData();

          return {
            text: `Parfait ! La famille ${familyData.name} est créée ! 🎉\n\nAllez, on attaque direct avec ta première recette. Qu'est-ce qui te ferait plaisir ?`,
            done: true
          };
        } catch (error) {
          console.error('Error creating family:', error);
          return { text: "Oups, une erreur s'est produite. Réessaie !" };
        }
      }
    },
    onComplete: () => {
      // Rediriger vers la création de recette
      setTimeout(() => {
        window.location.hash = '#/';
      }, 2000);
    }
  });
}

function renderJoinFamily(container, inviteCode) {
  container.innerHTML = `
    <div class="onboarding-page">
      <div id="join-chat"></div>
    </div>
  `;

  const chatContainer = document.getElementById('join-chat');

  let memberData = {
    name: null,
    appetite: 'normal'
  };

  let step = 0;
  const steps = [
    {
      message: "Hey ! 👋 Tu as reçu une invitation pour rejoindre une famille sur LoloBox.\n\nC'est quoi ton prénom ?",
      process: (answer) => {
        memberData.name = answer.trim();
        return true;
      }
    },
    {
      message: "Enchanté {name} ! 😊\n\nPetite question rigolote : tu es plutôt...\n\n🐦 Petit moineau (petites portions)\n🍽️ Appétit normal\n🦁 Ogre affamé (grosses portions)",
      process: (answer) => {
        const lower = answer.toLowerCase();
        if (lower.includes('moineau') || lower.includes('petit')) {
          memberData.appetite = 'petit_moineau';
        } else if (lower.includes('ogre') || lower.includes('gros') || lower.includes('affamé')) {
          memberData.appetite = 'ogre';
        } else {
          memberData.appetite = 'normal';
        }
        return true;
      }
    }
  ];

  createOnboardingChat(chatContainer, {
    initialMessage: steps[0].message,
    onUserMessage: async (message) => {
      const currentStep = steps[step];
      currentStep.process(message);
      step++;

      if (step < steps.length) {
        let nextMessage = steps[step].message;
        nextMessage = nextMessage.replace('{name}', memberData.name);
        return { text: nextMessage };
      } else {
        try {
          const family = await joinFamily(inviteCode, memberData.name, memberData.appetite);
          await refreshFamilyData();

          return {
            text: `Bienvenue dans la famille ${family.name} ! 🎉\n\nTu vas pouvoir découvrir leurs recettes et en ajouter des nouvelles.`,
            done: true
          };
        } catch (error) {
          console.error('Error joining family:', error);
          return { text: "Oups, cette invitation semble invalide ou expirée. Demande un nouveau lien !" };
        }
      }
    },
    onComplete: () => {
      setTimeout(() => {
        window.location.hash = '#/recipes';
      }, 2000);
    }
  });
}

// Chat simplifié pour l'onboarding (pas d'appel API)
function createOnboardingChat(container, options) {
  const { initialMessage, onUserMessage, onComplete } = options;

  container.innerHTML = `
    <div class="chat-container onboarding-chat">
      <div class="chat-messages" id="chat-messages">
        <div class="message assistant">
          <div class="message-content">${initialMessage.replace(/\n/g, '<br>')}</div>
        </div>
      </div>
      <div class="chat-input-container">
        <input type="text" id="chat-input" class="chat-input" placeholder="Ta réponse...">
        <button id="chat-send" class="btn btn-primary chat-send">➤</button>
      </div>
    </div>
  `;

  const messagesContainer = container.querySelector('#chat-messages');
  const input = container.querySelector('#chat-input');
  const sendBtn = container.querySelector('#chat-send');

  function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = `<div class="message-content">${content.replace(/\n/g, '<br>')}</div>`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function handleSend() {
    const text = input.value.trim();
    if (!text) return;

    addMessage('user', text);
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    const response = await onUserMessage(text);

    setTimeout(() => {
      addMessage('assistant', response.text);

      if (response.done) {
        onComplete?.();
      } else {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
      }
    }, 500);
  }

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
  sendBtn.addEventListener('click', handleSend);
  input.focus();
}
