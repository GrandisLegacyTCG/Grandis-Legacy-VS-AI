'use strict';

module.exports = {
  core: require('./core'),
  validators: {
    timing: require('./validators/timing-validator'),
    source: require('./validators/source-validator'),
    cost: require('./validators/cost-validator'),
    target: require('./validators/target-validator')
  },
  engines: {
    attack: require('./engines/attack-engine'),
    casting: require('./engines/casting-engine'),
    damage: require('./engines/damage-engine'),
    fixtureRules: require('./engines/fixture-rules-engine'),
    response: require('./engines/response-engine'),
    def: require('./engines/def-engine'),
    attachment: require('./engines/attachment-engine'),
    status: require('./engines/status-engine'),
    legacy: require('./engines/legacy-engine')
  },
  contracts: {
    runtimeApi: require('./contracts/runtime-api-contract'),
    intents: require('./contracts/intent-contract'),
    pending: require('./contracts/pending-contract')
  },
  tools: {
    schemaCheck: require('./tools/basic-schema-check'),
    convertStarter60Decks: require('./tools/convert-starter60-decks')
  },
  effects: require('./effects/effect-registry'),
  oneSource: require('./data/one-source-loader'),
  browserAuthority: { source: 'runtime/browser/runtime-authority.browser.js', version: 'v1.73-browser / one-source-v1.4' }
};
