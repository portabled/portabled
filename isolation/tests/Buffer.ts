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
    with_a: function() {
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

}