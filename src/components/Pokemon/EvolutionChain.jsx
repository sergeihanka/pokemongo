import { useState, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import TypeBadge from './TypeBadge.jsx';
import { normalizeTypeName } from '../../constants/typeColors.js';
import { usePokedex } from '../../hooks/usePokemon.js';

function getSpriteUrl(dexNr) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNr}.png`;
}

function formatPokemonId(id) {
  if (!id) return 'Unknown';
  return id.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function EvolutionNode({ evo, isBase = false }) {
  const [imgError, setImgError] = useState(false);
  const name = evo.names?.English ?? evo.name ?? formatPokemonId(evo.formId ?? evo.id);

  return (
    <div className={`flex flex-col items-center gap-1 p-2 rounded-lg ${isBase ? 'bg-[#21262D]' : 'bg-[#161B22]'} border border-[#30363D] min-w-[80px]`}>
      {!imgError && evo.dexNr != null ? (
        <img
          src={getSpriteUrl(evo.dexNr)}
          alt={name}
          className="w-14 h-14 object-contain pixelated"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-[#30363D] flex items-center justify-center text-2xl">
          ?
        </div>
      )}
      <p className="text-[#C9D1D9] text-xs font-semibold text-center leading-tight">{name}</p>
      {evo.primaryType?.names?.English && (
        <div className="flex flex-wrap gap-0.5 justify-center">
          <TypeBadge type={normalizeTypeName(evo.primaryType.names.English)} size="sm" />
          {evo.secondaryType?.names?.English && (
            <TypeBadge type={normalizeTypeName(evo.secondaryType.names.English)} size="sm" />
          )}
        </div>
      )}
    </div>
  );
}

function EvoArrow({ candyCost, label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-1">
      <ArrowRight className="text-[#8B949E] w-5 h-5" />
      {candyCost != null && (
        <span className="text-[#8B949E] text-[10px] whitespace-nowrap">{candyCost} candy</span>
      )}
      {label && (
        <span className="text-[#8B949E] text-[10px] whitespace-nowrap text-center max-w-[64px] leading-tight">
          {label}
        </span>
      )}
    </div>
  );
}

function LinearChain({ nodes }) {
  return (
    <div className="flex items-center flex-wrap gap-1">
      {nodes.map((node, idx) => (
        <div key={idx} className="flex items-center gap-1">
          {idx > 0 && (
            <EvoArrow candyCost={node.candyCost} label={node.condition} />
          )}
          <EvolutionNode evo={node} isBase={idx === 0} />
        </div>
      ))}
    </div>
  );
}

function MegaEvoItem({ mega, pokemon }) {
  const [imgErr, setImgErr] = useState(false);
  const name = mega.names?.English ?? `Mega ${pokemon.names?.English ?? ''}`;
  const energyCost = mega.energyCost ?? mega.megaEnergyRequired ?? mega.megaEnergy;
  const imgSrc = mega.assets?.image ?? (pokemon.dexNr != null ? getSpriteUrl(pokemon.dexNr) : null);

  return (
    <div className="flex items-center gap-1">
      <EvolutionNode evo={pokemon} isBase />
      <EvoArrow label="Mega" candyCost={energyCost} />
      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-purple-900/20 border border-purple-700/40 min-w-[80px]">
        {!imgErr && imgSrc ? (
          <img
            src={imgSrc}
            alt={name}
            className="w-14 h-14 object-contain pixelated"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-purple-900/40 flex items-center justify-center text-2xl">M</div>
        )}
        <p className="text-purple-300 text-xs font-semibold text-center leading-tight">{name}</p>
        <span className="text-purple-400 text-[10px]">MEGA</span>
      </div>
    </div>
  );
}

/**
 * EvolutionChain — shows evolution stages for a Pokemon.
 * Evolution entries from the API only carry { id, formId, candies, item, quests }.
 * Names and dexNr are resolved via the cached slim pokedex list.
 */
export default function EvolutionChain({ pokemon }) {
  const { data: pokedex = [] } = usePokedex();

  const pokedexByFormId = useMemo(() => {
    const map = {};
    for (const p of pokedex) {
      if (p.formId) map[p.formId] = p;
    }
    return map;
  }, [pokedex]);

  if (!pokemon) return null;

  const evolutions = pokemon.evolutions ?? [];
  // megaEvolutions comes back as an object keyed by id — normalise to array
  const rawMegas = pokemon.megaEvolutions ?? {};
  const megaEvolutions = Array.isArray(rawMegas) ? rawMegas : Object.values(rawMegas);

  const hasEvolutions = evolutions.length > 0;
  const hasMegas = megaEvolutions.length > 0;

  if (!hasEvolutions && !hasMegas) {
    return (
      <div className="text-[#8B949E] text-xs text-center py-4 italic">
        No evolutions available.
      </div>
    );
  }

  // Enrich a bare evolution entry { id, formId, candies, item } with
  // names, dexNr, and type from the slim pokedex lookup.
  const enrichEvo = (evo) => {
    const key = evo.formId ?? evo.id;
    const lookup = key ? (pokedexByFormId[key] ?? null) : null;
    return {
      ...evo,
      names: lookup?.names ?? evo.names,
      dexNr: lookup?.dexNr ?? evo.dexNr,
      primaryType: lookup?.primaryType ?? evo.primaryType,
      secondaryType: lookup?.secondaryType ?? evo.secondaryType,
      // Normalise cost/condition field names (API uses 'candies', not 'candyCost')
      candyCost: evo.candies ?? evo.candyCost ?? evo.candy_cost,
      condition: evo.item?.names?.English ?? evo.evolutionItemRequirement ?? evo.condition ?? null,
    };
  };

  const firstStageEvos = evolutions.map(enrichEvo);
  const isBranching = firstStageEvos.length > 1;

  return (
    <div className="space-y-4">
      {hasEvolutions && (
        <div>
          <h4 className="text-[#8B949E] text-xs font-semibold uppercase tracking-widest mb-3">
            Evolution Chain
          </h4>

          {isBranching ? (
            <div className="flex flex-col gap-2">
              {firstStageEvos.map((evo, idx) => (
                <div key={idx} className="flex items-center gap-1 flex-wrap">
                  <EvolutionNode evo={pokemon} isBase />
                  <EvoArrow candyCost={evo.candyCost} label={evo.condition} />
                  <EvolutionNode evo={evo} />
                </div>
              ))}
            </div>
          ) : (
            <LinearChain nodes={[pokemon, ...firstStageEvos]} />
          )}
        </div>
      )}

      {hasMegas && (
        <div>
          <h4 className="text-[#8B949E] text-xs font-semibold uppercase tracking-widest mb-3">
            Mega Evolutions
          </h4>
          <div className="flex flex-wrap gap-2">
            {megaEvolutions.map((mega, idx) => (
              <MegaEvoItem key={idx} mega={mega} pokemon={pokemon} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
