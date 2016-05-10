class CommentHeader {

  header: string;
  contentOffset: number;
  contentLength: number;

  constructor(public node: Comment) {
    var headerLine: string;
    var content: string;
    if (typeof node.substringData === 'function'
        && typeof node.length === 'number') {
      var chunkSize = 128;

      if (node.length >= chunkSize) {
        // TODO: cut chunks off the start and look for newlines
        var headerChunks: string[] = [];
        while (headerChunks.length * chunkSize < node.length) {
          var nextChunk = node.substringData(headerChunks.length * chunkSize, chunkSize);
          var posEOL = nextChunk.search(/\r|\n/);
          if (posEOL < 0) {
            headerChunks.push(nextChunk);
            continue;
          }

          this.header = headerChunks.join('') + nextChunk.slice(0, posEOL);
          this.contentOffset = this.header.length + 1; // if header is separated by a single CR or LF

          if (posEOL === nextChunk.length - 1) { // we may have LF part of CRLF in the next chunk!
            if (nextChunk.charAt(nextChunk.length - 1) === '\r'
                && node.substringData((headerChunks.length + 1) * chunkSize, 1) === '\n')
              this.contentOffset++;
          }
          else if (nextChunk.slice(posEOL, posEOL + 2) === '\r\n') {
            this.contentOffset++;
          }

          this.contentLength = node.length - this.contentOffset;
          return;
        }

        this.header = headerChunks.join('');
        this.contentOffset = this.header.length;
        this.contentLength = node.length - content.length;
        return;
      }
    }

    var wholeCommentText = node.nodeValue;
    var posEOL = wholeCommentText.search(/\r|\n/);
    if (posEOL < 0) {
      this.header = wholeCommentText;
      this.contentOffset = wholeCommentText.length;
      this.contentLength = wholeCommentText.length - this.contentOffset;
      return;
    }

    this.contentOffset = wholeCommentText.slice(posEOL, posEOL + 2) === '\r\n' ?
      posEOL + 2 : // ends with CRLF
    posEOL + 1; // ends with singular CR or LF

    this.header = wholeCommentText.slice(0, posEOL),
      this.contentLength = wholeCommentText.length - this.contentOffset
  }

}
