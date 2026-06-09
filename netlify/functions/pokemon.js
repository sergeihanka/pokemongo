const { connectDB } = require('./_db');

// In-memory cache for proxy actions only
const cache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

// Proxy actions still fetched from pogoapi.net
const PROXY_URLS = {
  stats: 'https://pogoapi.net/api/v1/pokemon_stats.json',
  shiny: 'https://pogoapi.net/api/v1/shiny_pokemon.json',
  types: 'https://pogoapi.net/api/v1/type_effectiveness.json',
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

// Transform a MongoDB pokedex doc into the shape the frontend expects
function toSlimShape(doc) {
  return {
    formId: doc.formId,
    dexNr: doc.dexNr,
    names: { English: doc.namesEnglish },
    stats: {
      attack: doc.statsAttack,
      defense: doc.statsDefense,
      stamina: doc.statsStamina,
    },
    primaryType: { names: { English: doc.primaryType } },
    secondaryType: doc.secondaryType ? { names: { English: doc.secondaryType } } : null,
    hasMegaEvolution: doc.hasMegaEvolution,
    assets: doc.data && doc.data.assets ? doc.data.assets : null,
  };
}

// Slim projection for list/search queries
const SLIM_PROJECTION = {
  formId: 1,
  dexNr: 1,
  namesEnglish: 1,
  primaryType: 1,
  secondaryType: 1,
  statsAttack: 1,
  statsDefense: 1,
  statsStamina: 1,
  hasMegaEvolution: 1,
  'data.assets': 1,
};

async function handleList() {
  const db = await connectDB();
  const collection = db.collection('pokedex');

  const count = await collection.estimatedDocumentCount();
  if (count === 0) {
    return jsonResponse(503, { error: 'Pokedex not seeded', seeded: false });
  }

  const docs = await collection
    .find({}, { projection: SLIM_PROJECTION })
    .sort({ dexNr: 1 })
    .toArray();

  return jsonResponse(200, docs.map(toSlimShape));
}

async function handleDetail(formId) {
  if (!formId) {
    return jsonResponse(400, { error: 'Missing required param: formId' });
  }

  const db = await connectDB();
  const collection = db.collection('pokedex');

  // Case-insensitive lookup by formId first
  let doc = await collection.findOne(
    { formId: { $regex: new RegExp(`^${formId}$`, 'i') } },
    { projection: { data: 1 } }
  );

  // Fall back to namesEnglish search if not found
  if (!doc) {
    doc = await collection.findOne(
      { namesEnglish: { $regex: new RegExp(formId, 'i') } },
      { projection: { data: 1 } }
    );
  }

  if (!doc) {
    return jsonResponse(404, { error: `Pokemon not found: ${formId}` });
  }

  return jsonResponse(200, doc.data);
}

async function handleSearch(q, type) {
  if (!q && !type) {
    return jsonResponse(400, { error: 'Provide at least one of: q, type' });
  }

  const filter = {};
  if (q) {
    filter.namesEnglish = { $regex: new RegExp(q, 'i') };
  }
  if (type) {
    filter.$or = [
      { primaryType: { $regex: new RegExp(`^${type}$`, 'i') } },
      { secondaryType: { $regex: new RegExp(`^${type}$`, 'i') } },
    ];
  }

  const db = await connectDB();
  const collection = db.collection('pokedex');

  const docs = await collection
    .find(filter, { projection: SLIM_PROJECTION })
    .sort({ dexNr: 1 })
    .limit(100)
    .toArray();

  return jsonResponse(200, docs.map(toSlimShape));
}

async function handleProxy(action) {
  const url = PROXY_URLS[action];

  // Check cache
  const cached = cache.get(action);
  if (cached && Date.now() < cached.expiresAt) {
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'X-Cache': 'HIT' },
      body: JSON.stringify(cached.data),
    };
  }

  let upstreamRes;
  try {
    upstreamRes = await fetch(url, {
      headers: { 'User-Agent': 'PoGoIVTracker/1.0' },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    console.error(`Fetch error for proxy action "${action}":`, err);
    return jsonResponse(502, { error: 'Failed to reach upstream API', details: err.message });
  }

  if (!upstreamRes.ok) {
    return jsonResponse(502, {
      error: 'Upstream API returned an error',
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
    });
  }

  let data;
  try {
    data = await upstreamRes.json();
  } catch (err) {
    return jsonResponse(502, { error: 'Failed to parse upstream response as JSON', details: err.message });
  }

  cache.set(action, { data, expiresAt: Date.now() + CACHE_TTL_MS });

  return {
    statusCode: 200,
    headers: { ...CORS_HEADERS, 'X-Cache': 'MISS' },
    body: JSON.stringify(data),
  };
}

exports.handler = async function (event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const params = event.queryStringParameters || {};
  const action = params.action;

  if (!action) {
    return jsonResponse(400, {
      error: 'Missing required query param: action',
      validActions: ['list', 'detail', 'search', 'stats', 'shiny', 'types'],
    });
  }

  try {
    switch (action) {
      case 'list':
        return await handleList();

      case 'detail':
        return await handleDetail(params.formId);

      case 'search':
        return await handleSearch(params.q, params.type);

      case 'stats':
      case 'shiny':
      case 'types':
        return await handleProxy(action);

      default:
        return jsonResponse(400, {
          error: `Unknown action: "${action}"`,
          validActions: ['list', 'detail', 'search', 'stats', 'shiny', 'types'],
        });
    }
  } catch (err) {
    console.error(`pokemon.js handler error (action=${action}):`, err);
    return jsonResponse(500, { error: 'Internal server error', details: err.message });
  }
};
