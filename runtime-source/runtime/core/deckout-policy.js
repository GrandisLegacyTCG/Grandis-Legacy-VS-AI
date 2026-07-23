'use strict';

function isMandatoryDrawPhaseDraw(input) {
  const phase = String(input && input.phase || '').toLowerCase();
  const checkpoint = String(input && input.checkpoint || '').toUpperCase();
  return Boolean(input && input.mandatory) && (phase === 'draw' || phase === 'draw phase') && (!checkpoint || checkpoint === 'DRAW_PHASE_START');
}

function resolveDrawAvailability(input) {
  const requested = Math.max(0, Number(input && input.requested_count || 0));
  const available = Math.max(0, Number(input && input.available_count || 0));
  const drawn = Math.min(requested, available);
  const loses = requested > 0 && available === 0 && isMandatoryDrawPhaseDraw(input);
  return { requested_count: requested, available_count: available, drawn_count: drawn, loses_by_deckout: loses };
}

module.exports = { isMandatoryDrawPhaseDraw, resolveDrawAvailability };
