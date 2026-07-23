'use strict';

class LocalAIAdapterContract {
  constructor(runtime) {
    this.runtime = runtime;
  }

  getLegalActions(state, side) {
    return this.runtime.getLegalActions(state, side);
  }

  submitIntent(state, intent) {
    return this.runtime.submitIntent(state, intent);
  }

  chooseAIAction(legalActions) {
    return legalActions && legalActions[0] ? legalActions[0] : null;
  }
}

module.exports = { LocalAIAdapterContract };
