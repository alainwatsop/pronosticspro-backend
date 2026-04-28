# README_ENV.md

Variables d'environnement **pretes a copier-coller** pour PronosticsPro.

Ce guide couvre:
- `.env` local (dev)
- Variables Render (prod backend)
- Variables Vercel (prod frontend)
- Generation des secrets
- Verification rapide

---

## 1) Fichier `.env` local (DEV)

Creer: `DWM/pronos/.env`

Copie-colle:

```env
# =========================
# PronosticsPro - DEV LOCAL
# =========================
NODE_ENV=development
PORT=5000

# URL frontend local (si tu lances juste index.html, garde cette valeur)
FRONTEND_URL=http://localhost:5500

# URL backend local
BACKEND_URL=http://localhost:5000

# MongoDB local OU Atlas
# Exemple local:
# MONGODB_URI=mongodb://127.0.0.1:27017/pronosticspro
# Exemple Atlas:
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/pronosticspro?retryWrites=true&w=majority

# JWT
JWT_SECRET=CHANGE_ME_DEV_ONLY

# API Sports
SPORTS_API_KEY=VOTRE_CLE_API_SPORTS
ALL_SPORTS_API_KEY=

# OpenAI
OPENAI_API_KEY=sk-votre_cle_openai

# CinetPay (optionnel en dev, requis pour test paiement reel)
CINETPAY_API_KEY=
CINETPAY_SITE_ID=

# Telegram (optionnel)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_ID=

# Redis (optionnel)
REDIS_URL=
```

---

## 2) Variables Render (PROD BACKEND)

Dans Render > Web Service > Environment, ajoute:

```env
NODE_ENV=production
PORT=5000

FRONTEND_URL=https://www.tonsite.com
BACKEND_URL=https://api.tonsite.com

MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/pronosticspro?retryWrites=true&w=majority

JWT_SECRET=GENERE_UN_SECRET_LONG_ET_UNIQUE

SPORTS_API_KEY=VOTRE_CLE_API_SPORTS
ALL_SPORTS_API_KEY=

OPENAI_API_KEY=sk-votre_cle_openai

CINETPAY_API_KEY=VOTRE_CLE_CINETPAY
CINETPAY_SITE_ID=VOTRE_SITE_ID_CINETPAY

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_ID=

REDIS_URL=
```

Important:
- `FRONTEND_URL` = domaine frontend final
- `BACKEND_URL` = domaine API final
- `JWT_SECRET` ne doit **jamais** rester par defaut

---

## 3) Variables Vercel (PROD FRONTEND)

Le frontend actuel est en `index.html` statique.
Tu as 2 options:

### Option A (actuelle, simple)
Modifier `CFG.API_BASE` dans `front/index.html` avec:
- `https://api.tonsite.com/api`

Puis push GitHub.

### Option B (evolutive)
Migrer vers build front (React/Vite/etc) pour utiliser:
- `VITE_API_BASE` ou `NEXT_PUBLIC_API_BASE`

---

## 4) Comment generer les secrets proprement

### 4.1 JWT secret
Commande:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copie le resultat dans:
- `JWT_SECRET`

### 4.2 Mots de passe admin
Regles minimales:
- 16+ caracteres
- majuscule + minuscule + chiffre + symbole
- unique (jamais reutilise)

---

## 5) Variables sensibles: regles d'or

- Ne jamais commit `.env` sur GitHub
- Ne jamais afficher les cles API dans le frontend public
- Rotation trimestrielle des cles critiques:
  - OpenAI
  - JWT secret (avec strategie token)
  - CinetPay

---

## 6) Verification rapide apres configuration

Backend:
- `GET /health` -> status OK
- `GET /api/bookmakers` -> JSON bookmakers
- `POST /api/ai/chat` -> reponse IA
- `POST /api/payments/notify` (test webhook) -> traite correctement

Base:
- Connexion Mongo sans erreur
- Creation utilisateur possible
- Script admin OK:
  - `npm run admin:create -- admin@tonsite.com StrongPass123`

---

## 7) Erreurs frequentes (ENV)

1. `MongoServerError authentication failed`
- Mauvais user/password Atlas
- IP non autorisee

2. `CORS blocked`
- `FRONTEND_URL` Render incorrect

3. `OpenAI key invalid`
- cle invalide ou desactivee
- quota facture depasse

4. `Payment notify not called`
- `BACKEND_URL` faux
- notify URL non HTTPS/public

---

## 8) Template `.env.example` recommande

Tu as deja `back/.env.example`.
Tu peux le garder comme source de reference et synchroniser avec ce README.

---

## 9) Mini checklist finale

- [ ] `.env` local rempli
- [ ] Render ENV rempli
- [ ] JWT secret fort
- [ ] API base frontend correcte
- [ ] Health endpoint OK
- [ ] Admin cree
- [ ] Paiement teste
- [ ] IA testee

