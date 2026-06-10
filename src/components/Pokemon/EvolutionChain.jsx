import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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

function EvolutionNode({ evo, isCurrent = false, onClick }) {
  const [imgError, setImgError] = useState(false);
  const name = evo.names?.English ?? evo.name ?? formatPokemonId(evo.formId ?? evo.id);

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      title={onClick ? `View ${name}` : name}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all min-w-[80px]
        ${isCurrent
          ? 'bg-blue-900/20 border-blue-500/60 ring-1 ring-blue-500/30 cursor-default'
          : onClick
            ? 'bg-[#161B22] border-[#30363D] hover:bg-[#21262D] hover:border-[#58A6FF]/60 cursor-pointer'
            : 'bg-[#161B22] border-[#30363D] cursor-default'
        }`}
    >
      {!imgError && evo.dexNr != null ? (
        <img
          src={getSpriteUrl(evo.dexNr)}
          alt={name}
          className="w-14 h-14 object-contain"
          style={{ imageRendering: 'pixelated' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-[#30363D] flex items-center justify-center text-2xl">?</div>
      )}
      <p className="text-[#C9D1D9] text-xs font-semibold text-center leading-tight">{name}</p>
      {isCurrent && (
        <span className="text-[10px] text-blue-400 font-medium leading-tight">Viewing</span>
      )}
      {evo.primaryType?.names?.English && (
        <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
          <TypeBadge type={normalizeTypeName(evo.primaryType.names.English)} size="sm" />
          {evo.secondaryType?.names?.English && (
            <TypeBadge type={normalizeTypeName(evo.secondaryType.names.English)} size="sm" />
          )}
        </div>
      )}
    </button>
  );
}

function EvoArrow({ candyCost, condition }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-1 flex-shrink-0">
      <ArrowRight className="text-[#8B949E] w-5 h-5" />
      {candyCost != null && (
        <span className="text-[#8B949E] text-[10px] whitespace-nowrap">{candyCost} candy</span>
      )}
      {condition && (
        <span className="text-[#8B949E] text-[10px] whitespace-nowrap text-center max-w-[64px] leading-tight">
          {condition}
        </span>
      )}
    </div>
  );
}

// Recursive chain renderer. Each node = { formId, entry, candyCost, condition, children }.
function ChainNode({ node, currentFormId, onNavigate }) {
  if (!node) return null;

  const isCurrent = node.formId === currentFormId;
  const nodeEl = (
    <EvolutionNode
      evo={node.entry}
      isCurrent={isCurrent}
      onClick={!isCurrent && node.entry.names?.English
        ? () => onNavigate(node.entry.names.English)
        : undefined}
    />
  );

  if (!node.children.length) return nodeEl;

  if (node.children.length === 1) {
    const child = node.children[0];
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {nodeEl}
        <EvoArrow candyCost={child.candyCost} condition={child.condition} />
        <ChainNode node={child} currentFormId={currentFormId} onNavigate={onNavigate} />
      </div>
    );
  }

  // Branching: show node then a column of arrow+child rows
  return (
    <div className="flex items-start gap-2 flex-wrap">
      {nodeEl}
      <div className="flex flex-col gap-2">
        {node.children.map((child, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <EvoArrow candyCost={child.candyCost} condition={child.condition} />
            <ChainNode node={child} currentFormId={currentFormId} onNavigate={onNavigate} />
          </div>
        ))}
      </div>
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
      <EvolutionNode evo={pokemon} isCurrent />
      <EvoArrow condition="Mega" candyCost={energyCost} />
      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-purple-900/20 border border-purple-700/40 min-w-[80px]">
        {!imgErr && imgSrc ? (
          <img
            src={imgSrc}
            alt={name}
            className="w-14 h-14 object-contain"
            style={{ imageRendering: 'pixelated' }}
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
 * EvolutionChain — shows the FULL evolution chain for a Pokemon, including
 * pre-evolutions found by reverse-lookup in the slim pokedex, and up to
 * two stages forward. All nodes are clickable to navigate to their page.
 */
export default function EvolutionChain({ pokemon }) {
  const navigate = useNavigate();
  const { data: pokedex = [], isLoading: pokedexLoading } = usePokedex();

  // Build forward and reverse lookup maps from the slim pokedex
  const { pokedexByFormId, parentByFormId } = useMemo(() => {
    const pokedexByFormId = {};
    const parentByFormId = new Map(); // childFormId → parentFormId
    for (const p of pokedex) {
      if (p.formId) {
        pokedexByFormId[p.formId] = p;
        for (const link of (p.evolutionLinks ?? [])) {
          if (link.formId) parentByFormId.set(link.formId, p.formId);
        }
      }
    }
    return { pokedexByFormId, parentByFormId };
  }, [pokedex]);

  // Build the full chain tree starting from the root ancestor
  const chainTree = useMemo(() => {
    if (!pokemon?.formId) return null;

    // Walk backwards to find the root of the chain
    let rootFormId = pokemon.formId;
    const visitedBack = new Set();
    while (true) {
      const parent = parentByFormId.get(rootFormId);
      if (!parent || visitedBack.has(parent)) break;
      visitedBack.add(rootFormId);
      rootFormId = parent;
    }

    // Recursively build the tree node
    function buildNode(formId, candyCost, condition, depth, visited) {
      if (visited.has(formId) || depth > 6) return null;
      visited.add(formId);

      const isCurrent = formId === pokemon.formId;

      // Get the display entry (merge slim data with full detail for current)
      let entry;
      if (isCurrent) {
        entry = {
          formId: pokemon.formId,
          names: pokemon.names,
          dexNr: pokemon.dexNr,
          primaryType: pokemon.primaryType,
          secondaryType: pokemon.secondaryType,
        };
      } else {
        const slim = pokedexByFormId[formId];
        if (!slim) return null;
        entry = {
          formId: slim.formId,
          names: slim.names,
          dexNr: slim.dexNr,
          primaryType: slim.primaryType,
          secondaryType: slim.secondaryType,
        };
      }

      // Forward evolution links: for the current Pokémon use full detail data (has item/quest info),
      // for others use the slim list's evolutionLinks.
      let evoLinks;
      if (isCurrent) {
        const rawEvos = pokemon.evolutions ?? [];
        const arr = Array.isArray(rawEvos) ? rawEvos : Object.values(rawEvos);
        evoLinks = arr.map(e => ({
          formId: e.formId ?? e.id,
          candies: e.candies ?? e.candyCost ?? null,
          condition: e.item?.names?.English ?? e.evolutionItemRequirement ?? null,
        })).filter(e => e.formId);
      } else {
        evoLinks = pokedexByFormId[formId]?.evolutionLinks ?? [];
      }

      const children = evoLinks
        .map(link => buildNode(link.formId, link.candies, link.condition, depth + 1, new Set(visited)))
        .filter(Boolean);

      return { formId, entry, candyCost, condition, children };
    }

    return buildNode(rootFormId, null, null, 0, new Set());
  }, [pokemon, pokedexByFormId, parentByFormId]);

  if (!pokemon) return null;

  const rawMegas = pokemon.megaEvolutions ?? {};
  const megaEvolutions = Array.isArray(rawMegas) ? rawMegas : Object.values(rawMegas);
  const hasMegas = megaEvolutions.length > 0;

  // Chain has content if there are pre- or post-evolutions (not just a lone node)
  const hasChain = chainTree &&
    (chainTree.formId !== pokemon.formId || chainTree.children.length > 0);

  const handleNavigate = (name) => {
    navigate(`/pokemon/${name.toLowerCase().replace(/\s+/g, '_')}`);
  };

  if (!hasChain && !hasMegas) {
    if (pokedexLoading) {
      return <div className="animate-pulse h-20 bg-[#21262D] rounded-lg" />;
    }
    return (
      <div className="text-[#8B949E] text-xs text-center py-4 italic">
        This Pokémon does not evolve.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasChain && (
        <div className="overflow-x-auto pb-1">
          <ChainNode
            node={chainTree}
            currentFormId={pokemon.formId}
            onNavigate={handleNavigate}
          />
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
