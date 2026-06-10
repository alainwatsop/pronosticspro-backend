const express = require('express');

const router = express.Router();

const BOOKMAKERS = [
  { id: 1, name: '1xBet', color: '#ff5722', bonus: "200% jusqu'a 130 000 FCFA", link: 'https://1xbet.com/?promo=20VM', rating: 4.8, promoCode: '20VM', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/1xBet_logo.svg/320px-1xBet_logo.svg.png' },
  { id: 2, name: 'Melbet', color: '#f44336', bonus: "130% jusqu'a 65 000 FCFA", link: 'https://melbet.com/?promo=20VM', rating: 4.7, promoCode: '20VM', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Melbet_logo.svg/320px-Melbet_logo.svg.png' },
  { id: 3, name: 'BetWinner', color: '#e91e63', bonus: '100% + 30 Free Spins', link: 'https://betwinner.com/?promo=20VM', rating: 4.6, promoCode: '20VM', logo: 'https://betwinner.com/design/build/desktop/images/logo.svg' },
  { id: 4, name: '22Bet', color: '#3f51b5', bonus: "100% jusqu'a 52 000 FCFA", link: 'https://22bet.com/?promo=20VM', rating: 4.5, promoCode: '20VM', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/22bet-logo.svg/320px-22bet-logo.svg.png' },
  { id: 5, name: 'Bet365', color: '#4caf50', bonus: "Jusqu'a 100 000 FCFA", link: 'https://bet365.com', rating: 4.9, promoCode: '20VM', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Bet365_logo.svg/320px-Bet365_logo.svg.png' },
  { id: 6, name: 'Premier Bet', color: '#0047ab', bonus: '100% sur 1er depot', link: 'https://premierbet.cm', rating: 4.3, promoCode: '20VM', logo: 'https://premierbet.cm/images/logo.png' },
  { id: 7, name: 'Parimatch', color: '#ff9800', bonus: '50 000 FCFA offerts', link: 'https://parimatch.com/?promo=20VM', rating: 4.4, promoCode: '20VM', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Parimatch_logo.svg/320px-Parimatch_logo.svg.png' },
];

router.get('/', (_req, res) => res.json(BOOKMAKERS));
router.get('/:id', (req, res) => {
  const bk = BOOKMAKERS.find(b => b.id === Number(req.params.id));
  if (!bk) return res.status(404).json({ error: 'Bookmaker non trouve' });
  return res.json(bk);
});

module.exports = router;
