const { connectDB } = require('./_db');

const POKEDEX_URL = 'https://pokemon-go-api.github.io/pokemon-go-api/api/pokedex.json';

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
  try {
    const res = await fetch(POKEDEX_URL, {
      headers: { 'User-Agent': 'PoGoIVTracker/1.0' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      throw new Error(`Upstream returned ${res.status} ${res.statusText}`);
    }
    entries = await res.json();
  } catch (err) {
    throw new Error(`Failed to fetch pokedex: ${err.message}`);
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

  return stats;
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
