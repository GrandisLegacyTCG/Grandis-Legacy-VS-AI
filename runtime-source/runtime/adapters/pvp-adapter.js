'use strict';

class PvPAdapterContract {
  constructor(runtime) {
    this.runtime = runtime;
  }

  serializeState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  importSnapshot(snapshot) {
    return JSON.parse(JSON.stringify(snapshot));
  }

  submitPlayerIntent(state, intent) {
    return this.runtime.submitIntent(state, intent);
  }
}

module.exports = { PvPAdapterContract };
