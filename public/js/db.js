// Module de gestion IndexedDB
const DB_NAME = 'FamilyMealPlannerDB';
const DB_VERSION = 1;

let db = null;

// Initialisation de la base
export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Store: recipes
      if (!database.objectStoreNames.contains('recipes')) {
        const recipeStore = database.createObjectStore('recipes', { keyPath: 'id' });
        recipeStore.createIndex('name', 'name', { unique: false });
        recipeStore.createIndex('rating', 'rating', { unique: false });
        recipeStore.createIndex('createdAt', 'createdAt', { unique: false });
        recipeStore.createIndex('lastCooked', 'lastCooked', { unique: false });
      }

      // Store: weekly_plans
      if (!database.objectStoreNames.contains('weekly_plans')) {
        const weekStore = database.createObjectStore('weekly_plans', { keyPath: 'id' });
        weekStore.createIndex('weekStartDate', 'weekStartDate', { unique: true });
      }

      // Store: shopping_lists
      if (!database.objectStoreNames.contains('shopping_lists')) {
        const shoppingStore = database.createObjectStore('shopping_lists', { keyPath: 'id' });
        shoppingStore.createIndex('weekStartDate', 'weekStartDate', { unique: false });
        shoppingStore.createIndex('weekPlanId', 'weekPlanId', { unique: false });
      }

      // Store: settings
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'id' });
      }
    };
  });
}

// Générer un UUID
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ==================== RECIPES ====================

export async function addRecipe(recipeData) {
  const recipe = {
    id: generateId(),
    ...recipeData,
    servings: recipeData.servings || {
      adults: 3,
      children: 3,
      adultPortion: 1,
      childPortion: 0.6
    },
    rating: null,
    ratings: [],
    timesCooked: 0,
    lastCooked: null,
    conversationHistory: recipeData.conversationHistory || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['recipes'], 'readwrite');
    const store = transaction.objectStore('recipes');
    const request = store.add(recipe);

    request.onsuccess = () => resolve(recipe);
    request.onerror = () => reject(request.error);
  });
}

export async function getRecipe(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['recipes'], 'readonly');
    const store = transaction.objectStore('recipes');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllRecipes() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['recipes'], 'readonly');
    const store = transaction.objectStore('recipes');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function updateRecipe(id, updates) {
  const recipe = await getRecipe(id);
  if (!recipe) throw new Error('Recipe not found');

  const updated = {
    ...recipe,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['recipes'], 'readwrite');
    const store = transaction.objectStore('recipes');
    const request = store.put(updated);

    request.onsuccess = () => resolve(updated);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteRecipe(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['recipes'], 'readwrite');
    const store = transaction.objectStore('recipes');
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function searchRecipes(query) {
  const all = await getAllRecipes();
  const lowerQuery = query.toLowerCase();

  return all.filter(recipe =>
    recipe.name.toLowerCase().includes(lowerQuery) ||
    recipe.ingredients.some(ing => ing.name.toLowerCase().includes(lowerQuery)) ||
    recipe.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export async function rateRecipe(id, rating, comment = null) {
  const recipe = await getRecipe(id);
  if (!recipe) throw new Error('Recipe not found');

  const newRating = {
    date: new Date().toISOString(),
    rating,
    comment
  };

  const ratings = [...(recipe.ratings || []), newRating];
  const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

  return updateRecipe(id, {
    rating: Math.round(avgRating * 10) / 10,
    ratings
  });
}

export async function markRecipeCooked(id) {
  const recipe = await getRecipe(id);
  if (!recipe) throw new Error('Recipe not found');

  return updateRecipe(id, {
    timesCooked: (recipe.timesCooked || 0) + 1,
    lastCooked: new Date().toISOString()
  });
}

// ==================== WEEKLY PLANS ====================

export async function getWeekPlan(weekStartDate) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['weekly_plans'], 'readonly');
    const store = transaction.objectStore('weekly_plans');
    const index = store.index('weekStartDate');
    const request = index.get(weekStartDate);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function createOrUpdateWeekPlan(weekStartDate, slots) {
  const existing = await getWeekPlan(weekStartDate);

  const plan = {
    id: existing?.id || generateId(),
    weekStartDate,
    slots: slots || existing?.slots || {
      monday: { lunch: null, dinner: null },
      tuesday: { lunch: null, dinner: null },
      wednesday: { lunch: null, dinner: null },
      thursday: { lunch: null, dinner: null },
      friday: { lunch: null, dinner: null },
      saturday: { lunch: null, dinner: null },
      sunday: { lunch: null, dinner: null }
    },
    shoppingListGenerated: existing?.shoppingListGenerated || false,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['weekly_plans'], 'readwrite');
    const store = transaction.objectStore('weekly_plans');
    const request = store.put(plan);

    request.onsuccess = () => resolve(plan);
    request.onerror = () => reject(request.error);
  });
}

