const { connectDB } = require('./_db');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

function jsonResponse(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

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

const SLIM_PROJECTION = {
  formId: 1, dexNr: 1, namesEnglish: 1,
  primaryType: 1, secondaryType: 1,
  statsAttack: 1, statsDefense: 1, statsStamina: 1,
  hasMegaEvolution: 1, 'data.assets': 1,
};

async function handleList() {
  const db = await connectDB();
  const col = db.collection('pokedex');
  const count = await col.estimatedDocumentCount();
  if (count === 0) return jsonResponse(503, { error: 'Pokedex not seeded', seeded: false });
  const docs = await col.find({}, { projection: SLIM_PROJECTION }).sort({ dexNr: 1 }).toArray();
  return jsonResponse(200, docs.map(toSlimShape));
}

async function handleDetail(formId) {
  if (!formId) return jsonResponse(400, { error: 'Missing required param: formId' });
  const db = await connectDB();
  const col = db.collection('pokedex');
  let doc = await col.findOne(
    { formId: { $regex: new RegExp(`^${formId}$`, 'i') } },
    { projection: { data: 1 } }
  );
  if (!doc) {
    doc = await col.findOne(
      { namesEnglish: { $regex: new RegExp(formId, 'i') } },
      { projection: { data: 1 } }
    );
  }
  if (!doc) return jsonResponse(404, { error: `Pokemon not found: ${formId}` });
  return jsonResponse(200, doc.data);
}

async function handleSearch(q, type) {
  if (!q && !type) return jsonResponse(400, { error: 'Provide at least one of: q, type' });
  const filter = {};
  if (q) filter.namesEnglish = { $regex: new RegExp(q, 'i') };
  if (type) filter.$or = [
    { primaryType: { $regex: new RegExp(`^${type}$`, 'i') } },
    { secondaryType: { $regex: new RegExp(`^${type}$`, 'i') } },
  ];
  const db = await connectDB();
  const docs = await db.collection('pokedex')
    .find(filter, { projection: SLIM_PROJECTION })
    .sort({ dexNr: 1 }).limit(100).toArray();
  return jsonResponse(200, docs.map(toSlimShape));
}

// Stats, shiny, types are seeded into MongoDB by pokedex-sync — no external calls at runtime.
async function handleAppData(key) {
  const db = await connectDB();
  const doc = await db.collection('appData').findOne({ key });
  if (!doc) return jsonResponse(503, { error: `${key} not seeded yet. Run /pokedex-sync first.`, seeded: false });
  return jsonResponse(200, doc.data);
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'Method not allowed' });

  const params = event.queryStringParameters || {};
  const action = params.action;

  if (!action) return jsonResponse(400, {
    error: 'Missing required query param: action',
    validActions: ['list', 'detail', 'search', 'stats', 'shiny', 'types'],
  });

  try {
    switch (action) {
      case 'list':   return await handleList();
      case 'detail': return await handleDetail(params.formId);
      case 'search': return await handleSearch(params.q, params.type);
      case 'stats':  return await handleAppData('pokemonStats');
      case 'shiny':  return await handleAppData('shinyPokemon');
      case 'types':  return await handleAppData('typeEffectiveness');
      default:
        return jsonResponse(400, { error: `Unknown action: "${action}"` });
    }
  } catch (err) {
    console.error(`pokemon.js error (action=${action}):`, err);
    return jsonResponse(500, { error: 'Internal server error', details: err.message });
  }
};
