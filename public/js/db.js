import { supabase, getFamily, getUser } from './supabase.js';
import { smartRoundQuantity, formatQuantity, mergeIngredients } from './utils.js';

// ==================== FAMILIES ====================

export async function createFamily(name, constraints = {}, defaultServings = { adults: 2, children: 0 }) {
  const user = getUser();
  if (!user) throw new Error('Not authenticated');

  // Générer le code famille
  const { data: codeResult, error: codeError } = await supabase.rpc('generate_family_code', { family_name: name });

  // Si la fonction RPC n'existe pas, générer un code simple
  const familyCode = codeResult || (name.substring(0, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase());

  // Créer la famille
  const { data: family, error: familyError } = await supabase
    .from('families')
    .insert({
      name,
      code: familyCode,
      constraints,
      default_servings: defaultServings
    })
    .select()
    .single();

  if (familyError) {
    console.error('Error creating family:', familyError);
    throw familyError;
  }

  // Ajouter l'utilisateur comme membre créateur
  const { error: memberError } = await supabase
    .from('family_members')
    .insert({
      family_id: family.id,
      user_id: user.id,
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Membre',
      is_creator: true,
      role: 'admin'
    });

  if (memberError) {
    console.error('Error adding member:', memberError);
    throw memberError;
  }

  return family;
}

export async function joinFamily(invitationCode, memberName, appetite = 'normal') {
  const user = getUser();
  if (!user) throw new Error('Not authenticated');

  // Trouver l'invitation
  const { data: invitation, error: invError } = await supabase
    .from('invitations')
    .select('*, family:families(*)')
    .eq('code', invitationCode)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (invError || !invitation) throw new Error('Invitation invalide ou expirée');

  // Rejoindre la famille
  const { error: memberError } = await supabase
    .from('family_members')
    .insert({
      family_id: invitation.family_id,
      user_id: user.id,
      name: memberName,
      appetite,
      is_creator: false
    });

  if (memberError) throw memberError;

  // Marquer l'invitation comme utilisée
  await supabase
    .from('invitations')
    .update({ used_at: new Date().toISOString(), used_by: user.id })
    .eq('id', invitation.id);

  return invitation.family;
}

export async function createInvitation() {
  const family = getFamily();
  const user = getUser();
  if (!family || !user) throw new Error('No family');

  const { data: codeResult } = await supabase.rpc('generate_invitation_code');

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      family_id: family.id,
      code: codeResult,
      created_by: user.id
    })
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    link: `${window.location.origin}/#/join/${data.code}`
  };
}

// ==================== RECIPES ====================

export async function addRecipe(recipeData) {
  const family = getFamily();
  const user = getUser();
  if (!family || !user) throw new Error('No family');

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      family_id: family.id,
      created_by: user.id,
      name: recipeData.name,
      description: recipeData.description,
      servings: recipeData.servings,
      prep_time: recipeData.prepTime,
      cook_time: recipeData.cookTime,
      total_time: recipeData.totalTime || (recipeData.prepTime + recipeData.cookTime),
      difficulty: recipeData.difficulty,
      tags: recipeData.tags || [],
      ingredients: recipeData.ingredients || [],
      steps: recipeData.steps || [],
      tips: recipeData.tips || [],
      creation_chat: recipeData.conversationHistory || []
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRecipe(id) {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      ratings:recipe_ratings(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  // Calculer la note moyenne
  if (data.ratings?.length > 0) {
    data.averageRating = data.ratings.reduce((sum, r) => sum + r.rating, 0) / data.ratings.length;
  }

  return data;
}

export async function getAllRecipes() {
  const family = getFamily();
  if (!family) return [];

  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      ratings:recipe_ratings(rating)
    `)
    .eq('family_id', family.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Calculer les notes moyennes
  return (data || []).map(recipe => {
    if (recipe.ratings?.length > 0) {
      recipe.averageRating = recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length;
    }
    return recipe;
  });
}

export async function updateRecipe(id, updates) {
  const { data, error } = await supabase
    .from('recipes')
    .update({
      name: updates.name,
      description: updates.description,
      servings: updates.servings,
      prep_time: updates.prepTime,
      cook_time: updates.cookTime,
      total_time: updates.totalTime,
      difficulty: updates.difficulty,
      tags: updates.tags,
      ingredients: updates.ingredients,
      steps: updates.steps,
      tips: updates.tips,
      times_cooked: updates.timesCooked,
      last_cooked_at: updates.lastCookedAt
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRecipe(id) {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function rateRecipe(recipeId, rating, comment = null) {
  const user = getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('recipe_ratings')
    .upsert({
      recipe_id: recipeId,
      user_id: user.id,
      rating,
      comment
    }, {
      onConflict: 'recipe_id,user_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function searchRecipes(query) {
  const family = getFamily();
  if (!family) return [];

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('family_id', family.id)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ==================== WEEKLY PLANS ====================

export async function getWeekPlan(weekStartDate) {
  const family = getFamily();
  if (!family) return null;

  const { data, error } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('family_id', family.id)
    .eq('week_start_date', weekStartDate)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

export async function createOrUpdateWeekPlan(weekStartDate, slots) {
  const family = getFamily();
  if (!family) throw new Error('No family');

  const { data, error } = await supabase
    .from('weekly_plans')
    .upsert({
      family_id: family.id,
      week_start_date: weekStartDate,
      slots
    }, {
      onConflict: 'family_id,week_start_date'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setMealSlot(weekStartDate, day, meal, recipeId) {
  const plan = await getWeekPlan(weekStartDate);
  const slots = plan?.slots || {
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
  const family = getFamily();
  if (!family) return null;

  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('family_id', family.id)
    .eq('week_start_date', weekStartDate)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function generateShoppingListFromPlan(weekStartDate) {
  const family = getFamily();
  if (!family) return [];

  const plan = await getWeekPlan(weekStartDate);
  if (!plan) return [];

  const allIngredients = [];
  const recipeIds = new Set();

  // Collecter tous les IDs de recettes
  Object.values(plan.slots).forEach(day => {
    if (day.lunch) recipeIds.add(day.lunch);
    if (day.dinner) recipeIds.add(day.dinner);
  });

  // Récupérer les ingrédients de chaque recette
  for (const recipeId of recipeIds) {
    const recipe = await getRecipe(recipeId);
    if (!recipe) continue;

    recipe.ingredients.forEach(ing => {
      allIngredients.push({
        ...ing,
        fromRecipe: recipe.name
      });
    });
  }

  // Fusionner et arrondir intelligemment
  return mergeIngredients(allIngredients);
}

export async function saveShoppingList(weekStartDate, weekPlanId, items) {
  const family = getFamily();
  if (!family) throw new Error('No family');

  const { data, error } = await supabase
    .from('shopping_lists')
    .upsert({
      family_id: family.id,
      week_plan_id: weekPlanId,
      week_start_date: weekStartDate,
      items
    }, {
      onConflict: 'family_id,week_start_date'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateShoppingItemCheck(weekStartDate, itemIndex, checked) {
  const list = await getShoppingList(weekStartDate);
  if (!list) return null;

  const items = [...list.items];
  if (items[itemIndex]) {
    items[itemIndex].checked = checked;
  }

  return saveShoppingList(weekStartDate, list.week_plan_id, items);
}

// ==================== HELPERS ====================

export function getWeekStartDate(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}
