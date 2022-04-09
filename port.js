// @ts-check
var portabled = (function() {

  /**
   * @typedef {{
   *  domTimestamp: number;
   *  domTotalSize: number;
   *  domLoadedSize: number;
   *  loadedFileCount: number;
   *  storageName: string;
   *  storageTimestamp: number;
   *  storageLoadFailures: { [storage: string]: string; };
   *
   *  newDOMFiles: string[];
   *  newStorageFiles: string[];
   *
   *  read(path: string): any;
   *  continueLoading(): void;
   *  finishParsing(completion: (drive: Drive.Detached.DOMDrive) => void): void;
   * }} persistence.BootState
   *
   * @typedef {{
   *  timestamp: number;
   *  files(): string[];
   *  read(file: string): string | null;
   *  write(file: string, content: string): void;
   *  storedSize?(file: string): number | null;
   * }} persistence.Drive
   *
   * @typedef {{
   *  timestamp?: number;
   *  write(file: string, content: string | null, encoding?: string): void;
   *  forget(file: string): void;
   * }} persistence.Drive.Shadow
   *
   * @typedef {{
   *  name: string;
   *  detect(uniqueKey: string, callback: Drive.ErrorOrDetachedCallback): void;
   * }} persistence.Drive.Optional
   *
   * @typedef {{
   *  (error: string): void;
   *  (error: null, detached: persistence.Drive.Detached): void;
   * }} Drive.ErrorOrDetachedCallback
   *
   * @typedef {{
   *  timestamp?: number;
   *  totalSize?: number;
   *  applyTo(mainDrive: persistence.Drive.Detached.DOMUpdater, callback: persistence.Drive.Detached.CallbackWithShadow): void;
   *  purge(callback: persistence.Drive.Detached.CallbackWithShadow): void;
   * }} persistence.Drive.Detached
   *
   * @typedef {{
   *  (loaded: persistence.Drive.Shadow): void;
   *  progress?: (current: number, total: number) => void;
   * }} persistence.Drive.Detached.CallbackWithShadow
   *
   * @typedef {{
   *  timestamp?: number;
   *  write(file: string, content: string | null, encoding?: string): void;
   * }} persistence.Drive.Detached.DOMUpdater
   *
   * @typedef {{
   *  write(file: string, content: string | null, encoding?: string): void;
   * } & persistence.Drive} persistence.Drive.Detached.DOMDrive
   * 
   * @typedef {{
   *  body: HTMLBodyElementSubset;
   *  head: Node;
   *  createComment(data: string): Comment;
   *  getElementsByTagName(tag: string): { [index: number]: Node; length: number };
   * }} persistence.Drive.Detached.DOMDrive.DocumentSubset
   * 
   * @typedef {{
   *  appendChild(node: Node): void;
   *  insertBefore(newChild: Node, refNode: Node | null): void;
   *  getElementsByTagName(tag: string): { [index: number]: Node; length: number; };
   *  firstChild: Node | null;
   *  children: { [index: number]: Node; length: number; };
   * }} persistence.Drive.Detached.DOMDrive.HTMLBodyElementSubset
   * 
   * @typedef {(text: string) => string} persistence.encodings.Encoding
   */

  var persistence = (function() {

    /**
     *
     * @param {any} content
     * @param {boolean=} escapePath
     * @returns {{ content: string; encoding: string; }}
     */
    function bestEncode(content, escapePath) {

      if (content.length>1024*2) {
        /*
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
          */
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

      var maxEscape = ((content.length * 0.1) | 0) + 2;

      var escape = 0;
      var escapeHigh = 0;
      var prevChar = 0;
      var crCount = 0;
      var lfCount = 0;
      var crlfCount = 0;

      if (escapePath) {
        for (var i = 0; i < content.length; i++) {
          var c = content.charCodeAt(i);
          if (c < 32 || c >126 || (c===32 && (!i || i===content.length-1))) {
            escape = 1;
            break;
          }
        }
      }
      else {
        for (var i = 0; i < content.length; i++) {
          var c = content.charCodeAt(i);

          if (c===10) {
            if (prevChar===13) {
              crCount--;
              crlfCount++;
            }
            else {
              lfCount++;
            }
          }
          else if (c===13) {
            crCount++;
          }
          else if (c<32 && c!=9) { // tab is an OK character, no need to escape
            escape++;
          }
          else if (c>126) {
            escapeHigh++;
          }

          prevChar = c;

          if ((escape+escapeHigh) > maxEscape)
            break;
        }
      }

      if (escapePath) {
        if (escape)
          return { content: _encodeUnusualStringAsJSON(content), encoding: 'json' };
        else
          return { content: content, encoding: 'LF' };
      }
      else {
        if (escape > maxEscape) {
          return { content: _encodeUnusualStringAsJSON(content), encoding: 'json' };
        }

        else if (escape)
          return { content: _encodeUnusualStringAsJSON(content), encoding: 'json' };
        else if (crCount) {
          if (lfCount)
            return { content: _encodeUnusualStringAsJSON(content), encoding: 'json' };
          else
            return { content: content, encoding: 'CR' };
        }
        else if (crlfCount) {
          if (lfCount)
            return { content: _encodeUnusualStringAsJSON(content), encoding: 'json' };
          else
            return { content: content, encoding: 'CRLF' };
        }
        else {
          return { content: content, encoding: 'LF' };
        }
      }

    }

    /**
     * @param {string} content
     * @returns string
     */
    function _encodeUnusualStringAsJSON(content) {
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
          escapeChar);
        return result;
      }
    }

    /**
     * @param {string} chr
     * @returns {string}
     */
    function escapeChar(chr) {
      return (
        chr === '\t' ? '\\t' :
        chr === '\r' ? '\\r' :
        chr === '\n' ? '\\n' :
        chr === '\"' ? '\\"' :
        chr < '\u0010' ? '\\u000' + chr.charCodeAt(0).toString(16) :
        '\\u00' + chr.charCodeAt(0).toString(16));
      }

    /**
     * @param {number[]} content
     * @returns string
     */
    function _encodeNumberArrayToBase64() {
      var str = '';
      for (var i = 0; i < content.length; i++) {
        str += String.fromCharCode(content[i]);
      }
      var b64 = '*'+encodings.base64.btoa(str);
      return b64;
    }

    /**
     * @param {any} content
     * @returns string
     */
    function _encodeArrayOrSimilarAsJSON(content) {
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
        /** @type {string[]} */
        var jsonArr = [];
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


    /**
     * @param {number} timestamp
     * @param {number} totalSize
     * @returns {string}
     */
    function formatTotalsInner(timestamp, totalSize) {
      var tot = new DOMTotals(timestamp, totalSize, /*node*/null);
      return tot.updateNode();
    }

    /**
     * @param {string} path
     * @param {any} content
     * @returns {string}
     */
    function formatFileInner(path, content) {
      var fi = new DOMFile(/*node*/null, path, /* encoding */null, 0, 0);
      var entry = bestEncode(content);
      return fi.write(entry.content, entry.encoding);
    }

    /**
     * @param {string} path
     * @returns {string}
     */
    function normalizePath(path) {
      if (!path) return '/'; // empty paths converted to root
      if (path.charAt(0) !== '/') path = '/' + path; // ensuring leading slash

      path = path.replace(/\/\/*/g, '/'); // replacing duplicate slashes with single
      return path;
    }


    /**
     * @class
     * @param {Comment} node
     */
    function CommentHeader(node) {


      if (typeof node.substringData === 'function'
          && typeof node.length === 'number') {
  
        if (node.length >= CommentHeader.chunkSize) {
          // TODO: cut chunks off the start and look for newlines
          /** @type {string[]} */
          var headerChunks = [];
          while (headerChunks.length * CommentHeader.chunkSize < node.length) {
            var nextChunk = node.substringData(headerChunks.length * CommentHeader.chunkSize, CommentHeader.chunkSize);
            var posEOL = nextChunk.search(/\r|\n/);
            if (posEOL < 0) {
              headerChunks.push(nextChunk);
              continue;
            }
  
            this.header = headerChunks.join('') + nextChunk.slice(0, posEOL);
            this.contentOffset = this.header.length + 1; // if header is separated by a single CR or LF
  
            if (posEOL === nextChunk.length - 1) { // we may have LF part of CRLF in the next chunk!
              if (nextChunk.charAt(nextChunk.length - 1) === '\r'
                && node.substringData((headerChunks.length + 1) * CommentHeader.chunkSize, 1) === '\n')
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
          this.contentLength = node.length - this.contentOffset;
          return;
        }
      }
  
      var wholeCommentText = node.nodeValue || '';
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
  
      this.header = wholeCommentText.slice(0, posEOL);
      this.contentLength = wholeCommentText.length - this.contentOffset;
    }

    CommentHeader.chunkSize = 128;

    var DOMFile = (function() {

      /**
       * @class
       * @param {Comment} node
       * @param {string} path
       * @param {((text: string) => any) | undefined} encoding
       * @param {number} contentOffset
       * @param {number} contentLength
       */
      function DOMFile(node, path, encoding, contentOffset, contentLength) {
        this.node = node;
        this._encoding = encoding;
        this._contentOffset = contentOffset;
        this.contentLength = contentLength;
        this._encodedPath = /** @type {string | null} */(null);
      }

      /**
       * @param {{
       *  header: string;
       *  contentOffset: number;
       *  contentLength: number;
       *  node: Comment;
       * }} cmheader
       * @returns {DOMFile | undefined}
       */
      function tryParse(cmheader) {
      
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
      }
      DOMFile.tryParse = tryParse;

      /**
       * @this {DOMFile}
       */
      function read() {
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
      DOMFile.prototype.read = read;
      
      /**
       * @this {DOMFile}
       * @param {any} content
       * @param {string=} encoding
       * @returns {string | boolean}
       */
      function write(content, encoding) {
    
        content =
          content===null || typeof content === 'undefined' ? content :
          String(content);
    
        var encoded = encoding ? { content, encoding } : bestEncode(content);
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
      DOMFile.prototype.write = write;

      return DOMFile;

    })();

    var DOMTotals = (function() {

      var monthsPrettyCase = ('Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec').split('|');
      var monthsUpperCaseStr = monthsPrettyCase.join('').toUpperCase();

      /**
       * @class
       * @param {number} timestamp
       * @param {number} totalSize
       * @param {Comment} node
       */
      function DOMTotals(timestamp, totalSize, node) {
        this.timestamp = timestamp;
        this.totalSize = totalSize;
        this.node = node;

        this._domTimestamp = -1;
        this._domTotalSize = -1;
      }

      /**
       * @param {{
       *  header: string;
       *  contentOffset: number;
       *  contentLength: number;
       *  node: Comment;
       * }} cmheader
       * @returns {DOMTotals | undefined}
       */
      function tryParse(cmheader) {

        // TODO: preserve unknowns when parsing

        var parts = cmheader.header.split(',');
        var anythingParsed = false;
        var totalSize = 0;
        var timestamp = 0;

        for (var i = 0; i < parts.length; i++) {

          // total 234Kb
          // total 23
          // total 6Mb

          var totalFmt = /^\s*total\s+(\d*)\s*([KkMm])?b?\s*$/;
          var totalMatch = totalFmt.exec(parts[i]);
          if (totalMatch) {
            try {
              var total = parseInt(totalMatch[1]);
              if ((totalMatch[2] + '').toUpperCase() === 'K')
                total *= 1024;
              else if ((totalMatch[2] + '').toUpperCase() === 'M')
                total *= 1024 * 1024;
              totalSize = total;
              anythingParsed = true;
            }
            catch (totalParseError) { }
            continue;
          }

          var savedFmt = /^\s*saved\s+(\d+)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)(\s+(\d+)\:(\d+)(\:(\d+(\.(\d+))?))\s*(GMT\s*[\-\+]?\d+\:?\d*)?)?\s*$/i;
          var savedMatch = savedFmt.exec(parts[i]);
          if (savedMatch) {
            // 25 Apr 2015 22:52:01.231
            try {
              var savedDay = parseInt(savedMatch[1]);

              // first find string index within JANFEBMAR...NOVDEC then divide by three
              // which happens to be (0...11)*3
              var savedMonth = monthsUpperCaseStr.indexOf(savedMatch[2].toUpperCase());
              if (savedMonth>=0 && savedMonth % 3 === 0)
                savedMonth = savedMonth/3;

              var savedYear = parseInt(savedMatch[3]);
              if (savedYear < 100)
                savedYear += 2000; // no 19xx notation anymore :-(
              var savedHour = parseInt(savedMatch[5]);
              var savedMinute = parseInt(savedMatch[6]);
              var savedSecond = savedMatch[8] ? parseFloat(savedMatch[8]) : 0;

              if (savedMatch[4]) {
                timestamp = new Date(savedYear, savedMonth, savedDay, savedHour, savedMinute, savedSecond | 0).valueOf();
                timestamp += (savedSecond - (savedSecond | 0))*1000; // milliseconds

                var savedGMTStr = savedMatch[11];
                if (savedGMTStr) {
                  var gmtColonPos = savedGMTStr.indexOf(':');
                  if (gmtColonPos>0) {
                    var gmtH = parseInt(savedGMTStr.slice(0, gmtColonPos));
                    timestamp += gmtH * 60 /*min*/ * 60 /*sec*/ * 1000 /*msec*/;
                    var gmtM = parseInt(savedGMTStr.slice(gmtColonPos + 1));
                    timestamp += gmtM * 60 /*sec*/ * 1000 /*msec*/;
                  }
                }
              }
              else {
                timestamp = new Date(savedYear, savedMonth, savedDay).valueOf();
              }

              anythingParsed = true;
            }
            catch (savedParseError) { }
          }

        }

        if (anythingParsed)
          return new DOMTotals(timestamp, totalSize, cmheader.node);
      }
      DOMTotals.tryParse = tryParse;

      /**
       * @this {DOMTotals}
       */
      function updateNode() {

        if (this._domTimestamp===this.timestamp && this._domTotalSize===this.totalSize) return;

        // total 4Kb, saved 25 Apr 2015 22:52:01.231
        var newTotals =
            'total ' + DOMTotals.formatSize(this.totalSize) + ', ' +
            'saved ' + DOMTotals.formatDate(new Date(this.timestamp));

        if (!this.node) return newTotals;

        this.node.nodeValue = newTotals;
        this._domTimestamp = this.timestamp;
        this._domTotalSize = this.totalSize;
      }
      DOMTotals.prototype.updateNode = updateNode;

      /**
       * @param {number} totalSize
       * @returns {string}
       */
      function formatSize(totalSize) {
        return (
          totalSize < 1024 * 9 ? totalSize + '' :
          totalSize < 1024 * 1024 * 9 ? ((totalSize / 1024) | 0) + 'Kb' :
          ((totalSize / (1024 * 1024)) | 0) + 'Mb');
      }
      DOMTotals.formatSize = formatSize;

      /**
       * @param {Date} date
       * @returns {string}
       */
      function formatDate(date) {

        var dateLocalStr = date.toString();
        var gmtMatch = (/(GMT\s*[\-\+]\d+(\:\d+)?)/i).exec(dateLocalStr);

        var d = date.getDate();
        var MMM = monthsPrettyCase[date.getMonth()];
        var yyyy = date.getFullYear();
        var h = date.getHours();
        var m = date.getMinutes();
        var s = date.getSeconds();
        var ticks = +date;

        var formatted =
            d +
            ' ' + MMM +
            ' ' + yyyy +
            (h>9 ? ' ' : ' 0') + h +
            (m>9 ? ':' : ':0') + m +
            (s>9? ':' : ':0') + s +
            '.' +(ticks).toString().slice(-3) +
            (gmtMatch && gmtMatch[1]!=='GMT+0000' ? ' ' + gmtMatch[1] : '');

        return formatted;
      }
      DOMTotals.formatDate = formatDate;

      return DOMTotals;
    })();

    var DOMDrive = (function() {


      // class DOMDrive implements persistence.Drive {

      /**
       * @param {DOMTotals} totals
       * @param {DOMFile[]} files
       * @param {persistence.Drive.Detached.DOMDrive.DocumentSubset} document 
       */
      function DOMDrive(totals, files, document) {
        this._totals = totals;
        this._document = document;
    
        for (var i = 0; i < files.length; i++) {
          this._byPath[files[i].path] = files[i];
          this._totalSize += files[i].contentLength;
          if (!this._anchorNode) this._anchorNode = files[i].node;
        }
    
        if (!this._totals) {
          var comment = this._document.createComment('');
          var parent = this._document.head || this._document.getElementsByTagName('head')[0] || this._document.body;
          parent.insertBefore(comment, parent.children ? parent.children[0] : null);
          this._totals = new DOMTotals(0, this._totalSize, comment);
        }
    
        this.timestamp = this._totals.timestamp;

        /** @type {{ [path: string]: DOMFile; }} */
        this._byPath = {};
        /** @type {Node | null} */
        this._anchorNode = null;
        this._totalSize = 0;
      }

      /**
       * @this {DOMDrive}
       * @returns {string[]}
       */
      function files() {
        if (typeof Object.keys === 'string') {
          var result = Object.keys(this._byPath);
        }
        else {
          /** @type {string[]} */
          var result = [];
          for (var k in this._byPath) if (this._byPath.hasOwnProperty(k)) {
            result.push(k);
          }
        }
    
        result.sort();
        return result;
      }
      DOMDrive.prototype.files = files;
    
      /**
       * @this {DOMDrive}
       * @param {string} file
       * @returns {string | undefined}
       */
      function read(file) {
        var file = normalizePath(file);
        var f = this._byPath[file];
        if (f) return f.read();
      }
      DOMDrive.prototype.read = read;
    
      /**
       * @this {DOMDrive}
       * @param {string} file
       * @returns {number | undefined}
       */
      function storedSize(file) {
        var file = normalizePath(file);
        var f = this._byPath[file];
        if (f) return f.contentLength;
      }
      DOMDrive.prototype.storedSize;
    
      /**
       * @this {DOMDrive}
       * @param {string} file
       * @param {string} content
       * @param {string=} encoding
       */
      function write(file, content, encoding) {
    
        var totalDelta = 0;
    
        var file = normalizePath(file);
        var f = this._byPath[file];
    
        if (content === null) {
          // removal
          if (f) {
            totalDelta -= f.contentLength;
            var parentElem = f.node.parentElement || f.node.parentNode;
            if (parentElem)
              parentElem.removeChild(f.node);
            delete this._byPath[file];
          }
        }
        else {
          if (f) { // update
            var lengthBefore = f.contentLength;
            if (!f.write(content, encoding)) return; // no changes - no update for timestamp/totals
            totalDelta += f.contentLength - lengthBefore;
          }
          else { // addition
            var comment = document.createComment('');
            var f = new DOMFile(comment, file, null, 0, 0);
            f.write(content, encoding);
    
            this._anchorNeeded();
    
            this._document.body.insertBefore(f.node, this._anchorNode || null);
            this._anchorNode = f.node; // next time insert before this node
            this._byPath[file] = f;
            totalDelta += f.contentLength;
          }
        }
    
        this._totals.timestamp = this.timestamp;
        this._totals.totalSize += totalDelta;
        this._totals.updateNode();
      }
      DOMDrive.prototype.write = write;
    
      /**
       * @this {DOMDrive}
       */
      function loadProgress() {
        return { total: this._totals ? this._totals.totalSize : this._totalSize, loaded: this._totalSize };
      }
      DOMDrive.prototype.loadProgress = loadProgress;
    
      /**
       * @this {DOMDrive}
       * @param {DOMFile | DOMTotals} entry
       */
      function continueLoad(entry) {
        if (!entry) {
          this.continueLoad = null;
          this._totals.totalSize = this._totalSize;
          this._totals.updateNode();
          return;
        }
    
        if ((entry).path) {
          var file = /** @type {DOMFile}*/(entry);
          // in case of duplicates, prefer earlier, remove latter
          if (this._byPath[file.path]) {
            if (!file.node) return;
            var p = file.node.parentElement || file.node.parentNode;
            if (p) p.removeChild(file.node);
            return;
          }
    
          this._byPath[file.path] = file;
          if (!this._anchorNode) this._anchorNode = file.node;
          this._totalSize += file.contentLength;
        }
        else {
          var totals = /** @type {DOMTotals} */(entry);
          // consider the values, but throw away the later totals DOM node
          this._totals.timestamp = Math.max(this._totals.timestamp, totals.timestamp|0);
          this._totals.totalSize = Math.max(this._totals.totalSize, totals.totalSize|0);
          if (!totals.node) return;
          var p = totals.node.parentElement || totals.node.parentNode;
          if (p) p.removeChild(totals.node);
        }
      }
      DOMDrive.prototype.continueLoad = continueLoad;
    
      function _anchorNeeded() {
        // try to insert at the start, so new files will be loaded first
        var anchor = this._anchorNode;
        if (anchor && anchor.parentElement === this._document.body) return;
    
        // this happens when filesystem is empty, or nodes got removed
        // - we try not to bubble above scripts, so boot UI is rendered fast even on slow connections
        var scripts = this._document.body.getElementsByTagName('script');
        anchor = scripts[scripts.length-1];
        if (anchor) {
          var next = anchor.nextSibling;
          if (!next && anchor.parentNode)
            next = anchor.parentNode.nextSibling;
          anchor = next;
        }
    
        if (anchor) this._anchorNode = anchor;
      }
      DOMDrive.prototype._anchorNeeded = _anchorNeeded;

      return DOMDrive;
    })();


    var MountedDrive = (function() {
    
      /**
       * @class
       * @param {persistence.Drive.Detached.DOMDrive} dom
       * @param {persistence.Drive.Shadow} shadow
       */
      function MountedDrive(dom, shadow) {
        this.timestamp = this._dom.timestamp;
        this._dom = dom;
        this._shadow = shadow;
        this.updateTime = true;
        this._cachedFiles = null;
      }
    
      /**
       * @this {MountedDrive}
       * @returns {string[]}
       */
      function files() {
        if (!this._cachedFiles)
          this._cachedFiles = this._dom.files();
    
        return this._cachedFiles.slice(0);
      }
      MountedDrive.prototype.files = files;
    
      /**
       * @this {MountedDrive}
       * @param {string} file
       * @returns {string | undefined}
       */
      function read(file) {
        return this._dom.read(file);
      }
      MountedDrive.prototype.read = read;
    
      /**
       * @this {MountedDrive}
       * @param {string} file
       * @returns {number | undefined}
       */
      function storedSize(file) {
        if (typeof this._dom.storedSize === 'function')
          return this._dom.storedSize(file);
      }
      MountedDrive.prototype.storedSize = storedSize;
    
      /**
       * @this {MountedDrive}
       * @param {string} file
       * @param {string} content
       */
      function write(file, content) {
        if (this.updateTime)
          this.timestamp = +new Date();
    
        this._cachedFiles = null;
    
        this._dom.timestamp = this.timestamp;
    
        const encoded = typeof content === 'undefined' || content === null ? null : bestEncode(content);
    
        if (encoded)
          this._dom.write(file, encoded.content, encoded.encoding);
        else
          this._dom.write(file, null);
    
        if (this._shadow) {
          this._shadow.timestamp = this.timestamp;
          if (encoded)
            this._shadow.write(file, encoded.content, encoded.encoding);
          else
            this._shadow.write(file, null);
        }
      }
      MountedDrive.prototype.write = write;
      
      return MountedDrive;
    })();


    var encodings = (function() {

      /**
       * @param {string} text
       * @returns {string}
       */
      function CR(text) {
        return text.replace(/\r\n|\n/g, '\r');
      }

      /**
       * @param {string} text
       * @returns {string}
       */
      function LF(text) {
        return text.replace(/\r\n|\r/g, '\n');
      }

      /**
       * @param {string} text
       * @returns {string}
       */
      function CRLF(text) {
        return text.replace(/(\r\n)|\r|\n/g, '\r\n');
      }

      /**
       * @param {string} text
       * @returns {any}
       */
      function json(text) {
        var result = typeof JSON ==='undefined' ? eval('(' + text + ')') : JSON.parse(text);
    
        if (result && typeof result !== 'string' && result.type) {
          var ctor = window[result.type];
          result = new ctor(result);
        }
    
        return result;
      }

      /**
       * @param {string} text
       * @returns {any}
       */
      function eval(text) {
        return (
          0,
          (typeof window !== 'undefined' && window) ? window['eval'] :
            (typeof global !== 'undefined' && global) ? global['eval'] :
              (function () { return this; })()['eval']
          )(text);
      }

      /**
       * @param {string} text
       * @returns {any}
       */
      function base64(text) {
        if (text && text.charCodeAt(0)===42) {
          var bin = _atob(text.slice(1));
          var buf = typeof Uint8Array==='function' ? new Uint8Array(bin.length) : [];
          for (var i = 0; i < bin.length; i++) {
            buf[i] = bin.charCodeAt(i);
          }
          return buf;
        }
        else {
          return _atob(text);
        }
      }

      var _btoa = typeof btoa === 'function' ? /** @param {string} text */function(text) { return btoa(text); } : null;
      var _atob = typeof atob === 'function' ? /** @param {string} text */function(text) { return atob(text); } : null;

      if (!_btoa) {
    
        var e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        _btoa = function (r) {
          for (var o, n, a = String(r), i = 0, c = e, d = ""; a.charAt(0 | i) || (c = "=", i % 1); d += c.charAt(63 & o >> 8 - i % 1 * 8)) {
            if (n = a.charCodeAt(i += .75), n > 255)
              throw new (typeof InvalidCharacterError === 'function' ? InvalidCharacterError : Error)("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
            o = o << 8 | n;
          }
          return d
        };
        _atob = function (r) {
          var o = String(r).replace(/=+$/, "");
          if (o.length % 4 == 1)
            throw new (typeof InvalidCharacterError === 'function' ? InvalidCharacterError : Error)("'atob' failed: The string to be decoded is not correctly encoded.");
            
          for (var n, a, i = 0, c = 0, d = ""; a = o.charAt(c++); ~a && (n = i % 4 ? 64 * n + a : a, i++ % 4) ? d += String.fromCharCode(255 & n >> (-2 * i & 6)) : 0)
            a = e.indexOf(a);
          return d;
        };
      }

      base64.btoa = _btoa;
      base64.atob = _atob;

      return {
        CR: CR,
        LF: LF,
        CRLF: CRLF,
        json: json,
        eval: eval,
        base64: base64
      };
    

    })();

    var attached = (function () {
      var detectLocalStorage = (function() {

        function _getLocalStorage() { typeof localStorage === 'undefined' ? void 0 : localStorage; }

        /**
         * @param {string} uniqueKey
         * @param {persistence.Drive.ErrorOrDetachedCallback} callback 
         */
        function detectLocalStorage(uniqueKey, callback) {
          try {
            var localStorageInstance = _getLocalStorage();
            if (!localStorageInstance) {
              callback('Variable localStorage is not available.');
              return;
            }
        
            var access = new LocalStorageAccess(localStorageInstance, uniqueKey);
            var dt = new LocalStorageDetached(access);
            callback(null, dt);
          } catch (error) {
            callback(error ? error.message : error);
          }
        }

        var LocalStorageAccess = (function(){
      
          /**
           * @class
           * @param {Storage} localStorage
           * @param {string} prefix
           */
          function LocalStorageAccess(localStorage, prefix) {
            this._localStorage = localStorage;
            this._prefix = prefix;
            this._cache = {};
          }
      
          /**
           * @this {LocalStorageAccess}
           * @param {string} key
           * @returns {string | undefined}
           */
          function get(key) {
            var k = this._expandKey(key);
            var r = this._localStorage.getItem(k);
            return r;
          }
          LocalStorageAccess.prototype.get = get;
      
          /**
           * @this {LocalStorageAccess}
           * @param {string} key
           * @param {string} value
           */
          function set(key, value) {
            var k = this._expandKey(key);
            try {
              return this._localStorage.setItem(k, value);
            }
            catch (error) {
              try {
                // if size is too large, try to revert
                this._localStorage.removeItem(k);
                return this._localStorage.setItem(k, value);
              }
              catch (furtherError) {
              }
            }
          }
          LocalStorageAccess.prototype.set = set;
      
          /**
           * @this {LocalStorageAccess}
           * @param {string} key
           */
          function remove(key) {
            var k = this._expandKey(key);
            return this._localStorage.removeItem(k);
          }
          LocalStorageAccess.prototype.remove = remove;
      
          /**
           * @this {LocalStorageAccess}
           * @returns {string[]}
           */
          function keys() {
            /** @type {string[]} */
            var result = [];
            var len = this._localStorage.length;
            for (var i = 0; i < len; i++) {
              const str = this._localStorage.key(i);
              if (str && str.length > this._prefix.length && str.slice(0, this._prefix.length) === this._prefix)
                result.push(str.slice(this._prefix.length));
            }
            return result;
          }
          LocalStorageAccess.prototype.keys = keys;
      
          /**
           * @this {LocalStorageAccess}
           * @param {string} key
           * @returns {string}
           */
          function _expandKey(key) {
            /** @type {string} */
            var k;
      
            if (!key) {
              k = this._prefix;
            }
            else {
              k = this._cache[key];
              if (!k)
                this._cache[key] = k = this._prefix + key;
            }
      
            return k;
          }
          LocalStorageAccess.prototype._expandKey = _expandKey;

          return LocalStorageAccess;
        })();

        var LocalStorageDetached = (function () {

          timestamp: number = 0;
      
          /**
           * @class
           * @param {LocalStorageAccess} access
           */
          function LocalStorageDetached(access) {
            this._access = access;
            var timestampStr = this._access.get('*timestamp');
            if (timestampStr && timestampStr.charAt(0)>='0' && timestampStr.charAt(0)<='9') {
              try {
                this.timestamp = parseInt(timestampStr);
              }
              catch (parseError) {
              }
            }
          }
      
          /**
           * @this {LocalStorageDetached}
           * @param {persistence.Drive.Detached.DOMUpdater} mainDrive
           * @param {persistence.Drive.Detached.CallbackWithShadow} callback
           */
          function applyTo(mainDrive, callback) {
            const keys = this._access.keys();
            for (let i = 0; i < keys.length; i++) {
              const k = keys[i];
              if (k.charCodeAt(0)===47 /* slash */) {
                const value = this._access.get(k);
                if (value && value.charCodeAt(0)===91 /* open square bracket [ */) {
                  const cl = value.indexOf(']');
                  if (cl>0 && cl < 10) {
                    const encoding = value.slice(1,cl);
                    const encFn = encodings[encoding];
                    if (typeof encFn==='function') {
                      mainDrive.write(k, value.slice(cl+1), encoding);
                      break;
                    }
                  }
                }
                mainDrive.write(k, value, 'LF');
              }
            }
      
            var shadow = new LocalStorageShadow(this._access, mainDrive.timestamp);
            callback(shadow);
          }
          LocalStorageDetached.prototype.applyTo = applyTo;
      
          /**
           * @this {LocalStorageDetached}
           * @param {persistence.Drive.Detached.CallbackWithShadow} callback
           */
          function purge(callback) {
            var keys = this._access.keys();
            for (var i = 0; i < keys.length; i++) {
              var k = keys[i];
              if (k.charAt(0)==='/') {
                var value = this._access.remove(k);
              }
            }
      
            var shadow = new LocalStorageShadow(this._access, this.timestamp);
            callback(shadow);
          }
          LocalStorageDetached.prototype.purge = purge;

          return LocalStorageDetached;
        })();

        var LocalStorageShadow = (function(){

          /**
           * @class
           * @param {LocalStorageAccess} access
           * @param {number=} timestamp
           */
          function LocalStorageShadow(access, timestamp) {
            this._access = access;
            this.timestamp = timestamp;
          }
      
          /**
           * @this {LocalStorageShadow}
           * @param {string} file
           * @param {string} content
           * @param {string} encoding
           */
          function write(file, content, encoding) {
            this._access.set(file, '['+encoding+']'+content);
            this._access.set('*timestamp', this.timestamp);
          }
          LocalStorageShadow.prototype.write = write;
      
          /**
           * @this {LocalStorageShadow}
           * @param {string} file
           */
          function forget(file) {
            this._access.remove(file);
          }
          LocalStorageShadow.prototype.forget = forget;
      
          return LocalStorageShadow;
        })();

        return detectLocalStorage;
      })();

      var detectWebSQL = (function() {

        function getOpenDatabase() {
          return typeof openDatabase !== 'function' ? null : openDatabase;
        }

        /**
         * @param {string} uniqueKey
         * @param {persistence.Drive.ErrorOrDetachedCallback} callback
         */
        function detectWebSQL(uniqueKey, callback) {
          try {

            const openDatabaseInstance = getOpenDatabase();
            if (!openDatabaseInstance) {
              callback('Variable openDatabase is not available.');
              return;
            }
        
            const dbName = uniqueKey || 'portabled';
        
            const db = openDatabaseInstance(
              dbName, // name
              1, // version
              'Portabled virtual filesystem data', // displayName
              1024 * 1024); // size
            // upgradeCallback?
        
        
            var repeatingFailures_unexpected = 0; // protect against multiple transaction errors causing one another
            var finished = false; // protect against reporting results multiple times
        
            db.readTransaction(
              function (transaction) {
        
                transaction.executeSql(
                  'SELECT value from "*metadata" WHERE name=\'editedUTC\'',
                  [],
                  function (transaction, result) {
                    /** @type {number} */
                    var editedValue;
                    if (result.rows && result.rows.length === 1) {
                      var row = result.rows.item(0);
                      var editedValueStr = row && row.value;
                      if (typeof editedValueStr === 'string') {
                        try {
                          editedValue = parseInt(editedValueStr);
                        }
                        catch (error) {
                          // unexpected value for the timestamp, continue as if no value found
                        }
                      }
                      else if (typeof editedValueStr === 'number') {
                        editedValue = editedValueStr;
                      }
                    }
        
                    finished = true;
                    callback(null, new WebSQLDetached(db, editedValue || 0, true));
                  },
                  function (transaction, sqlError) {
                    if (finished) return;
                    else finished = true;
                    // no data
                    callback(null, new WebSQLDetached(db, 0, false));
                  });
              },
              function (sqlError) {
                if (finished) return;
        
                repeatingFailures_unexpected++;
                if (repeatingFailures_unexpected>5) {
                  finished = true;
                  callback('Loading from metadata table failed, generating multiple failures ' + sqlError.message);
                  return;
                }
        
                db.transaction(
                  function (transaction) {
                    createMetadataTable(
                      transaction,
                      function (sqlError_creation) {
                        if (finished) return;
                        else finished = true;
        
                        if (sqlError_creation)
                          callback('Loading from metadata table failed: ' + sqlError.message + ' and creation metadata table failed: ' + sqlError_creation.message);
                        else
                          // original metadata access failed, but create table succeeded
                          callback(null, new WebSQLDetached(db, 0, false));
                      });
                  },
                  function (sqlError) {
                    if (finished) return;
                    else finished = true;
        
                    callback('Creating metadata table failed: ' + sqlError.message);
                  });
              });
        
          } catch (error) {
            callback(error ? error.message : error);
          }
        }

        /**
         * @param {SQLTransaction} transaction
         * @param {(error: SQLError | null) => void} callback
         */
        function createMetadataTable(transaction, callback) {
          transaction.executeSql(
            'CREATE TABLE "*metadata" (name PRIMARY KEY, value)',
            [],
            function (transaction, result) {
              callback(null);
            },
            function (transaction, sqlError) {
              callback(sqlError);
            });
        }

        var WebSQLDetached = (function (){

          /**
           * @class
           * @param {Database} db
           * @param {number} timestamp 
           * @param {boolean} metadataTableIsValid 
           */
          function WebSQLDetached(db, timestamp, metadataTableIsValid) {
            this._db = db;
            this.timestamp = timestamp;
            this._metadataTableIsValid = metadataTableIsValid;
          }
      
          /**
           * @this {WebSQLDetached}
           * @param {persistence.Drive.Detached.DOMUpdater} mainDrive
           * @param {persistence.Drive.Detached.CallbackWithShadow} callback
           */
          function applyTo(mainDrive, callback) {
            this._db.readTransaction(
              function (transaction) {
                listAllTables(
                  transaction,
                  function (tables) {
                    const ftab = getFilenamesFromTables(tables);
                    this._applyToWithFiles(transaction, ftab, mainDrive, callback);
                  },
                  function (sqlError) {
                    reportSQLError('Failed to list tables for the webSQL database.', sqlError);
                    callback(new WebSQLShadow(this._db, this.timestamp, this._metadataTableIsValid));
                  });
              },
              function (sqlError) {
                reportSQLError('Failed to open read transaction for the webSQL database.', sqlError);
                callback(new WebSQLShadow(this._db, this.timestamp, this._metadataTableIsValid));
              });
          }
          WebSQLDetached.prototype.applyTo = applyTo;
      
          /**
           * @this {WebSQLDetached}
           * @param {persistence.Drive.Detached.CallbackWithShadow} callback
           */
          function purge(callback) {
            this._db.transaction(
              function (transaction) {
                 listAllTables(
                  transaction,
                  function (tables) {
                    this._purgeWithTables(transaction, tables, callback);
                  },
                  function (sqlError) {
                    reportSQLError('Failed to list tables for the webSQL database.', sqlError);
                    callback(new WebSQLShadow(this._db, 0, false));
                  });
                },
              function (sqlError) {
                reportSQLError('Failed to open read-write transaction for the webSQL database.', sqlError);
                callback(new WebSQLShadow(this._db, 0, false));
              });
          }
          WebSQLDetached.prototype.purge = purge;
      
          /**
           * @this {WebSQLDetached}
           * @param {SQLTransaction} transaction
           * @param {{ file: string, table: string }[]} ftab
           * @param {persistence.Drive.Detached.DOMUpdater]} mainDrive
           * @param {persistence.Drive.Detached.CallbackWithShadow} callback
           */
          function _applyToWithFiles(transaction, ftab, mainDrive, callback) {
      
            if (!ftab.length) {
              callback(new WebSQLShadow(this._db, this.timestamp, this._metadataTableIsValid));
              return;
            }
      
            var reportedFileCount = 0;
      
            var completeOne = function () {
              reportedFileCount++;
              if (reportedFileCount === ftab.length) {
                callback(new WebSQLShadow(this._db, this.timestamp, this._metadataTableIsValid));
              }
            };
      
            var applyFile = 
              /**
               * @param {string} file
               * @param {string} table
               */
              function (file, table) {
                transaction.executeSql(
                  'SELECT * FROM "' + table + '"',
                  [],
                  function (transaction, result) {
                    if (result.rows.length) {
                      const row = result.rows.item(0);
                      if (row.value === null)
                        mainDrive.write(file, null);
                      else if (typeof row.value === 'string')
                        mainDrive.write(file, fromSqlText(row.value), fromSqlText(row.encoding));
                    }
                    completeOne();
                  },
                  function (sqlError) {
                    completeOne();
                  });
              };
      
            for (let i = 0; i < ftab.length; i++) {
              applyFile(ftab[i].file, ftab[i].table);
            }
      
          }
          WebSQLDetached.prototype._applyToWithFiles = _applyToWithFiles;
      
          /**
           * @this {WebSQLDetached}
           * @param {SQLTransaction} transaction
           * @param {string[]} tables
           * @param {persistence.Drive.Detached.CallbackWithShadow} callback
           */
          function _purgeWithTables(transaction, tables, callback) {
            if (!tables.length) {
              callback(new WebSQLShadow(this._db, 0, false));
              return;
            }
      
            var droppedCount = 0;
      
            const completeOne = function () {
              droppedCount++;
              if (droppedCount === tables.length) {
                callback(new WebSQLShadow(this._db, 0, false));
              }
            };
      
            for (let i = 0; i < tables.length; i++) {
              transaction.executeSql(
                'DROP TABLE "' + tables[i] + '"',
                [],
                function (transaction, result) {
                  completeOne();
                },
                function (transaction, sqlError) {
                  reportSQLError('Failed to drop table for the webSQL database.', sqlError);
                  completeOne();
                });
            }
          }
          WebSQLDetached.prototype._purgeWithTables = _purgeWithTables;

          return WebSQLDetached;
        })();

        var noop = function() {};

        var WebSQLShadow = (function (){
      
          /**
           * @class
           * @param {Database} db
           * @param {number} timestamp 
           * @param {boolean} metadataTableIsValid 
           */
          function WebSQLShadow(db, timestamp, metadataTableIsValid) {
            this._db = db;
            this.timestamp = timestamp;
            this._metadataTableIsValid = metadataTableIsValid;

            this._cachedUpdateStatementsByFile = {};

            // closures
            var _this = this;
            this.updateMetadata = 
              /** @param {SQLTransaction} transaction */
              function (transaction) { _this._updateMetadata(transaction); };

            this.updateMetdata_noMetadataCase =
              /** @param {SQLTransaction} transaction */
              function (transaction) { _this._updateMetdata_noMetadataCase(transaction); };  
          }
      
          /**
           * @this {WebSQLShadow}
           * @param {string} file
           * @param {string} content
           * @param {string} encoding
           */
          function write(file, content, encoding) {
            if (content || typeof content === 'string') {
              this._updateCore(file, content, encoding);
            }
            else {
              this._deleteAllFromTable(file);
            }
          }
          WebSQLShadow.prototype.write = write;
      
          /**
           * @this {WebSQLShadow}
           * @param {string} file
           */
          function forget(file) {
            this._dropFileTable(file);
          }
          WebSQLShadow.prototype.forget = forget;
          
          /**
           * @this {WebSQLShadow}
           * @param {string} file
           * @param {string} content
           * @param {string} encoding
           */
          function _updateCore(file, content, encoding) {
            let updateSQL = this._cachedUpdateStatementsByFile[file];
            if (!updateSQL) {
              var tableName = mangleDatabaseObjectName(file);
              updateSQL = this._createUpdateStatement(file, tableName);
            }
      
            var repeatingTransactionErrorCount_unexpected = 0;
            this._db.transaction(
              function (transaction) {
                transaction.executeSql(
                  updateSQL,
                  ['content', content, encoding],
                  this.updateMetadata,
                  function (transaction, sqlError) {
                    this._createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding)
                  });
              },
              function (sqlError) {
                repeatingTransactionErrorCount_unexpected++;
                if (repeatingTransactionErrorCount_unexpected>5) {
                  reportSQLError('Transaction failures ('+repeatingTransactionErrorCount_unexpected+') updating file "' + file + '".', sqlError);
                  return;
                }
      
                // failure might have been due to table absence?
                // -- redo with a new transaction
                this._db.transaction(
                  function (transaction) {
                    this._createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding);
                  },
                  function (sqlError_inner) {
                    // failure might have been due to *metadata table ansence
                    // -- redo with a new transaction (last attempt)
                    this._db.transaction(
                      function (transaction) {
                        this._updateMetdata_noMetadataCase(transaction);
                        // OK, once again for extremely confused browsers like Opera
                        transaction.executeSql(
                          updateSQL,
                          ['content', content, encoding],
                          this.updateMetadata,
                          function (transaction, sqlError) {
                            this._createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding)
                          });
                      },
                      function (sqlError_ever_inner) {
                        reportSQLError(
                          'Transaction failure updating file "' + file + '" '+
                          '(after '+
                          (repeatingTransactionErrorCount_unexpected>1 ? repeatingTransactionErrorCount_unexpected:'')+
                          ' errors like ' +sqlError_inner.message +' and '+sqlError_ever_inner.message+
                          ').',
                          sqlError);
                      });
                  });
              });
          }
          WebSQLShadow.prototype._updateCore = _updateCore;
      
          /**
           * @this {WebSQLShadow}
           * @param {SQLTransaction} transaction
           * @param {string} file
           * @param {string} tableName
           * @param {string} updateSQL
           * @param {srting} content
           * @param {string} encoding
           */
          function _createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding) {
            if (!tableName)
              tableName = mangleDatabaseObjectName(file);
      
            transaction.executeSql(
              'CREATE TABLE "' + tableName + '" (name PRIMARY KEY, value, encoding)',
              [],
              function (transaction, result) {
                transaction.executeSql(
                  updateSQL,
                  ['content', content, encoding],
                  this.updateMetadata,
                  function (transaction, sqlError) {
                    reportSQLError('Failed to update table "' + tableName + '" for file "' + file + '" after creation.', sqlError);
                  });
              },
              function (transaction, sqlError) {
                reportSQLError('Failed to create a table "' + tableName + '" for file "' + file + '".', sqlError);
              });
          }
          WebSQLShadow.prototype._createTableAndUpdate = _createTableAndUpdate;
      
          /**
           * @this {WebSQLShadow}
           * @param {string} file
           */
          function _deleteAllFromTable(file) {
            const tableName = mangleDatabaseObjectName(file);
            this._db.transaction(
              function (transaction) {
                transaction.executeSql(
                  'DELETE FROM TABLE "' + tableName + '"',
                  [],
                  this.updateMetadata,
                  function (transaction, sqlError) {
                    reportSQLError('Failed to delete all from table "' + tableName + '" for file "' + file + '".', sqlError);
                  });
              },
              function sqlError() {
                reportSQLError('Transaction failure deleting all from table "' + tableName + '" for file "' + file + '".', sqlError);
              });
          }
          WebSQLShadow.prototype._deleteAllFromTable = _deleteAllFromTable;
      
          /**
           * @this {WebSQLShadow}
           * @param {string} file
           */
          function _dropFileTable(file) {
            const tableName = mangleDatabaseObjectName(file);
            this._db.transaction(
              function (transaction) {
                transaction.executeSql(
                  'DROP TABLE "' + tableName + '"',
                  [],
                  this.updateMetadata,
                  function (transaction, sqlError) {
                    reportSQLError('Failed to drop table "' + tableName + '" for file "' + file + '".', sqlError);
                  });
              },
              function sqlError() {
                reportSQLError('Transaction failure dropping table "' + tableName + '" for file "' + file + '".', sqlError);
              });
          }
          WebSQLShadow.prototype._dropFileTable = _dropFileTable;
      
          /**
           * @this {WebSQLShadow}
           * @param {SQLTransaction} transaction
           */
          function _updateMetadata(transaction) {
            transaction.executeSql(
              'INSERT OR REPLACE INTO "*metadata" VALUES (?,?)',
              ['editedUTC', this.timestamp],
              noop, // TODO: generate closure statically
              this.updateMetdata_noMetadataCase);
          }
          WebSQLShadow.prototype._updateMetadata = _updateMetadata;

      
          /**
           * @this {WebSQLShadow}
           * @param {SQLTransaction} transaction
           */
          function _updateMetdata_noMetadataCase(transaction) {
            createMetadataTable(
              transaction,
              function (sqlerr) {
                if (sqlerr) {
                  reportSQLError('Failed create metadata table.', sqlerr);
                  return;
                }
      
                transaction.executeSql(
                  'INSERT OR REPLACE INTO "*metadata" VALUES (?,?)',
                  ['editedUTC', this.timestamp],
                  function (tr, result) {
                    // OK
                  },
                  function (tr, sqlerr) {
                    reportSQLError('Failed to update metadata table after creation.', sqlerr);
                  });
              });
          }
          WebSQLShadow.prototype._updateMetdata_noMetadataCase = _updateMetdata_noMetadataCase;
      
          /**
           * @this {WebSQLShadow}
           * @param {string} file
           * @param {string} tableName
           * @returns {string}
           */
          function _createUpdateStatement(file, tableName) {
            return this._cachedUpdateStatementsByFile[file] =
              'INSERT OR REPLACE INTO "' + tableName + '" VALUES (?,?,?)';
          }
          WebSQLShadow.prototype._createUpdateStatement = _createUpdateStatement;

          return WebSQLShadow;
        })();

        /**
         * @param {string} name
         * @returns {string}
         */
        function mangleDatabaseObjectName(name) {
          // no need to polyfill btoa, if webSQL exists
          if (name.toLowerCase() === name)
            return name;
          else
            return '=' + btoa(name);
        }
      
        /**
         * @param {string} name
         * @returns {string | null}
         */
        function unmangleDatabaseObjectName(name) {
          if (!name || name.charAt(0) === '*') return null;
      
          if (name.charAt(0) !== '=') return name;
      
          try {
            return atob(name.slice(1));
          }
          catch (error) {
            return name;
          }
        }

        return detectWebSQL;
      })();

      var detectIndexedDB = (function() {

        function _getIndexedDB() { return typeof indexedDB === 'undefined' || typeof indexedDB.open !== 'function' ? void 0 : indexedDB; }

        /**
         * @param {string} uniqueKey
         * @param {persistence.Drive.ErrorOrDetachedCallback} callback
         */
        function detectIndexedDB(uniqueKey, callback) {
          try {
      
            // Firefox fires global window.onerror
            // when indexedDB.open is called in private mode
            // (even though it still reports failure in request.onerror and DOES NOT throw anything)
            var needsFirefoxPrivateModeOnerrorWorkaround =
                typeof document !== 'undefined' && document && document.documentElement && document.documentElement.style
                && 'MozAppearance' in document.documentElement.style;
      
            if (needsFirefoxPrivateModeOnerrorWorkaround) {
              try {
      
                detectCore(
                  uniqueKey,
                  /**
                   * @param {string | null} error
                   * @param {persistence.Drive.Detached=} detached 
                   */
                  function (error, detached) {
                    callback(error, detached);
        
                    // the global window.onerror will fire AFTER request.onerror,
                    // so here we temporarily install a dummy handler for it
                    var tmp_onerror = onerror;
                    onerror = function() { };
                    setTimeout(function() {
                      // restore on the next 'beat'
                      onerror = tmp_onerror;
                    }, 1);
        
                  });
      
              }
              catch (err) {
                callback(err.message);
              }
            }
            else {
                detectCore(uniqueKey, callback);
            }
      
          }
          catch (error) {
            callback(error.message);
          }
        }

        /**
         * @param {string} uniqueKey
         * @param {persistence.Drive.ErrorOrDetachedCallback} callback
         */
        function detectCore(uniqueKey, callback) {

          var indexedDBInstance = _getIndexedDB();
          if (!indexedDBInstance) {
            callback('Variable indexedDB is not available.');
            return;
          }
      
          var dbName = uniqueKey || 'portabled';
      
          var openRequest = indexedDBInstance.open(dbName, 1);
      
          openRequest.onerror = function (errorEvent) { callback('Opening database error: '+getErrorMessage(errorEvent)); };
      
          openRequest.onupgradeneeded = createDBAndTables;
      
          openRequest.onsuccess = function (event) {
            /** @type {IDBDatabase} */
            var db = openRequest.result;
      
            try {
              var transaction = db.transaction(['files', 'metadata']);
              // files mentioned here, but not really used to detect
              // broken multi-store transaction implementation in Safari
      
              transaction.onerror = function (errorEvent) {
                callback('Transaction error: '+getErrorMessage(errorEvent));
              };
      
              var metadataStore = transaction.objectStore('metadata');
              var filesStore = transaction.objectStore('files');
              var editedUTCRequest = metadataStore.get('editedUTC');
            }
            catch (getStoreError) {
              callback('Cannot open database: '+getStoreError.message);
              return;
            }
      
            if (!editedUTCRequest) {
              callback('Request for editedUTC was not created.');
              return;
            }
      
            editedUTCRequest.onerror = function (errorEvent) {
              var detached = new IndexedDBDetached(db, transaction);
              callback(null, detached);
            };
      
            editedUTCRequest.onsuccess = function (event) {
              /** @type {MetadataData} */
              var result = editedUTCRequest.result;
              var detached = new IndexedDBDetached(db, transaction, result && typeof result.value === 'number' ? result.value : void 0);
              callback(null, detached);
            };
          }

          function createDBAndTables() {
            /** @type {IDBDatabase} */
            var db = openRequest.result;
            var filesStore = db.createObjectStore('files', { keyPath: 'path' });
            var metadataStore = db.createObjectStore('metadata', { keyPath: 'property' })
          }
  
          /**
           * @param {any} event
           * @returns {string}
           */
          function getErrorMessage(event) {
            if (event.message) return event.message;
            else if (event.target) return event.target.errorCode;
            return event+'';
          }
        }

        var IndexedDBDetached = (function () {

          /**
           * @class
           * @param {IDBDatabase} db
           * @param {IDBTransaction=} transaction
           * @param {number=} timestamp
           */
          function IndexedDBDetached(db, transaction, timestamp) {
            this._db = db;
            this._transaction = transaction;
            this.timestamp = timestamp;

            // ensure the same transaction is used for applyTo/purge if possible
            // -- but not if it's completed
            if (this._transaction) {
              this._transaction.oncomplete = function () {
                this._transaction = void 0;
              };
            }
          }
      
          /**
           * @this {IndexedDBDetached}
           * @param {persistence.Drive.Detached.DOMUpdater} mainDrive
           * @param {persistence.Drive.Detached.CallbackWithShadow} callback
           */
          function applyTo(mainDrive, callback) {
            var transaction = this._transaction || this._db.transaction(['files', 'metadata']); // try to reuse the original opening _transaction
            var metadataStore = transaction.objectStore('metadata');
            var filesStore = transaction.objectStore('files');
      
            var onerror = function (errorEvent) {
              if (typeof console!=='undefined' && console && typeof console.error==='function')
                console.error('Could not count files store: ', errorEvent);
              callback(new IndexedDBShadow(this._db, this.timestamp));
            };
      
            try {
              var countRequest = filesStore.count();
            }
            catch (error) {
              try {
                transaction = this._db.transaction(['files', 'metadata']); // try to reuse the original opening _transaction
                metadataStore = transaction.objectStore('metadata');
                filesStore = transaction.objectStore('files');
                countRequest = filesStore.count();
              }
              catch (error) {
                onerror(error);
                return;
              }
            }
      
            countRequest.onerror = onerror;
      
            countRequest.onsuccess = function (event) {
      
              try {
                var storeCount = countRequest.result;
      
                var cursorRequest = filesStore.openCursor();
                cursorRequest.onerror = function (errorEvent) {
                  if (typeof console!=='undefined' && console && typeof console.error==='function')
                    console.error('Could not open cursor: ', errorEvent);
                  callback(new IndexedDBShadow(this._db, this.timestamp));
                };
      
                var processedCount = 0;
      
                cursorRequest.onsuccess = function (event) {
                  try {
                    var cursor = cursorRequest.result;
      
                    if (!cursor) {
                      callback(new IndexedDBShadow(this._db, this.timestamp));
                      return;
                    }
      
                    if (callback.progress)
                      callback.progress(processedCount, storeCount);
                    processedCount++;
      
                    /** @type {FileData} */
                    var result = cursor.value;
                    if (result && result.path) {
                      mainDrive.timestamp = this.timestamp;
                      mainDrive.write(result.path, result.content, result.encoding);
                    }
      
                    cursor['continue']();
                  }
                  catch (cursorContinueSuccessHandlingError) {
                    var message = 'Failing to process cursor continue';
                    try {
                      message += ' ('+processedCount+' of '+storeCount+'): ';
                    }
                    catch (ignoreDiagError) {
                      message += ': ';
                    }
      
                    if (typeof console!=='undefined' && console && typeof console.error==='function')
                      console.error(message, cursorContinueSuccessHandlingError);
                    callback(new IndexedDBShadow(this._db, this.timestamp));
                  }
      
                }; // cursorRequest.onsuccess
              }
              catch (cursorCountSuccessHandlingError) {
      
                var message = 'Failing to process cursor count';
                try {
                  message += ' ('+countRequest.result+'): ';
                }
                catch (ignoreDiagError) {
                  message += ': ';
                }
      
                if (typeof console!=='undefined' && console && typeof console.error==='function')
                  console.error(message, cursorCountSuccessHandlingError);
                callback(new IndexedDBShadow(this._db, this.timestamp));
              }
            }; // countRequest.onsuccess
          }
          IndexedDBDetached.prototype.applyTo = applyTo;
      
          /**
           * @this {IndexedDBDetached}
           * @param {persistence.Drive.Detached.CallbackWithShadow} callback
           */
          function purge(callback) {
            if (this._transaction) {
              this._transaction = void 0;
              setTimeout(function () { // avoid being in the original transaction
                this._purgeCore(callback);
              }, 1);
            }
            else {
              this._purgeCore(callback);
            }
          }
          IndexedDBDetached.prototype.purge = purge;
      
          /**
           * @this {IndexedDBDetached}
           * @param {persistence.Drive.Detached.CallbackWithShadow} callback
           */
          function _purgeCore(callback) {
            var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');
      
            var filesStore = transaction.objectStore('files');
            filesStore.clear();
      
            var metadataStore = transaction.objectStore('metadata');
            metadataStore.clear();
      
            callback(new IndexedDBShadow(this._db, -1));
          }
          IndexedDBDetached.prototype._purgeCore = _purgeCore;
      
          /**
           * @this {IndexedDBDetached}
           * @param {string[]} storeNames
           * @param {'readwrite' | null} readwrite
           * @param {(stores: IDBObjectStore[]) => void} callback
           */
          function _requestStores(storeNames, readwrite, callback) {
            /** @type {IDBObjectStore[]} */
            var stores = [];
      
            var attemptPopulateStores = function () {
              if (transaction) {
                for (var i = 0; i < storeNames.length; i++) {
                  stores[i] = transaction.objectStore(storeNames[i]);
                }
              }
            };
      
            try {
              var transaction = this._transaction;
              if (!transaction) {
                transaction = readwrite ? this._db.transaction(storeNames, readwrite) : this._db.transaction(storeNames);
                this._transaction = transaction;
              }
              attemptPopulateStores();
            }
            catch (error) {
              transaction = readwrite ? this._db.transaction(storeNames, readwrite) : this._db.transaction(storeNames);
              this._transaction = transaction;
              attemptPopulateStores();
            }
          }
          IndexedDBDetached.prototype._requestStores = _requestStores;

          return IndexedDBDetached;

          /** @typedef {{ [file: string]: { content: string | null, encoding: string | undefined } }} WriteSnapshot */

          var IndexedDBShadow = (function () {

            /**
             * @class
             * @param {IDBDatabase} db
             * @param {number=} timestamp
             */
            function IndexedDBShadow(db, timestamp) {
              this._db = db;
              this.timestamp = timestamp;
              this._lastWrite = 0;
              /** @type {WriteSnapshot} */
              this._conflatedWrites = null;
            }
        
            /**
             * @this {IndexedDBShadow}
             * @param {string} file
             * @param {string | null} content
             * @param {string | undefined} encoding
             */
            function write(file, content, encoding) {
              var now = Date.now ? Date.now() : +new Date();
              if (this._conflatedWrites || now-this._lastWrite<10) {
                if (!this._conflatedWrites) {
                  this._conflatedWrites = {};
                  var _this = this;
                  setTimeout(function () {
                    var writes = _this._conflatedWrites;
                    if (writes) {
                      _this._conflatedWrites = null;
                      _this._writeCore(writes);
                    }
                  }, 0);
                }
                this._conflatedWrites[file] = { content, encoding };
              }
              else {
                var entry = {};
                entry[file] = {content,encoding};
                this._writeCore(entry);
              }
            }
            IndexedDBShadow.prototype.write = write;
        
            /**
             * @this {IndexedDBShadow}
             * @param {WriteSnapshot} writes
             */
            function _writeCore(writes) {
              this._lastWrite = Date.now ? Date.now() : +new Date();
              var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');
              var filesStore = transaction.objectStore('files');
              var metadataStore = transaction.objectStore('metadata');
        
              for (var file in writes) if (writes.hasOwnProperty(file)) {
        
                var entry = writes[file];
        
                // no file deletion here: we need to keep account of deletions too!
                var fileData = {
                  path: file,
                  content: entry.content,
                  encoding: entry.encoding,
                  state: null
                };
        
                var putFile = filesStore.put(fileData);
              }
        
              var md = {
                property: 'editedUTC',
                value: Date.now()
              };
        
              metadataStore.put(md);
            }
            IndexedDBShadow.prototype._writeCore = _writeCore;
        
            /**
             * @this {IndexedDBShadow}
             * @param {string} file
             */
            function forget(file) {
              var transaction = this._db.transaction(['files'], 'readwrite');
              var filesStore = transaction.objectStore('files');
              filesStore['delete'](file);
            }
            IndexedDBShadow.prototype.forget = forget;

            return IndexedDBShadow;
        
          })();

          /**
           * @typedef {{
           *  path: string;
           *  content: string | null;
           *  encoding: string | undefined;
           *  state: string | null;
           * }} FileData
           * 
           * @typedef {{
           *  property: string;
           *  value: any;
           * }} MetadataData
           */
              
        })();

        return detectIndexedDB;

      })();


      return {
        localStorage: detectLocalStorage,
        webSQL: detectWebSQL,
        indexedDB: detectIndexedDB
      };
    })();

    /**
     * @param {string} content
     */
    function parseTotalsInner(content) {
      const tot = DOMTotals.tryParse({ header: content });
      if (tot) return { timestamp: tot.timestamp, totalSize: tot.totalSize };
    }
    
    /**
     * @param {string} content
     */
    function parseFileInner(content) {
    
      const cm = new CommentHeader({nodeValue: content});
      const fi = DOMFile.tryParse(cm);
    
      if (fi) return { 
        path: fi.path,
        read: function () {
          return fi.read();
       }
      };
    
    }
    
    /**
     * 
     * @param {string} html
     * @returns {{
     *  files: { path: string; content: string; start: number; end: number; }[];
     *  totals?: { size: number; timestamp: number; start: number; end: number; };
     * }}
     */
    function parseHTML(html) {
    
      /** @type {{ path: string; content: string; start: number; end: number; }[]} */
      var files = [];
      /** @type {{ timestamp: number; totalSize: number} | undefined} */
      var totals;
      /** @type {number | undefined} */
      var totalsCommentStart;
      /** @type {number | undefined} */
      var totalsCommentEnd;
    
      var scriptOrCommentStart = /(\<script[\s\>])|(\<!\-\-)/gi;
      var scriptEnd = /\<\/script\s*\>/gi;
      var commentEnd = /\-\-\>/g;
    
      var pos = 0;
      while (true) {
        scriptOrCommentStart.lastIndex = pos;
        var next = scriptOrCommentStart.exec(html);
        if (!next) break;
        pos = next.index + next[0].length;
    
        if (next[1]) { // script
          scriptEnd.lastIndex = pos;
          next = scriptEnd.exec(html);
          if (!next) break; // script tag never ends
          pos = next.index + next[0].length;
          continue; // skipped script
        }
    
        var commentStartOffset = next.index;
        var start = pos;
    
        commentEnd.lastIndex = pos;
        next = commentEnd.exec(html);
        if (!next) break; // no end of comment
    
        var end = next.index;
        var commentEndOffset = next.index+next[0].length;
    
        var inner = html.slice(start,end);
    
        pos = next.index + next[0].length;
    
        if (!totals) {
          totals = parseTotalsInner(inner);
          if (totals) {
            totalsCommentStart = commentStartOffset;
            totalsCommentEnd = commentEndOffset;
            continue;
          }
        }
    
        var fi = parseFileInner(inner);
        if (fi) files.push({path: fi.path, content: fi.read(), start: commentStartOffset, end: commentEndOffset});
      }
    
      if (totals) return { files, totals: { size:totals.totalSize, timestamp: totals.timestamp, start: totalsCommentStart, end: totalsCommentEnd } };
      else return { files };
    }

    var BootState = (function() {
    
      /**
       * @class
       * @param {Document} document
       * @param {string} uniqueKey
       * @param {persistence.Drive.Optional[]} optionalDrives
       */
      function BootState(document, uniqueKey, optionalDrives) {
        if (typeof optionalDrives === 'undefined') optionalDrives = [attached.indexedDB, attached.webSQL, attached.localStorage];
        this._document = document;
        this.uniqueKey = uniqueKey;
        this._optionalDrives = optionalDrives;

        /** @type {number | null} */
        this.domTimestamp = null;
        /** @type {number | null} */
        this.domTotalSize = null;
        /** @type {number | null} */
        this.domLoadedSize = null;
        /** @type {number | null} */
        this.loadedFileCount = null;
        /** @type {string | null} */
        this.storageName = null;
        /** @type {number | undefined} */
        this.storageTimestamp = void 0;
        this.storageLoadFailures = {};
      
        /** @type {string[]} */
        this.newDOMFiles = [];
        /** @type {string[]} */
        this.newStorageFiles = [];
      
        /** @type {((node: any, recognizedKind?: 'file' | 'totals', recognizedEntity?: any) => void) | null} */
        this.ondomnode = null;
      
        /** @type {{ [path: string]: DOMFile; }} */
        this._byPath = {};
      
        /** @type {DOMTotals | null} */
        this._totals = null;
      
        /** @type {((drive: persistence.Drive) => void) | null} */
        this._completion = null;
      
        this._anticipationSize = 0;
        /** @type {Node | null} */
        this._lastNode = null;
      
        this._currentOptionalDriveIndex = 0;
        this._shadowFinished = false;
        /** @type {persistence.Drive.Detached | null} */
        this._detachedDrive = null; // sometimes it lingers here until DOM timestamp is ready
        /** @type {persistence.Drive.Shadow | null} */
        this._shadow = null;
        this._toUpdateDOM = null;
        /** @type {string[]} */
        this._toForgetShadow = [];
        this._domFinished = false;
        this._reportedFiles = {};
      
        this._newDOMFileCache = {};
        this._newStorageFileCache = {};
  
        this._loadNextOptionalDrive();
      }
    
      /**
       * @this {BootState}
       * @param {string} path
       */
      function read(path) {
        if (this._toUpdateDOM && path in this._toUpdateDOM)
          return this._toUpdateDOM[path];
        var f = this._byPath[path];
        if (f) return f.read();
        else return null;
      }
      BootState.prototype.read = read;
    
      /**
       * @this {BootState}
       */
      function continueLoading() {
        if (!this._domFinished)
          this._continueParsingDOM(false /* toCompletion */);
    
        this.newDOMFiles = [];
        for (var k in this._newDOMFileCache) {
          if (k && k.charCodeAt(0)==47)
            this.newDOMFiles.push(k);
        }
        this._newDOMFileCache = {};
    
        this.newStorageFiles = [];
        for (var k in this._newStorageFileCache) {
          if (k && k.charCodeAt(0)==47)
            this.newStorageFiles.push(k);
        }
        this._newStorageFileCache = {};
      }
      BootState.prototype.continueLoading = continueLoading;
    
      /**
       * @this {BootState}
       * @param {(drive: persistence.Drive) => void} completion 
       */
      function finishParsing(completion) {
        if (this._domFinished) {
          try {
            // when debugging, break on any error will hit here too
            throw new Error('finishParsing should only be called once.');
          }
          catch (error) {
            if (typeof console !== 'undefined' && console && typeof console.error==='function')
              console.error(error);
          }
        }
    
        this._completion = completion;
        this._continueParsingDOM(true /* toCompletion */);
      }
      BootState.prototype.finishParsing = finishParsing;
    
      /**
       * @this {BootState}
       * @param {Node} node
       */
      function _processNode(node) {
        var cmheader = new CommentHeader(node);
    
        var file = DOMFile.tryParse(cmheader);
        if (file) {
          this._processFileNode(file);
          if (typeof this.ondomnode==='function') {
            this.ondomnode(node, 'file', file);
          }
          return;
        }
    
        var totals = DOMTotals.tryParse(cmheader);
        if (totals) {
          this._processTotalsNode(totals);
          if (typeof this.ondomnode==='function') {
            this.ondomnode(node, 'totals', totals);
          }
          return;
        }
    
        if (typeof this.ondomnode==='function') {
          this.ondomnode(node);
        }
      }
      BootState.prototype._processNode = _processNode;
    
      /**
       * @this {BootState}
       * @param {DOMTotals} totals
       */
      function _processTotalsNode(totals) {
        if (this._totals) {
          this._removeNode(totals.node);
        }
        else {
          this._totals = totals;
          this.domTimestamp = totals.timestamp;
          this.domTotalSize = Math.max(totals.totalSize, this.domTotalSize|0);
    
          var detached = this._detachedDrive;
          if (detached) {
            this._detachedDrive = null;
            this._compareTimestampsAndProceed(detached);
          }
        }
      }
      BootState.prototype._processTotalsNode = _processTotalsNode;
    
      /**
       * @this {BootState}
       * @param {DOMFile} file
       */
      function _processFileNode(file) {
        if (this._byPath[file.path]) { // a file with this name was encountered before
          // prefer earlier nodes
          this._removeNode(file.node);
          return;
        }
    
        // no updating nodes until whole DOM loaded
        // (looks like some browsers get confused by updating DOM during loading)
    
        this._byPath[file.path] = file;
        this._newDOMFileCache[file.path] = true;
    
        this.loadedFileCount++;
        this.domLoadedSize += file.contentLength;
        this.domTotalSize = Math.max(this.domTotalSize | 0, this.domLoadedSize | 0);
      }
      BootState.prototype._processFileNode = _processFileNode;
    
      /**
       * @this {BootState}
       * @param {Node} node
       */
      function _removeNode(node) {
        var parent = node.parentElement || node.parentNode;
        if (parent) parent.removeChild(node);
      }
      BootState.prototype._removeNode = _removeNode;
    
      /**
       * @this {BootState}
       * @param {boolean} toCompletion
       */
      function _continueParsingDOM(toCompletion){
    
        this.domLoadedSize -= this._anticipationSize;
        this._anticipationSize = 0;
    
        while (true) {
    
          // keep very last node unprocessed until whole document loaded
          // -- that means each iteration we find the next node, but process this._lastNode
          var nextNode = this._getNextNode();
    
          if (!nextNode && !toCompletion) {
    
            // no more nodes found, but more expected: no processing at this point
            // -- but try to estimate what part of the last known node is loaded (for better progress precision)
            if (this._lastNode && this._lastNode.nodeType===8) {
              var cmheader = new CommentHeader(this._lastNode);
              var speculativeFile = DOMFile.tryParse(cmheader);
              if (speculativeFile) {
                this._anticipationSize = speculativeFile.contentLength;
                this.domLoadedSize += this._anticipationSize;
                this.domTotalSize = Math.max(this.domTotalSize | 0, this.domLoadedSize | 0); // total should not become less that loaded
              }
            }
            return;
          }
    
          if (this._lastNode && this._lastNode.nodeType===8) {
            this._processNode(this._lastNode);
          }
          else {
            if (typeof this.ondomnode==='function') {
              this.ondomnode(this._lastNode);
            }
          }
    
          if (!nextNode) {
            // finish
            this._lastNode = null;
            this._processDOMFinished();
            return;
          }
    
          this._lastNode = nextNode;
        }
      }
      BootState.prototype._continueParsingDOM = _continueParsingDOM;
    
      /**
       * @this {BootState}
       */
      function _processDOMFinished() {
    
        this._domFinished = true;
    
        if (this._toUpdateDOM) {
    
          // these are updates from attached storage that have not been written out
          // (because files with corresponding paths don't exist in DOM)
    
          for (var path in this._toUpdateDOM) {
            /** @type {{ content: string, encoding: string } | undefined} */
            let entry;
            if (!path || path.charCodeAt(0)!==47) continue; // expect leading slash
            var content = this._toUpdateDOM[path];
            if (content && content.content && content.encoding) {
              entry = content; // content could be string or { content, encoding }
            }
    
            if (content===null) {
              var f = this._byPath[path];
              if (f) {
                delete this._byPath[path];
                this._removeNode(f.node);
              }
              else {
                if (this._shadow) this._shadow.forget(path);
                else this._toForgetShadow.push(path);
              }
            }
            else if (typeof content!=='undefined') {
              var f = this._byPath[path];
              if (f) {
                if (!entry)
                  entry = bestEncode(content); // it could already be { content, encoding }
    
                var modified = f.write(entry.content, entry.encoding);
                if (!modified) {
                  if (this._shadow) this._shadow.forget(path);
                  else this._toForgetShadow.push(path);
                }
              }
              else {
                var anchor = this._findAnchor();
                var comment = document.createComment('');
                var f = new DOMFile(comment, path, null, 0, 0);
                entry = bestEncode(content);
                f.write(entry.content, entry.encoding);
                this._byPath[path] = f;
                this._newDOMFileCache[path] = true;
                this._document.body.insertBefore(f.node, anchor);
              }
            }
          }
        }
    
        if (this._shadowFinished) {
          this._allCompleted();
          return;
        }
    
        var detached = this._detachedDrive;
        if (detached) {
          this._detachedDrive = null;
          this._compareTimestampsAndProceed(detached);
        }
      }
      BootState.prototype._processDOMFinished = _processDOMFinished;
    
      /**
       * @this {BootState}
       */
      function _finishUpdateTotals() {
        if (this._totals) {
          if (this.storageTimestamp > this.domTimestamp) {
            this._totals.timestamp = this.storageTimestamp;
            this._totals.updateNode();
          }
        }
      }
      BootState.prototype._finishUpdateTotals = _finishUpdateTotals;
    
      /**
       * @this {BootState}
       */
      function _getNextNode() {
        if (!this._lastNode) {
          var head = this._document.head || this._document.getElementsByTagName('head')[0];
          if (head) {
            var next = head.firstChild;
            if (next) return next;
          }
          var body = this._document.body;
          if (body)
            return body.firstChild;
          return null;
        }
    
        var nextNode = this._lastNode.nextSibling;
        if (!nextNode) {
          var body = this._document.body || null;
          var lastNodeParent = this._lastNode.parentNode || this._lastNode.parentElement || null;
          if (lastNodeParent!==body)
            nextNode = body.firstChild;
        }
        return nextNode;
      }
      BootState.prototype._getNextNode = _getNextNode;
    
      /**
       * @this {BootState}
       */
      function _loadNextOptionalDrive() {
        if (this._currentOptionalDriveIndex >= this._optionalDrives.length) {
    
          this._finishOptionalDetection();
          return;
        }
    
        var nextDrive = this._optionalDrives[this._currentOptionalDriveIndex];
        var _this = this;
        nextDrive(
          this._uniqueKey,
          /**
           * @param {string | null} error
           * @param {persistence.Drive.Detached} detached
           */
          function (error, detached) {
            if (detached) {
              _this.storageName = nextDrive.name;
              _this._shadowDetected(detached);
            }
            else {
              _this.storageLoadFailures[nextDrive.name] = error || 'Empty return.';
              _this._currentOptionalDriveIndex++;
              _this._loadNextOptionalDrive();
            }
          });
      }
      BootState.prototype._loadNextOptionalDrive = _loadNextOptionalDrive;
    
      /**
       * @this {BootState}
       * @param {persistence.Drive.Detached} detached
       */
      function _shadowDetected(detached) {
        this.storageTimestamp = detached.timestamp;
        if (this._totals || this._domFinished)
          this._compareTimestampsAndProceed(detached);
        else
          this._detachedDrive = detached;
      }
      BootState.prototype._shadowDetected = _shadowDetected;
    
      /**
       * @this {BootState}
       * @param {persistence.Drive.Detached} detached
       */
      function _compareTimestampsAndProceed(detached) {
        /** @type {boolean} */
        var domRecent;
        if (detached.timestamp && detached.timestamp > this.domTimestamp) domRecent = false;
        else if (!detached.timestamp && !this.domTimestamp) domRecent = false;
        else domRecent = true;
    
        if (domRecent) {
          detached.purge(shadow => {
            this._shadow = shadow;
            this._finishOptionalDetection();
          });
        }
        else {
          this._toUpdateDOM = {};
          var _this = this;
          detached.applyTo({
            timestamp: this.domTimestamp | 0,
            write:
              /**
               * @param {string} path
               * @param {any} content
               * @param {string} encoding
               */
              function (path, content, encoding) {
                _this._applyShadowToDOM(path, content, encoding);
              }
          }, shadow => {
            this._shadow = shadow;
            this._finishOptionalDetection();
          });
        }
      }
      BootState.prototype._compareTimestampsAndProceed = _compareTimestampsAndProceed;
    
      /**
       * @this {BootState}
       * @param {string} path
       * @param {any} content
       * @param {string} encoding
       */
      function _applyShadowToDOM(path, content, encoding) {
        if (this._domFinished) {
    
          var file = this._byPath[path];
          if (file) {
            if (content===null) {
              this._removeNode(file.node);
              delete this._byPath[path];
            }
            else {
              var modified = file.write(content, encoding);
              if (!modified)
                this._toForgetShadow.push(path);
            }
          }
          else {
            if (content===null) {
              this._toForgetShadow.push(path);
            }
            else {
              var anchor = this._findAnchor();
              var comment = document.createComment('');
              var f = new DOMFile(comment, path, null, 0, 0);
              f.write(content, encoding);
              this._document.body.insertBefore(f.node, anchor);
              this._byPath[path] = f;
              this._newDOMFileCache[path] = true;
            }
          }
          this._newStorageFileCache[path] = true;
        }
        else {
          if (!this._toUpdateDOM)
            this._toUpdateDOM = {};
    
          this._toUpdateDOM[path] = encoding ? { content, encoding } : content;
          this._newStorageFileCache[path] = true;
        }
      }
      BootState.prototype._applyShadowToDOM = _applyShadowToDOM;
    
      /**
       * @this {BootState}
       */
      function _findAnchor() {
        /** @type {Node | null} */
        var anchor = null;
        for (var k in this._byPath) if (k && k.charCodeAt(0)===47) {
          anchor = this._byPath[k].node;
        }
        if (!anchor) {
          var scripts = this._document.getElementsByTagName('script');
          anchor = scripts[scripts.length-1];
        }
        return anchor;
      }
      BootState.prototype._findAnchor = _findAnchor;
    
      /**
       * @this {BootState}
       */
      function _finishOptionalDetection() {
    
        if (this._shadow) {
          for (var i = 0; i < this._toForgetShadow.length; i++) {
            this._shadow.forget(this._toForgetShadow[i]);
          }
        }
    
        this._shadowFinished = true;
    
        if (this._domFinished){
          this._allCompleted();
        }
      }
      BootState.prototype._finishOptionalDetection = _finishOptionalDetection;
    
      /**
       * @this {BootState}
       */
      function _createSynteticTotals() {
        const comment = this._document.createComment('');
        const totalsParent =
          this._document.head
          || (this._document.getElementsByTagName('head') && this._document.getElementsByTagName('head')[0])
          || this._document.body;
        totalsParent.appendChild(comment);
        this._totals = new DOMTotals(this.domTimestamp | 0, this.domTotalSize | 0, comment);
        this._totals.updateNode();
      }
      BootState.prototype._createSynteticTotals = _createSynteticTotals;
    
      /**
       * @this {BootState}
       */
      function _allCompleted() {
        this._finishUpdateTotals();
    
        /** @type {DOMFile[]} */
        var domFiles = [];
        for (var path in this._byPath) {
          if (!path || path.charCodeAt(0)!==47) continue; // expect leading slash
          domFiles.push(this._byPath[path]);
        }
    
        if (!this._totals)
          this._createSynteticTotals();
    
        var domDrive = new DOMDrive(this._totals, domFiles, this._document);
        var mountDrive = new MountedDrive(domDrive, this._shadow);
        this._completion(mountDrive);
      }
      BootState.prototype._allCompleted = _allCompleted;

      return BootState;
    })();
    
    function getDocument() { return typeof document === 'undefined' ? void 0 : document; }

    /**
     * @param {Document=} document
     * @param {string=} uniqueKey
     * @param {persistence.Drive.Optional[]=} optionalDrives 
     */
    function persistence(document, uniqueKey, optionalDrives) {
      if (typeof document === 'undefined') {
        document = getDocument();
        if (!document) {
          if (typeof console !== 'undefined' && console && typeof console.warn === 'function')
            console.warn('Persistence relies on browser DOM.');
            return;
        }
      }

      return new BootState(document, uniqueKey, optionalDrives);
    }

    persistence.formatTotalsInner = formatTotalsInner;
    persistence.formatDate = DOMTotals.formatDate;
    persistence.formatSize = DOMTotals.formatSize;
    persistence.formatFileInner = formatFileInner;
    persistence.parseTotalsInner = parseTotalsInner;
    persistence.parseFileInner = parseFileInner;
    persistence.parseHTML = parseHTML;
    persistence.attached = attached;
    persistence.encodings = encodings;
    persistence.bestEncode = bestEncode;

    return persistence;
  })();

  var portabled = {
    persistence: persistence
  };

  return portabled;

})()