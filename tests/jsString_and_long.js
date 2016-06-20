define_jsString_and_long_tests(
  typeof tests==='undefined' || !tests ? (tests = {}):tests);

function define_jsString_and_long_tests(tests){

  var jsString_pairs = [
    [null, 'null'],
    ['', '""'],
    ['\'', '"\'"'],
    ['"', '"\\""'],
    ['\\', '"\\\\"'],
    ['abcdef', '"abcdef"'],
    ['\n', '"\\n"'],
    ['abc\ndef', '"abc\\n"+\n  "def"'],
    ['\r\n', '"\\r\\n"'],
    [String.fromCharCode(0), '"\\u0000"'],
    [String.fromCharCode(0x00FD), '"\u00FD"'], // no substitution
    [String.fromCharCode(0xFD00), '"\\ufd00"'],
    [String.fromCharCode(0x60FD), '"\u60FD"'], // no substitution
    [String.fromCharCode(0xFD60), '"\\ufd60"'],
    [String.fromCharCode(0x00FF), '"\u00FF"'], // no substitution
    [String.fromCharCode(0xFF00), '"\\uff00"'],
    [String.fromCharCode(0x60FF), '"\u60FF"'], // no substitution
    [String.fromCharCode(0xFF60), '"\\uff60"'],
    ['a  ', '"a  "'],
    ['  a  ', '"  a  "'],
    ['  a', '"  a"']
  ];

  var jsStringTests = {};
  var jsStringLongTests = {};

  for (var i = 0; i < jsString_pairs.length; i++) {
    var arg = jsString_pairs[i][0];
    var res = jsString_pairs[i][1];
    var longres = jsString_pairs[i][2];
    addTest(arg, res, longres);
  }

  jsStringLongTests['testScriptItself (roundtrip)'] = function() {
    var txt = define_jsString_and_long_tests+'';
    var rdtr = eval(jsStringLong(txt));
    assert.equal(txt, rdtr);
  };

  jsStringLongTests['testScriptItself (compresses)'] = function() {
    var txt = define_jsString_and_long_tests+'';
    var cmpr = jsStringLong(txt);
    assert.equal(
      'compression',
    	cmpr.length<txt.length ? 'compression' : 'was '+txt.length+', become '+cmpr.length);
  };

  tests.jsString = jsStringTests;
  tests.jsStringLong = jsStringLongTests;

  function addTest(arg, res, longres) {
    jsStringTests['arg: '+JSON.stringify(arg)] = function() {
      assert.equal(res, jsString(arg));
    };
    jsStringTests['arg: '+JSON.stringify(arg)+' (roundtrip)'] = function() {
      var rdtr = eval(jsString(arg));
      assert.equal(arg, rdtr);
    };
    jsStringLongTests['arg: '+JSON.stringify(arg)+' (roundtrip)'] = function() {
      var rdtr = eval(jsStringLong(arg));
      assert.equal(arg, rdtr);
    };
  }

}