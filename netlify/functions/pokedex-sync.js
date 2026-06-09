const { connectDB } = require('./_db');
const axios = require('axios');

// Fastly (GitHub Pages CDN) blocks Lambda IPs at the TLS layer.
// jsDelivr mirrors the same repo content through a different CDN that Lambda can reach.
// raw.githubusercontent.com is the second fallback.
const POKEDEX_URLS = [
  'https://cdn.jsdelivr.net/gh/pokemon-go-api/pokemon-go-api@main/api/pokedex.json',
  'https://raw.githubusercontent.com/pokemon-go-api/pokemon-go-api/main/api/pokedex.json',
  'https://pokemon-go-api.github.io/pokemon-go-api/api/pokedex.json',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

// djb2 hash — no crypto module needed
function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    // Keep it 32-bit unsigned
    hash = hash >>> 0;
  }
  return hash.toString(16);
}

async function ensureIndexes(collection) {
  await collection.createIndex({ formId: 1 }, { unique: true, background: true });
  await collection.createIndex({ dexNr: 1 }, { background: true });
  await collection.createIndex({ namesEnglish: 1 }, { background: true });
}

async function runSync() {
  // Fetch upstream pokedex
  let entries;
  let lastErr;
  for (const url of POKEDEX_URLS) {
    try {
      console.log(`pokedex-sync: trying ${url}`);
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PoGoIVTracker/1.0)',
          'Accept': 'application/json',
        },
        responseType: 'json',
      });
      entries = response.data;
      console.log(`pokedex-sync: fetched ${entries.length} entries from ${url}`);
      break;
    } catch (err) {
      const status = err.response?.status;
      console.warn(`pokedex-sync: ${url} failed${status ? ` (HTTP ${status})` : ''}: ${err.message}`);
      lastErr = err;
    }
  }
  if (!entries) {
    throw new Error(`All pokedex sources failed. Last error: ${lastErr?.message}`);
  }

  if (!Array.isArray(entries)) {
    throw new Error('Pokedex response is not an array');
  }

  const db = await connectDB();
  const collection = db.collection('pokedex');

  await ensureIndexes(collection);

  const stats = { total: entries.length, added: 0, updated: 0, unchanged: 0, errors: 0 };
  const now = new Date();

  for (const entry of entries) {
    try {
      const formId = entry.formId;
      if (!formId) {
        stats.errors++;
        continue;
      }

      const hash = djb2Hash(JSON.stringify(entry));

      const existing = await collection.findOne({ formId }, { projection: { dataHash: 1 } });

      if (existing && existing.dataHash === hash) {
        stats.unchanged++;
        continue;
      }

      const doc = {
        formId,
        dexNr: entry.dexNr,
        namesEnglish: entry.names && entry.names.English ? entry.names.English : formId,
        primaryType: entry.primaryType && entry.primaryType.names
          ? entry.primaryType.names.English
          : null,
        secondaryType: entry.secondaryType && entry.secondaryType.names
          ? entry.secondaryType.names.English
          : null,
        statsAttack: entry.stats ? entry.stats.attack : null,
        statsDefense: entry.stats ? entry.stats.defense : null,
        statsStamina: entry.stats ? entry.stats.stamina : null,
        hasMegaEvolution: entry.hasMegaEvolution === true,
        data: entry,
        dataHash: hash,
        lastSynced: now,
      };

      await collection.updateOne(
        { formId },
        { $set: doc },
        { upsert: true }
      );

      if (existing) {
        stats.updated++;
      } else {
        stats.added++;
      }
    } catch (err) {
      console.error(`Error processing entry ${entry.formId}:`, err.message);
      stats.errors++;
    }
  }

  // Sync auxiliary app data: stats (derived), shiny (fetched), type chart (hardcoded)
  await syncAuxData(db, entries);

  return stats;
}

