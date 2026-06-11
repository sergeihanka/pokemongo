const { connectDB } = require('./_db');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Content-Type': 'application/json',
};

function response(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

const PROFILE_KEY = 'default';

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };

  let db;
  try {
    db = await connectDB();
  } catch (err) {
    return response(503, { error: 'Database connection failed', details: err.message });
  }

  const col = db.collection('profile');

  // ── GET ──────────────────────────────────────────────────────────────────────
  if (event.httpMethod === 'GET') {
    try {
      const doc = await col.findOne({ key: PROFILE_KEY });
      return response(200, {
        trainerLevel: doc?.trainerLevel ?? 40,
      });
    } catch (err) {
      return response(500, { error: 'Failed to fetch profile', details: err.message });
    }
  }

  // ── PUT ──────────────────────────────────────────────────────────────────────
  if (event.httpMethod === 'PUT') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return response(400, { error: 'Invalid JSON body' });
    }

    const trainerLevel = Math.min(50, Math.max(1, parseInt(body.trainerLevel, 10) || 40));

    try {
      await col.updateOne(
        { key: PROFILE_KEY },
        { $set: { trainerLevel, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      return response(200, { trainerLevel });
    } catch (err) {
      return response(500, { error: 'Failed to update profile', details: err.message });
    }
  }

  return response(405, { error: `Method ${event.httpMethod} not allowed` });
};
