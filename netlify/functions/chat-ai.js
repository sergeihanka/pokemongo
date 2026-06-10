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

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const { messages = [], collectionContext = '', trainerLevel = 40 } = body;
  if (!messages.length) return json(400, { error: 'No messages provided' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(503, { error: 'ANTHROPIC_API_KEY not configured' });

  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are a Pokémon GO expert assistant for a specific trainer. You have full visibility into their collection. Always answer in the context of Pokémon GO — never ask them to clarify which game they mean.

Be specific and direct. Reference their actual Pokémon by name and stats when giving advice. Use current Pokémon GO meta knowledge for movesets, raid counters, PvP leagues, and gym defense.

${collectionContext}

GAME MECHANICS REMINDERS:
- IVs are 0–15 for Attack, Defense, Stamina. 15/15/15 = 100%. For PvP, low Attack IV is often preferred to stay under CP caps.
- Trainer level ${trainerLevel}: owned Pokémon can be powered up to level ${Math.min(50, (trainerLevel || 40) + 1.5)}.
- Stardust is scarce — only recommend powering up Pokémon worth the investment.
- Shadow Pokémon deal ~20% more damage but take ~20% more damage.
- Lucky Pokémon cost half the stardust to power up.
- Keep answers concise and actionable.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: systemPrompt,
      messages,
    });

    return json(200, {
      role: 'assistant',
      content: response.content[0]?.text ?? '',
    });
  } catch (err) {
    console.error('chat-ai error:', err);
    return json(500, { error: 'AI request failed', details: err.message });
  }
};
