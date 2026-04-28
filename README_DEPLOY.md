# README_DEPLOY.md

Guide ultra detaille pour mettre **PronosticsPro** en ligne en mode pro.

Ce document couvre:
- Frontend sur **Vercel**
- Backend sur **Render**
- Base de donnees sur **MongoDB Atlas**
- Nom de domaine + DNS
- Variables d'environnement
- Paiement webhook
- Verification finale production

---

## 0) Prerequis (avant de commencer)

Tu dois avoir:
- Un compte GitHub
- Un compte Vercel
- Un compte Render
- Un compte MongoDB Atlas
- Un nom de domaine (Namecheap, OVH, Cloudflare, etc.)
- Les cles API:
  - `SPORTS_API_KEY`
  - `OPENAI_API_KEY`
  - `CINETPAY_API_KEY`
  - `CINETPAY_SITE_ID`

Outils locaux conseilles:
- Node.js 18+
- npm
- Git

---

## 1) Structure projet attendue

Dans ton dossier `DWM/pronos`, tu dois avoir au minimum:
- `front/index.html`
- `back/server.js`
- `back/routes/*`
- `back/services/*`
- `back/models/index.js`
- `back/middleware/auth.js`
- `back/cron/dailyCron.js`
- `back/scripts/createAdmin.js`
- `package.json`
- `vercel.json`
- `render.yaml`

---

## 2) Push sur GitHub (obligatoire pour Vercel/Render)

Depuis `DWM/pronos`:

1. Initialiser git (si besoin)
   - `git init`
2. Ajouter fichiers
   - `git add .`
3. Commit
   - `git commit -m "Prepare production deploy"`
4. Creer repository sur GitHub
5. Ajouter remote
   - `git remote add origin https://github.com/<ton-user>/<ton-repo>.git`
6. Push
   - `git branch -M main`
   - `git push -u origin main`

---

## 3) MongoDB Atlas (base cloud)

### 3.1 Creer cluster
1. Connecte-toi a MongoDB Atlas
2. `Build a Database`
3. Choisis plan:
   - Dev: `M0` (gratuit)
   - Prod: recommande `M10+`
4. Region proche de ton backend (latence plus faible)

### 3.2 Creer user DB
1. `Database Access`
2. `Add New Database User`
3. Username + password fort
4. Role: `Read and write to any database`

### 3.3 Autoriser IP
1. `Network Access`
2. Ajouter:
   - Dev: `0.0.0.0/0` (temporaire)
   - Prod: restreindre aux IP Render (si possible)

### 3.4 Recuperer URI
1. `Connect` -> `Drivers`
2. Copier URI:
   - `mongodb+srv://USER:PASSWORD@cluster.../pronosticspro?...`
3. Remplacer `USER` et `PASSWORD`
4. Conserver pour Render: `MONGODB_URI`

---

## 4) Deploy Backend sur Render

### 4.1 Creer service
1. Ouvre Render -> `New` -> `Web Service`
2. Connecte ton repo GitHub
3. Choisis repo `pronos`
4. Parametres:
   - Runtime: Node
   - Root: `.`
   - Build command: `npm install`
   - Start command: `npm run start`

### 4.2 Variables d'environnement Render
Ajoute ces variables:

- `NODE_ENV=production`
- `PORT=5000`
- `MONGODB_URI=<uri-atlas>`
- `JWT_SECRET=<secret-long-random>`
- `FRONTEND_URL=https://<ton-front>.vercel.app`
- `BACKEND_URL=https://<ton-api>.onrender.com`
- `SPORTS_API_KEY=<key>`
- `OPENAI_API_KEY=<key>`
- `CINETPAY_API_KEY=<key>`
- `CINETPAY_SITE_ID=<id>`
- (optionnel) `TELEGRAM_BOT_TOKEN=<token>`
- (optionnel) `TELEGRAM_CHANNEL_ID=<id>`

Important:
- `FRONTEND_URL` doit matcher ton domaine front final
- `BACKEND_URL` doit etre l'URL Render publique

### 4.3 Deploy et health check
1. Lance le deploy
2. Verifie:
   - `https://<ton-api>.onrender.com/health`
3. Tu dois voir un JSON status OK

---

## 5) Creer premier admin

Une fois backend deploye et Atlas connecte:

Option A (local, simple):
1. Creer `.env` local avec meme `MONGODB_URI`
2. Lance:
   - `npm run admin:create -- admin@tonsite.com MotDePasseUltraFort123`

Option B (shell Render):
1. Ouvre shell Render
2. Execute:
   - `npm run admin:create -- admin@tonsite.com MotDePasseUltraFort123`

---

## 6) Deploy Frontend sur Vercel

### 6.1 Creer projet Vercel
1. Vercel -> `New Project`
2. Choisis repo GitHub `pronos`
3. Vercel detecte `vercel.json`
4. Deploy

### 6.2 Verifier routing
`vercel.json` route tout vers `front/index.html`, donc:
- `/` affiche site
- navigation interne SPA fonctionne

