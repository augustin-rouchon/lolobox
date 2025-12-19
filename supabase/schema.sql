-- =====================================================
-- LOLOBOX DATABASE SCHEMA
-- =====================================================

-- Table: families
-- Une famille regroupe plusieurs membres et leurs recettes
CREATE TABLE families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- Code d'invitation (ex: ROUCHON-7K2M)
  constraints JSONB DEFAULT '{}', -- {"lactose_free": true, "vegetarian": false}
  preferences JSONB DEFAULT '{}', -- {"cuisines": ["français", "italien"], "budget": "equilibre"}
  default_servings JSONB DEFAULT '{"adults": 2, "children": 0}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: family_members
-- Les membres d'une famille
CREATE TABLE family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Prénom affiché
  role TEXT DEFAULT 'member', -- 'admin' ou 'member' (pour V2)
  appetite TEXT DEFAULT 'normal', -- 'petit_moineau', 'normal', 'ogre'
  profile JSONB DEFAULT '{}', -- Données additionnelles futures
  is_creator BOOLEAN DEFAULT FALSE, -- Celui qui a créé la famille
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(family_id, user_id)
);

-- Table: invitations
-- Liens d'invitation pour rejoindre une famille
CREATE TABLE invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL, -- Code unique pour le lien
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: recipes
-- Les recettes d'une famille
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),

  name TEXT NOT NULL,
  description TEXT,
  servings JSONB DEFAULT '{"description": "4 personnes", "portions": 4}',
  prep_time INTEGER, -- minutes
  cook_time INTEGER, -- minutes
  total_time INTEGER, -- minutes
  difficulty TEXT DEFAULT 'facile', -- facile, moyen, difficile

  tags TEXT[] DEFAULT '{}',
  ingredients JSONB NOT NULL DEFAULT '[]',
  steps JSONB NOT NULL DEFAULT '[]',
  tips TEXT[] DEFAULT '{}',

  -- Stats
  times_cooked INTEGER DEFAULT 0,
  last_cooked_at TIMESTAMPTZ,

  -- Conversation de création (pour contexte futur)
  creation_chat JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: recipe_ratings
-- Notes et commentaires sur les recettes
CREATE TABLE recipe_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(recipe_id, user_id) -- Une note par personne par recette
);

-- Table: weekly_plans
-- Planning hebdomadaire d'une famille
CREATE TABLE weekly_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL, -- Lundi de la semaine
  slots JSONB DEFAULT '{}', -- {"monday": {"lunch": "uuid", "dinner": "uuid"}, ...}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(family_id, week_start_date)
);

-- Table: shopping_lists
-- Listes de courses générées
CREATE TABLE shopping_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  week_plan_id UUID REFERENCES weekly_plans(id) ON DELETE SET NULL,
  week_start_date DATE NOT NULL,
  items JSONB DEFAULT '[]', -- Liste des ingrédients avec checked status
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_family_members_family ON family_members(family_id);
CREATE INDEX idx_family_members_user ON family_members(user_id);
CREATE INDEX idx_recipes_family ON recipes(family_id);
CREATE INDEX idx_recipes_created_by ON recipes(created_by);
CREATE INDEX idx_weekly_plans_family_week ON weekly_plans(family_id, week_start_date);
CREATE INDEX idx_invitations_code ON invitations(code);
CREATE INDEX idx_families_code ON families(code);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

-- Fonction helper : obtenir les familles d'un user
CREATE OR REPLACE FUNCTION user_family_ids()
RETURNS SETOF UUID AS $$
  SELECT family_id FROM family_members WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Policies: families
CREATE POLICY "Users can view their families"
  ON families FOR SELECT
  USING (id IN (SELECT user_family_ids()));

CREATE POLICY "Users can create families"
  ON families FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Family admins can update"
  ON families FOR UPDATE
  USING (id IN (SELECT user_family_ids()));

-- Policies: family_members
CREATE POLICY "Users can view members of their families"
  ON family_members FOR SELECT
  USING (family_id IN (SELECT user_family_ids()));

CREATE POLICY "Users can join families"
  ON family_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own membership"
  ON family_members FOR UPDATE
  USING (user_id = auth.uid());

-- Policies: invitations
CREATE POLICY "Family members can view invitations"
  ON invitations FOR SELECT
  USING (family_id IN (SELECT user_family_ids()));

CREATE POLICY "Family members can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (family_id IN (SELECT user_family_ids()));

CREATE POLICY "Anyone can view invitation by code (for joining)"
  ON invitations FOR SELECT
  USING (true);

-- Policies: recipes
CREATE POLICY "Users can view recipes of their families"
  ON recipes FOR SELECT
  USING (family_id IN (SELECT user_family_ids()));

CREATE POLICY "Users can create recipes in their families"
  ON recipes FOR INSERT
  WITH CHECK (family_id IN (SELECT user_family_ids()));

CREATE POLICY "Users can update recipes of their families"
  ON recipes FOR UPDATE
  USING (family_id IN (SELECT user_family_ids()));

CREATE POLICY "Users can delete recipes of their families"
  ON recipes FOR DELETE
  USING (family_id IN (SELECT user_family_ids()));

-- Policies: recipe_ratings
CREATE POLICY "Users can view ratings of their family recipes"
  ON recipe_ratings FOR SELECT
  USING (recipe_id IN (
    SELECT id FROM recipes WHERE family_id IN (SELECT user_family_ids())
  ));

CREATE POLICY "Users can rate recipes of their families"
  ON recipe_ratings FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    recipe_id IN (SELECT id FROM recipes WHERE family_id IN (SELECT user_family_ids()))
  );

CREATE POLICY "Users can update their own ratings"
  ON recipe_ratings FOR UPDATE
  USING (user_id = auth.uid());

-- Policies: weekly_plans
CREATE POLICY "Users can view plans of their families"
  ON weekly_plans FOR SELECT
  USING (family_id IN (SELECT user_family_ids()));

CREATE POLICY "Users can create/update plans of their families"
  ON weekly_plans FOR INSERT
  WITH CHECK (family_id IN (SELECT user_family_ids()));

CREATE POLICY "Users can update plans of their families"
  ON weekly_plans FOR UPDATE
  USING (family_id IN (SELECT user_family_ids()));

-- Policies: shopping_lists
CREATE POLICY "Users can manage shopping lists of their families"
  ON shopping_lists FOR ALL
  USING (family_id IN (SELECT user_family_ids()));

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Générer un code famille unique
CREATE OR REPLACE FUNCTION generate_family_code(family_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_code TEXT;
  random_suffix TEXT;
  final_code TEXT;
BEGIN
  -- Prendre les 6 premières lettres du nom, en majuscules
  base_code := UPPER(SUBSTRING(REGEXP_REPLACE(family_name, '[^a-zA-Z]', '', 'g') FROM 1 FOR 6));

  -- Ajouter un suffixe aléatoire
  random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

  final_code := base_code || '-' || random_suffix;

  RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- Générer un code d'invitation unique
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 12));
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_families_updated
  BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_recipes_updated
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_weekly_plans_updated
  BEFORE UPDATE ON weekly_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_shopping_lists_updated
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
