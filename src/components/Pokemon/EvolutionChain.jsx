import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import TypeBadge from './TypeBadge.jsx';
import { normalizeTypeName } from '../../constants/typeColors.js';

function getSpriteUrl(dexNr) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNr}.png`;
}

function EvolutionNode({ evo, isBase = false }) {
  const [imgError, setImgError] = useState(false);
  const name = evo.names?.English ?? evo.name ?? 'Unknown';

  return (
    <div className={`flex flex-col items-center gap-1 p-2 rounded-lg ${isBase ? 'bg-[#21262D]' : 'bg-[#161B22]'} border border-[#30363D] min-w-[80px]`}>
      {!imgError ? (
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

/**
 * Renders a single linear chain: base → stage1 → stage2 ...
 */
function LinearChain({ nodes }) {
  return (
    <div className="flex items-center flex-wrap gap-1">
      {nodes.map((node, idx) => (
        <div key={idx} className="flex items-center gap-1">
          {idx > 0 && (
            <EvoArrow
              candyCost={node.candyCost}
              label={node.condition}
            />
          )}
          <EvolutionNode evo={node} isBase={idx === 0} />
        </div>
      ))}
    </div>
  );
}

function MegaEvoItem({ mega, pokemon }) {
  const [imgErr, setImgErr] = useState(false);
  const target = mega.pokemon ?? mega;
  const name = target.names?.English ?? target.name ?? `Mega ${pokemon.names?.English}`;

  return (
    <div className="flex items-center gap-1">
      <EvolutionNode evo={pokemon} isBase />
      <EvoArrow label="Mega" candyCost={mega.megaEnergyRequired ?? mega.megaEnergy} />
      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-purple-900/20 border border-purple-700/40 min-w-[80px]">
        {!imgErr ? (
          <img
            src={getSpriteUrl(target.dexNr ?? pokemon.dexNr)}
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
 *
 * @param {Object} pokemon  - Pokedex object with evolutions / megaEvolutions arrays
 */
export default function EvolutionChain({ pokemon }) {
  if (!pokemon) return null;

  const evolutions = pokemon.evolutions ?? [];
  const megaEvolutions = pokemon.megaEvolutions ?? [];

  const hasEvolutions = evolutions.length > 0;
  const hasMegas = megaEvolutions.length > 0;

  if (!hasEvolutions && !hasMegas) {
    return (
      <div className="text-[#8B949E] text-xs text-center py-4 italic">
        No evolutions available.
      </div>
    );
  }

  /**
   * Build a tree from the flat evolutions array.
   * Each evolution entry is expected to have a `pokemon` field (or be the evolved pokemon itself)
   * plus optional `candyCost` and `condition`/`evolutionItemRequirement`.
   */
  const buildChain = (base, evos) => {
    // Group by which stage they evolve from
    // Simple approach: treat all evos as branching from the base
    return evos.map((evo) => {
      const target = evo.pokemon ?? evo; // allow both shapes
      return {
        ...target,
        candyCost: evo.candyCost ?? evo.candy_cost,
        condition: evo.evolutionItemRequirement ?? evo.condition ?? null,
        subEvolutions: target.evolutions ?? [],
      };
    });
  };

  const firstStageEvos = buildChain(pokemon, evolutions);

  // Detect branching: multiple first-stage evolutions = branching chain
  const isBranching = firstStageEvos.length > 1;

  return (
    <div className="space-y-4">
      {/* Normal evolutions */}
      {hasEvolutions && (
        <div>
          <h4 className="text-[#8B949E] text-xs font-semibold uppercase tracking-widest mb-3">
            Evolution Chain
          </h4>

          {isBranching ? (
            // Branching: base → [branch1, branch2, ...]
            <div className="flex flex-col gap-2">
              {firstStageEvos.map((evo, idx) => (
                <div key={idx} className="flex items-center gap-1 flex-wrap">
                  <EvolutionNode evo={pokemon} isBase />
                  <EvoArrow candyCost={evo.candyCost} label={evo.condition} />
                  <EvolutionNode evo={evo} />
                  {/* Sub-evolutions (stage 3) */}
                  {evo.subEvolutions?.map((sub, sIdx) => {
                    const subTarget = sub.pokemon ?? sub;
                    return (
                      <div key={sIdx} className="flex items-center gap-1">
                        <EvoArrow candyCost={sub.candyCost ?? sub.candy_cost} label={sub.condition} />
                        <EvolutionNode evo={subTarget} />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            // Linear chain
            <LinearChain
              nodes={[
                pokemon,
                ...firstStageEvos.map((e) => ({
                  ...e,
                  candyCost: e.candyCost,
                  condition: e.condition,
                })),
                // Stage 3 (if any)
                ...(firstStageEvos[0]?.subEvolutions?.map((sub) => {
                  const t = sub.pokemon ?? sub;
                  return {
                    ...t,
                    candyCost: sub.candyCost ?? sub.candy_cost,
                    condition: sub.condition,
                  };
                }) ?? []),
              ]}
            />
          )}
        </div>
      )}

      {/* Mega Evolutions */}
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
