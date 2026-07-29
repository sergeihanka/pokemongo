// Rarity tiers for Pokémon GO wild spawns + availability
export const RARITY_TIERS = {
  legendary:  { label: 'Legendary',  color: 'text-yellow-400',  bg: 'bg-yellow-400/10 border border-yellow-400/40',  order: 0 },
  mythical:   { label: 'Mythical',   color: 'text-pink-400',    bg: 'bg-pink-400/10 border border-pink-400/40',      order: 1 },
  ultra_rare: { label: 'Ultra Rare', color: 'text-purple-400',  bg: 'bg-purple-400/10 border border-purple-400/40',  order: 2 },
  rare:       { label: 'Rare',       color: 'text-blue-400',    bg: 'bg-blue-400/10 border border-blue-400/40',      order: 3 },
  uncommon:   { label: 'Uncommon',   color: 'text-teal-400',    bg: 'bg-teal-400/10 border border-teal-400/40',      order: 4 },
  common:     { label: 'Common',     color: 'text-[#8B949E]',   bg: 'bg-[#30363D]/60',                              order: 5 },
  regional:   { label: 'Regional',   color: 'text-orange-400',  bg: 'bg-orange-400/10 border border-orange-400/40', order: 6 },
}

// Dex numbers of Region-Exclusive Pokémon (as of 2025)
export const REGIONAL_DEX = new Set([
  83,         // Farfetch'd — Asia
  115,        // Kangaskhan — Australia/NZ
  122,        // Mr. Mime — Europe
  128,        // Tauros — North America
  214,        // Heracross — South/Central America, S. Florida
  222,        // Corsola — Tropical regions
  313,        // Volbeat — Europe/Asia/Oceania
  314,        // Illumise — Americas/Africa
  324,        // Torkoal — South/SE Asia
  357,        // Tropius — Africa, S. Spain
  369,        // Relicanth — New Zealand
  417,        // Pachirisu — Canada/Alaska/Russia
  439,        // Mime Jr. — Europe
  441,        // Chatot — Southern Hemisphere
  455,        // Carnivine — SE USA
  480,        // Uxie — Asia-Pacific
  481,        // Mesprit — Europe/Middle East/Africa
  482,        // Azelf — Americas/Greenland
  511, 512,   // Pansage/Simisage — Asia-Pacific
  513, 514,   // Pansear/Simisear — Europe/Middle East/Africa
  515, 516,   // Panpour/Simipour — Americas
  538,        // Throh — NA/W Europe/Africa/Australia
  539,        // Sawk — Asia/E Europe/Australia
  550,        // Basculin — varies by form
  556,        // Maractus — South Americas
  561,        // Sigilyph — Egypt/Greece
  626,        // Bouffalant — NYC area
  631,        // Heatmor — Western Hemisphere
  632,        // Durant — Eastern Hemisphere
  707,        // Klefki — France
  764,        // Comfey — Hawaii
  813, 814,   // Incineroar line (regional forms)
  819, 820,   // Skwovet/Greedent — North America
])

// Ultra Rare wild spawns — exceptional to encounter
export const ULTRA_RARE_DEX = new Set([
  201,                    // Unown (all forms)
  443, 444, 445,          // Gible / Gabite / Garchomp
  610, 611, 612,          // Axew / Fraxure / Haxorus
  633, 634, 635,          // Deino / Zweilous / Hydreigon
  704, 705, 706,          // Goomy / Sliggoo / Goodra
  782, 783, 784,          // Jangmo-o / Hakamo-o / Kommo-o
  840, 841, 842,          // Applin / Flapple / Appletun
  885, 886, 887,          // Dreepy / Drakloak / Dragapult
])