// Pokemon GO type effectiveness chart (multipliers: 1.6 / 0.625 / 0.390625)
// This is stable and only changes with major PoGo game updates.
const TYPE_CHART = {
  Bug:      { Bug:0.625, Dark:1.6, Dragon:0.625, Fairy:0.625, Fighting:0.625, Fire:0.625, Flying:0.625, Ghost:0.390625, Grass:1.6, Ground:0.625, Ice:0.625, Normal:0.625, Poison:0.625, Psychic:1.6, Rock:0.625, Steel:0.625, Water:0.625, Electric:0.625 },
  Dark:     { Bug:0.625, Dark:0.625, Dragon:1.0, Fairy:0.625, Fighting:0.625, Fire:1.0, Flying:1.0, Ghost:1.6, Grass:1.0, Ground:1.0, Ice:1.0, Normal:1.0, Poison:1.0, Psychic:1.6, Rock:1.0, Steel:0.625, Water:1.0, Electric:1.0 },
  Dragon:   { Bug:1.0, Dark:1.0, Dragon:1.6, Fairy:0.390625, Fighting:1.0, Fire:0.625, Flying:1.0, Ghost:1.0, Grass:0.625, Ground:1.0, Ice:1.0, Normal:1.0, Poison:1.0, Psychic:1.0, Rock:1.0, Steel:0.625, Water:0.625, Electric:0.625 },
  Electric: { Bug:1.0, Dark:1.0, Dragon:0.625, Fairy:1.0, Fighting:1.0, Fire:1.0, Flying:1.6, Ghost:1.0, Grass:0.625, Ground:0.390625, Ice:1.0, Normal:1.0, Poison:1.0, Psychic:1.0, Rock:1.0, Steel:0.625, Water:1.6, Electric:0.625 },
  Fairy:    { Bug:0.625, Dark:1.6, Dragon:1.6, Fairy:1.0, Fighting:1.6, Fire:0.625, Flying:1.0, Ghost:1.0, Grass:1.0, Ground:1.0, Ice:1.0, Normal:1.0, Poison:0.625, Psychic:1.0, Rock:1.0, Steel:0.625, Water:1.0, Electric:1.0 },
  Fighting: { Bug:0.625, Dark:1.6, Dragon:1.0, Fairy:0.625, Fighting:1.0, Fire:1.0, Flying:0.625, Ghost:0.390625, Grass:1.0, Ground:1.0, Ice:1.6, Normal:1.6, Poison:0.625, Psychic:0.625, Rock:1.6, Steel:1.6, Water:1.0, Electric:1.0 },
  Fire:     { Bug:1.6, Dark:1.0, Dragon:0.625, Fairy:1.0, Fighting:1.0, Fire:0.625, Flying:1.0, Ghost:1.0, Grass:1.6, Ground:1.0, Ice:1.6, Normal:1.0, Poison:1.0, Psychic:1.0, Rock:0.625, Steel:1.6, Water:0.625, Electric:1.0 },
  Flying:   { Bug:1.6, Dark:1.0, Dragon:1.0, Fairy:1.0, Fighting:1.6, Fire:1.0, Flying:1.0, Ghost:1.0, Grass:1.6, Ground:1.0, Ice:1.0, Normal:1.0, Poison:1.0, Psychic:1.0, Rock:0.625, Steel:0.625, Water:1.0, Electric:0.625 },
  Ghost:    { Bug:0.625, Dark:0.625, Dragon:1.0, Fairy:1.0, Fighting:1.0, Fire:1.0, Flying:1.0, Ghost:1.6, Grass:1.0, Ground:1.0, Ice:1.0, Normal:0.390625, Poison:0.625, Psychic:1.6, Rock:1.0, Steel:0.625, Water:1.0, Electric:1.0 },
  Grass:    { Bug:0.625, Dark:1.0, Dragon:0.625, Fairy:1.0, Fighting:1.0, Fire:0.625, Flying:0.625, Ghost:1.0, Grass:0.625, Ground:1.6, Ice:1.0, Normal:1.0, Poison:0.625, Psychic:1.0, Rock:1.6, Steel:0.625, Water:1.6, Electric:1.0 },
  Ground:   { Bug:0.625, Dark:1.0, Dragon:1.0, Fairy:1.0, Fighting:1.0, Fire:1.6, Flying:0.390625, Ghost:1.0, Grass:0.625, Ground:1.0, Ice:1.0, Normal:1.0, Poison:1.6, Psychic:1.0, Rock:1.6, Steel:1.6, Water:1.0, Electric:1.6 },
  Ice:      { Bug:1.0, Dark:1.0, Dragon:1.6, Fairy:1.0, Fighting:1.0, Fire:0.625, Flying:1.6, Ghost:1.0, Grass:1.6, Ground:1.6, Ice:0.625, Normal:1.0, Poison:1.0, Psychic:1.0, Rock:1.0, Steel:0.625, Water:0.625, Electric:1.0 },
  Normal:   { Bug:1.0, Dark:1.0, Dragon:1.0, Fairy:1.0, Fighting:1.0, Fire:1.0, Flying:1.0, Ghost:0.390625, Grass:1.0, Ground:1.0, Ice:1.0, Normal:1.0, Poison:1.0, Psychic:1.0, Rock:0.625, Steel:0.625, Water:1.0, Electric:1.0 },
  Poison:   { Bug:1.0, Dark:1.0, Dragon:1.0, Fairy:1.6, Fighting:1.0, Fire:1.0, Flying:1.0, Ghost:0.625, Grass:1.6, Ground:0.625, Ice:1.0, Normal:1.0, Poison:0.625, Psychic:1.0, Rock:0.625, Steel:0.390625, Water:1.0, Electric:1.0 },
  Psychic:  { Bug:1.0, Dark:0.390625, Dragon:1.0, Fairy:1.0, Fighting:1.6, Fire:1.0, Flying:1.0, Ghost:1.0, Grass:1.0, Ground:1.0, Ice:1.0, Normal:1.0, Poison:1.6, Psychic:0.625, Rock:1.0, Steel:0.625, Water:1.0, Electric:1.0 },
  Rock:     { Bug:1.6, Dark:1.0, Dragon:1.0, Fairy:1.0, Fighting:0.625, Fire:1.6, Flying:1.6, Ghost:1.0, Grass:1.0, Ground:0.625, Ice:1.6, Normal:1.0, Poison:1.0, Psychic:1.0, Rock:1.0, Steel:0.625, Water:1.0, Electric:1.0 },
  Steel:    { Bug:1.0, Dark:1.0, Dragon:1.0, Fairy:1.6, Fighting:1.0, Fire:0.625, Flying:1.0, Ghost:1.0, Grass:1.0, Ground:1.0, Ice:1.6, Normal:1.0, Poison:1.0, Psychic:1.0, Rock:1.6, Steel:0.625, Water:0.625, Electric:0.625 },
  Water:    { Bug:1.0, Dark:1.0, Dragon:0.625, Fairy:1.0, Fighting:1.0, Fire:1.6, Flying:1.0, Ghost:1.0, Grass:0.625, Ground:1.6, Ice:1.0, Normal:1.0, Poison:1.0, Psychic:1.0, Rock:1.6, Steel:1.0, Water:0.625, Electric:1.0 },
};

