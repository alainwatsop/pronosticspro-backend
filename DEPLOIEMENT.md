# 🚀 Guide de Déploiement – PronosticsPro

## Architecture
```
Frontend (HTML)  →  Vercel / Netlify
Backend (Node.js) →  Railway / Render
Database (MongoDB) → MongoDB Atlas (cloud gratuit)
```

---

## ÉTAPE 1 – Base de données (MongoDB Atlas)

1. Créez un compte sur https://cloud.mongodb.com (gratuit)
2. Créez un **Cluster gratuit (M0)**
3. Créez un utilisateur DB avec mot de passe fort
4. Whitelist `0.0.0.0/0` dans Network Access
5. Copiez l'URI de connexion:
   ```
   mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/pronosticspro
   ```

---

## ÉTAPE 2 – APIs externes

### API Sports (gratuit: 100 req/jour)
1. Créez un compte sur https://api-sports.io
2. Copiez votre API Key
3. Sports disponibles: Football, Basketball, Tennis, Hockey

### OpenAI (GPT-4o)
1. Créez un compte sur https://platform.openai.com
2. Générez une clé API
3. Coût approximatif: ~$0.01-0.05 par pronostic

---

## ÉTAPE 3 – Backend sur Railway

1. Créez un compte sur https://railway.app
2. New Project → Deploy from GitHub
3. Connectez votre repo GitHub (uploadez le dossier /backend)
4. Ajoutez les **Variables d'environnement** (Settings → Variables):
   ```
   NODE_ENV=production
   MONGODB_URI=votre_uri_mongodb
   JWT_SECRET=votre_cle_secrete_longue
   SPORTS_API_KEY=votre_cle_api_sports
   OPENAI_API_KEY=sk-votre_cle_openai
   FRONTEND_URL=https://votre-site.vercel.app
   ```
5. Railway démarre automatiquement votre serveur
6. Copiez l'URL générée: `https://votre-api.railway.app`

### Alternative: Render (gratuit)
1. https://render.com → New Web Service
2. Runtime: Node
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Ajoutez les variables d'environnement

---

## ÉTAPE 4 – Frontend sur Vercel

1. Créez un compte sur https://vercel.com
2. Importez votre dossier `/frontend`
3. **Modifiez** dans `index.html`:
   ```javascript
   const API_BASE = 'https://votre-api.railway.app/api';
   ```
4. Déployez (Vercel détecte auto les fichiers HTML)

### Alternative: Netlify
1. https://netlify.com → Drag & drop le dossier `/frontend`
2. Votre site est en ligne instantanément !

---

## ÉTAPE 5 – Vérification

Testez ces URLs:
- `https://votre-api.railway.app/` → `{"status":"PronosticsPro API v1.0"}`
- `https://votre-api.railway.app/health` → `{"status":"OK"}`
- `https://votre-api.railway.app/api/matches/today` → Liste des matchs

---

## ÉTAPE 6 – Premier lancement

### Créer le compte admin
```bash
# Via curl ou Postman
curl -X POST https://votre-api.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pronosticspro.cm","password":"VotreMotDePasse123","firstName":"Admin"}'

# Puis mettre le rôle admin manuellement dans MongoDB:
# db.users.updateOne({email:"admin@pronosticspro.cm"},{$set:{role:"admin"}})
```

### Sur le site: connexion admin
- Email: admin@pronosticspro.cm
- Mot de passe: votre_mot_de_passe
- Cliquez "🛡️ Connexion Administrateur" (entrez le mot de passe admin dans le champ)
  *(Changez "admin2025" dans le code JS par votre vrai mot de passe)*

### Lancer la première synchronisation
- Connectez-vous en admin
- Dashboard → "Actualiser Pronos"
- Ou via API: `POST /api/admin/sync` avec votre token JWT

---

## Personnalisation

### Changer les infos de contact
Dans `index.html`, cherchez et remplacez:
```
+237600000000  → votre numéro WhatsApp
PronosticsPro  → @votre_telegram
contact@pronosticspro.cm → votre email
```

### Changer les liens affiliés
Dans `index.html`, dans le tableau BOOKMAKERS:
```javascript
link: 'https://1xbet.com/?promo=TAB6677'  // Remplacez par vos liens affiliés
```

### Modifier le code promo
```javascript
const PROMO_CODE = 'TAB6677'; // Changez ici
```

---

## Coûts mensuels estimés

| Service | Plan | Coût |
|---------|------|------|
| Railway (backend) | Hobby | ~$5/mois |
| MongoDB Atlas | M0 Free | Gratuit |
| Vercel (frontend) | Free | Gratuit |
| API-Sports | Free | Gratuit (100 req/j) |
| OpenAI GPT-4o | Pay-as-you-go | ~$2-10/mois |
| **TOTAL** | | **~$7-15/mois** |

Pour réduire les coûts: utilisez Render (gratuit) au lieu de Railway.

---

## Support

WhatsApp: +237 600 000 000
Telegram: @PronosticsPro
