class DOMFile {

  private _encodedPath: string = null;

  constructor(
    public node: Comment,
    public path: string,
    private _encoding: (text: string) => any,
    private _contentOffset: number,
    public contentLength: number) {
  }

  static tryParse(
    cmheader: {
      header: string;
      contentOffset: number;
      contentLength: number;
      node: Comment;
    }): DOMFile {

    //    /file/path/continue
    //    "/file/path/continue"
    //    /file/path/continue   [encoding]

    var parseFmt = /^\s*((\/|\"\/)(\s|\S)*[^\]])\s*(\[((\s|\S)*)\])?\s*$/;
    var parsed = parseFmt.exec(cmheader.header);
    if (!parsed) return null; // does not match the format

    var filePath = parsed[1];
    var encodingName = parsed[5];

    if (filePath.charAt(0) === '"') {
      if (filePath.charAt(filePath.length - 1) !== '"') return null; // unpaired leading quote
      try {
        if (typeof JSON !== 'undefined' && typeof JSON.parse === 'function')
          filePath = JSON.parse(filePath);
        else
          filePath = eval(filePath); // security doesn't seem to be compromised, input is coming from the same file
      }
      catch (parseError) {
        return null; // quoted path but wrong format (JSON expected)
      }
    }
    else { // filePath NOT started with quote
      if (encodingName) {
        // regex above won't strip trailing whitespace from filePath if encoding is specified
        // (because whitespace matches 'non-bracket' class too)
        filePath = filePath.slice(0, filePath.search(/\S(\s*)$/) + 1);
      }
    }

    var encoding = encodings[encodingName || 'LF'];
    // invalid encoding considered a bogus comment, skipped
    if (encoding)
      return new DOMFile(cmheader.node, filePath, encoding, cmheader.contentOffset, cmheader.contentLength);

    return null;
  }


  read() {

    // proper HTML5 has substringData to read only a chunk
    // (that saves on string memory allocations
    // comparing to fetching the whole text including the file name)
    var contentText = typeof this.node.substringData === 'function' ?
        this.node.substringData(this._contentOffset, 1000000000) :
    this.node.nodeValue.slice(this._contentOffset);

    // XML end-comment is escaped when stored in DOM,
    // unescape it back
    var restoredText = contentText.
    replace(/\-\-\*(\**)\>/g, '--$1>').
    replace(/\<\*(\**)\!/g, '<$1!');

    // decode
    var decodedText = this._encoding(restoredText);

    // update just in case it's been off
    this.contentLength = decodedText.length;

    return decodedText;
  }

  write(content: any): string | boolean {

    var encoded = bestEncode(content);
    var protectedText = encoded.content.
    replace(/\-\-(\**)\>/g, '--*$1>').
    replace(/\<(\**)\!/g, '<*$1!');

    if (!this._encodedPath) {
      // most cases path is path,
      // but if anything is weird, it's going to be quoted
      // (actually encoded with JSON format)
      var encp = bestEncode(this.path, true /*escapePath*/);
      this._encodedPath = encp.content;
    }

    var leadText = ' ' + this._encodedPath + (encoded.encoding === 'LF' ? '' : ' [' + encoded.encoding + ']') + '\n';
    var html = leadText + protectedText;
    if (!this.node) return html; // can be used without backing 'node' for formatting purpose

    if (html===this.node.nodeValue) return false;
    this.node.nodeValue = html;

    this._encoding = encodings[encoded.encoding || 'LF'];
    this._contentOffset = leadText.length;

    this.contentLength = content.length;
    return true;
  }

}