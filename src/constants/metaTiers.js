// Meta tier lists for Pokemon GO gym/raid/PVP roles
// S = elite, A = great, B = solid, C = situational, D = below average

export const GYM_ATTACKER_TIERS = {
  // By Pokemon name (lowercase)
  S: [
    'mewtwo', 'shadow_mewtwo', 'mega_mewtwo_x', 'mega_mewtwo_y',
    'rayquaza', 'mega_rayquaza', 'groudon', 'kyogre',
    'garchomp', 'mega_garchomp', 'lucario', 'mega_lucario',
    'machamp', 'shadow_machamp', 'conkeldurr',
    'chandelure', 'shadow_chandelure', 'reshiram',
    'zekrom', 'electivire', 'shadow_electivire',
    'dragonite', 'shadow_dragonite', 'salamence', 'mega_salamence',
    'rampardos', 'shadow_rampardos', 'rhyperior', 'shadow_rhyperior',
    'mamoswine', 'shadow_mamoswine', 'weavile', 'shadow_weavile',
    'tyranitar', 'shadow_tyranitar', 'mega_tyranitar',
    'gengar', 'shadow_gengar', 'mega_gengar',
    'metagross', 'shadow_metagross', 'mega_metagross',
    'roserade', 'shadow_roserade', 'tangrowth', 'shadow_tangrowth',
    'darkrai', 'yveltal', 'shadow_weavile',
    'excadrill', 'shadow_excadrill', 'landorus',
    'togekiss', 'gardevoir', 'mega_gardevoir',
  ],
  A: [
    'alakazam', 'mega_alakazam', 'espeon', 'shadow_espeon',
    'moltres', 'shadow_moltres', 'entei', 'shadow_entei',
    'gyarados', 'shadow_gyarados', 'mega_gyarados',
    'feraligatr', 'shadow_feraligatr', 'swampert', 'mega_swampert',
    'raikou', 'shadow_raikou', 'luxray', 'shadow_luxray',
    'sceptile', 'mega_sceptile', 'shadow_sceptile',
    'glaceon', 'shadow_glaceon', 'jynx', 'shadow_jynx',
    'terrakion', 'keldeo', 'virizion',
    'blaziken', 'mega_blaziken', 'shadow_blaziken',
    'hariyama', 'shadow_hariyama', 'breloom', 'shadow_breloom',
    'pinsir', 'mega_pinsir', 'shadow_pinsir',
    'scizor', 'mega_scizor', 'shadow_scizor',
    'honchkrow', 'shadow_honchkrow', 'houndoom', 'mega_houndoom',
  ],
  B: [
    'vaporeon', 'jolteon', 'flareon', 'umbreon', 'leafeon',
    'golem', 'arcanine', 'ninetales', 'poliwrath',
    'exeggutor', 'hitmonlee', 'hitmonchan', 'hitmonlee',
    'venusaur', 'mega_venusaur', 'blastoise', 'mega_blastoise', 'charizard',
    'mega_charizard_x', 'mega_charizard_y',
    'aerodactyl', 'mega_aerodactyl', 'kabutops', 'omastar',
    'steelix', 'mega_steelix', 'ampharos', 'mega_ampharos',
    'heracross', 'mega_heracross', 'ursaring', 'granbull',
  ],
};

export const GYM_DEFENDER_TIERS = {
  S: [
    'blissey', 'snorlax', 'chansey',
    'togekiss', 'milotic', 'slaking',
    'mewtwo', 'dragonite', 'lapras',
  ],
  A: [
    'gardevoir', 'gyarados', 'rhyperior', 'metagross',
    'tyranitar', 'vaporeon', 'espeon', 'umbreon',
    'machamp', 'slowbro', 'mega_slowbro',
    'alakazam', 'gengar', 'arcanine', 'steelix',
    'salamence', 'garchomp', 'heracross',
  ],
  B: [
    'venusaur', 'blastoise', 'charizard', 'raichu',
    'nidoqueen', 'nidoking', 'clefable', 'wigglytuff',
    'poliwrath', 'victreebel', 'golem', 'hypno',
    'exeggutor', 'weezing', 'mr_mime', 'scyther',
    'electabuzz', 'magmar', 'pinsir', 'tauros',
    'gyarados', 'eevee', 'porygon',
  ],
};

