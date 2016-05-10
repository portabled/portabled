namespace tests {

  export var buildMetadata = {
    'not null': () => assert(persistence.build),
    'timestamp>=1461014284236': () => assert(persistence.build.timestamp >= 1461014284236),
    '60000>taken>10': () => assert(persistence.build.taken > 10 && persistence.build.taken < 60000),
    'platform is string': () => assert.equal('string', typeof persistence.build.platform)
  };

};