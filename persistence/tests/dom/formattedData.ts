namespace tests.dom {

  function data(formatted, path, text) { return {
    formatted: formatted,
    path: path,
    text: text
  }; }

  export var _formattedData = {

    fileContentLF: data(' /path.txt\nbla\nbla', '/path.txt', 'bla\nbla'),
    fileContentCR: data(' /path.txt [CR]\nbla\rbla', '/path.txt', 'bla\rbla'),
    fileContentCRLF: data(' /path.txt [CRLF]\nbla\r\nbla', '/path.txt', 'bla\r\nbla'),
    fileContentCRmixLF: data(' /path.txt [json]\n"bla\\rbla\\nbla"', '/path.txt', 'bla\rbla\nbla'),
    fileNameWhitespaceInner: data(' /path is.txt\ntext', '/path is.txt', 'text'),
    fileNameWhitespaceLead: data(' / path.txt\ntext', '/ path.txt', 'text'),
    fileNameWhitespaceTrail: data(' "/path.txt "\ntext', '/path.txt ', 'text'),
    fileNameLFInner: data(' "/path\\nis.txt"\ntext', '/path\nis.txt', 'text'),
    fileNameLFLead: data(' "/\\npath.txt"\ntext', '/\npath.txt', 'text'),
    fileNameLFTrail: data(' "/path.txt\\n"\ntext', '/path.txt\n', 'text'),
    fileNameWithLeftSqBracket: data(' /path[.txt\ntext', '/path[.txt', 'text'),
    fileNameWithRightSqBracket: data(' /path].txt\ntext', '/path].txt', 'text'),
    fileContentWithZeroJSON: data(' /path.txt [json]\n"base\\u000064"', '/path.txt', 'base' + String.fromCharCode(0) + '64'),

    fileContentWithCopyright: data(' /path.txt\ncopyright-'+String.fromCharCode(169), '/path.txt', 'copyright-'+String.fromCharCode(169)),
    fileContentWith127: data(' /path.txt\ncopyright-'+String.fromCharCode(127), '/path.txt', 'copyright-'+String.fromCharCode(127)),

    fileContentBinaryJSON: data(' /path.txt [json]\n[98,97,115,101,0,54,52]', '/path.txt', asBinary('base' + String.fromCharCode(0) + '64')),
    fileContentBinaryWithZeroJSON: data(' /path.txt [json]\n[98,97,115,101,54,52]', '/path.txt', asBinary('base64')),
    filteContentBase64Binary: data(' /path.txt [base64]\n*YmFzZTY0LUFCQ0RFRkdISUpLTA==', '/path.txt', asBinary('base64-ABCDEFGHIJKL'))

  };

  function longBinaryString(length: number) {
    var str = '';
    for (var i = 0; i < length; i++) {
      str += String.fromCharCode(0);
    }
    return str;
  }

  function asBinary(txt: string): number[] {
    var nums: number[] = [];
    for (var i =0; i< txt.length; i++) {
      nums.push(txt.charCodeAt(i));
    }
    return nums;
  }

}