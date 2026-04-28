# README_RUNBOOK.md

Runbook d'exploitation PronosticsPro (mode SaaS pro).

Objectif:
- Savoir quoi verifier chaque jour
- Detecter vite les incidents
- Savoir quoi faire en cas de panne
- Garder la plateforme stable et rentable

---

## 1) Roles et responsabilites

Minimum equipe:
- **Ops/Tech**: surveille API, DB, paiements, cron
- **Produit/Support**: surveille conversion, tickets, remboursements
- **Admin contenu**: surveille qualite pronostics et bookmakers

Si tu es seul:
- fais la routine en 2 blocs/jour (matin + soir)

---

## 2) Routine quotidienne (matin, 15-20 min)

### 2.1 Sante infrastructure

1. Ouvrir:
- Render dashboard (backend)
- Vercel dashboard (frontend)
- MongoDB Atlas metrics

2. Verifier:
- backend up (pas de crash)
- frontend up
- latence API correcte
- erreurs 5xx faibles

3. Test rapide:
- `GET /health`
- `GET /api/matches/today`

### 2.2 Cron matinal (pronostics)

Verifier dans logs backend:
- cron 06:00 execute
- matchs recuperes
- pronostics generes
- aucune erreur API-Sports/OpenAI bloquante

Si echec:
- lancer sync admin manuelle
- ou endpoint admin `/api/admin/sync`

### 2.3 Paiements

Verifier dernieres transactions:
- paiement initie
- webhook recu
- abonnement active

Confirmer qu'il n'y a pas de transactions "pending" anormales.

### 2.4 IA & traduction

Verifier:
- chat IA repond
- traduction full-page fonctionne (changer FR -> EN)

---

## 3) Routine quotidienne (soir, 15-20 min)

### 3.1 Cron resultats 23:30

Verifier:
- execution cron resultats
- mises a jour win/loss/push
- resume Telegram (si active)

### 3.2 KPI business du jour

Suivre au minimum:
- inscriptions nouvelles
- conversions VIP
- revenus du jour
- taux d'echec paiement
- tickets support ouverts

### 3.3 Logs d'erreurs

Verifier logs Render:
- erreurs recurrentes
- erreurs webhook
- erreurs Mongo
- erreurs OpenAI quota

---

## 4) Routine hebdomadaire (1h)

### 4.1 Maintenance technique

- verifier maintenance hebdo cron
- verifier desactivation abonnements expires
- nettoyer donnees obsoletes si besoin
- verifier croissance DB (taille collections)

### 4.2 Securite

- verifier tentatives auth anormales
- verifier endpoints sensibles (`/api/admin`, `/api/payments/notify`)
- verifier CORS et domaines autorises

### 4.3 Produit et monetiation

- analyser plans VIP les plus vendus
- revoir bonus bookmakers (logos/liens/codes)
- ajuster pricing si besoin

---

## 5) Routine mensuelle (2-3h)

- Rotation cles API critiques (si politique interne)
- Revue couts:
  - Render
  - Vercel
  - Atlas
  - OpenAI
  - API-Sports
- Revue performance:
  - temps reponse API
  - taux erreur
  - conversion checkout
- Sauvegarde/export securite business (users/subscriptions)

---

## 6) Incident management (plan simple)

### Niveau P1 (critique)
Exemples:
- site down
- paiements casses
- DB inaccessible

Actions (ordre):
1. Confirmer incident (health + logs)
2. Stopper impact:
   - page maintenance si necessaire
   - suspendre checkout si webhooks casses
3. Corriger
4. Verifier retour a la normale
5. Ecrire post-mortem court

### Niveau P2 (majeur)
Exemples:
- pronostics non mis a jour
- chat IA KO

Actions:
1. Lancer fallback (sync manuelle, fallback heuristique)
2. Corriger cause
3. Monitorer 24h

### Niveau P3 (mineur)
Exemples:
- bug UI localise
- lenteur ponctuelle

Actions:
1. Ticket
2. Correctif prochaine release

---

## 7) Playbooks rapides

### 7.1 "Plus de pronostics du jour"
1. Verifier API-Sports key/quota
2. Verifier cron 06:00 logs
3. Lancer sync manuelle admin
4. Verifier collection `Match` et `Pronostic`

### 7.2 "Paiement effectue mais VIP non active"
1. Verifier webhook `/api/payments/notify` recu
2. Verifier verification `checkPaymentStatus`
3. Verifier `Subscription` (`pending` vs `active`)
4. Corriger user manuellement si necessaire

### 7.3 "Chat IA ne repond plus"
1. Verifier `OPENAI_API_KEY`
2. Verifier quota OpenAI
3. Verifier logs `/api/ai/chat` et `/api/ai/translate`
4. Activer message fallback temporaire

### 7.4 "Frontend ne charge plus les donnees backend"
1. Verifier `CFG.API_BASE` (front)
2. Verifier CORS (`FRONTEND_URL`)
3. Verifier domaine API et SSL

---

## 8) Alertes recommandees

Configurer alertes sur:
- uptime backend/front (1 min)
- taux erreur API > 3%
- latence moyenne > 1.5s
- echecs paiement webhook
- cron non execute

Outils simples:
- UptimeRobot
- BetterStack
- Sentry (erreurs runtime)

---

## 9) SLO / SLA internes (simples)

Exemple de cibles:
- Disponibilite API: 99.5%
- Delai correction P1: < 1h
- Delai correction P2: < 24h
- Taux webhook paiements reussis: > 99%

---

## 10) Release process conseille

1. Dev sur branche
2. Test local:
- auth
- matches/pronostics
- paiement sandbox
- chat/traduction
3. Merge
4. Deploy automatique Render/Vercel
5. Smoke tests prod (5 min)

---

## 11) Tableau journalier (copier-coller)

Tu peux copier ce bloc chaque jour:

```text
Date:
Backend status:
Frontend status:
Mongo status:
Cron 06:00:
Cron 23:30:
AI chat status:
Translate status:
Payments success rate:
New users:
New VIP:
Revenue:
Incidents:
Actions prises:
```

---

## 12) Commandes utiles exploitation

Depuis `DWM/pronos`:
- `npm run dev`
- `npm run start`
- `npm run admin:create -- admin@tonsite.com StrongPass123`

Health:
- `GET /health`

---

## 13) Quand embaucher / deleguer

Si tu atteins:
- trafic eleve
- incidents frequents
- support saturant

Alors deleguer:
- support client
- surveillance infra
- suivi paiements/compta

---

Ce runbook te permet d'exploiter PronosticsPro comme un vrai produit SaaS, avec une routine claire et repetitive.
