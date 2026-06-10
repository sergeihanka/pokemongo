const Anthropic = require('@anthropic-ai/sdk');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function json(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

// Rough dust → level lookup (midpoint of each dust tier)
const DUST_LEVEL = [
  [200, 2], [400, 4], [600, 6], [800, 8],
  [1000, 10], [1300, 14], [1600, 19], [1900, 24],
  [2500, 29], [3500, 34], [4500, 37], [5000, 39],
  [6000, 41], [7000, 43], [8000, 45], [9000, 47], [10000, 50],
];

function dustToLevel(dust) {
  if (!dust) return null;
  const d = Number(dust);
  for (const [threshold, level] of DUST_LEVEL) {
    if (d <= threshold) return level;
  }
  return 50;
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const { image, mediaType = 'image/jpeg' } = body;
  if (!image) return json(400, { error: 'Missing image (base64)' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(503, { error: 'ANTHROPIC_API_KEY not configured' });

  const client = new Anthropic({ apiKey });

  const prompt = `You are analyzing a Pokémon GO in-game screenshot. Extract every visible stat and return ONLY valid JSON with these exact keys (use null for anything not visible):

{
  "pokemonName": string,
  "cp": number,
  "hp": number,
  "dustCost": number,
  "stars": number (0-4, from appraisal — 3 stars means 3-star appraisal, 4 means perfect/hundo),
  "ivAttack": number (0-15, from the three appraisal bars if shown),
  "ivDefense": number (0-15),
  "ivStamina": number (0-15),
  "isShiny": boolean,
  "isShadow": boolean,
  "caughtDate": string (ISO date if visible on screen, else null),
  "notes": string (any extra info like "caught during event", "traded", etc., else "")
}

Rules:
- pokemonName must be the English Pokémon species name only (e.g. "Tepig"), not a nickname.
- For IVs: if the appraisal bars are fully filled the IV for that stat is 15; if 2/3 filled it is ~10; if 1/3 it is ~5; if empty it is 0. Use your best estimate.
- Stars: 0=no stars, 1=one star, 2=two stars, 3=three stars, 4=three stars with sparkle/perfect.
- dustCost is the stardust cost shown on screen to power up.
- Return ONLY the JSON object, no explanation.`;

  let result;
  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const raw = message.content[0]?.text?.trim() ?? '';
    // Strip markdown code fences if present
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    result = JSON.parse(jsonStr);
  } catch (err) {
    console.error('scan-pokemon vision error:', err);
    return json(500, { error: 'Vision parsing failed', details: err.message });
  }

  // Derive level from dust cost if not provided
  if (!result.level && result.dustCost) {
    result.level = dustToLevel(result.dustCost);
  }

  return json(200, result);
};
