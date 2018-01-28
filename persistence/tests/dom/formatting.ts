namespace tests.dom.formatting {

	export function generateTests() {

    var empty = {};
    var tests = {};

    for (var k in _formattedData) if (!empty[k]) {
      createRoundtripTests(_formattedData[k], k);
    }

    return tests;


    function createRoundtripTests(data, name) {

      tests[name] = test_formatFileInner;
      tests[name+'_parse'] = test_parseFileInner;

      function test_formatFileInner() {
        assert.equal(data.formatted, persistence.formatFileInner(data.path, data.text));
      }

      function test_parseFileInner() {
        var fi = persistence.parseFileInner(data.formatted);
        assert.equal(data.path, fi.path);
        assert.equal(data.text, String(fi.read()));
      }
    }

  }

}