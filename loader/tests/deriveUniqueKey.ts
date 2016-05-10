namespace tests {

  export var deriveUniqueKey_tests = {
    null_value: () => assertGoodKey(loader.deriveUniqueKey(null)),
    strempty_value: () => assertGoodKey(loader.deriveUniqueKey('')),
    str123456_value: () => assertGoodKey(loader.deriveUniqueKey('123456'))
  };

  function assertGoodKey(key) {
    assert(key.length>5, 'length>5');
    assert(/^[a-zA-Z0-9_]+$/.test(key), 'all chars are alphanumberical');
    for (var i = 3; i < key.length; i++) {
      assert(
        key.charAt(i)!==key.charAt(i-1)
        || key.charAt(i-1)!==key.charAt(i-2)
        || key.charAt(i-2)!==key.charAt(i-3),
        '3 or more duplicate characters at '+(i-3));
    }
  }
}