async function syncAuxData(db, entries) {
  const appData = db.collection('appData');

  // Derive stats from the already-fetched pokedex — no external call needed
  const statsData = {};
  for (const entry of entries) {
    if (entry.dexNr && entry.stats) {
      statsData[String(entry.dexNr)] = {
        pokemon_id: entry.dexNr,
        pokemon_name: entry.names && entry.names.English ? entry.names.English : entry.formId,
        base_attack:  entry.stats.attack  || 0,
        base_defense: entry.stats.defense || 0,
        base_stamina: entry.stats.stamina || 0,
      };
    }
  }
  await appData.updateOne(
    { key: 'pokemonStats' },
    { $set: { key: 'pokemonStats', data: statsData, lastSynced: new Date() } },
    { upsert: true }
  );
  console.log(`pokedex-sync: stored stats for ${Object.keys(statsData).length} Pokemon`);

  // Try to fetch shiny list — several CDN fallbacks
  const SHINY_URLS = [
    'https://cdn.jsdelivr.net/gh/pokemon-go-api/pokemon-go-api@main/api/shiny.json',
    'https://raw.githubusercontent.com/pokemon-go-api/pokemon-go-api/main/api/shiny.json',
    'https://pogoapi.net/api/v1/shiny_pokemon.json',
  ];
  let shinyData = null;
  for (const url of SHINY_URLS) {
    try {
      const res = await axios.get(url, { timeout: 15000, responseType: 'json' });
      shinyData = res.data;
      console.log(`pokedex-sync: fetched shiny data from ${url}`);
      break;
    } catch (err) {
      console.warn(`pokedex-sync: shiny source ${url} failed: ${err.message}`);
    }
  }
  if (shinyData) {
    await appData.updateOne(
      { key: 'shinyPokemon' },
      { $set: { key: 'shinyPokemon', data: shinyData, lastSynced: new Date() } },
      { upsert: true }
    );
  } else {
    console.warn('pokedex-sync: all shiny sources failed — keeping existing shiny data');
  }

  // Store hardcoded type chart (only changes with major game updates)
  await appData.updateOne(
    { key: 'typeEffectiveness' },
    { $set: { key: 'typeEffectiveness', data: TYPE_CHART, lastSynced: new Date() } },
    { upsert: true }
  );
  console.log('pokedex-sync: stored type effectiveness chart');
}

// Netlify scheduled function handler
const handler = async function (event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  // Allow manual GET trigger with secret
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const secret = process.env.SYNC_SECRET;

    if (!secret || params.secret !== secret) {
      return jsonResponse(401, { error: 'Unauthorized: valid ?secret= required' });
    }
  }

  // Scheduled invocations arrive as POST with no body validation needed
  console.log('pokedex-sync: starting sync', new Date().toISOString());

  try {
    const stats = await runSync();
    console.log('pokedex-sync: complete', stats);
    return jsonResponse(200, { ok: true, ...stats, syncedAt: new Date().toISOString() });
  } catch (err) {
    console.error('pokedex-sync: fatal error', err.message);
    return jsonResponse(500, { error: err.message });
  }
};

module.exports = { handler };
