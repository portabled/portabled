function bestEncode(content: any, escapePath?: boolean): { content: string; encoding: string; } {

  if (content.length>1024*2) {
    var compressed = encodings.lzma.compress(content);
    var str = '';
    for (var i = 0; i < compressed.length; i++) {
      str += String.fromCharCode((compressed[i] + 256) % 256);
    }
    var b64 = encodings.base64.btoa(str);
    if (typeof content !== 'string')
      b64 = '*' + b64;
    else
      b64 = 'A' + b64;
    if (b64.length<content.length)
      return {content:b64, encoding: 'lzma'};
  }

  if (typeof content!=='string') {
    if (typeof content==='object' && typeof content.length==='number'
        && content.length>16 && typeof content[0]==='number') {
      try {
        return { content: _encodeNumberArrayToBase64(content), encoding: 'base64' };
      }
      catch (base64Error) { }
    }
    return { content: _encodeArrayOrSimilarAsJSON(content), encoding: 'json' };
  }

  var needsEscaping: boolean;
  if (escapePath) {
    // zero-char, newlines, leading/trailing spaces, quote and apostrophe
    needsEscaping = /\u0000|\r|\n|^\s|\s$|\"|\'/.test(content);
  }
  else {
    needsEscaping = /\u0000|\r/.test(content);
  }

  if (needsEscaping) {
    // ZERO character is officially unsafe in HTML,
    // CR is contentious in IE (which converts any CR or LF into CRLF)

    return { content: _encodeUnusualStringAsJSON(content), encoding: 'json' };
  }
  else {
    return { content: content, encoding: 'LF' };
  }
}

function _encodeUnusualStringAsJSON(content: string): string {
  if (typeof JSON !== 'undefined' && typeof JSON.stringify === 'function') {
    var simpleJSON = JSON.stringify(content);
    var sanitizedJSON = simpleJSON.
    replace(/\u0000/g, '\\u0000').
    replace(/\r/g, '\\r').
    replace(/\n/g, '\\n');
    return sanitizedJSON;
  }
  else {
    var result = content.replace(
      /\"\u0000|\u0001|\u0002|\u0003|\u0004|\u0005|\u0006|\u0007|\u0008|\u0009|\u00010|\u00011|\u00012|\u00013|\u00014|\u00015|\u0016|\u0017|\u0018|\u0019|\u0020|\u0021|\u0022|\u0023|\u0024|\u0025|\u0026|\u0027|\u0028|\u0029|\u0030|\u0031/g,
      (chr) =>
      chr === '\t' ? '\\t' :
      chr === '\r' ? '\\r' :
      chr === '\n' ? '\\n' :
      chr === '\"' ? '\\"' :
      chr < '\u0010' ? '\\u000' + chr.charCodeAt(0).toString(16) :
      '\\u00' + chr.charCodeAt(0).toString(16));
    return result;
  }
}

function _encodeNumberArrayToBase64(content: number[]): string {
  var str = '';
  for (var i = 0; i < content.length; i++) {
    str += String.fromCharCode(content[i]);
  }
  var b64 = '*'+encodings.base64.btoa(str);
  return b64;
}

function _encodeArrayOrSimilarAsJSON(content: any): string {
  var type = content instanceof Array ? null : content.constructor.name || content.type;
  if (typeof JSON !== 'undefined' && typeof JSON.stringify === 'function') {
    if (type) {
      var wrapped = { type, content };
      var wrappedJSON = JSON.stringify(wrapped);
      return wrappedJSON;
    }
    else {
      var contentJSON = JSON.stringify(content);
      return contentJSON;
    }
  }
  else {
    var jsonArr: string[] = [];
    if (type) {
      jsonArr.push('{"type": "');
      jsonArr.push(content.type || content.prototype.constructor.name);
      jsonArr.push('", "content": [');
    }
    else {
      jsonArr.push('[');
    }

    for (var i = 0; i < content.length; i++) {
      if (i) jsonArr.push(',');
      jsonArr.push(content[i]);
    }

    if (type)
      jsonArr.push(']}');
    else
      jsonArr.push(']');

    return jsonArr.join('');
  }
}