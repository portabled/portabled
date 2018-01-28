namespace tests.dom.base64Encoding {

	export function generateTests() {

    return {
      parseBase64,
      parseBase64Star
    };

/*
    fileContentBase64: data(' /path.txt [base64]\nYmFzZTY0', '/path.txt', 'base64'),
    fileContentBase64Star: data(' /path.txt [base64]\n*YmFzZTY0', '/path.txt', 'base64')
*/

    function parseBase64() {

      var html = '<!doctype html>'+
          '<html><head><title>Dummy page</title></head>'+
          '<body>'+
          '<!-- total 12Mb, saved 4 Apr 2016 -->'+
          '<!-- /path.txt [base64]\nYmFzZTY0-->'+
          '</body>'+
          '</html>';

      var dt = persistence.parseHTML(html);

      assert.equal(1024*1024*12, dt.totals.size);
      assert.equal(1459724400000, dt.totals.timestamp);
      assert.equal(1, dt.files.length);
      assert.equal('/path.txt', dt.files[0].path);
      assert.equal('base64', dt.files[0].content);
    }

    function parseBase64Star() {

      var html = '<!doctype html>'+
          '<html><head><title>Dummy page</title></head>'+
          '<body>'+
          '<!-- total 12Mb, saved 4 Apr 2016 -->'+
          '<!-- /path.txt [base64]\n*YmFzZTY0-->'+
          '</body>'+
          '</html>';

      var dt = persistence.parseHTML(html);

      assert.equal(1024*1024*12, dt.totals.size);
      assert.equal(1459724400000, dt.totals.timestamp);
      assert.equal(1, dt.files.length);
      assert.equal('/path.txt', dt.files[0].path);

      var expectedContentStr = 'base64';

      var expectedContent: number[] = [];
      for (var i = 0; i < expectedContentStr.length; i++) {
        expectedContent.push(expectedContentStr.charCodeAt(i));
      }

      var actualContent: number[] = [];
      var actualContentSrc = dt.files[0].content;
      for (var i = 0; i < actualContentSrc.length; i++) {
        actualContent.push(actualContentSrc[i] as any);
      }

      assert.equal(expectedContent.join(','), actualContent.join(','));
    }

  }

}