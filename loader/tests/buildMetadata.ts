namespace tests {

  export var buildMetadata = {
    'not null': () => assert(loader.build),
    'timestamp>=1462227529476': () => assert(loader.build.timestamp >= 1462227529476),
    '60000>taken>10': () => assert(loader.build.taken > 10 && loader.build.taken < 60000),
    'platform is string': () => assert.equal('string', typeof loader.build.platform)
  };

};