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

// ---- Rarity derivation (Pokémon GO specific) ---------------------------------

const REGIONAL_DEX = new Set([
  83, 115, 122, 128, 214, 222, 313, 314, 324, 357, 369, 417, 439, 441, 455,
  480, 481, 482,
  511, 512, 513, 514, 515, 516,
  538, 539, 550, 556, 561, 626, 631, 632, 707, 764, 819, 820,
]);

const ULTRA_RARE_DEX = new Set([
  201,
  443, 444, 445,
  610, 611, 612,
  633, 634, 635,
  704, 705, 706,
  782, 783, 784,
  840, 841, 842,
  885, 886, 887,
]);

const RARE_DEX = new Set([
  131, 143,
  147, 148, 149,
  246, 247, 248,
  349, 350, 359,
  371, 372, 373,
  374, 375, 376,
  403, 404, 405,
  447, 448,
  495, 496, 497, 498, 499, 500, 501, 502, 503,
  551, 552, 553, 554, 555,
  607, 608, 609, 621,
  650, 651, 652, 653, 654, 655, 656, 657, 658,
  674, 675, 686, 687, 696, 697, 698, 699, 700,
  722, 723, 724, 725, 726, 727, 728, 729, 730,
  777, 778,
  827, 828, 843, 844, 848, 849,
  855, 856, 857, 858,
  870, 872, 873, 875, 878, 879,
]);

const UNCOMMON_DEX = new Set([
  1, 4, 7, 25, 26, 35, 36, 39, 40,
  54, 55, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68,
  79, 80, 81, 82, 92, 93, 94,
  104, 105, 109, 110, 111, 112, 116, 117, 120, 121,
  129, 130, 133, 134, 135, 136,
  152, 155, 158,
  161, 162, 163, 164, 170, 171, 179, 180, 181,
  183, 184, 187, 188, 189, 190, 191, 192, 193, 194,
  198, 200, 202, 204, 205, 206, 207, 209, 210, 211,
  215, 216, 217, 218, 219, 220, 221, 223, 224,
  226, 227, 228, 229, 231, 232,
  252, 255, 258,
  261, 262, 270, 271, 272, 273, 274, 275,
  276, 277, 278, 279, 280, 281, 282, 283, 284,
  285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295,
  296, 297, 299, 300, 301, 304, 305, 306, 307, 308,
  309, 310, 311, 312, 315, 316, 317, 318, 319, 320, 321,
  322, 323, 325, 326, 327, 328, 329, 330, 331, 332,
  333, 334, 335, 336, 337, 338, 339, 340, 341,
  343, 344, 345, 346, 347, 348, 351, 353, 354, 355, 356, 358,
  361, 362, 363, 364, 365, 366, 367, 368, 370,
  387, 390, 393,
  396, 397, 398, 399, 400, 401, 402, 406, 407,
  408, 409, 410, 411, 412, 415, 416, 418, 419, 420, 421,
  422, 423, 425, 426, 427, 428, 429, 430, 431, 432,
  433, 434, 435, 436, 437, 438, 440, 449, 450,
  451, 452, 453, 454, 456, 457, 459, 460,
  461, 462, 463, 464, 465, 466, 467, 468, 469,
  470, 471, 472, 473, 474, 475, 476, 477, 478,
]);

function deriveRarity(dexNr, rawData) {
  // GameMaster has explicit rarity for Legendary/Mythical
  const gmRarity = rawData?.rarity || rawData?.pokemonClass || '';
  if (gmRarity.includes('MYTHIC')) return 'mythical';
  if (gmRarity.includes('LEGENDARY')) return 'legendary';
  if (REGIONAL_DEX.has(dexNr)) return 'regional';
  if (ULTRA_RARE_DEX.has(dexNr)) return 'ultra_rare';
  if (RARE_DEX.has(dexNr)) return 'rare';
  if (UNCOMMON_DEX.has(dexNr)) return 'uncommon';
  return 'common';
}

function toSlimShape(doc) {
  const rawEvos = doc.data?.evolutions;
  const evosArr = Array.isArray(rawEvos) ? rawEvos
    : (rawEvos && typeof rawEvos === 'object') ? Object.values(rawEvos)
    : [];
  const evolutionLinks = evosArr
    .map(e => ({
      formId: e.formId ?? e.id ?? null,
      candies: e.candies ?? e.candyCost ?? null,
      condition: e.item?.names?.English ?? e.evolutionItemRequirement ?? null,
    }))
    .filter(e => e.formId);

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
    evolutionLinks,
    rarity: deriveRarity(doc.dexNr, doc.data),
  };
}

const SLIM_PROJECTION = {
  formId: 1, dexNr: 1, namesEnglish: 1,
  primaryType: 1, secondaryType: 1,
  statsAttack: 1, statsDefense: 1, statsStamina: 1,
  hasMegaEvolution: 1, 'data.assets': 1, 'data.evolutions': 1,
  'data.rarity': 1, 'data.pokemonClass': 1,
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
