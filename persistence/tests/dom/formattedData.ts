namespace tests.dom {

  function data(formatted, path, text) { return {
    formatted: formatted,
    path: path,
    text: text
  }; }

  export var _formattedData = {

    fileContentLF: data(' /path.txt\nbla\nbla', '/path.txt', 'bla\nbla'),
    fileContentCR: data(' /path.txt [json]\n"bla\\rbla"', '/path.txt', 'bla\rbla'),
    fileNameWhitespaceInner: data(' /path is.txt\ntext', '/path is.txt', 'text'),
    fileNameWhitespaceLead: data(' / path.txt\ntext', '/ path.txt', 'text'),
    fileNameWhitespaceTrail: data(' "/path.txt "\ntext', '/path.txt ', 'text'),
    fileNameLFInner: data(' "/path\\nis.txt"\ntext', '/path\nis.txt', 'text'),
    fileNameLFLead: data(' "/\\npath.txt"\ntext', '/\npath.txt', 'text'),
    fileNameLFTrail: data(' "/path.txt\\n"\ntext', '/path.txt\n', 'text'),
    fileNameWhithLeftSqBracket: data(' /path[.txt\ntext', '/path[.txt', 'text'),
    fileNameWhithRightSqBracket: data(' /path].txt\ntext', '/path].txt', 'text')

  };

}