/* Grandis Legacy PvP authoritative Draw Phase / Quick Reload runtime.
   This module is server-side only. It does not render UI and does not depend on the browser bundle. */

const LANES = ['LEFT', 'CENTER', 'RIGHT'];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function sideHeroes(state, side) { return side === 'AI' ? state.aiHeroes : state.playerHeroes; }
function sideHand(state, side) { return side === 'AI' ? state.aiHand : state.playerHand; }
function sideDeck(state, side) { return side === 'AI' ? state.aiDeck : state.playerDeck; }
function manaKey(side) { return side === 'AI' ? 'aiMana' : 'mana'; }
function regenKey(side) { return side === 'AI' ? 'aiManaRegen' : 'manaRegen'; }
function isLegacyHero(hero) {
  if (!hero) return true;
  const id = String(hero.active_legacy_card_id || hero.card_id || '');
  return Boolean(hero.legacy_mode || hero.legacy || hero.active_legacy_card_id || /^S1-[A-Z]{3}-L\d+/i.test(id));
}
function activeHero(hero) { return Boolean(hero && !isLegacyHero(hero) && Number(hero.hp || 0) > 0); }
function heroHasPendingCasting(state, side, lane, hero) {
  const heroId = hero && hero.card_id;
  return Boolean((state.pendingCastings || []).some((pending) => {
    if (!pending || pending.side !== side) return false;
    if (pending.source_hero_card_id && heroId) return pending.source_hero_card_id === heroId;
    return pending.source_lane === lane;
  }));
}
function runtimeStamp(state, side) { return `${Number(state.round || 1)}|${side}`; }
function log(state, message) {
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.unshift(message);
  if (state.log.length > 20) state.log.length = 20;
}
function cardClass(card, hero) {
  const ident = card && card.identity || {};
  return String(ident.display_class || ident.class || card && (card.display_class || card.class_name || card.class) || hero && (hero.display_class || hero.class_name || hero.class) || '');
}
function drawAbility(card, hero) {
  const cls = cardClass(card, hero);
  if (/Grand Arbalest/i.test(cls)) return { abilityId: 'rapid_chamber', abilityName: 'Rapid Chamber' };
  if (/Arbalest/i.test(cls)) return { abilityId: 'quick_reload', abilityName: 'Quick Reload' };
  return null;
}
function sourceForSide(state, side, cardsById) {
  const heroes = sideHeroes(state, side) || {};
  const stamp = runtimeStamp(state, side);
  for (const lane of LANES) {
    const hero = heroes[lane];
    if (!activeHero(hero)) continue;
    const ability = drawAbility(cardsById[hero.card_id], hero);
    if (!ability) continue;
    if (hero.draw_replacement_used_turn === stamp) continue;
    return { lane, hero, ability };
  }
  return null;
}
function shuffle(list, random = Math.random) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
function updateDrawCounterCastings(state, side, cardsById) {
  if (!Array.isArray(state.pendingCastings)) return;
  for (const pending of state.pendingCastings) {
    if (!pending || pending.side !== side) continue;
    const card = cardsById[pending.card_id] || {};
    const rules = card.rules || {};
    const legality = rules.legality || {};
    const execution = rules.execution || {};
    const lifecycle = execution.lifecycle || {};
    const attachmentPolicy = execution.attachment_policy || lifecycle.attachment_policy || {};
    const staging = legality.staging || lifecycle.staging || {};
    const effects = Array.isArray(execution.effects) ? execution.effects : [];
    const tags = Array.isArray(legality.runtime_tags) ? legality.runtime_tags : String(legality.runtime_tags || '').split(/[;,\s]+/).filter(Boolean);
    const drawCounterEffect = effects.find((effect) => effect && effect.kind === 'pending_casting_draw_counter') || null;
    const isDrawCounter = attachmentPolicy.role === 'draw_counter_casting' || tags.includes('DRAW_COUNTER_CASTING') || Boolean(drawCounterEffect);
    if (!isDrawCounter) continue;
    pending.counters = Number(pending.counters || 0) + 1;
    const required = Number((drawCounterEffect && drawCounterEffect.counters_required) || staging.counters_required || execution.casting_delay && execution.casting_delay.remaining_count_on_entry || attachmentPolicy.remaining_count || 5);
    if (Array.isArray(state.activeAttachments)) {
      for (const attachment of state.activeAttachments) {
        if (attachment && attachment.side === pending.side && attachment.lane === pending.source_lane && Number(attachment.slot) === Number(pending.attachmentSlot) && attachment.card_id === pending.card_id) {
          attachment.remaining = pending.counters;
        }
      }
    }
    log(state, `${card.name || card.card_id} gains counter (${pending.counters}/${required}) from draw.`);
  }
}
function drawOne(state, side, cardsById, { drawPhase = false } = {}) {
  const deck = sideDeck(state, side);
  const hand = sideHand(state, side);
  if (!Array.isArray(deck) || !Array.isArray(hand)) throw new Error(`Missing ${side} deck/hand.`);
  if (!deck.length) {
    if (drawPhase) {
      state.gameOver = true;
      state.winner = side === 'PLAYER' ? 'AI' : 'PLAYER';
      state.gameEndReason = `${side} loses: cannot draw during Draw Phase because their Main Deck is empty.`;
      state.pending = null;
      state.responseWindow = null;
      log(state, `GAME END: ${state.winner} wins. ${state.gameEndReason}`);
    } else {
      log(state, `${side} attempts to draw from an empty Main Deck outside Draw Phase and draws 0.`);
    }
    return null;
  }
  const drawn = deck.shift();
  hand.push(drawn);
  state.cardsDrawnThisTurn = state.cardsDrawnThisTurn || { PLAYER: 0, AI: 0 };
  state.cardsDrawnThisTurn[side] = Number(state.cardsDrawnThisTurn[side] || 0) + 1;
  state.lastDrawnCardBySide = state.lastDrawnCardBySide || {};
  state.lastDrawnCardBySide[side] = drawn;
  updateDrawCounterCastings(state, side, cardsById);
  log(state, `${side} draws 1 card. Draw This Turn: ${state.cardsDrawnThisTurn[side]}.`);
  return { cardId: drawn, handIndex: hand.length - 1 };
}

