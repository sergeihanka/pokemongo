// In-memory cache: action -> { data, expiresAt }
const cache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const ACTION_URLS = {
  stats:   'https://pogoapi.net/api/v1/pokemon_stats.json',
  moves:   'https://pogoapi.net/api/v1/current_pokemon_moves.json',
  shiny:   'https://pogoapi.net/api/v1/shiny_pokemon.json',
  types:   'https://pogoapi.net/api/v1/type_effectiveness.json',
  pokedex: 'https://pokemon-go-api.github.io/pokemon-go-api/api/pokedex.json',
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
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
      validActions: Object.keys(ACTION_URLS),
    });
  }

  const url = ACTION_URLS[action];
  if (!url) {
    return jsonResponse(400, {
      error: `Unknown action: "${action}"`,
      validActions: Object.keys(ACTION_URLS),
    });
  }

  // Check cache
  const cached = cache.get(action);
  if (cached && Date.now() < cached.expiresAt) {
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'X-Cache': 'HIT' },
      body: JSON.stringify(cached.data),
    };
  }

  // Fetch from upstream
  let upstreamRes;
  try {
    upstreamRes = await fetch(url, {
      headers: { 'User-Agent': 'PoGoIVTracker/1.0' },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    console.error(`Fetch error for action "${action}":`, err);
    return jsonResponse(502, {
      error: 'Failed to reach upstream API',
      details: err.message,
    });
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
    return jsonResponse(502, {
      error: 'Failed to parse upstream response as JSON',
      details: err.message,
    });
  }

  // Store in cache
  cache.set(action, { data, expiresAt: Date.now() + CACHE_TTL_MS });

  return {
    statusCode: 200,
    headers: { ...CORS_HEADERS, 'X-Cache': 'MISS' },
    body: JSON.stringify(data),
  };
};
