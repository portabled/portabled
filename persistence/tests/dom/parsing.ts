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
        assert.equal(1024*1024*12, dt.totals.size);
        assert.equal(1459724400000, dt.totals.timestamp);
        assert.equal(1, dt.files.length);
        assert.equal('/myfile', dt.files[0].path);
        assert.equal('Abc', dt.files[0].content);
      },
      parseHTML_timestamp_Date_with_time_222601: function() {
        var dt = persistence.parseHTML(
          '<!doctype html>'+
          '<html><head><title>Dummy page</title></head>'+
          '<body>'+
          '<!-- total 12Mb, saved 4 Apr 2016 22:26:01 -->'+
          '<!-- /myfile\n'+
          'Abc-->'+
          '</body>'+
          '</html>');
        assert.equal(1024*1024*12, dt.totals.size);
        assert.equal(1459805161000, dt.totals.timestamp);
        assert.equal(1, dt.files.length);
        assert.equal('/myfile', dt.files[0].path);
        assert.equal('Abc', dt.files[0].content);
      },
      parseHTML_timestamp_Date_with_time_080109: function() {
        var dt = persistence.parseHTML(
          '<!doctype html>'+
          '<html><head><title>Dummy page</title></head>'+
          '<body>'+
          '<!-- total 12Mb, saved 4 Apr 2016 08:01:09 -->'+
          '<!-- /myfile\n'+
          'Abc-->'+
          '</body>'+
          '</html>');
        assert.equal(1024*1024*12, dt.totals.size);
        assert.equal(1459753269000, dt.totals.timestamp);
        assert.equal(1, dt.files.length);
        assert.equal('/myfile', dt.files[0].path);
        assert.equal('Abc', dt.files[0].content);
      },
      parseHTML_offsets_removeChunks: function() {
        var origHTML =
					'<!doctype html>'+
          '<html><head><title>Dummy page</title></head>'+
          '<body>'+
          '<!-- total 12Mb, saved 4 Apr 2016 08:01:09 -->'+
          '<!-- /myfile\n'+
          'Abc-->'+
          '</body>'+
          '</html>';

        var dt = persistence.parseHTML(origHTML);
        var removeChunksHTML =
            origHTML.slice(0,dt.totals.start)+
            'TOTALS'+
            origHTML.slice(dt.totals.end, dt.files[0].start)+
            'FILE'+
            origHTML.slice(dt.files[0].end);

        var expectedRemoveChunksHTML =
					'<!doctype html>'+
          '<html><head><title>Dummy page</title></head>'+
          '<body>'+
          'TOTALS'+
          'FILE'+
          '</body>'+
          '</html>';
      }
    };

    return tests;
  }

}