# SKIN'S

Boutique e-commerce Next.js basee sur le guide HTML fourni.

## Stack

- Next.js 16
- React 19
- CSS vanilla
- PostgreSQL Supabase via routes API Next.js
- Panier et preferences UI persistes en `localStorage`

## Developpement local

```bash
npm install
npm run db:setup
npm run dev
```

Le site sera disponible sur `http://localhost:3000`.

## Base de donnees

- La connexion serveur passe par `DATABASE_URL`
- Le fallback HTTPS utilise `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Le schema SQL est dans `supabase/schema.sql`
- Le seed initial est dans `supabase/seed.sql`
- Le script `npm run db:setup` applique schema + seed sur la base cible
- Si `db.<ref>.supabase.co` ne se resout pas, utilise le SQL Editor Supabase ou un host pooler valide

## Deploiement Vercel

1. Importer le depot dans Vercel.
2. Ajouter `DATABASE_URL` si tu as un host Postgres valide.
3. Ajouter aussi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY`.
4. Laisser Vercel detecter automatiquement `Next.js`.
5. Deployer.

## Reference

Le guide HTML original est conserve dans [reference/jb9store-guide.html](./reference/jb9store-guide.html).
