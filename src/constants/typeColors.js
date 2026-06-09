export const TYPE_COLORS = {
  Normal:   { bg: 'bg-gray-400',   text: 'text-gray-900',  hex: '#A8A878' },
  Fire:     { bg: 'bg-orange-500', text: 'text-white',     hex: '#F08030' },
  Water:    { bg: 'bg-blue-500',   text: 'text-white',     hex: '#6890F0' },
  Electric: { bg: 'bg-yellow-400', text: 'text-gray-900',  hex: '#F8D030' },
  Grass:    { bg: 'bg-green-500',  text: 'text-white',     hex: '#78C850' },
  Ice:      { bg: 'bg-cyan-400',   text: 'text-gray-900',  hex: '#98D8D8' },
  Fighting: { bg: 'bg-red-700',    text: 'text-white',     hex: '#C03028' },
  Poison:   { bg: 'bg-purple-600', text: 'text-white',     hex: '#A040A0' },
  Ground:   { bg: 'bg-amber-600',  text: 'text-white',     hex: '#E0C068' },
  Flying:   { bg: 'bg-indigo-400', text: 'text-white',     hex: '#A890F0' },
  Psychic:  { bg: 'bg-pink-500',   text: 'text-white',     hex: '#F85888' },
  Bug:      { bg: 'bg-lime-600',   text: 'text-white',     hex: '#A8B820' },
  Rock:     { bg: 'bg-yellow-700', text: 'text-white',     hex: '#B8A038' },
  Ghost:    { bg: 'bg-violet-800', text: 'text-white',     hex: '#705898' },
  Dragon:   { bg: 'bg-blue-800',   text: 'text-white',     hex: '#7038F8' },
  Dark:     { bg: 'bg-gray-700',   text: 'text-white',     hex: '#705848' },
  Steel:    { bg: 'bg-slate-500',  text: 'text-white',     hex: '#B8B8D0' },
  Fairy:    { bg: 'bg-pink-300',   text: 'text-gray-900',  hex: '#EE99AC' },
};

export function getTypeColor(typeName) {
  return TYPE_COLORS[typeName] || { bg: 'bg-gray-500', text: 'text-white', hex: '#888888' };
}

// Normalize type names from the Pokedex API format
export function normalizeTypeName(rawType) {
  if (!rawType) return 'Normal';
  const clean = rawType.replace('POKEMON_TYPE_', '').toLowerCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