export const PVP_TIERS = {
  great_league: {
    S: [
      'altaria', 'bastiodon', 'galarian_stunfisk', 'medicham',
      'sableye', 'nidoqueen', 'azumarill', 'registeel',
      'walrein', 'swampert', 'trevenant', 'drifblim',
      'shadow_swampert', 'shadow_drifblim',
    ],
    A: [
      'skarmory', 'lanturn', 'umbreon', 'tropius',
      'galvantula', 'dewgong', 'vigoroth', 'scrafty',
      'lickitung', 'hypno', 'whiscash', 'diggersby',
      'obstagoon', 'shadow_obstagoon', 'pelipper',
    ],
  },
  ultra_league: {
    S: [
      'giratina_altered', 'registeel', 'cresselia', 'obstagoon',
      'swampert', 'talonflame', 'galarian_stunfisk',
      'shadow_swampert', 'jellicent', 'walrein',
    ],
    A: [
      'umbreon', 'regirock', 'regice', 'articuno',
      'lapras', 'poliwrath', 'froslass', 'escavalier',
      'lugia', 'shadow_lugia', 'cobalion',
    ],
  },
  master_league: {
    S: [
      'mewtwo', 'shadow_mewtwo', 'dialga', 'kyogre',
      'groudon', 'zacian', 'lugia', 'ho_oh',
      'palkia', 'origin_giratina', 'eternatus',
    ],
    A: [
      'dragonite', 'salamence', 'garchomp', 'togekiss',
      'gyarados', 'metagross', 'shadow_metagross',
      'rayquaza', 'reshiram', 'zekrom',
      'excadrill', 'landorus_therian',
    ],
  },
};

export const LEGENDARY_MYTHICAL = new Set([
  'articuno', 'zapdos', 'moltres', 'mewtwo', 'raikou', 'entei', 'suicune',
  'lugia', 'ho_oh', 'celebi', 'regirock', 'regice', 'registeel', 'latias',
  'latios', 'kyogre', 'groudon', 'rayquaza', 'jirachi', 'deoxys', 'uxie',
  'mesprit', 'azelf', 'dialga', 'palkia', 'heatran', 'regigigas', 'giratina',
  'cresselia', 'phione', 'manaphy', 'darkrai', 'shaymin', 'arceus',
  'victini', 'cobalion', 'terrakion', 'virizion', 'tornadus', 'thundurus',
  'reshiram', 'zekrom', 'landorus', 'kyurem', 'keldeo', 'meloetta',
  'genesect', 'xerneas', 'yveltal', 'zygarde', 'diancie', 'hoopa', 'volcanion',
  'tapu_koko', 'tapu_lele', 'tapu_bulu', 'tapu_fini', 'solgaleo', 'lunala',
  'nihilego', 'buzzwole', 'pheromosa', 'xurkitree', 'celesteela', 'kartana',
  'guzzlord', 'necrozma', 'magearna', 'marshadow', 'poipole', 'naganadel',
  'stakataka', 'blacephalon', 'zeraora', 'zacian', 'zamazenta', 'eternatus',
  'kubfu', 'urshifu', 'zarude', 'regieleki', 'regidrago', 'glastrier',
  'spectrier', 'calyrex', 'enamorus',
]);

export function getTierForRole(name, role) {
  if (!name) return 'C';
  const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const tiers = role === 'attacker' ? GYM_ATTACKER_TIERS :
                role === 'defender' ? GYM_DEFENDER_TIERS : null;
  if (!tiers) return 'C';
  for (const [tier, list] of Object.entries(tiers)) {
    if (list.includes(cleanName)) return tier;
  }
  return 'C';
}

export function getPVPTierForLeague(name, league) {
  if (!name) return null;
  const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const leagueData = PVP_TIERS[league];
  if (!leagueData) return null;
  for (const [tier, list] of Object.entries(leagueData)) {
    if (list.includes(cleanName)) return tier;
  }
  return null;
}

export function isLegendaryOrMythical(name) {
  if (!name) return false;
  const clean = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return LEGENDARY_MYTHICAL.has(clean);
}
