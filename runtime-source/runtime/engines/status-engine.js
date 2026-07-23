'use strict';

function applyStatusIfConnected(resolution, statusEffect, target) {
  if (!resolution || !resolution.applySecondEffect) {
    return { applied: false, reason: 'Attack did not connect.' };
  }
  const nextTarget = Object.assign({}, target);
  nextTarget.statuses = Array.isArray(nextTarget.statuses) ? nextTarget.statuses.slice() : [];
  nextTarget.statuses.push(statusEffect);
  return { applied: true, target: nextTarget };
}

module.exports = { applyStatusIfConnected };
