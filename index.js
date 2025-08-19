require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Home page
app.get('/', (req, res) => {
  res.render('home');
});

// yu gi oh search page
app.get('/ygoSearch', async (req, res) => {
  const searchQuery = req.query.name;
  const sortField = req.query.sort || null;
  const sortOrder = req.query.order === 'desc' ? 'desc' : 'asc';
  const page = parseInt(req.query.page) || 1;
  const pageSize = 50;

  if (!searchQuery) {
    return res.render('ygoIndex', {
      cards: null,
      searchQuery: null,
      page,
      sortField: null,
      sortOrder: null,
      hasNext: false
    });
  }
  
  // Fetch cards from Magic API
  try {
    const response = await axios.get(`${process.env.YGO_API}`, {
      
      params: {
        name: searchQuery,
      },
      headers: {
        'X-Api-Key': process.env.YGO_API_KEY
      }
    });
    let cards = response.data.data;  
    // sorting (YUGIOH DOESN'T RETURN )
    if (sortField === 'date') {
      cards[0].sort((a, b) => {
        // only promo cards have a release date so this probably won't work well
        const dateA = new Date(a.startdate || '2100-01-01');
        const dateB = new Date(b.startdate || '2100-01-01');
        console.log(dateA, dateB);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else if (sortField === 'rarity') {
      const rarityRank = {
        'Common': 1,
        'Short Print': 2,
        'Normal Parallel': 2,
        'Rare': 3,
        'Super Rare': 4,
        'Ultra Rare': 5,
        'Gold Rare': 6,
        'Secret Rare': 7,
        'Gold Secret Rare': 8,
        'Prismatic Secret Rare': 9,
        'Platinum Rare': 10,
        'Platinum Secret Rare': 11,
        'Ultimate Rare': 12,
        'Duel Terminal Parallel Rare': 13,
        'Starfoil Rare': 14,
        'Mosaic Rare': 15,
        'Shatterfoil Rare': 16,
        'Ghost Rare': 17,
        'Collectors Rare': 18,
        'Starlight Rare': 19,
        'Quarter Century Secret Rare': 20,
        'Prize / Trophy Rarities': 21
      };
      // Calculate the rank
      const getRank = (card) => {
        const cardRarity = card.rarity ?? '';
        const subtypes = card.subtypes ?? [];
        for (const subtype of subtypes) {
          if (rarityRank[subtype]) return rarityRank[subtype];
        }
        return rarityRank[cardRarity] ?? 999;
      };
      cards.sort((a, b) => {
        const rankA = getRank(a);
        const rankB = getRank(b);
        return sortOrder === 'asc' ? rankA - rankB : rankB - rankA;
      });
    }
    // 250 per page
    // API doesn't support pagination, so we do it manually
    const start = (page - 1) * 250;
    const hasNext = start + 250 < cards.length;
    res.render('ygoIndex', {
      cards,
      searchQuery,
      page,
      sortField,
      sortOrder,
      hasNext
    });
  } catch (err) {
    console.error('Failed to fetch ygo cards:', err.response?.data || err.message);
    res.send('Failed to fetch ygo cards');
  }
});

// Main search page
app.get('/pkmnSearch', async (req, res) => {
  const searchQuery = req.query.name;
  const sortField = req.query.sort || null;
  const sortOrder = req.query.order === 'desc' ? 'desc' : 'asc';
  const page = parseInt(req.query.page) || 1;
  const pageSize = 50;
  // Empty page if nothing searched
  if (!searchQuery) {
    return res.render('pkmnIndex', {
      cards: null,
      searchQuery: null,
      sortField,
      sortOrder,
      page,
      hasNext: false
    });
  }

  try {
    // Get all matching cards
    const response = await axios.get(`${process.env.POKEMON_API}/cards`, {
      params: {
        q: `name:${searchQuery}`,
        pageSize: 250
      },
      headers: {
        'X-Api-Key': process.env.POKEMON_API_KEY
      }
    });

    let cards = response.data.data;

    // Sorting
    if (sortField === 'price') {
      cards.sort((a, b) => {
        const priceA = a.cardmarket?.prices?.averageSellPrice || 0;
        const priceB = b.cardmarket?.prices?.averageSellPrice || 0;
        return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
      });
    } else if (sortField === 'date') {
      cards.sort((a, b) => {
        const dateA = new Date(a.set.releaseDate || '2100-01-01');
        const dateB = new Date(b.set.releaseDate || '2100-01-01');
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else if (sortField === 'rarity') {
      // Rarity levels of cards
      const rarityRank = {
      'Common': 1,
      'Uncommon': 2,
      'Rare': 3,
      'Rare Holo': 4,
      'Holo Rare': 5,
      'GX': 6,
      'EX': 7,
      'V': 8,
      'VSTAR': 9,
      'VMAX': 10,
      'Full Art': 11,
      'Radiant': 12,
      'BREAK': 13,
      'Ultra Rare': 14,
      'Secret Rare': 15,
      'Trainer Gallery': 16,
      'Promo': 17,
      'Special Illustration Rare': 18
    };
      // Calculate the rank
      const getRank = (card) => {
        const cardRarity = card.rarity?.trim() ?? '';
        const subtypes = card.subtypes ?? [];
        for (const subtype of subtypes) {
          if (rarityRank[subtype]) return rarityRank[subtype];
        }
        return rarityRank[cardRarity] ?? 999;
      };

      cards.sort((a, b) => {
        const rankA = getRank(a);
        const rankB = getRank(b);
        return sortOrder === 'asc' ? rankA - rankB : rankB - rankA;
      });
    }

    // Pagination
    const start = (page - 1) * pageSize;
    const paginatedCards = cards.slice(start, start + pageSize);
    const hasNext = start + pageSize < cards.length;

    res.render('pkmnIndex', {
      cards: paginatedCards,
      searchQuery,
      sortField,
      sortOrder,
      page,
      hasNext
    });
  } catch (err) {
    console.error('Failed to fetch cards:', err.response?.data || err.message);
    res.send('Failed to fetch cards');
  }
});

// Sets list page
app.get('/pkmnSets', async (req, res) => {
  try {
    const response = await axios.get(`${process.env.POKEMON_API}/sets`, {
      headers: {
        'X-Api-Key': process.env.POKEMON_API_KEY
      }
    });

    let sets = response.data.data;

    const sortField = req.query.sort || 'date';
    const sortOrder = req.query.order === 'desc' ? 'desc' : 'asc';

    if (sortField === 'alpha') {
      sets.sort((a, b) =>
        sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );
    } else {
      sets.sort((a, b) =>
        sortOrder === 'asc'
          ? new Date(a.releaseDate) - new Date(b.releaseDate)
          : new Date(b.releaseDate) - new Date(a.releaseDate)
      );
    }

    res.render('pkmnSets', { sets, sortField, sortOrder });

  } catch (err) {
    console.error('Failed to load sets:', err.response?.data || err.message);
    res.send('Failed to load sets');
  }
});

// Cards in specific set
app.get('/sets/:id', async (req, res) => {
  const setId = req.params.id;
  const sortField = req.query.sort || null;
  const sortOrder = req.query.order === 'desc' ? 'desc' : 'asc';

  try {
    const response = await axios.get(`${process.env.POKEMON_API}/cards`, {
      params: { q: `set.id:${setId}`, orderBy: 'name', pageSize: 250 },
      headers: {
        'X-Api-Key': process.env.POKEMON_API_KEY
      }
    });

    let cards = response.data.data;

    // Define rarity ranks
    const rarityRank = {
      'Common': 1,
      'Uncommon': 2,
      'Rare': 3,
      'Rare Holo': 4,
      'Holo Rare': 5,
      'EX': 6,
      'GX': 7,
      'V': 8,
      'VSTAR': 9,
      'VMAX': 10,
      'Full Art': 11,
      'Radiant': 12,
      'BREAK': 13,
      'Ultra Rare': 14,
      'Secret Rare': 15,
      'Trainer Gallery': 16,
      'Promo': 17,
      'Special Illustration Rare': 18
    };

    const getRank = (card) => {
    const rarity = card.rarity?.trim() ?? '';
    const subtypes = card.subtypes ?? [];
    const name = card.name?.toLowerCase() ?? '';

    // Subtypes take priority
    for (const subtype of subtypes) {
      if (rarityRank[subtype]) return rarityRank[subtype];
    }

    // Name clues override vague rarities
    if (name.includes('full art')) return rarityRank['Full Art'];
    if (name.includes('ex')) return rarityRank['EX'];
    if (name.includes('gx')) return rarityRank['GX'];
    if (name.includes('vmax')) return rarityRank['VMAX'];
    if (name.includes('vstar')) return rarityRank['VSTAR'];
    if (name.includes('radiant')) return rarityRank['Radiant'];

    // Fallback to rarity
    return rarityRank[rarity] ?? 999;
  };

    // Apply sorting
    if (sortField === 'price') {
      cards.sort((a, b) => {
        const priceA = a.cardmarket?.prices?.averageSellPrice || 0;
        const priceB = b.cardmarket?.prices?.averageSellPrice || 0;
        return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
      });
    } else if (sortField === 'rarity') {
      cards.sort((a, b) => {
        const rankA = getRank(a);
        const rankB = getRank(b);
        return sortOrder === 'asc' ? rankA - rankB : rankB - rankA;
      });
    }

    const set = cards[0]?.set;

    res.render('pkmnSetCards', { cards, setId, set, sortField, sortOrder });
  } catch (err) {
    console.error('Failed to load cards for this set:', err.response?.data || err.message);
    res.send('Failed to load cards for this set');
  }
});

// Pokemon Card Details
app.get('/card/:id', async (req, res) => {
  const cardId = req.params.id;

  try {
    const response = await axios.get(`${process.env.POKEMON_API}/cards/${cardId}`, {
      headers: {
        'X-Api-Key': process.env.POKEMON_API_KEY
      }
    });

    const card = response.data.data;

    res.render('pkmnCardDetails', { card });
  } catch (err) {
    console.error('Failed to fetch card details:', err.response?.data || err.message);
    res.status(500).send('Failed to load card details');
  }
});

//yu gi oh card details
app.get('/ygoCard/:id', async (req, res) => {
  const cardId = req.params.id;

  try {
    const response = await axios.get(`${process.env.YGO_API}`, {
      params: { id: cardId },
      headers: {
        'X-Api-Key': process.env.YGO_API_KEY
      }
    });

    const card = response.data.data[0];
    console.log(card.card_sets);
    
    if (!card) {
      return res.status(404).send('Card not found');
    }

    res.render('ygoCardDetails', { card });
  } catch (err) {
    console.error('Failed to fetch YGO card details:', err.response?.data || err.message);
    res.status(500).send('Failed to load YGO card details');
  }
});

// Help page
app.get('/help', (req, res) => {
  res.render('help');
});

// Debugging
app.get('/debug/:id', async (req, res) => {
  const cardId = req.params.id;

  try {
    const response = await axios.get(`${process.env.POKEMON_API}/cards/${cardId}`, {
      headers: {
        'X-Api-Key': process.env.POKEMON_API_KEY
      }
    });

    res.type('json').send(JSON.stringify(response.data.data, null, 2));
  } catch (err) {
    console.error('Failed to fetch card details:', err.response?.data || err.message);
    res.status(500).send('Failed to fetch card details');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
