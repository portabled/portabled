namespace tests.dom.parsing {

	export function generateTests() {

    var tests = {
      parseHTML_timestamp_simpleDate: function() {
        var dt = persistence.parseHTML(
          '<!doctype html>'+
          '<html><head><title>Dummy page</title></head>'+
          '<body>'+
          '<!-- total 12Mb, saved 4 Apr 2016 -->'+
          '<!-- /myfile\n'+
          'Abc-->'+
          '</body>'+
          '</html>');
        assert.equal(1024*1024*12, dt.totalSize);
        assert.equal(1459724400000, dt.timestamp);
        assert.equal(1, dt.files.length);
        assert.equal('/myfile', dt.files[0].path);
        assert.equal('Abc', dt.files[0].content);
      },
      parseHTML_timestamp_Date_with_time: function() {
        var dt = persistence.parseHTML(
          '<!doctype html>'+
          '<html><head><title>Dummy page</title></head>'+
          '<body>'+
          '<!-- total 12Mb, saved 4 Apr 2016 22:26:01 -->'+
          '<!-- /myfile\n'+
          'Abc-->'+
          '</body>'+
          '</html>');
        assert.equal(1024*1024*12, dt.totalSize);
        assert.equal(1459805161000, dt.timestamp);
        assert.equal(1, dt.files.length);
        assert.equal('/myfile', dt.files[0].path);
        assert.equal('Abc', dt.files[0].content);
      }
    };

    return tests;
  }

}