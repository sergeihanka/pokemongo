const { ObjectId } = require('mongodb');
const { connectDB } = require('./_db');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

function validatePokemon(data) {
  const errors = [];

  if (data.pokemonId !== undefined && (typeof data.pokemonId !== 'number' || data.pokemonId < 1)) {
    errors.push('pokemonId must be a positive number');
  }
  if (data.cp !== undefined && (typeof data.cp !== 'number' || data.cp < 0)) {
    errors.push('cp must be a non-negative number');
  }

  for (const iv of ['ivAttack', 'ivDefense', 'ivStamina']) {
    if (data[iv] !== undefined) {
      const val = data[iv];
      if (typeof val !== 'number' || val < 0 || val > 15 || !Number.isInteger(val)) {
        errors.push(`${iv} must be an integer between 0 and 15`);
      }
    }
  }

  if (data.level !== undefined && (typeof data.level !== 'number' || data.level < 1 || data.level > 50)) {
    errors.push('level must be a number between 1 and 50');
  }

  return errors;
}

function sanitizePokemon(data) {
  return {
    pokemonId: typeof data.pokemonId === 'number' ? data.pokemonId : undefined,
    pokemonName: typeof data.pokemonName === 'string' ? data.pokemonName.trim() : undefined,
    nickname: typeof data.nickname === 'string' ? data.nickname.trim() : '',
    cp: typeof data.cp === 'number' ? data.cp : undefined,
    ivAttack: typeof data.ivAttack === 'number' ? data.ivAttack : undefined,
    ivDefense: typeof data.ivDefense === 'number' ? data.ivDefense : undefined,
    ivStamina: typeof data.ivStamina === 'number' ? data.ivStamina : undefined,
    level: typeof data.level === 'number' ? data.level : 20,
    isShiny: Boolean(data.isShiny),
    isShadow: Boolean(data.isShadow),
    notes: typeof data.notes === 'string' ? data.notes.trim() : '',
    caughtDate: data.caughtDate || new Date().toISOString(),
  };
}

exports.handler = async function (event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  let db;
  try {
    db = await connectDB();
  } catch (err) {
    console.error('DB connection error:', err);
    return response(503, { error: 'Database connection failed', details: err.message });
  }

  const collection = db.collection('pokemon_collection');
  const method = event.httpMethod;

  // ── GET ──────────────────────────────────────────────────────────────────────
  if (method === 'GET') {
    try {
      const params = event.queryStringParameters || {};
      const filter = {};

      if (params.pokemonId) filter.pokemonId = parseInt(params.pokemonId, 10);
      if (params.isShiny === 'true') filter.isShiny = true;
      if (params.isShadow === 'true') filter.isShadow = true;

      const sort = {};
      if (params.sortBy) {
        sort[params.sortBy] = params.sortDir === 'asc' ? 1 : -1;
      } else {
        sort.caughtDate = -1;
      }

      const limit = Math.min(parseInt(params.limit, 10) || 200, 500);
      const skip = parseInt(params.skip, 10) || 0;

      const [items, total] = await Promise.all([
        collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
        collection.countDocuments(filter),
      ]);

      return response(200, { data: items, total, limit, skip });
    } catch (err) {
      console.error('GET error:', err);
      return response(500, { error: 'Failed to fetch collection', details: err.message });
    }
  }

  // ── POST ─────────────────────────────────────────────────────────────────────
  if (method === 'POST') {
    try {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return response(400, { error: 'Invalid JSON body' });
      }

      const errors = validatePokemon(body);
      if (!body.pokemonId) errors.unshift('pokemonId is required');
      if (!body.pokemonName) errors.unshift('pokemonName is required');
      if (errors.length) return response(400, { error: 'Validation failed', details: errors });

      const doc = {
        ...sanitizePokemon(body),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await collection.insertOne(doc);
      return response(201, { data: { ...doc, _id: result.insertedId } });
    } catch (err) {
      console.error('POST error:', err);
      return response(500, { error: 'Failed to add Pokemon', details: err.message });
    }
  }

  // ── PUT ──────────────────────────────────────────────────────────────────────
  if (method === 'PUT') {
    try {
      const id = (event.queryStringParameters || {}).id;
      if (!id) return response(400, { error: 'Query param `id` is required' });

      let objectId;
      try {
        objectId = new ObjectId(id);
      } catch {
        return response(400, { error: 'Invalid id format' });
      }

      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return response(400, { error: 'Invalid JSON body' });
      }

      const errors = validatePokemon(body);
      if (errors.length) return response(400, { error: 'Validation failed', details: errors });

      // Build a partial update — only include provided fields
      const allowedFields = [
        'pokemonId', 'pokemonName', 'nickname', 'cp',
        'ivAttack', 'ivDefense', 'ivStamina', 'level',
        'isShiny', 'isShadow', 'notes', 'caughtDate',
      ];
      const updateFields = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateFields[field] = sanitizePokemon(body)[field];
        }
      }
      updateFields.updatedAt = new Date().toISOString();

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        { $set: updateFields },
        { returnDocument: 'after' }
      );

      if (!result) return response(404, { error: 'Pokemon not found' });
      return response(200, { data: result });
    } catch (err) {
      console.error('PUT error:', err);
      return response(500, { error: 'Failed to update Pokemon', details: err.message });
    }
  }

  // ── DELETE ───────────────────────────────────────────────────────────────────
  if (method === 'DELETE') {
    const params = event.queryStringParameters || {};

    // DELETE ?all=true — wipe entire collection
    if (params.all === 'true') {
      try {
        const result = await collection.deleteMany({});
        return response(200, { message: 'Collection cleared', deletedCount: result.deletedCount });
      } catch (err) {
        console.error('DELETE all error:', err);
        return response(500, { error: 'Failed to clear collection', details: err.message });
      }
    }

    // DELETE ?id=<id> — delete single entry
    try {
      const id = params.id;
      if (!id) return response(400, { error: 'Query param `id` or `all=true` is required' });

      let objectId;
      try {
        objectId = new ObjectId(id);
      } catch {
        return response(400, { error: 'Invalid id format' });
      }

      const result = await collection.deleteOne({ _id: objectId });
      if (result.deletedCount === 0) return response(404, { error: 'Pokemon not found' });

      return response(200, { message: 'Pokemon deleted successfully', id });
    } catch (err) {
      console.error('DELETE error:', err);
      return response(500, { error: 'Failed to delete Pokemon', details: err.message });
    }
  }

  return response(405, { error: `Method ${method} not allowed` });
};
