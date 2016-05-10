namespace tests {

  export var buildMetadata = {
    'not null': () => assert(isolation.build),
    'timestamp>=1462227529476': () => assert(isolation.build.timestamp >= 1462227529476),
    '60000>taken>10': () => assert(isolation.build.taken > 10 && isolation.build.taken < 60000),
    'platform is string': () => assert.equal('string', typeof isolation.build.platform)
  };

};