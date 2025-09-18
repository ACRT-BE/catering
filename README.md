# ACRT – Catering & Planning (Vite + React + Supabase)

## Démarrage local
```bash
npm i
cp .env.example .env
# Éditez .env si besoin
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Variables d'env Vercel (Project Settings → Environment Variables)
- `VITE_SUPABASE_URL` = votre URL Supabase
- `VITE_SUPABASE_ANON_KEY` = votre clé anonyme

## Déploiement Vercel
- Connectez ce repo, framework = Vite
- Build command: `npm run build`
- Output: `dist`
- Ajoutez les deux env vars ci-dessus
