# 🍳 Family Meal Planner

Application web locale de planification de repas familiaux avec assistant IA.

## Configuration requise

- Node.js 18+
- Une clé API Anthropic

## Installation

```bash
cd family-meal-planner

# Installer les dépendances
npm install

# Configurer la clé API
# Éditer server/.env et remplacer "your-api-key-here" par ta vraie clé API
```

## Lancement

```bash
# Mode développement (avec auto-reload)
npm run dev

# Mode production
npm start
```

Puis ouvrir http://localhost:3000

## Fonctionnalités

1. **Création de recette** - Chat IA pour générer des recettes personnalisées
2. **Index des recettes** - Liste avec filtres, recherche, notation
3. **Planning semaine** - Calendrier 7 jours × 2 repas (midi/soir)
4. **Liste de courses** - Génération automatique depuis le planning

## Structure du projet

```
family-meal-planner/
├── server/
│   ├── index.js        # Serveur Express + proxy API Claude
│   └── .env            # Clé API (à configurer)
├── public/
│   ├── index.html      # Page principale
│   ├── css/styles.css  # Styles
│   └── js/
│       ├── app.js      # Router principal
│       ├── db.js       # IndexedDB
│       ├── api.js      # Communication serveur
│       ├── utils.js    # Helpers
│       ├── components/ # Composants UI
│       └── pages/      # Pages de l'application
└── package.json
```

## Contexte familial

- **Famille** : 3 adultes + 3 enfants
- **Portions enfants** : 60% d'une portion adulte
- **Contrainte** : Sans lactose par défaut
- **Philosophie** : Recettes rapides (~30 min) ou "Batch Cooking"
