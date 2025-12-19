# LoloBox V1

Application de planification de repas familiale avec authentification multi-famille.

## Stack Technique

- **Frontend**: PWA (Vanilla JS, CSS, HTML)
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Auth**: Google Sign-in
- **AI**: Claude API via Edge Function

## Fonctionnalites

- Authentification Google
- Systeme multi-famille avec invitations
- Creation de recettes assistee par IA
- Planification hebdomadaire des repas
- Liste de courses automatique
- Gestion des portions (adultes/enfants)

## Deploiement

Le deploiement est automatique via GitHub Actions vers Hetzner.

```bash
# Local
npm install
npm start
# -> http://localhost:3000
```

## Configuration Supabase

1. Creer un projet Supabase
2. Executer `supabase/schema.sql` dans l'editeur SQL
3. Configurer Google OAuth dans Authentication > Providers
4. Deployer l'Edge Function `chat` pour l'IA
