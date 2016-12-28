namespace tests.buffer {

  export var fromNumber = {
    'with_0': function() {
      var buf=new Buffer(0);
      assert.equal(0, buf.length);
    },
    'with_1': function() {
      var buf=new Buffer(1);
      assert.equal(1, buf.length);
      assert.equal(0, buf[0]);
    },
    'with_2': function() {
      var buf=new Buffer(2);
      assert.equal(2, buf.length);
      assert.equal(0, buf[0]);
      assert.equal(0, buf[1]);
    },
    'with_22': function() {
      var buf=new Buffer(22);
      assert.equal(22, buf.length);
      for (var i = 0; i < 22; i++) {
        assert.equal(0, buf[i], 'buf['+i+']');
      }
    }

  };

	export var fromUtf8 = {
    empty: function() {
      var buf=new Buffer('', 'utf8');
      assert.equal(0, buf.length);
    },
    with_a: function() {
      var buf=new Buffer('a', 'utf8');
      assert.equal(1, buf.length);
      assert.equal(('a').charCodeAt(0), buf[0]);
    },
    with_A: function() {
      var buf=new Buffer('A', 'utf8');
      assert.equal(1, buf.length);
      assert.equal(('A').charCodeAt(0), buf[0]);
    },
    with_cr: function() {
      var buf=new Buffer('\r', 'utf8');
      assert.equal(1, buf.length);
      assert.equal(('\r').charCodeAt(0), buf[0]);
    },
    with_lf: function() {
      var buf=new Buffer('\n', 'utf8');
      assert.equal(1, buf.length);
      assert.equal(('\n').charCodeAt(0), buf[0]);
    },
    with_crlf: function() {
      var buf=new Buffer('\r\n', 'utf8');
      assert.equal(2, buf.length);
      assert.equal(('\r\n').charCodeAt(0), buf[0]);
    },
    with_zero: function() {
      var buf=new Buffer(String.fromCharCode(0), 'utf8');
      assert.equal(1, buf.length);
      assert.equal(0, buf[0]);
    },
    with_MultilineText: function() {
      var multilineText = 'Let us go, you and I,\nWhen the evening is spread out against the sky\nLike a patient etherized upon a table.';
      var buf=new Buffer(multilineText, 'utf8');
      assert.equal(multilineText.length, buf.length);
      for (var i = 0; i < buf.length; i++) {
        assert.equal(multilineText.charCodeAt(i), buf[i], 'buf['+i+']');
      }
    }
  };

	function utf8ToStringRoundtripTest(text) {
    return function() {
      var buf = new Buffer(text, 'utf8');
      assert.equal(text, buf.toString());
    };
  }

  export var toString_roundtrip = {
    with_empty: utf8ToStringRoundtripTest(''),
    with_a: utf8ToStringRoundtripTest('a'),
    with_A: utf8ToStringRoundtripTest('A'),
    with_cr: utf8ToStringRoundtripTest('\r'),
    with_lf: utf8ToStringRoundtripTest('\n'),
    with_crlf: utf8ToStringRoundtripTest('\r\n'),
    with_zero: utf8ToStringRoundtripTest(String.fromCharCode(0)),
    with_MultilineText: utf8ToStringRoundtripTest('Let us go, you and I,\nWhen the evening is spread out against the sky\nLike a patient etherized upon a table.')
  };


  function driveAs(snapshot) {
    if (!snapshot.timestamp) snapshot.timestamp = 1465249756308;
    snapshot.files = function() {
      var result = [];
      for (var k in snapshot) if (k && k.charCodeAt(0)===47) result.push(k);
      return result;
    };
    snapshot.read = function(f) {
      var dt = snapshot[f];
      if (dt || typeof dt==='string') return dt;
      else return null;
    };
    snapshot.write = function(f, txt) {
      if (txt || typeof txt==='string') snapshot[f] = txt;
      else delete snapshot[f];
    };
    return snapshot;
  }

  buffer['hosted'] = createTestsWith_createIsolateHost(isolation.createIsolateHost);

  buffer['hosted_iframe'] = createTestsWith_createIsolateHost(isolation.createIsolateHost.iframe);

  buffer['hosted_worker'] = createTestsWith_createIsolateHost(isolation.createIsolateHost.worker);

  function createTestsWith_createIsolateHost(createIsolateHost: any) {

    function initNoapi(drive, callback: (host, close_clean) => void) {
      isolation.createApiHost(driveAs(drive), {}, host=> {
        callback(host, close_clean);

        function close_clean() {
          try { if (host) host.terminate(); }
          catch (error) { }
        }
      });
    }

    return {

      newBuffer_succeeds: (callback) => {
        initNoapi({}, (host, close_clean) => {
          host.runGlobal('new Buffer(100)', 'script.js', (error, result) => {
            try {
              assert(!error, error);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });
        });
      },

      bufferA: (callback) => {
        initNoapi({}, (host, close_clean) => {
          host.runGlobal(
            `var buf=new Buffer('A', 'utf8');
              if (buf.length!==1) throw new Error('buffer length!=1');
              if (buf[0] !== ('A').charCodeAt(0)) throw new Error('buf[0]!=#A');`,
						'script.js',
            (error, result) => {
            try {
              assert(!error, error);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });
        });
      }
    };
  }

}