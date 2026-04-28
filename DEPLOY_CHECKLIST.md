## PronosticsPro Production Checklist

- [ ] `npm install` completed without errors
- [ ] `npm run admin:create -- <email> <password>` tested locally
- [ ] MongoDB Atlas URI configured in `MONGODB_URI`
- [ ] OpenAI key configured in `OPENAI_API_KEY`
- [ ] API-Sports key configured in `SPORTS_API_KEY`
- [ ] CinetPay keys configured (`CINETPAY_API_KEY`, `CINETPAY_SITE_ID`)
- [ ] `BACKEND_URL` points to deployed API URL
- [ ] `FRONTEND_URL` points to Vercel domain
- [ ] CORS validated between frontend and backend
- [ ] Webhook endpoint reachable: `/api/payments/notify`
- [ ] Payment flow tested end-to-end with sandbox
- [ ] Cron jobs logs verified (`06:00`, `23:30`, weekly)
- [ ] Telegram bot variables configured (optional)
- [ ] Domain + HTTPS active on frontend/backend
- [ ] Monitoring enabled (uptime + errors)

## Quick Commands

- Start API locally: `npm run dev`
- Create first admin: `npm run admin:create -- admin@example.com StrongPass123`
- Health check: `GET /health`
