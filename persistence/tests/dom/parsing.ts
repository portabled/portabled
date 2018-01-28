namespace tests.dom.parsing {

	export function generateTests() {

    var testsMyFile = withFile({fileMarkup:'/myfile', content: 'Abc'});
    var testsWithSpace = withFile({fileMarkup:'"/with space"', filePath: '/with space', content: 'Abc'});

    return {
      testsMyFile: testsMyFile,
      testsWithSpace: testsWithSpace
    };

    type Options = {
      fileMarkup: string;
      filePath?: string;
      content: string;
    }

/*
    fileContentBase64: data(' /path.txt [base64]\nYmFzZTY0', '/path.txt', 'base64'),
    fileContentBase64Star: data(' /path.txt [base64]\n*YmFzZTY0', '/path.txt', 'base64')
*/

    function withFile(options: Options) {
      var {fileMarkup, filePath, content} = options;
      var tests = {
        parseHTML_timestamp_simpleDate: function() {

          var html = '<!doctype html>'+
            '<html><head><title>Dummy page</title></head>'+
            '<body>'+
            '<!-- total 12Mb, saved 4 Apr 2016 -->'+
            '<!-- '+fileMarkup+'\n'+content+'-->'+
            '</body>'+
            '</html>';

          var dt = persistence.parseHTML(html);

          assert.equal(1024*1024*12, dt.totals.size);
          assert.equal(1459724400000, dt.totals.timestamp);
          assert.equal(1, dt.files.length);
          assert.equal(filePath||fileMarkup, dt.files[0].path);
          assert.equal(content, dt.files[0].content);
          assert.equal('<!-- '+fileMarkup+'\n'+content+'-->', html.slice(dt.files[0].start, dt.files[0].end));
        },

        parseHTML_timestamp_Date_with_time_222601: function() {
          var html = '<!doctype html>'+
            '<html><head><title>Dummy page</title></head>'+
            '<body>'+
            '<!-- total 12Mb, saved 4 Apr 2016 22:26:01 -->'+
            '<!-- '+fileMarkup+'\n'+content+'-->'+
            '</body>'+
            '</html>';

          var dt = persistence.parseHTML(html);

          assert.equal(1024*1024*12, dt.totals.size);
          assert.equal(1459805161000, dt.totals.timestamp);
          assert.equal(1, dt.files.length);
          assert.equal(filePath||fileMarkup, dt.files[0].path);
          assert.equal(content, dt.files[0].content);
          assert.equal('<!-- '+fileMarkup+'\n'+content+'-->', html.slice(dt.files[0].start, dt.files[0].end));
        },

        parseHTML_timestamp_Date_with_time_080109: function() {
          var html =
            '<!doctype html>'+
            '<html><head><title>Dummy page</title></head>'+
            '<body>'+
            '<!-- total 12Mb, saved 4 Apr 2016 08:01:09 -->'+
            '<!-- '+fileMarkup+'\n'+
            content+'-->'+
            '</body>'+
            '</html>';

          var dt = persistence.parseHTML(html);

          assert.equal(1024*1024*12, dt.totals.size);
          assert.equal(1459753269000, dt.totals.timestamp);
          assert.equal(1, dt.files.length);
          assert.equal(filePath||fileMarkup, dt.files[0].path);
          assert.equal(content, dt.files[0].content);
          assert.equal('<!-- '+fileMarkup+'\n'+content+'-->', html.slice(dt.files[0].start, dt.files[0].end));
        },

        parseHTML_offsets_removeChunks: function() {
          var origHTML =
            '<!doctype html>'+
            '<html><head><title>Dummy page</title></head>'+
            '<body>'+
            '<!-- total 12Mb, saved 4 Apr 2016 08:01:09 -->'+
            '<!-- /'+fileMarkup+'\n'+
            content+'-->'+
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

}