### 6.3 Config API base frontend
Dans `front/index.html`, `CFG.API_BASE` doit pointer vers:
- `https://<ton-api>.onrender.com/api`

Si besoin, modifie puis push GitHub pour redeployer.

---

## 7) Connecter domaine + DNS

Exemple:
- Front: `www.tonsite.com`
- API: `api.tonsite.com`

### 7.1 Domaine frontend sur Vercel
1. Vercel project -> `Settings` -> `Domains`
2. Add `www.tonsite.com`
3. Vercel te donne en general un CNAME:
   - `www` -> `cname.vercel-dns.com`
4. Creer ce record chez ton registrar

### 7.2 Domaine API sur Render
1. Render service -> `Settings` -> `Custom Domains`
2. Add `api.tonsite.com`
3. Render donne target CNAME
4. Creer record DNS correspondant

### 7.3 SSL
- Vercel et Render gerent HTTPS automatiquement
- Attendre propagation DNS (5 min a 24h)

---

## 8) Webhook paiement reel (CinetPay)

### 8.1 URL webhook
Dans dashboard CinetPay:
- Notify URL:
  - `https://api.tonsite.com/api/payments/notify`
- Return URL:
  - `https://www.tonsite.com/?payment=success`

### 8.2 Test webhook
1. Lance paiement test
2. Verifie logs Render:
   - requete `/api/payments/notify`
3. Verifie DB:
   - `Subscription.status = active`
   - `User.role = vip`
   - dates VIP renseignees

### 8.3 Securite
Le backend fait verification serveur-a-serveur via `checkPaymentStatus`.
Ne jamais activer VIP uniquement depuis payload brut webhook.

---

## 9) Checklist tests avant ouverture publique

### 9.1 Auth
- register OK
- login OK
- token JWT valide
- endpoint `/api/users/me` protege

### 9.2 Donnees sport
- `/api/matches/today` renvoie des matchs
- pronostics generes
- fallback fonctionne si API-Sports indisponible

### 9.3 IA
- chat IA repond
- refuse hors sujet (non paris sportifs)
- traduction full-page fonctionne

### 9.4 Paiement
- init paiement OK
- webhook OK
- upgrade VIP OK
- expiration/retour role user OK

### 9.5 Admin
- compte admin cree
- dashboard stats OK
- sync manuelle OK

---

## 10) Production hardening (fortement recommande)

- Ajouter rate limiting (`express-rate-limit`)
- Ajouter logs structurels (pino/winston)
- Ajouter monitoring erreurs (Sentry)
- Ajouter uptime monitor (UptimeRobot/BetterStack)
- Sauvegarde DB (Atlas backup policy)
- Rotation de cles API reguliere
- Restreindre CORS strictement aux domaines legitimes
- Activer headers securite CSP strict (ajuster assets externes)

---

## 11) Automatisation cron

Deja branche dans `back/server.js`:
- `06:00` recuperation + generation pronostics
- `23:30` verification resultats
- Hebdo maintenance subscriptions/matchs anciens

Verifier en logs Render:
- execution quotidienne
- pas d'erreurs API
- volumes stables

---

## 12) Estimation cout mensuel (ordre de grandeur)

- Vercel:
  - hobby: gratuit
  - pro: ~20 USD+
- Render:
  - starter: ~7 USD+
- Mongo Atlas:
  - M0: gratuit
  - M10+: ~25 USD+
- OpenAI:
  - variable (ex: 5 USD a 100+ USD selon trafic)
- API-Sports:
  - gratuit limite
  - payant selon besoin
- Domaine:
  - ~10 a 20 USD/an

---

## 13) Commandes utiles

Depuis racine `pronos`:

- Dev API:
  - `npm run dev`
- Start prod local:
  - `npm run start`
- Create admin:
  - `npm run admin:create -- admin@tonsite.com StrongPass123`

---

## 14) Probleme frequent et solution rapide

1. **Frontend ne parle pas au backend**
   - Verifier `CFG.API_BASE`
   - Verifier `FRONTEND_URL` dans Render (CORS)

2. **Mongo connection failed**
   - Verifier URI, user/password, IP whitelist Atlas

3. **Webhook paiement non recu**
   - URL notify publique invalide
   - mauvais domaine/API non en HTTPS

4. **Chat/traduction IA ne marche pas**
   - `OPENAI_API_KEY` absente cote backend
   - quota OpenAI depasse

5. **Admin login impossible**
   - compte admin pas cree
   - mot de passe mal saisi

---

## 15) Sequence ideale de mise en ligne

1. Mongo Atlas
2. Render backend
3. Creation admin
4. Vercel frontend
5. DNS custom domains
6. Config webhook paiement
7. Tests end-to-end
8. Ouverture publique

---

Si tu veux, prochaine etape je peux aussi te fournir un `README_ENV.md` (copier-coller exact de toutes les variables, avec exemples valides pour dev/prod) et un plan de monitoring quotidien (check matin/soir en 5 minutes).
