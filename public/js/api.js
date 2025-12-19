import { supabase, getFamily } from './supabase.js';

export async function sendChatMessage(messages) {
  const family = getFamily();

  const { data, error } = await supabase.functions.invoke('chat', {
    body: {
      messages,
      familyContext: family ? {
        name: family.name,
        servings: family.default_servings,
        constraints: family.constraints
      } : null
    }
  });

  if (error) throw error;
  return data;
}