// Rare wild spawns — uncommon but not ultra rare
export const RARE_DEX = new Set([
  131,                    // Lapras
  143,                    // Snorlax
  147, 148, 149,          // Dratini / Dragonair / Dragonite
  246, 247, 248,          // Larvitar / Pupitar / Tyranitar
  349, 350,               // Feebas / Milotic
  359,                    // Absol
  371, 372, 373,          // Bagon / Shelgon / Salamence
  374, 375, 376,          // Beldum / Metang / Metagross
  403, 404, 405,          // Shinx / Luxio / Luxray
  447, 448,               // Riolu / Lucario
  449, 450,               // Hippopotas / Hippowdon
  495, 496, 497,          // Snivy line
  498, 499, 500,          // Tepig line
  501, 502, 503,          // Oshawott line
  551, 552, 553,          // Sandile line
  554, 555,               // Darumaka / Darmanitan
  574, 575, 576,          // Gothita line
  577, 578, 579,          // Solosis line
  607, 608, 609,          // Litwick / Lampent / Chandelure
  621,                    // Druddigon
  650, 651, 652,          // Chespin line
  653, 654, 655,          // Fennekin line
  656, 657, 658,          // Froakie line
  661, 662, 663,          // Fletchling line
  674, 675,               // Pancham / Pangoro
  686, 687,               // Inkay / Malamar
  696, 697,               // Tyrunt / Tyrantrum
  698, 699,               // Amaura / Aurorus
  700,                    // Sylveon
  722, 723, 724,          // Rowlet line
  725, 726, 727,          // Litten line
  728, 729, 730,          // Popplio line
  771,                    // Pyukumuku
  777, 778,               // Togedemaru / Mimikyu
  827, 828,               // Nickit / Thievul
  843, 844,               // Silicobra / Sandaconda
  848, 849,               // Toxel / Toxtricity
  855, 856, 857, 858,     // Hatenna line
  861,                    // Grimmsnarl line
  869,                    // Alcremie
  870,                    // Falinks
  872, 873,               // Snom / Frosmoth
  875,                    // Eiscue
  876,                    // Indeedee
  878, 879,               // Cufant / Copperajah
])