export async function setMealSlot(weekStartDate, day, meal, recipeId) {
  const plan = await getWeekPlan(weekStartDate) || {};
  const slots = plan.slots || {
    monday: { lunch: null, dinner: null },
    tuesday: { lunch: null, dinner: null },
    wednesday: { lunch: null, dinner: null },
    thursday: { lunch: null, dinner: null },
    friday: { lunch: null, dinner: null },
    saturday: { lunch: null, dinner: null },
    sunday: { lunch: null, dinner: null }
  };

  slots[day][meal] = recipeId;
  return createOrUpdateWeekPlan(weekStartDate, slots);
}

// ==================== SHOPPING LISTS ====================

export async function getShoppingList(weekStartDate) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['shopping_lists'], 'readonly');
    const store = transaction.objectStore('shopping_lists');
    const index = store.index('weekStartDate');
    const request = index.get(weekStartDate);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveShoppingList(weekStartDate, weekPlanId, items) {
  const existing = await getShoppingList(weekStartDate);

  const list = {
    id: existing?.id || generateId(),
    weekPlanId,
    weekStartDate,
    items,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['shopping_lists'], 'readwrite');
    const store = transaction.objectStore('shopping_lists');
    const request = store.put(list);

    request.onsuccess = () => resolve(list);
    request.onerror = () => reject(request.error);
  });
}

export async function updateShoppingItemCheck(weekStartDate, itemName, checked) {
  const list = await getShoppingList(weekStartDate);
  if (!list) return null;

  const items = list.items.map(item =>
    item.name === itemName ? { ...item, checked } : item
  );

  return saveShoppingList(weekStartDate, list.weekPlanId, items);
}

// ==================== SETTINGS ====================

export async function getSettings() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get('settings');

    request.onsuccess = () => {
      resolve(request.result || {
        id: 'settings',
        defaultConstraints: {
          lactoseFree: true,
          maxPrepTime: 30,
          familySize: { adults: 3, children: 3 }
        },
        categories: {
          ingredients: ['légumes', 'fruits', 'viandes', 'poissons', 'épicerie', 'crèmerie-sans-lactose', 'surgelés', 'condiments'],
          tags: ['rapide', 'batch-cooking', 'budget', 'italien', 'asiatique', 'français', 'végétarien', 'enfants-adorent']
        }
      });
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updateSettings(updates) {
  const current = await getSettings();
  const updated = { ...current, ...updates };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    const request = store.put(updated);

    request.onsuccess = () => resolve(updated);
    request.onerror = () => reject(request.error);
  });
}

// ==================== HELPERS ====================

// Obtenir le lundi de la semaine pour une date donnée
export function getWeekStartDate(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

// Agréger les ingrédients pour la liste de courses
export async function generateShoppingListFromPlan(weekStartDate) {
  const plan = await getWeekPlan(weekStartDate);
  if (!plan) return [];

  const ingredients = {};
  const recipeIds = new Set();

  // Collecter tous les IDs de recettes
  Object.values(plan.slots).forEach(day => {
    if (day.lunch) recipeIds.add(day.lunch);
    if (day.dinner) recipeIds.add(day.dinner);
  });

  // Récupérer et agréger les ingrédients
  for (const recipeId of recipeIds) {
    const recipe = await getRecipe(recipeId);
    if (!recipe) continue;

    recipe.ingredients.forEach(ing => {
      const key = `${ing.name.toLowerCase()}_${ing.unit}`;

      if (ingredients[key]) {
        ingredients[key].quantity += ing.quantity;
        if (!ingredients[key].fromRecipes.includes(recipe.name)) {
          ingredients[key].fromRecipes.push(recipe.name);
        }
      } else {
        ingredients[key] = {
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          category: ing.category,
          checked: false,
          fromRecipes: [recipe.name]
        };
      }
    });
  }

  // Convertir en array et trier par catégorie
  return Object.values(ingredients).sort((a, b) =>
    a.category.localeCompare(b.category)
  );
}
