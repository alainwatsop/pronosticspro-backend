// routes/bookmakers.js
const express = require('express');
const router = express.Router();

const BOOKMAKERS = [
  { id:1, name:'1xBet', color:'#ff5722', bonus:'200% jusqu\'à 130 000 FCFA', link:'https://1xbet.com/?promo=TAB6677', rating:4.8, promoCode:'TAB6677' },
  { id:2, name:'Melbet', color:'#f44336', bonus:'130% jusqu\'à 65 000 FCFA', link:'https://melbet.com/?promo=TAB6677', rating:4.7, promoCode:'TAB6677' },
  { id:3, name:'BetWinner', color:'#e91e63', bonus:'100% + 30 Free Spins', link:'https://betwinner.com/?promo=TAB6677', rating:4.6, promoCode:'TAB6677' },
  { id:4, name:'22Bet', color:'#3f51b5', bonus:'100% jusqu\'à 52 000 FCFA', link:'https://22bet.com/?promo=TAB6677', rating:4.5, promoCode:'TAB6677' },
  { id:5, name:'Bet365', color:'#4caf50', bonus:'Jusqu\'à 100 000 FCFA', link:'https://bet365.com', rating:4.9, promoCode:'TAB6677' },
  { id:6, name:'Premier Bet', color:'#0047ab', bonus:'100% sur 1er dépôt', link:'https://premierbet.cm', rating:4.3, promoCode:'TAB6677' },
  { id:7, name:'Parimatch', color:'#ff9800', bonus:'50 000 FCFA offerts', link:'https://parimatch.com/?promo=TAB6677', rating:4.4, promoCode:'TAB6677' },
];

router.get('/', (req, res) => res.json(BOOKMAKERS));
router.get('/:id', (req, res) => {
  const bk = BOOKMAKERS.find(b => b.id === parseInt(req.params.id));
  if (!bk) return res.status(404).json({error:'Bookmaker non trouvé'});
  res.json(bk);
});

module.exports = router;