export function ensureAuthoritativeDrawReview(inputState, side, cardsById, options = {}) {
  const state = options.mutate ? inputState : clone(inputState);
  if (!state || state.gameOver || state.pending) return { state, opened: false };
  if (state.turn !== side) return { state, opened: false };
  if (state.phase !== 'Draw') return { state, opened: false };
  const source = sourceForSide(state, side, cardsById);
  if (!source) return { state, opened: false };
  const drawnCardId = state.lastDrawnCardBySide && state.lastDrawnCardBySide[side];
  const hand = sideHand(state, side) || [];
  const handIndex = hand.lastIndexOf(drawnCardId);
  if (!drawnCardId || handIndex < 0 || Number(state.cardsDrawnThisTurn && state.cardsDrawnThisTurn[side] || 0) < 1) return { state, opened: false };
  state.phase = 'Draw';
  state.pvpTurnReady = false;
  state.pending = {
    type: 'draw_replacement_choice',
    side,
    decision_side: side,
    source_side: side,
    source_lane: source.lane,
    source_hero_card_id: source.hero.card_id,
    abilityId: source.ability.abilityId,
    abilityName: source.ability.abilityName,
    drawn_card_id: drawnCardId,
    hand_index: handIndex,
    authority: 'server_draw_review_runtime_v1'
  };
  log(state, `${source.ability.abilityName} offers draw review for the card just drawn.`);
  return { state, opened: true };
}

export function beginAuthoritativeDrawPhase(inputState, side, cardsById, options = {}) {
  const state = options.mutate ? inputState : clone(inputState);
  if (!state || state.gameOver) return { state, opened: false, drawn: null };
  state.turn = side;
  state.phase = 'Draw';
  state.pending = null;
  state.cardsDrawnThisTurn = state.cardsDrawnThisTurn || { PLAYER: 0, AI: 0 };
  state.cardsDrawnThisTurn[side] = 0;
  const heroes = sideHeroes(state, side) || {};
  for (const lane of LANES) {
    const hero = heroes[lane];
    if (!activeHero(hero)) continue;
    const casting = heroHasPendingCasting(state, side, lane, hero);
    hero.exhausted = casting;
    hero.casting = casting;
    if (casting) hero.exhaust_reason = 'Casting remains Exhausted until the pending effect releases.';
    else { hero.casting_card_id = null; hero.exhaust_reason = null; }
  }
  const drawn = drawOne(state, side, cardsById, { drawPhase: true });
  if (!state.gameOver) {
    const mk = manaKey(side), rk = regenKey(side);
    const regen = Number(state[rk] || 0);
    state[mk] = Math.min(12, Number(state[mk] || 0) + regen);
    log(state, `${side} gains ${regen} Mana from Mana Regen.`);
  }
  const opened = drawn ? ensureAuthoritativeDrawReview(state, side, cardsById, { mutate: true }).opened : false;
  if (!opened && !state.gameOver) state.phase = 'Deploy';
  return { state, opened, drawn };
}

export function resolveAuthoritativeDrawReview(inputState, side, choice, cardsById, options = {}) {
  const state = options.mutate ? inputState : clone(inputState);
  const pending = state && state.pending;
  if (!pending || pending.type !== 'draw_replacement_choice') throw new Error('No authoritative Draw Review is pending.');
  const owner = pending.decision_side || pending.side || pending.source_side;
  if (owner !== side) throw new Error('Only the Draw Review owner may choose.');
  const normalized = String(choice || '').toLowerCase();
  if (!['keep', 'redraw', 'shuffle_redraw', 'shuffle-redraw'].includes(normalized)) throw new Error('Draw Review choice must be keep or redraw.');
  const heroes = sideHeroes(state, side) || {};
  const source = heroes[pending.source_lane];
  if (!activeHero(source)) throw new Error('Quick Reload source Hero is no longer active.');
  source.draw_replacement_used_turn = runtimeStamp(state, side);
  const hand = sideHand(state, side), deck = sideDeck(state, side);
  let idx = Number(pending.hand_index);
  if (!Number.isInteger(idx) || hand[idx] !== pending.drawn_card_id) idx = hand.lastIndexOf(pending.drawn_card_id);
  if (idx < 0) throw new Error('The just-drawn card is no longer in hand.');
  const abilityName = pending.abilityName || 'Draw Review';
  if (normalized === 'keep') {
    log(state, `${abilityName} keeps the card just drawn.`);
    state.pending = null;
    state.pvpTurnReady = false;
    state.phase = 'Deploy';
    return { state, choice: 'keep', returnedCardId: null, replacementCardId: null };
  }
  const returnedCardId = hand.splice(idx, 1)[0];
  deck.push(returnedCardId);
  shuffle(deck, options.random || Math.random);
  state.pending = null;
  state.pvpTurnReady = false;
  const drawn = drawOne(state, side, cardsById, { drawPhase: false });
  log(state, `${abilityName} returns the card just drawn to Main Deck, shuffles, then draws a replacement card.`);
  state.phase = 'Deploy';
  return { state, choice: 'redraw', returnedCardId, replacementCardId: drawn && drawn.cardId };
}