// Common spawns (most other Pokémon are treated as Common or Uncommon by default)
// Uncommon is the default for starters and Pokémon not in any other list
export const UNCOMMON_DEX = new Set([
  1, 4, 7,                // Starters
  25, 26,                 // Pikachu / Raichu
  35, 36,                 // Clefairy / Clefable
  39, 40,                 // Jigglypuff / Wigglytuff
  54, 55,                 // Psyduck / Golduck
  58, 59,                 // Growlithe / Arcanine
  60, 61, 62,             // Poliwag line
  63, 64, 65,             // Abra line
  66, 67, 68,             // Machop line
  69, 70, 71,             // Bellsprout line
  79, 80,                 // Slowpoke / Slowbro
  81, 82,                 // Magnemite / Magneton
  92, 93, 94,             // Gastly / Haunter / Gengar
  104, 105,               // Cubone / Marowak
  109, 110,               // Koffing / Weezing
  111, 112,               // Rhyhorn / Rhydon
  116, 117, 118,          // Horsea / Seadra / Goldeen
  120, 121,               // Staryu / Starmie
  129, 130,               // Magikarp / Gyarados
  133, 134, 135, 136,     // Eevee / Vaporeon / Jolteon / Flareon
  137, 138, 139, 140, 141,// Porygon / Kabuto / Kabutops / Omanyte / Omastar
  152, 155, 158,          // Gen 2 starters
  161, 162,               // Sentret / Furret
  163, 164,               // Hoothoot / Noctowl
  165, 166,               // Ledyba / Ledian
  167, 168,               // Spinarak / Ariados
  170, 171,               // Chinchou / Lanturn
  179, 180, 181,          // Mareep line
  183, 184,               // Marill / Azumarill
  185,                    // Sudowoodo
  187, 188, 189,          // Hoppip line
  190,                    // Aipom
  191, 192,               // Sunkern / Sunflora
  193, 194,               // Yanma / Wooper
  198,                    // Murkrow
  200,                    // Misdreavus
  202,                    // Wobbuffet
  204, 205,               // Pineco / Forretress
  206,                    // Dunsparce
  207,                    // Gligar
  209, 210,               // Snubbull / Granbull
  211,                    // Qwilfish
  215,                    // Sneasel
  216, 217,               // Teddiursa / Ursaring
  218, 219,               // Slugma / Magcargo
  220, 221,               // Swinub / Piloswine
  223, 224,               // Remoraid / Octillery
  225,                    // Delibird
  226,                    // Mantine
  227,                    // Skarmory
  228, 229,               // Houndour / Houndoom
  231, 232,               // Phanpy / Donphan
  252, 255, 258,          // Gen 3 starters
  261, 262,               // Poochyena / Mightyena
  270, 271, 272,          // Lotad line
  273, 274, 275,          // Seedot line
  276, 277,               // Taillow / Swellow
  278, 279,               // Wingull / Pelipper
  280, 281, 282,          // Ralts line
  283, 284,               // Surskit / Masquerain
  285, 286,               // Shroomish / Breloom
  287, 288, 289,          // Slakoth line
  290, 291, 292,          // Nincada / Ninjask / Shedinja
  293, 294, 295,          // Whismur line
  296, 297,               // Makuhita / Hariyama
  299,                    // Nosepass
  300, 301,               // Skitty / Delcatty
  304, 305, 306,          // Aron line
  307, 308,               // Meditite / Medicham
  309, 310,               // Electrike / Manectric
  311, 312,               // Plusle / Minun
  315,                    // Roselia
  316, 317,               // Gulpin / Swalot
  318, 319,               // Carvanha / Sharpedo
  320, 321,               // Wailmer / Wailord
  322, 323,               // Numel / Camerupt
  325, 326,               // Spoink / Grumpig
  327,                    // Spinda
  328, 329, 330,          // Trapinch line
  331, 332,               // Cacnea / Cacturne
  333, 334,               // Swablu / Altaria
  335, 336,               // Zangoose / Seviper
  337, 338,               // Lunatone / Solrock
  339, 340,               // Barboach / Whiscash
  341,                    // Corphish
  343, 344,               // Baltoy / Claydol
  345, 346,               // Lileep / Cradily
  347, 348,               // Anorith / Armaldo
  351,                    // Castform
  353, 354,               // Shuppet / Banette
  355, 356,               // Duskull / Dusclops
  358,                    // Chimecho
  360,                    // Wynaut
  361, 362,               // Snorunt / Glalie
  363, 364, 365,          // Spheal line
  366, 367, 368,          // Clamperl / Huntail / Gorebyss
  370,                    // Luvdisc
  387, 390, 393,          // Gen 4 starters
  396, 397, 398,          // Starly line
  399, 400,               // Bidoof / Bibarel
  401, 402,               // Kricketot / Kricketune
  406, 407,               // Budew / Roserade
  408, 409,               // Cranidos / Rampardos
  410, 411,               // Shieldon / Bastiodon
  412,                    // Burmy
  415, 416,               // Combee / Vespiquen
  418, 419,               // Buizel / Floatzel
  420, 421,               // Cherubi / Cherrim
  422, 423,               // Shellos / Gastrodon
  425, 426,               // Drifloon / Drifblim
  427, 428,               // Buneary / Lopunny
  429,                    // Mismagius
  430,                    // Honchkrow
  431, 432,               // Glameow / Purugly
  433,                    // Chingling
  434, 435,               // Stunky / Skuntank
  436, 437,               // Bronzor / Bronzong
  438,                    // Bonsly
  440,                    // Happiny
  451, 452,               // Skorupi / Drapion
  453, 454,               // Croagunk / Toxicroak
  456, 457,               // Finneon / Lumineon
  459, 460,               // Snover / Abomasnow
  461,                    // Weavile
  462,                    // Magnezone
  463,                    // Lickilicky
  464,                    // Rhyperior
  465,                    // Tangrowth
  466,                    // Electivire
  467,                    // Magmortar
  468,                    // Togekiss
  469,                    // Yanmega
  470, 471,               // Leafeon / Glaceon
  472,                    // Gliscor
  473,                    // Mamoswine
  474,                    // Porygon-Z
  475,                    // Gallade
  476,                    // Probopass
  477,                    // Dusknoir
  478,                    // Froslass
])
