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

// Full Pokémon GO stardust cost → median level lookup
// Each tier covers multiple half-levels; median gives best single estimate
const DUST_TO_LEVEL = [
  [200,  2],
  [400,  4],
  [600,  6],
  [800,  8],
  [1000, 10],
  [1300, 13],
  [1900, 17],
  [2500, 21],
  [3000, 25],
  [3500, 29],
  [4000, 32],
  [4500, 34],
  [5000, 36],
  [6000, 38],
  [7000, 40],
];

function dustToLevel(dust) {
  if (!dust || dust <= 0) return null;
  const d = Number(dust);
  for (const [cost, level] of DUST_TO_LEVEL) {
    if (d <= cost) return level;
  }
  return 40;
}

function buildPrompt(trainerLevel) {
  const maxLevel = Math.min(50, (trainerLevel || 40) + 1.5);
  return `You are analyzing a Pokémon GO screenshot. Read every number precisely. Return ONLY a valid JSON object — no markdown, no explanation.

━━━ LEVEL DETECTION ━━━
Look for the "Power Up" stardust cost (the number next to the stardust icon at the bottom of the screen).
Use this exact table to determine level (pick the median of the range):
  200 stardust  → levels 1–2.5   → use level 2
  400 stardust  → levels 3–4.5   → use level 4
  600 stardust  → levels 5–6.5   → use level 6
  800 stardust  → levels 7–8.5   → use level 8
  1000 stardust → levels 9–10.5  → use level 10
  1300 stardust → levels 11–14.5 → use level 13
  1900 stardust → levels 15–18.5 → use level 17
  2500 stardust → levels 19–22.5 → use level 21
  3000 stardust → levels 23–26.5 → use level 25
  3500 stardust → levels 27–30.5 → use level 29
  4000 stardust → levels 31–32.5 → use level 32
  4500 stardust → levels 33–34.5 → use level 34
  5000 stardust → levels 35–36.5 → use level 36
  6000 stardust → levels 37–38.5 → use level 38
  7000 stardust → levels 39–40   → use level 40

Also check the CP arc (white semicircle at top of screen):
  Arc marker near far left → level ~3
  Arc at ¼ position → level ~15
  Arc at ½ position → level ~25
  Arc at ¾ position → level ~35
  Arc near far right → level ~40

Hard cap: this trainer is level ${trainerLevel}, so the Pokémon cannot exceed level ${maxLevel}.
If dust cost and arc disagree, prefer the dust cost but cap at ${maxLevel}.

━━━ IV DETECTION ━━━
Priority 1 — If you see exact IV numbers (e.g. "Attack 14/15", "Defense 13/15", "HP 15/15" OR three numbers like "14 / 13 / 15"):
  Read them directly as ivAttack, ivDefense, ivStamina.

Priority 2 — If you see three horizontal colored bars (appraisal screen):
  Each bar ranges 0–15. Estimate by how full each bar is:
  • Full bar + star/sparkle at tip = 15
  • Full bar, no sparkle = 13 or 14 (use 14)
  • About ⅔ full = 10
  • About ½ full = 7 or 8 (use 8)
  • About ⅓ full = 4 or 5 (use 5)
  • Nearly empty = 1 or 2 (use 1)
  • Completely empty = 0
  Bar order (left to right or top to bottom): Attack, Defense, HP.

If no appraisal is visible, set all IV fields to null.

━━━ OTHER FIELDS ━━━
- pokemonName: English species name only (never a nickname — the nickname appears in larger text at top; species is smaller gray text or at top if no nickname)
- isShiny: true if there is a sparkle/glitter effect or shiny icon
- isShadow: true if there is a dark/purple aura or "Shadow" label
- caughtDate: read from "Caught" date if visible, else null

Return ONLY this JSON:
{
  "pokemonName": string,
  "cp": number,
  "hp": number,
  "dustCost": number,
  "level": number,
  "ivAttack": number or null,
  "ivDefense": number or null,
  "ivStamina": number or null,
  "isShiny": boolean,
  "isShadow": boolean,
  "caughtDate": string or null,
  "notes": string
}`;
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

  const { image, mediaType = 'image/jpeg', trainerLevel = 40 } = body;
  if (!image) return json(400, { error: 'Missing image (base64)' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(503, { error: 'ANTHROPIC_API_KEY not configured' });

  const client = new Anthropic({ apiKey });

  let result;
  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: buildPrompt(trainerLevel) },
        ],
      }],
    });

    const raw = message.content[0]?.text?.trim() ?? '';
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    result = JSON.parse(jsonStr);
  } catch (err) {
    console.error('scan-pokemon error:', err);
    return json(500, { error: 'Vision parsing failed', details: err.message });
  }

  // Fallback: derive level from dust cost if Claude didn't set it
  if (!result.level && result.dustCost) {
    result.level = dustToLevel(result.dustCost);
  }

  // Enforce trainer level cap
  const maxLevel = Math.min(50, (trainerLevel || 40) + 1.5);
  if (result.level && result.level > maxLevel) {
    result.level = maxLevel;
  }

  // Clamp IVs to 0-15
  for (const key of ['ivAttack', 'ivDefense', 'ivStamina']) {
    if (result[key] != null) {
      result[key] = Math.max(0, Math.min(15, Math.round(Number(result[key]))));
    }
  }

  return json(200, result);
};
