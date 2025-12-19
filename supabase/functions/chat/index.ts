import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.30.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECIPE_SYSTEM_PROMPT = `Tu es un assistant culinaire familial pour LoloBox.

CONTEXTE PAR DÉFAUT :
- Sans lactose (sauf indication contraire)
- Recettes idéalement < 30 min de préparation (sinon tag "batch-cooking")
- Plats qui plaisent aux enfants
- Viande autorisée

COMPORTEMENT :
1. Quand on te demande une idée de recette, propose 5 options format compact :
   🍗 Nom du plat - Description 5 mots max

2. Quand l'utilisateur choisit une recette, demande TOUJOURS :
   "Pour combien de personnes ?"

3. Pose 1-2 questions de clarification si nécessaire

4. Quand tu as toutes les infos, génère le JSON final

RÈGLES CRITIQUES POUR LES QUANTITÉS :
- Quantités RÉALISTES et PRATIQUES
- Œufs, oignons, boîtes : toujours entiers
- Viandes : 150-180g par adulte
- Pâtes : 80-100g par adulte (sec)
- Arrondis aux valeurs pratiques (350g, 400g, 500g...)

CALCUL DES PORTIONS :
- "X personnes" → X portions adultes
- "X adultes + Y enfants" → X + (Y × 0.6) portions

FORMAT DE SORTIE FINAL :
{
  "ready": true,
  "recipe": {
    "name": "...",
    "description": "...",
    "servings": {"description": "4 personnes", "portions": 4},
    "prepTime": 20,
    "cookTime": 15,
    "totalTime": 35,
    "difficulty": "facile",
    "tags": ["rapide"],
    "ingredients": [{"name": "...", "quantity": 400, "unit": "g", "category": "viandes"}],
    "steps": [{"order": 1, "instruction": "...", "duration": 5, "tip": null}],
    "tips": ["..."]
  }
}`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, familyContext } = await req.json();

    // Construire le contexte famille
    let systemPrompt = RECIPE_SYSTEM_PROMPT;
    if (familyContext) {
      systemPrompt += `\n\nCONTEXTE FAMILLE :
- Famille : ${familyContext.name}
- Composition : ${familyContext.servings?.adults || 2} adultes, ${familyContext.servings?.children || 0} enfants
- Contraintes : ${Object.keys(familyContext.constraints || {}).filter(k => familyContext.constraints[k]).join(', ') || 'aucune'}`;
    }

    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages,
    });

    const content = response.content[0].text;

    // Parser si c'est une recette
    let recipe = null;
    try {
      const parsed = JSON.parse(content);
      if (parsed.ready && parsed.recipe) {
        recipe = parsed.recipe;
      }
    } catch {
      // Pas un JSON, c'est OK
    }

    return new Response(
      JSON.stringify({ content, recipe }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
