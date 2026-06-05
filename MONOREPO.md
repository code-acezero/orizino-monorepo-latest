# Orizino — Monorepo Setup Guide

## Structure

```
orizino/
├── apps/
│   ├── company/        → orizino.com        (public marketing/landing)
│   ├── storefront/     → shop.orizino.com   (customer e-commerce)
│   └── masterpanel/    → mp.orizino.com     (admin / back-office)
├── packages/
│   ├── ui/             → @orizino/ui        (shadcn primitives, mobile kit, skeletons)
│   ├── shared/         → @orizino/shared    (contexts, hooks, lib utils)
│   └── supabase/       → @orizino/supabase  (client, types, auth helpers)
├── supabase/           → Edge functions + migrations (shared DB, one project)
└── package.json        → npm workspaces root
```

---

## Local Development

### 1. Install all dependencies (run once from root)

```bash
npm install --legacy-peer-deps
```

### 2. Copy env files into each app

Each app needs its own `.env.local`. The same Supabase project serves all three apps.

```bash
cp apps/storefront/.env.example  apps/storefront/.env.local
cp apps/masterpanel/.env.example apps/masterpanel/.env.local
cp apps/company/.env.example     apps/company/.env.local
```

Fill in the values in each `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...
# Add SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY etc. as needed
```

### 3. Run individual apps

```bash
# Company site — http://localhost:3000
npm run dev:company

# Storefront — http://localhost:3001
npm run dev:storefront

# Master panel — http://localhost:3002
npm run dev:masterpanel
```

Or run all three at once (requires a terminal multiplexer or parallel-capable shell):

```bash
npm run dev
```

---

## Netlify Deployment (3 separate sites)

Each app is deployed as its own Netlify site pointing to the same Git repo. Configure the `base` directory in each site's Netlify settings to match.

| App         | Netlify base dir    | Domain            |
|-------------|---------------------|-------------------|
| company     | `apps/company`      | `orizino.com`     |
| storefront  | `apps/storefront`   | `shop.orizino.com`|
| masterpanel | `apps/masterpanel`  | `mp.orizino.com`  |

### Steps

1. **Push this repo to GitHub/GitLab.**

2. **Create 3 Netlify sites** — one per app:
   - Netlify → "Add new site" → "Import an existing project"
   - Each site: set **Base directory** to `apps/company`, `apps/storefront`, or `apps/masterpanel`
   - Build command: `npm run build` (each `package.json` has its own build script)
   - Publish directory: `.next`
   - Plugin: `@netlify/plugin-nextjs` (already in each `netlify.toml`)

3. **Set environment variables** in each Netlify site's Settings → Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   SUPABASE_URL
   SUPABASE_PUBLISHABLE_KEY
   SUPABASE_SERVICE_ROLE_KEY   (masterpanel + storefront)
   RESEND_API_KEY               (storefront — email campaigns)
   RESEND_WEBHOOK_SECRET        (storefront — resend webhook)
   ```

4. **Custom domains** — in each Netlify site's Domain settings:
   - company     → `orizino.com`
   - storefront  → `shop.orizino.com`
   - masterpanel → `mp.orizino.com`

---

## Supabase (one project, shared by all apps)

All three apps point to the same Supabase project. The DB, RLS policies, and edge functions are shared.

### Apply migrations

```bash
# From repo root
npx supabase db push
```

### Deploy edge functions

```bash
npx supabase functions deploy ai-chat
npx supabase functions deploy create-order
npx supabase functions deploy sync-shipments
npx supabase functions deploy generate-invoice
npx supabase functions deploy notify-live-support
npx supabase functions deploy archive-to-gdocs
npx supabase functions deploy gdocs-export-pdf
npx supabase functions deploy og-image
```

---

## Package aliases (within each app)

All apps use `@/*` to refer to their own root, plus workspace package aliases:

| Alias          | Resolves to                     |
|----------------|---------------------------------|
| `@/*`          | The app's own root (`./`)       |
| `@ui/*`        | `packages/ui/src/*`             |
| `@shared/*`    | `packages/shared/src/*`         |
| `@supabase/*`  | `packages/supabase/src/*`       |

These are set in each app's `tsconfig.json` and picked up by Next.js automatically.

---

## Adding new pages / features

| Feature type             | Where it goes                        |
|--------------------------|--------------------------------------|
| New storefront page      | `apps/storefront/pages-src/`         |
| New admin section        | `apps/masterpanel/pages-src/admin/`  |
| New company/marketing page | `apps/company/pages-src/`          |
| New shared UI primitive  | `packages/ui/src/components/`        |
| New shared hook          | `packages/shared/src/hooks/`         |
| New shared context       | `packages/shared/src/contexts/`      |
| New Supabase migration   | `supabase/migrations/`               |
| New edge function        | `supabase/functions/<name>/index.ts` |

---

## Ports summary

| App         | Dev port |
|-------------|----------|
| company     | 3000     |
| storefront  | 3001     |
| masterpanel | 3002     |
