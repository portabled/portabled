"use strict";
var BootState = /** @class */ (function () {
    function BootState(_document, _uniqueKey, _optionalDrives) {
        if (_optionalDrives === void 0) { _optionalDrives = [attached.indexedDB, attached.webSQL, attached.localStorage]; }
        this._document = _document;
        this._uniqueKey = _uniqueKey;
        this._optionalDrives = _optionalDrives;
        this.domTimestamp = null;
        this.domTotalSize = null;
        this.domLoadedSize = null;
        this.loadedFileCount = null;
        this.storageName = null;
        this.storageTimestamp = null;
        this.storageLoadFailures = {};
        this.newDOMFiles = [];
        this.newStorageFiles = [];
        this.ondomnode = null;
        this._byPath = {};
        this._totals = null;
        this._completion = null;
        this._anticipationSize = 0;
        this._lastNode = null;
        this._currentOptionalDriveIndex = 0;
        this._shadowFinished = false;
        this._detachedDrive = null; // sometimes it lingers here until DOM timestamp is ready
        this._shadow = null;
        this._toUpdateDOM = null;
        this._toForgetShadow = [];
        this._domFinished = false;
        this._reportedFiles = {};
        this._newDOMFileCache = {};
        this._newStorageFileCache = {};
        this._loadNextOptionalDrive();
    }
    BootState.prototype.read = function (path) {
        if (this._toUpdateDOM && path in this._toUpdateDOM)
            return this._toUpdateDOM[path];
        var f = this._byPath[path];
        if (f)
            return f.read();
        else
            return null;
    };
    BootState.prototype.continueLoading = function () {
        if (!this._domFinished)
            this._continueParsingDOM(false /* toCompletion */);
        this.newDOMFiles = [];
        for (var k in this._newDOMFileCache) {
            if (k && k.charCodeAt(0) == 47)
                this.newDOMFiles.push(k);
        }
        this._newDOMFileCache = {};
        this.newStorageFiles = [];
        for (var k in this._newStorageFileCache) {
            if (k && k.charCodeAt(0) == 47)
                this.newStorageFiles.push(k);
        }
        this._newStorageFileCache = {};
    };
    BootState.prototype.finishParsing = function (completion) {
        if (this._domFinished) {
            try {
                // when debugging, break on any error will hit here too
                throw new Error('finishParsing should only be called once.');
            }
            catch (error) {
                if (typeof console !== 'undefined' && console && typeof console.error === 'function')
                    console.error(error);
            }
        }
        this._completion = completion;
        this._continueParsingDOM(true /* toCompletion */);
    };
    BootState.prototype._processNode = function (node) {
        var cmheader = new CommentHeader(node);
        var file = DOMFile.tryParse(cmheader);
        if (file) {
            this._processFileNode(file);
            if (typeof this.ondomnode === 'function') {
                this.ondomnode(node, 'file', file);
            }
            return;
        }
        var totals = DOMTotals.tryParse(cmheader);
        if (totals) {
            this._processTotalsNode(totals);
            if (typeof this.ondomnode === 'function') {
                this.ondomnode(node, 'totals', totals);
            }
            return;
        }
        if (typeof this.ondomnode === 'function') {
            this.ondomnode(node, null, null);
        }
    };
    BootState.prototype._processTotalsNode = function (totals) {
        if (this._totals) {
            this._removeNode(totals.node);
        }
        else {
            this._totals = totals;
            this.domTimestamp = totals.timestamp;
            this.domTotalSize = Math.max(totals.totalSize, this.domTotalSize | 0);
            var detached = this._detachedDrive;
            if (detached) {
                this._detachedDrive = null;
                this._compareTimestampsAndProceed(detached);
            }
        }
    };
    BootState.prototype._processFileNode = function (file) {
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
        this.domTotalSize = Math.max(this.domTotalSize, this.domLoadedSize);
    };
    BootState.prototype._removeNode = function (node) {
        var parent = node.parentElement || node.parentNode;
        if (parent)
            parent.removeChild(node);
    };
    BootState.prototype._continueParsingDOM = function (toCompletion) {
        this.domLoadedSize -= this._anticipationSize;
        this._anticipationSize = 0;
        while (true) {
            // keep very last node unprocessed until whole document loaded
            // -- that means each iteration we find the next node, but process this._lastNode
            var nextNode = this._getNextNode();
            if (!nextNode && !toCompletion) {
                // no more nodes found, but more expected: no processing at this point
                // -- but try to estimate what part of the last known node is loaded (for better progress precision)
                if (this._lastNode && this._lastNode.nodeType === 8) {
                    var cmheader = new CommentHeader(this._lastNode);
                    var speculativeFile = DOMFile.tryParse(cmheader);
                    if (speculativeFile) {
                        this._anticipationSize = speculativeFile.contentLength;
                        this.domLoadedSize = this.domLoadedSize + this._anticipationSize;
                        this.domTotalSize = Math.max(this.domTotalSize, this.domLoadedSize); // total should not become less that loaded
                    }
                }
                return;
            }
            if (this._lastNode && this._lastNode.nodeType === 8) {
                this._processNode(this._lastNode);
            }
            else {
                if (typeof this.ondomnode === 'function') {
                    this.ondomnode(this._lastNode, null, null);
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
    };
    BootState.prototype._processDOMFinished = function () {
        this._domFinished = true;
        if (this._toUpdateDOM) {
            // these are updates from attached storage that have not been written out
            // (because files with corresponding paths don't exist in DOM)
            for (var path in this._toUpdateDOM) {
                var entry = void 0;
                if (!path || path.charCodeAt(0) !== 47)
                    continue; // expect leading slash
                var content = this._toUpdateDOM[path];
                if (content && content.content && content.encoding) {
                    entry = content; // content could be string or { content, encoding }
                }
                if (content === null) {
                    var f = this._byPath[path];
                    if (f) {
                        delete this._byPath[path];
                        this._removeNode(f.node);
                    }
                    else {
                        if (this._shadow)
                            this._shadow.forget(path);
                        else
                            this._toForgetShadow.push(path);
                    }
                }
                else if (typeof content !== 'undefined') {
                    var f = this._byPath[path];
                    if (f) {
                        if (!entry)
                            entry = bestEncode(content); // it could already be { content, encoding }
                        var modified = f.write(entry.content, entry.encoding);
                        if (!modified) {
                            if (this._shadow)
                                this._shadow.forget(path);
                            else
                                this._toForgetShadow.push(path);
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
    };
    BootState.prototype._finishUpdateTotals = function () {
        if (this._totals) {
            if (this.storageTimestamp > this.domTimestamp) {
                this._totals.timestamp = this.storageTimestamp;
                this._totals.updateNode();
            }
        }
    };
    BootState.prototype._getNextNode = function () {
        if (!this._lastNode) {
            var head = this._document.head || this._document.getElementsByTagName('head')[0];
            if (head) {
                var next = head.firstChild;
                if (next)
                    return next;
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
            if (lastNodeParent !== body)
                nextNode = body.firstChild;
        }
        return nextNode;
    };
    BootState.prototype._loadNextOptionalDrive = function () {
        var _this = this;
        if (this._currentOptionalDriveIndex >= this._optionalDrives.length) {
            this._finishOptionalDetection();
            return;
        }
        var nextDrive = this._optionalDrives[this._currentOptionalDriveIndex];
        nextDrive.detect(this._uniqueKey, function (error, detached) {
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
    };
    BootState.prototype._shadowDetected = function (detached) {
        this.storageTimestamp = detached.timestamp;
        if (this._totals || this._domFinished)
            this._compareTimestampsAndProceed(detached);
        else
            this._detachedDrive = detached;
    };
    BootState.prototype._compareTimestampsAndProceed = function (detached) {
        var _this = this;
        var domRecent;
        if (detached.timestamp && detached.timestamp > this.domTimestamp)
            domRecent = false;
        else if (!detached.timestamp && !this.domTimestamp)
            domRecent = false;
        else
            domRecent = true;
        if (domRecent) {
            detached.purge(function (shadow) {
                _this._shadow = shadow;
                _this._finishOptionalDetection();
            });
        }
        else {
            this._toUpdateDOM = {};
            detached.applyTo({
                timestamp: this.domTimestamp,
                write: function (path, content, encoding) {
                    _this._applyShadowToDOM(path, content, encoding);
                }
            }, function (shadow) {
                _this._shadow = shadow;
                _this._finishOptionalDetection();
            });
        }
    };
    BootState.prototype._applyShadowToDOM = function (path, content, encoding) {
        if (this._domFinished) {
            var file = this._byPath[path];
            if (file) {
                if (content === null) {
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
                if (content === null) {
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
            this._toUpdateDOM[path] = encoding ? { content: content, encoding: encoding } : content;
            this._newStorageFileCache[path] = true;
        }
    };
    BootState.prototype._findAnchor = function () {
        var anchor = null;
        for (var k in this._byPath)
            if (k && k.charCodeAt(0) === 47) {
                anchor = this._byPath[k].node;
            }
        if (!anchor) {
            var scripts = this._document.getElementsByTagName('script');
            anchor = scripts[scripts.length - 1];
        }
        return anchor;
    };
    BootState.prototype._finishOptionalDetection = function () {
        if (this._shadow) {
            for (var i = 0; i < this._toForgetShadow.length; i++) {
                this._shadow.forget(this._toForgetShadow[i]);
            }
        }
        this._shadowFinished = true;
        if (this._domFinished) {
            this._allCompleted();
        }
    };
    BootState.prototype._allCompleted = function () {
        this._finishUpdateTotals();
        var domFiles = [];
        for (var path in this._byPath) {
            if (!path || path.charCodeAt(0) !== 47)
                continue; // expect leading slash
            domFiles.push(this._byPath[path]);
        }
        var domDrive = new DOMDrive(this._totals, domFiles, this._document);
        var mountDrive = new MountedDrive(domDrive, this._shadow);
        this._completion(mountDrive);
    };
    return BootState;
}());
var MountedDrive = /** @class */ (function () {
    function MountedDrive(_dom, _shadow) {
        this._dom = _dom;
        this._shadow = _shadow;
        this.updateTime = true;
        this.timestamp = 0;
        this._cachedFiles = null;
        this.timestamp = this._dom.timestamp;
    }
    MountedDrive.prototype.files = function () {
        if (!this._cachedFiles)
            this._cachedFiles = this._dom.files();
        return this._cachedFiles.slice(0);
    };
    MountedDrive.prototype.read = function (file) {
        return this._dom.read(file);
    };
    MountedDrive.prototype.storedSize = function (file) {
        return this._dom.storedSize(file);
    };
    MountedDrive.prototype.write = function (file, content) {
        if (this.updateTime)
            this.timestamp = +new Date();
        this._cachedFiles = null;
        this._dom.timestamp = this.timestamp;
        var encoded = content ? bestEncode(content) : null;
        this._dom.write(file, encoded ? encoded.content : null, encoded ? encoded.encoding : null);
        if (this._shadow) {
            this._shadow.timestamp = this.timestamp;
            this._shadow.write(file, encoded ? encoded.content : null, encoded ? encoded.encoding : null);
        }
    };
    return MountedDrive;
}());
function bestEncode(content, escapePath) {
    if (content.length > 1024 * 2) {
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
    if (typeof content !== 'string') {
        if (typeof content === 'object' && typeof content.length === 'number'
            && content.length > 16 && typeof content[0] === 'number') {
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
            if (c < 32 || c > 126 || (c === 32 && (!i || i === content.length - 1))) {
                escape = 1;
                break;
            }
        }
    }
    else {
        for (var i = 0; i < content.length; i++) {
            var c = content.charCodeAt(i);
            if (c === 10) {
                if (prevChar === 13) {
                    crCount--;
                    crlfCount++;
                }
                else {
                    lfCount++;
                }
            }
            else if (c === 13) {
                crCount++;
            }
            else if (c < 32 && c != 9) { // tab is an OK character, no need to escape
                escape++;
            }
            else if (c > 126) {
                escapeHigh++;
            }
            prevChar = c;
            if ((escape + escapeHigh) > maxEscape)
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
        var result = content.replace(/\"\u0000|\u0001|\u0002|\u0003|\u0004|\u0005|\u0006|\u0007|\u0008|\u0009|\u00010|\u00011|\u00012|\u00013|\u00014|\u00015|\u0016|\u0017|\u0018|\u0019|\u0020|\u0021|\u0022|\u0023|\u0024|\u0025|\u0026|\u0027|\u0028|\u0029|\u0030|\u0031/g, function (chr) {
            return chr === '\t' ? '\\t' :
                chr === '\r' ? '\\r' :
                    chr === '\n' ? '\\n' :
                        chr === '\"' ? '\\"' :
                            chr < '\u0010' ? '\\u000' + chr.charCodeAt(0).toString(16) :
                                '\\u00' + chr.charCodeAt(0).toString(16);
        });
        return result;
    }
}
function _encodeNumberArrayToBase64(content) {
    var str = '';
    for (var i = 0; i < content.length; i++) {
        str += String.fromCharCode(content[i]);
    }
    var b64 = '*' + encodings.base64.btoa(str);
    return b64;
}
function _encodeArrayOrSimilarAsJSON(content) {
    var type = content instanceof Array ? null : content.constructor.name || content.type;
    if (typeof JSON !== 'undefined' && typeof JSON.stringify === 'function') {
        if (type) {
            var wrapped = { type: type, content: content };
            var wrappedJSON = JSON.stringify(wrapped);
            return wrappedJSON;
        }
        else {
            var contentJSON = JSON.stringify(content);
            return contentJSON;
        }
    }
    else {
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
            if (i)
                jsonArr.push(',');
            jsonArr.push(content[i]);
        }
        if (type)
            jsonArr.push(']}');
        else
            jsonArr.push(']');
        return jsonArr.join('');
    }
}
function formatTotalsInner(timestamp, totalSize) {
    var tot = new DOMTotals(timestamp, totalSize, /*node*/ null);
    return tot.updateNode();
}
function formatFileInner(path, content) {
    var fi = new DOMFile(/*node*/ null, path, null, 0, 0);
    var entry = bestEncode(content);
    return fi.write(entry.content, entry.encoding);
}
function normalizePath(path) {
    if (!path)
        return '/'; // empty paths converted to root
    if (path.charAt(0) !== '/') // ensuring leading slash
        path = '/' + path;
    path = path.replace(/\/\/*/g, '/'); // replacing duplicate slashes with single
    return path;
}
function parseTotalsInner(content) {
    var tot = DOMTotals.tryParse({ header: content });
    if (tot)
        return { timestamp: tot.timestamp, totalSize: tot.totalSize };
}
function parseFileInner(content) {
    var cm = new CommentHeader({ nodeValue: content });
    var fi = DOMFile.tryParse(cm);
    if (fi)
        return { path: fi.path, read: function () { return fi.read(); } };
}
function parseHTML(html) {
    var files = [];
    var totals = null;
    var totalsCommentStart;
    var totalsCommentEnd;
    var scriptOrCommentStart = /(\<script[\s\>])|(\<!\-\-)/gi;
    var scriptEnd = /\<\/script\s*\>/gi;
    var commentEnd = /\-\-\>/g;
    var pos = 0;
    while (true) {
        scriptOrCommentStart.lastIndex = pos;
        var next = scriptOrCommentStart.exec(html);
        if (!next)
            break;
        pos = next.index + next[0].length;
        if (next[1]) { // script
            scriptEnd.lastIndex = pos;
            next = scriptEnd.exec(html);
            if (!next)
                break; // script tag never ends
            pos = next.index + next[0].length;
            continue; // skipped script
        }
        var commentStartOffset = next.index;
        var start = pos;
        commentEnd.lastIndex = pos;
        next = commentEnd.exec(html);
        if (!next)
            break; // no end of comment
        var end = next.index;
        var commentEndOffset = next.index + next[0].length;
        var inner = html.slice(start, end);
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
        if (fi)
            files.push({ path: fi.path, content: fi.read(), start: commentStartOffset, end: commentEndOffset });
    }
    if (totals)
        return { files: files, totals: { size: totals.totalSize, timestamp: totals.timestamp, start: totalsCommentStart, end: totalsCommentEnd } };
    else
        return { files: files };
}
//declare var onerror;
function _getIndexedDB() {
    return typeof indexedDB === 'undefined' || typeof indexedDB.open !== 'function' ? null : indexedDB;
}
var attached;
(function (attached) {
    var indexedDB;
    (function (indexedDB) {
        indexedDB.name = 'indexedDB';
        function detect(uniqueKey, callback) {
            try {
                // Firefox fires global window.onerror
                // when indexedDB.open is called in private mode
                // (even though it still reports failure in request.onerror and DOES NOT throw anything)
                var needsFirefoxPrivateModeOnerrorWorkaround = typeof document !== 'undefined' && document.documentElement && document.documentElement.style
                    && 'MozAppearance' in document.documentElement.style;
                if (needsFirefoxPrivateModeOnerrorWorkaround) {
                    try {
                        detectCore(uniqueKey, function (error, detached) {
                            callback(error, detached);
                            // the global window.onerror will fire AFTER request.onerror,
                            // so here we temporarily install a dummy handler for it
                            var tmp_onerror = onerror;
                            onerror = function () { };
                            setTimeout(function () {
                                // restore on the next 'beat'
                                onerror = tmp_onerror;
                            }, 1);
                        });
                    }
                    catch (err) {
                        callback(err.message, null);
                    }
                }
                else {
                    detectCore(uniqueKey, callback);
                }
            }
            catch (error) {
                callback(error.message, null);
            }
        }
        indexedDB.detect = detect;
        function detectCore(uniqueKey, callback) {
            var indexedDBInstance = _getIndexedDB();
            if (!indexedDBInstance) {
                callback('Variable indexedDB is not available.', null);
                return;
            }
            var dbName = uniqueKey || 'portabled';
            var openRequest = indexedDBInstance.open(dbName, 1);
            openRequest.onerror = function (errorEvent) { return callback('Opening database error: ' + getErrorMessage(errorEvent), null); };
            openRequest.onupgradeneeded = createDBAndTables;
            openRequest.onsuccess = function (event) {
                var db = openRequest.result;
                try {
                    var transaction = db.transaction(['files', 'metadata']);
                    // files mentioned here, but not really used to detect
                    // broken multi-store transaction implementation in Safari
                    transaction.onerror = function (errorEvent) { return callback('Transaction error: ' + getErrorMessage(errorEvent), null); };
                    var metadataStore = transaction.objectStore('metadata');
                    var filesStore = transaction.objectStore('files');
                    var editedUTCRequest = metadataStore.get('editedUTC');
                }
                catch (getStoreError) {
                    callback('Cannot open database: ' + getStoreError.message, null);
                    return;
                }
                if (!editedUTCRequest) {
                    callback('Request for editedUTC was not created.', null);
                    return;
                }
                editedUTCRequest.onerror = function (errorEvent) {
                    var detached = new IndexedDBDetached(db, transaction, null);
                    callback(null, detached);
                };
                editedUTCRequest.onsuccess = function (event) {
                    var result = editedUTCRequest.result;
                    var detached = new IndexedDBDetached(db, transaction, result && typeof result.value === 'number' ? result.value : null);
                    callback(null, detached);
                };
            };
            function createDBAndTables() {
                var db = openRequest.result;
                var filesStore = db.createObjectStore('files', { keyPath: 'path' });
                var metadataStore = db.createObjectStore('metadata', { keyPath: 'property' });
            }
        }
        function getErrorMessage(event) {
            if (event.message)
                return event.message;
            else if (event.target)
                return event.target.errorCode;
            return event + '';
        }
        var IndexedDBDetached = /** @class */ (function () {
            function IndexedDBDetached(_db, _transaction, timestamp) {
                var _this = this;
                this._db = _db;
                this._transaction = _transaction;
                this.timestamp = timestamp;
                // ensure the same transaction is used for applyTo/purge if possible
                // -- but not if it's completed
                if (this._transaction) {
                    this._transaction.oncomplete = function () {
                        _this._transaction = null;
                    };
                }
            }
            IndexedDBDetached.prototype.applyTo = function (mainDrive, callback) {
                var _this = this;
                var transaction = this._transaction || this._db.transaction(['files', 'metadata']); // try to reuse the original opening _transaction
                var metadataStore = transaction.objectStore('metadata');
                var filesStore = transaction.objectStore('files');
                var onerror = function (errorEvent) {
                    if (typeof console !== 'undefined' && console && typeof console.error === 'function')
                        console.error('Could not count files store: ', errorEvent);
                    callback(new IndexedDBShadow(_this._db, _this.timestamp));
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
                            if (typeof console !== 'undefined' && console && typeof console.error === 'function')
                                console.error('Could not open cursor: ', errorEvent);
                            callback(new IndexedDBShadow(_this._db, _this.timestamp));
                        };
                        var processedCount = 0;
                        cursorRequest.onsuccess = function (event) {
                            try {
                                var cursor = cursorRequest.result;
                                if (!cursor) {
                                    callback(new IndexedDBShadow(_this._db, _this.timestamp));
                                    return;
                                }
                                if (callback.progress)
                                    callback.progress(processedCount, storeCount);
                                processedCount++;
                                var result = cursor.value;
                                if (result && result.path) {
                                    mainDrive.timestamp = _this.timestamp;
                                    mainDrive.write(result.path, result.content, result.encoding);
                                }
                                cursor['continue']();
                            }
                            catch (cursorContinueSuccessHandlingError) {
                                var message = 'Failing to process cursor continue';
                                try {
                                    message += ' (' + processedCount + ' of ' + storeCount + '): ';
                                }
                                catch (ignoreDiagError) {
                                    message += ': ';
                                }
                                if (typeof console !== 'undefined' && console && typeof console.error === 'function')
                                    console.error(message, cursorContinueSuccessHandlingError);
                                callback(new IndexedDBShadow(_this._db, _this.timestamp));
                            }
                        }; // cursorRequest.onsuccess
                    }
                    catch (cursorCountSuccessHandlingError) {
                        var message = 'Failing to process cursor count';
                        try {
                            message += ' (' + countRequest.result + '): ';
                        }
                        catch (ignoreDiagError) {
                            message += ': ';
                        }
                        if (typeof console !== 'undefined' && console && typeof console.error === 'function')
                            console.error(message, cursorCountSuccessHandlingError);
                        callback(new IndexedDBShadow(_this._db, _this.timestamp));
                    }
                }; // countRequest.onsuccess
            };
            IndexedDBDetached.prototype.purge = function (callback) {
                var _this = this;
                if (this._transaction) {
                    this._transaction = null;
                    setTimeout(function () {
                        _this._purgeCore(callback);
                    }, 1);
                }
                else {
                    this._purgeCore(callback);
                }
            };
            IndexedDBDetached.prototype._purgeCore = function (callback) {
                var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');
                var filesStore = transaction.objectStore('files');
                filesStore.clear();
                var metadataStore = transaction.objectStore('metadata');
                metadataStore.clear();
                callback(new IndexedDBShadow(this._db, -1));
            };
            IndexedDBDetached.prototype._requestStores = function (storeNames, readwrite, callback) {
                var stores = [];
                var attemptPopulateStores = function () {
                    for (var i = 0; i < storeNames.length; i++) {
                        stores[i] = transaction.objectStore(storeNames[i]);
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
            };
            return IndexedDBDetached;
        }());
        var IndexedDBShadow = /** @class */ (function () {
            function IndexedDBShadow(_db, timestamp) {
                this._db = _db;
                this.timestamp = timestamp;
                this._lastWrite = 0;
                this._conflatedWrites = null;
            }
            IndexedDBShadow.prototype.write = function (file, content, encoding) {
                var _this = this;
                var now = Date.now ? Date.now() : +new Date();
                if (this._conflatedWrites || now - this._lastWrite < 10) {
                    if (!this._conflatedWrites) {
                        this._conflatedWrites = {};
                        setTimeout(function () {
                            var writes = _this._conflatedWrites;
                            _this._conflatedWrites = null;
                            _this._writeCore(writes);
                        }, 0);
                    }
                    this._conflatedWrites[file] = { content: content, encoding: encoding };
                }
                else {
                    var entry = {};
                    entry[file] = { content: content, encoding: encoding };
                    this._writeCore(entry);
                }
            };
            IndexedDBShadow.prototype._writeCore = function (writes) {
                this._lastWrite = Date.now ? Date.now() : +new Date();
                var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');
                var filesStore = transaction.objectStore('files');
                var metadataStore = transaction.objectStore('metadata');
                for (var file in writes)
                    if (writes.hasOwnProperty(file)) {
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
            };
            IndexedDBShadow.prototype.forget = function (file) {
                var transaction = this._db.transaction(['files'], 'readwrite');
                var filesStore = transaction.objectStore('files');
                filesStore['delete'](file);
            };
            return IndexedDBShadow;
        }());
    })(indexedDB = attached.indexedDB || (attached.indexedDB = {}));
})(attached || (attached = {}));
function _getLocalStorage() {
    return typeof localStorage === 'undefined' || typeof localStorage.length !== 'number' ? null : localStorage;
}
var attached;
(function (attached) {
    var localStorage;
    (function (localStorage) {
        localStorage.name = 'localStorage';
        function detect(uniqueKey, callback) {
            try {
                detectCore(uniqueKey, callback);
            }
            catch (error) {
                callback(error.message, null);
            }
        }
        localStorage.detect = detect;
        function detectCore(uniqueKey, callback) {
            var localStorageInstance = _getLocalStorage();
            if (!localStorageInstance) {
                callback('Variable localStorage is not available.', null);
                return;
            }
            var access = new LocalStorageAccess(localStorageInstance, uniqueKey);
            var dt = new LocalStorageDetached(access);
            callback(null, dt);
        }
        var LocalStorageAccess = /** @class */ (function () {
            function LocalStorageAccess(_localStorage, _prefix) {
                this._localStorage = _localStorage;
                this._prefix = _prefix;
                this._cache = {};
            }
            LocalStorageAccess.prototype.get = function (key) {
                var k = this._expandKey(key);
                var r = this._localStorage.getItem(k);
                return r;
            };
            LocalStorageAccess.prototype.set = function (key, value) {
                var k = this._expandKey(key);
                try {
                    return this._localStorage.setItem(k, value);
                }
                catch (error) {
                    try {
                        this._localStorage.removeItem(k);
                        return this._localStorage.setItem(k, value);
                    }
                    catch (furtherError) {
                    }
                }
            };
            LocalStorageAccess.prototype.remove = function (key) {
                var k = this._expandKey(key);
                return this._localStorage.removeItem(k);
            };
            LocalStorageAccess.prototype.keys = function () {
                var result = [];
                var len = this._localStorage.length;
                for (var i = 0; i < len; i++) {
                    var str = this._localStorage.key(i);
                    if (str.length > this._prefix.length && str.slice(0, this._prefix.length) === this._prefix)
                        result.push(str.slice(this._prefix.length));
                }
                return result;
            };
            LocalStorageAccess.prototype._expandKey = function (key) {
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
            };
            return LocalStorageAccess;
        }());
        var LocalStorageDetached = /** @class */ (function () {
            function LocalStorageDetached(_access) {
                this._access = _access;
                this.timestamp = 0;
                var timestampStr = this._access.get('*timestamp');
                if (timestampStr && timestampStr.charAt(0) >= '0' && timestampStr.charAt(0) <= '9') {
                    try {
                        this.timestamp = parseInt(timestampStr);
                    }
                    catch (parseError) {
                    }
                }
            }
            LocalStorageDetached.prototype.applyTo = function (mainDrive, callback) {
                var keys = this._access.keys();
                for (var i = 0; i < keys.length; i++) {
                    var k = keys[i];
                    if (k.charCodeAt(0) === 47 /* slash */) {
                        var value = this._access.get(k);
                        if (value.charCodeAt(0) === 91 /* open square bracket [ */) {
                            var cl = value.indexOf(']');
                            if (cl > 0 && cl < 10) {
                                var encoding = value.slice(1, cl);
                                var encFn = encodings[encoding];
                                if (typeof encFn === 'function') {
                                    mainDrive.write(k, value.slice(cl + 1), encoding);
                                    break;
                                }
                            }
                        }
                        mainDrive.write(k, value, 'LF');
                    }
                }
                var shadow = new LocalStorageShadow(this._access, mainDrive.timestamp);
                callback(shadow);
            };
            LocalStorageDetached.prototype.purge = function (callback) {
                var keys = this._access.keys();
                for (var i = 0; i < keys.length; i++) {
                    var k = keys[i];
                    if (k.charAt(0) === '/') {
                        var value = this._access.remove(k);
                    }
                }
                var shadow = new LocalStorageShadow(this._access, this.timestamp);
                callback(shadow);
            };
            return LocalStorageDetached;
        }());
        var LocalStorageShadow = /** @class */ (function () {
            function LocalStorageShadow(_access, timestamp) {
                this._access = _access;
                this.timestamp = timestamp;
            }
            LocalStorageShadow.prototype.write = function (file, content, encoding) {
                this._access.set(file, '[' + encoding + ']' + content);
                this._access.set('*timestamp', this.timestamp);
            };
            LocalStorageShadow.prototype.forget = function (file) {
                this._access.remove(file);
            };
            return LocalStorageShadow;
        }());
    })(localStorage = attached.localStorage || (attached.localStorage = {}));
})(attached || (attached = {}));
var attached;
(function (attached) {
    var webSQL;
    (function (webSQL) {
        function getOpenDatabase() {
            return typeof openDatabase !== 'function' ? null : openDatabase;
        }
        webSQL.name = 'webSQL';
        function detect(uniqueKey, callback) {
            try {
                detectCore(uniqueKey, callback);
            }
            catch (error) {
                callback(error.message, null);
            }
        }
        webSQL.detect = detect;
        function detectCore(uniqueKey, callback) {
            var _this = this;
            var openDatabaseInstance = getOpenDatabase();
            if (!openDatabaseInstance) {
                callback('Variable openDatabase is not available.', null);
                return;
            }
            var dbName = uniqueKey || 'portabled';
            var db = openDatabase(dbName, // name
            1, // version
            'Portabled virtual filesystem data', // displayName
            1024 * 1024); // size
            // upgradeCallback?
            var repeatingFailures_unexpected = 0; // protect against multiple transaction errors causing one another
            var finished = false; // protect against reporting results multiple times
            db.readTransaction(function (transaction) {
                transaction.executeSql('SELECT value from "*metadata" WHERE name=\'editedUTC\'', [], function (transaction, result) {
                    var editedValue = null;
                    if (result.rows && result.rows.length === 1) {
                        var editedValueStr = result.rows.item(0).value;
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
                }, function (transaction, sqlError) {
                    if (finished)
                        return;
                    else
                        finished = true;
                    // no data
                    callback(null, new WebSQLDetached(db, 0, false));
                });
            }, function (sqlError) {
                if (finished)
                    return;
                else
                    finished = true;
                repeatingFailures_unexpected++;
                if (repeatingFailures_unexpected > 5) {
                    callback('Loading from metadata table failed, generating multiple failures ' + sqlError.message, null);
                }
                _this._createMetadataTable(function (sqlError_creation) {
                    if (finished)
                        return;
                    else
                        finished = true;
                    if (sqlError)
                        callback('Loading from metadata table failed: ' + sqlError.message + ' and creation metadata table failed: ' + sqlError_creation.message, null);
                    else
                        // original metadata access failed, but create table succeeded
                        callback(null, new WebSQLDetached(db, 0, false));
                });
            });
        }
        var WebSQLDetached = /** @class */ (function () {
            function WebSQLDetached(_db, timestamp, _metadataTableIsValid) {
                this._db = _db;
                this.timestamp = timestamp;
                this._metadataTableIsValid = _metadataTableIsValid;
            }
            WebSQLDetached.prototype.applyTo = function (mainDrive, callback) {
                var _this = this;
                this._db.readTransaction(function (transaction) { return listAllTables(transaction, function (tables) {
                    var ftab = getFilenamesFromTables(tables);
                    _this._applyToWithFiles(transaction, ftab, mainDrive, callback);
                }, function (sqlError) {
                    reportSQLError('Failed to list tables for the webSQL database.', sqlError);
                    callback(new WebSQLShadow(_this._db, _this.timestamp, _this._metadataTableIsValid));
                }); }, function (sqlError) {
                    reportSQLError('Failed to open read transaction for the webSQL database.', sqlError);
                    callback(new WebSQLShadow(_this._db, _this.timestamp, _this._metadataTableIsValid));
                });
            };
            WebSQLDetached.prototype.purge = function (callback) {
                var _this = this;
                this._db.transaction(function (transaction) { return listAllTables(transaction, function (tables) {
                    _this._purgeWithTables(transaction, tables, callback);
                }, function (sqlError) {
                    reportSQLError('Failed to list tables for the webSQL database.', sqlError);
                    callback(new WebSQLShadow(_this._db, 0, false));
                }); }, function (sqlError) {
                    reportSQLError('Failed to open read-write transaction for the webSQL database.', sqlError);
                    callback(new WebSQLShadow(_this._db, 0, false));
                });
            };
            WebSQLDetached.prototype._applyToWithFiles = function (transaction, ftab, mainDrive, callback) {
                var _this = this;
                if (!ftab.length) {
                    callback(new WebSQLShadow(this._db, this.timestamp, this._metadataTableIsValid));
                    return;
                }
                var reportedFileCount = 0;
                var completeOne = function () {
                    reportedFileCount++;
                    if (reportedFileCount === ftab.length) {
                        callback(new WebSQLShadow(_this._db, _this.timestamp, _this._metadataTableIsValid));
                    }
                };
                var applyFile = function (file, table) {
                    transaction.executeSql('SELECT * FROM "' + table + '"', [], function (transaction, result) {
                        if (result.rows.length) {
                            var row = result.rows.item(0);
                            if (row.value === null)
                                mainDrive.write(file, null, null);
                            else if (typeof row.value === 'string')
                                mainDrive.write(file, fromSqlText(row.value), fromSqlText(row.encoding));
                        }
                        completeOne();
                    }, function (sqlError) {
                        completeOne();
                    });
                };
                for (var i = 0; i < ftab.length; i++) {
                    applyFile(ftab[i].file, ftab[i].table);
                }
            };
            WebSQLDetached.prototype._purgeWithTables = function (transaction, tables, callback) {
                var _this = this;
                if (!tables.length) {
                    callback(new WebSQLShadow(this._db, 0, false));
                    return;
                }
                var droppedCount = 0;
                var completeOne = function () {
                    droppedCount++;
                    if (droppedCount === tables.length) {
                        callback(new WebSQLShadow(_this._db, 0, false));
                    }
                };
                for (var i = 0; i < tables.length; i++) {
                    transaction.executeSql('DROP TABLE "' + tables[i] + '"', [], function (transaction, result) {
                        completeOne();
                    }, function (transaction, sqlError) {
                        reportSQLError('Failed to drop table for the webSQL database.', sqlError);
                        completeOne();
                    });
                }
            };
            return WebSQLDetached;
        }());
        var WebSQLShadow = /** @class */ (function () {
            function WebSQLShadow(_db, timestamp, _metadataTableIsValid) {
                var _this = this;
                this._db = _db;
                this.timestamp = timestamp;
                this._metadataTableIsValid = _metadataTableIsValid;
                this._cachedUpdateStatementsByFile = {};
                this._closures = {
                    noop: function () {
                        // nothing to do
                    },
                    updateMetadata: function (transaction) { return _this._updateMetadata(transaction); },
                    updateMetdata_noMetadataCase: function (transaction) { return _this._updateMetdata_noMetadataCase(transaction); }
                };
            }
            WebSQLShadow.prototype.write = function (file, content, encoding) {
                if (content || typeof content === 'string') {
                    this._updateCore(file, content, encoding);
                }
                else {
                    this._deleteAllFromTable(file);
                }
            };
            WebSQLShadow.prototype.forget = function (file) {
                this._dropFileTable(file);
            };
            WebSQLShadow.prototype._updateCore = function (file, content, encoding) {
                var _this = this;
                var updateSQL = this._cachedUpdateStatementsByFile[file];
                if (!updateSQL) {
                    var tableName = mangleDatabaseObjectName(file);
                    updateSQL = this._createUpdateStatement(file, tableName);
                }
                var repeatingTransactionErrorCount_unexpected = 0;
                this._db.transaction(function (transaction) {
                    transaction.executeSql(updateSQL, ['content', content, encoding], _this._closures.updateMetadata, function (transaction, sqlError) {
                        _this._createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding);
                    });
                }, function (sqlError) {
                    repeatingTransactionErrorCount_unexpected++;
                    if (repeatingTransactionErrorCount_unexpected > 5) {
                        reportSQLError('Transaction failures (' + repeatingTransactionErrorCount_unexpected + ') updating file "' + file + '".', sqlError);
                        return;
                    }
                    // failure might have been due to table absence?
                    // -- redo with a new transaction
                    _this._db.transaction(function (transaction) {
                        _this._createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding);
                    }, function (sqlError_inner) {
                        // failure might have been due to *metadata table ansence
                        // -- redo with a new transaction (last attempt)
                        _this._db.transaction(function (transaction) {
                            _this._updateMetdata_noMetadataCase(transaction);
                            // OK, once again for extremely confused browsers like Opera
                            transaction.executeSql(updateSQL, ['content', content, encoding], _this._closures.updateMetadata, function (transaction, sqlError) {
                                _this._createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding);
                            });
                        }, function (sqlError_ever_inner) {
                            reportSQLError('Transaction failure updating file "' + file + '" ' +
                                '(after ' +
                                (repeatingTransactionErrorCount_unexpected > 1 ? repeatingTransactionErrorCount_unexpected : '') +
                                ' errors like ' + sqlError_inner.message + ' and ' + sqlError_ever_inner.message +
                                ').', sqlError);
                        });
                    });
                });
            };
            WebSQLShadow.prototype._createTableAndUpdate = function (transaction, file, tableName, updateSQL, content, encoding) {
                var _this = this;
                if (!tableName)
                    tableName = mangleDatabaseObjectName(file);
                transaction.executeSql('CREATE TABLE "' + tableName + '" (name PRIMARY KEY, value, encoding)', [], function (transaction, result) {
                    transaction.executeSql(updateSQL, ['content', content, encoding], _this._closures.updateMetadata, function (transaction, sqlError) {
                        reportSQLError('Failed to update table "' + tableName + '" for file "' + file + '" after creation.', sqlError);
                    });
                }, function (transaction, sqlError) {
                    reportSQLError('Failed to create a table "' + tableName + '" for file "' + file + '".', sqlError);
                });
            };
            WebSQLShadow.prototype._deleteAllFromTable = function (file) {
                var _this = this;
                var tableName = mangleDatabaseObjectName(file);
                this._db.transaction(function (transaction) {
                    transaction.executeSql('DELETE FROM TABLE "' + tableName + '"', [], _this._closures.updateMetadata, function (transaction, sqlError) {
                        reportSQLError('Failed to delete all from table "' + tableName + '" for file "' + file + '".', sqlError);
                    });
                }, function (sqlError) {
                    reportSQLError('Transaction failure deleting all from table "' + tableName + '" for file "' + file + '".', sqlError);
                });
            };
            WebSQLShadow.prototype._dropFileTable = function (file) {
                var _this = this;
                var tableName = mangleDatabaseObjectName(file);
                this._db.transaction(function (transaction) {
                    transaction.executeSql('DROP TABLE "' + tableName + '"', [], _this._closures.updateMetadata, function (transaction, sqlError) {
                        reportSQLError('Failed to drop table "' + tableName + '" for file "' + file + '".', sqlError);
                    });
                }, function (sqlError) {
                    reportSQLError('Transaction failure dropping table "' + tableName + '" for file "' + file + '".', sqlError);
                });
            };
            WebSQLShadow.prototype._updateMetadata = function (transaction) {
                transaction.executeSql('INSERT OR REPLACE INTO "*metadata" VALUES (?,?)', ['editedUTC', this.timestamp], this._closures.noop, // TODO: generate closure statically
                this._closures.updateMetdata_noMetadataCase);
            };
            WebSQLShadow.prototype._updateMetdata_noMetadataCase = function (transaction) {
                var _this = this;
                this._createMetadataTable(transaction, function (sqlerr) {
                    if (sqlerr) {
                        reportSQLError('Failed create metadata table.', sqlerr);
                        return;
                    }
                    transaction.executeSql('INSERT OR REPLACE INTO "*metadata" VALUES (?,?)', ['editedUTC', _this.timestamp], function (tr, result) {
                        // OK
                    }, function (tr, sqlerr) {
                        reportSQLError('Failed to update metadata table after creation.', sqlerr);
                    });
                });
            };
            WebSQLShadow.prototype._createMetadataTable = function (transaction, callback) {
                transaction.executeSql('CREATE TABLE "*metadata" (name PRIMARY KEY, value)', [], function (transaction, result) {
                    return callback(null);
                }, function (transaction, sqlError) {
                    return callback(sqlError);
                });
            };
            WebSQLShadow.prototype._createUpdateStatement = function (file, tableName) {
                return this._cachedUpdateStatementsByFile[file] =
                    'INSERT OR REPLACE INTO "' + tableName + '" VALUES (?,?,?)';
            };
            return WebSQLShadow;
        }());
        function mangleDatabaseObjectName(name) {
            // no need to polyfill btoa, if webSQL exists
            if (name.toLowerCase() === name)
                return name;
            else
                return '=' + btoa(name);
        }
        function unmangleDatabaseObjectName(name) {
            if (!name || name.charAt(0) === '*')
                return null;
            if (name.charAt(0) !== '=')
                return name;
            try {
                return atob(name.slice(1));
            }
            catch (error) {
                return name;
            }
        }
        function listAllTables(transaction, callback, errorCallback) {
            transaction.executeSql('SELECT tbl_name  from sqlite_master WHERE type=\'table\'', [], function (transaction, result) {
                var tables = [];
                for (var i = 0; i < result.rows.length; i++) {
                    var row = result.rows.item(i);
                    var table = row.tbl_name;
                    if (!table || (table[0] !== '*' && table.charAt(0) !== '=' && table.charAt(0) !== '/'))
                        continue;
                    tables.push(row.tbl_name);
                }
                callback(tables);
            }, function (transaction, sqlError) { return errorCallback(sqlError); });
        }
        function getFilenamesFromTables(tables) {
            var filenames = [];
            for (var i = 0; i < tables.length; i++) {
                var file = unmangleDatabaseObjectName(tables[i]);
                if (file)
                    filenames.push({ table: tables[i], file: file });
            }
            return filenames;
        }
        function toSqlText(text) {
            if (text.indexOf('\u00FF') < 0 && text.indexOf('\u0000') < 0)
                return text;
            return text.replace(/\u00FF/g, '\u00FFf').replace(/\u0000/g, '\u00FF0');
        }
        function fromSqlText(sqlText) {
            if (sqlText.indexOf('\u00FF') < 0 && sqlText.indexOf('\u0000') < 0)
                return sqlText;
            return sqlText.replace(/\u00FFf/g, '\u00FF').replace(/\u00FF0/g, '\u0000');
        }
        function reportSQLError(message, sqlError) {
            if (typeof console !== 'undefined' && typeof console.error === 'function') {
                if (sqlError)
                    console.error(message, sqlError);
                else
                    console.error(sqlError);
            }
        }
    })(webSQL = attached.webSQL || (attached.webSQL = {}));
})(attached || (attached = {}));
var CommentHeader = /** @class */ (function () {
    function CommentHeader(node) {
        this.node = node;
        var headerLine;
        var content;
        if (typeof node.substringData === 'function'
            && typeof node.length === 'number') {
            var chunkSize = 128;
            if (node.length >= chunkSize) {
                // TODO: cut chunks off the start and look for newlines
                var headerChunks = [];
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
            this.contentLength = wholeCommentText.length - this.contentOffset;
    }
    return CommentHeader;
}());
var DOMDrive = /** @class */ (function () {
    function DOMDrive(_totals, files, _document) {
        this._totals = _totals;
        this._document = _document;
        this._byPath = {};
        this._anchorNode = null;
        this._totalSize = 0;
        for (var i = 0; i < files.length; i++) {
            this._byPath[files[i].path] = files[i];
            this._totalSize += files[i].contentLength;
            if (!this._anchorNode)
                this._anchorNode = files[i].node;
        }
        if (!this._totals) {
            var comment = this._document.createComment('');
            var parent = this._document.head || this._document.getElementsByTagName('head')[0] || this._document.body;
            parent.insertBefore(comment, parent.children ? parent.children[0] : null);
            this._totals = new DOMTotals(0, this._totalSize, comment);
        }
        this.timestamp = this._totals.timestamp;
    }
    DOMDrive.prototype.files = function () {
        if (typeof Object.keys === 'string') {
            var result = Object.keys(this._byPath);
        }
        else {
            var result = [];
            for (var k in this._byPath)
                if (this._byPath.hasOwnProperty(k)) {
                    result.push(k);
                }
        }
        result.sort();
        return result;
    };
    DOMDrive.prototype.read = function (file) {
        var file = normalizePath(file);
        var f = this._byPath[file];
        if (!f)
            return null;
        else
            return f.read();
    };
    DOMDrive.prototype.storedSize = function (file) {
        var file = normalizePath(file);
        var f = this._byPath[file];
        if (!f)
            return null;
        else
            return f.contentLength;
    };
    DOMDrive.prototype.write = function (file, content, encoding) {
        var totalDelta = 0;
        var file = normalizePath(file);
        var f = this._byPath[file];
        if (content === null) {
            // removal
            if (f) {
                totalDelta -= f.contentLength;
                var parentElem = f.node.parentElement || f.node.parentNode;
                parentElem.removeChild(f.node);
                delete this._byPath[file];
            }
        }
        else {
            if (f) { // update
                var lengthBefore = f.contentLength;
                if (!f.write(content, encoding))
                    return; // no changes - no update for timestamp/totals
                totalDelta += f.contentLength - lengthBefore;
            }
            else { // addition
                var comment = document.createComment('');
                var f = new DOMFile(comment, file, null, 0, 0);
                f.write(content, encoding);
                this._anchorNeeded();
                this._document.body.insertBefore(f.node, this._anchorNode);
                this._anchorNode = f.node; // next time insert before this node
                this._byPath[file] = f;
                totalDelta += f.contentLength;
            }
        }
        this._totals.timestamp = this.timestamp;
        this._totals.totalSize += totalDelta;
        this._totals.updateNode();
    };
    DOMDrive.prototype.loadProgress = function () {
        return { total: this._totals ? this._totals.totalSize : this._totalSize, loaded: this._totalSize };
    };
    DOMDrive.prototype.continueLoad = function (entry) {
        if (!entry) {
            this.continueLoad = null;
            this._totals.totalSize = this._totalSize;
            this._totals.updateNode();
            return;
        }
        if (entry.path) {
            var file = entry;
            // in case of duplicates, prefer earlier, remove latter
            if (this._byPath[file.path]) {
                if (!file.node)
                    return;
                var p = file.node.parentElement || file.node.parentNode;
                if (p)
                    p.removeChild(file.node);
                return;
            }
            this._byPath[file.path] = file;
            if (!this._anchorNode)
                this._anchorNode = file.node;
            this._totalSize += file.contentLength;
        }
        else {
            var totals = entry;
            // consider the values, but throw away the later totals DOM node
            this._totals.timestamp = Math.max(this._totals.timestamp, totals.timestamp | 0);
            this._totals.totalSize = Math.max(this._totals.totalSize, totals.totalSize | 0);
            if (!totals.node)
                return;
            var p = totals.node.parentElement || totals.node.parentNode;
            if (p)
                p.removeChild(totals.node);
        }
    };
    DOMDrive.prototype._anchorNeeded = function () {
        // try to insert at the start, so new files will be loaded first
        var anchor = this._anchorNode;
        if (anchor && anchor.parentElement === this._document.body)
            return;
        // this happens when filesystem is empty, or nodes got removed
        // - we try not to bubble above scripts, so boot UI is rendered fast even on slow connections
        var scripts = this._document.body.getElementsByTagName('script');
        anchor = scripts[scripts.length - 1];
        if (anchor) {
            var next = anchor.nextSibling;
            if (!next && anchor.parentNode)
                next = anchor.parentNode.nextSibling;
            anchor = next;
        }
        if (anchor)
            this._anchorNode = anchor;
    };
    return DOMDrive;
}());
var DOMFile = /** @class */ (function () {
    function DOMFile(node, path, _encoding, _contentOffset, contentLength) {
        this.node = node;
        this.path = path;
        this._encoding = _encoding;
        this._contentOffset = _contentOffset;
        this.contentLength = contentLength;
        this._encodedPath = null;
    }
    DOMFile.tryParse = function (cmheader) {
        //    /file/path/continue
        //    "/file/path/continue"
        //    /file/path/continue   [encoding]
        var parseFmt = /^\s*((\/|\"\/)(\s|\S)*[^\]])\s*(\[((\s|\S)*)\])?\s*$/;
        var parsed = parseFmt.exec(cmheader.header);
        if (!parsed)
            return null; // does not match the format
        var filePath = parsed[1];
        var encodingName = parsed[5];
        if (filePath.charAt(0) === '"') {
            if (filePath.charAt(filePath.length - 1) !== '"')
                return null; // unpaired leading quote
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
    };
    DOMFile.prototype.read = function () {
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
    };
    DOMFile.prototype.write = function (content, encoding) {
        content =
            content === null || typeof content === 'undefined' ? content :
                String(content);
        var encoded = encoding ? { content: content, encoding: encoding } : bestEncode(content);
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
        if (!this.node)
            return html; // can be used without backing 'node' for formatting purpose
        if (html === this.node.nodeValue)
            return false;
        this.node.nodeValue = html;
        this._encoding = encodings[encoded.encoding || 'LF'];
        this._contentOffset = leadText.length;
        this.contentLength = content.length;
        return true;
    };
    return DOMFile;
}());
var monthsPrettyCase = ('Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec').split('|');
var monthsUpperCaseStr = monthsPrettyCase.join('').toUpperCase();
var DOMTotals = /** @class */ (function () {
    function DOMTotals(timestamp, totalSize, node) {
        this.timestamp = timestamp;
        this.totalSize = totalSize;
        this.node = node;
        // cache after updating DOM, to avoid unneeded updates
        this._domTimestamp = -1;
        this._domTotalSize = -1;
    }
    DOMTotals.tryParse = function (cmheader) {
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
                    if (savedMonth >= 0 && savedMonth % 3 === 0)
                        savedMonth = savedMonth / 3;
                    var savedYear = parseInt(savedMatch[3]);
                    if (savedYear < 100)
                        savedYear += 2000; // no 19xx notation anymore :-(
                    var savedHour = parseInt(savedMatch[5]);
                    var savedMinute = parseInt(savedMatch[6]);
                    var savedSecond = savedMatch[8] ? parseFloat(savedMatch[8]) : 0;
                    if (savedMatch[4]) {
                        timestamp = new Date(savedYear, savedMonth, savedDay, savedHour, savedMinute, savedSecond | 0).valueOf();
                        timestamp += (savedSecond - (savedSecond | 0)) * 1000; // milliseconds
                        var savedGMTStr = savedMatch[11];
                        if (savedGMTStr) {
                            var gmtColonPos = savedGMTStr.indexOf(':');
                            if (gmtColonPos > 0) {
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
        else
            return null;
    };
    DOMTotals.prototype.updateNode = function () {
        if (this._domTimestamp === this.timestamp && this._domTotalSize === this.totalSize)
            return;
        // total 4Kb, saved 25 Apr 2015 22:52:01.231
        var newTotals = 'total ' + DOMTotals.formatSize(this.totalSize) + ', ' +
            'saved ' + DOMTotals.formatDate(new Date(this.timestamp));
        if (!this.node)
            return newTotals;
        this.node.nodeValue = newTotals;
        this._domTimestamp = this.timestamp;
        this._domTotalSize = this.totalSize;
    };
    DOMTotals.formatSize = function (totalSize) {
        return (totalSize < 1024 * 9 ? totalSize + '' :
            totalSize < 1024 * 1024 * 9 ? ((totalSize / 1024) | 0) + 'Kb' :
                ((totalSize / (1024 * 1024)) | 0) + 'Mb');
    };
    DOMTotals.formatDate = function (date) {
        var dateLocalStr = date.toString();
        var gmtMatch = (/(GMT\s*[\-\+]\d+(\:\d+)?)/i).exec(dateLocalStr);
        var d = date.getDate();
        var MMM = monthsPrettyCase[date.getMonth()];
        var yyyy = date.getFullYear();
        var h = date.getHours();
        var m = date.getMinutes();
        var s = date.getSeconds();
        var ticks = +date;
        var formatted = d +
            ' ' + MMM +
            ' ' + yyyy +
            (h > 9 ? ' ' : ' 0') + h +
            (m > 9 ? ':' : ':0') + m +
            (s > 9 ? ':' : ':0') + s +
            '.' + (ticks).toString().slice(-3) +
            (gmtMatch && gmtMatch[1] !== 'GMT+0000' ? ' ' + gmtMatch[1] : '');
        return formatted;
    };
    return DOMTotals;
}());
var encodings;
(function (encodings) {
    function CR(text) {
        return text.
            replace(/\r\n|\n/g, '\r');
    }
    encodings.CR = CR;
})(encodings || (encodings = {}));
var encodings;
(function (encodings) {
    function CRLF(text) {
        return text.
            replace(/(\r\n)|\r|\n/g, '\r\n');
    }
    encodings.CRLF = CRLF;
})(encodings || (encodings = {}));
var encodings;
(function (encodings) {
    function LF(text) {
        return text.
            replace(/\r\n|\r/g, '\n');
    }
    encodings.LF = LF;
})(encodings || (encodings = {}));
var encodings;
(function (encodings) {
    var _btoa = base64.btoa = (typeof btoa === 'function' ? (function (text) { return btoa(text); }) : null);
    var _atob = base64.atob = (typeof atob === 'function' ? (function (text) { return atob(text); }) : null);
    if (!_btoa) {
        function t(t) { this.message = t; }
        var e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        t.prototype = new Error, t.prototype.name = "InvalidCharacterError";
        base64.btoa = _btoa = function (r) {
            for (var o, n, a = String(r), i = 0, c = e, d = ""; a.charAt(0 | i) || (c = "=", i % 1); d += c.charAt(63 & o >> 8 - i % 1 * 8)) {
                if (n = a.charCodeAt(i += .75), n > 255)
                    throw new t("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
                o = o << 8 | n;
            }
            return d;
        };
        base64.atob = _atob = function (r) {
            var o = String(r).replace(/=+$/, "");
            if (o.length % 4 == 1)
                throw new t("'atob' failed: The string to be decoded is not correctly encoded.");
            for (var n, a, i = 0, c = 0, d = ""; a = o.charAt(c++); ~a && (n = i % 4 ? 64 * n + a : a, i++ % 4) ? d += String.fromCharCode(255 & n >> (-2 * i & 6)) : 0)
                a = e.indexOf(a);
            return d;
        };
    }
    function base64(text) {
        if (text && text.charCodeAt(0) === 42) {
            var bin = _atob(text.slice(1));
            var buf = typeof Uint8Array === 'function' ? new Uint8Array(bin.length) : [];
            for (var i = 0; i < bin.length; i++) {
                buf[i] = bin.charCodeAt(i);
            }
            return buf;
        }
        else {
            return _atob(text);
        }
    }
    encodings.base64 = base64;
})(encodings || (encodings = {}));
var encodings;
(function (encodings) {
    function eval(text) {
        return (0, window['eval'])(text);
    }
    encodings.eval = eval;
})(encodings || (encodings = {}));
var encodings;
(function (encodings) {
    function json(text) {
        var result = typeof JSON === 'undefined' ? encodings.eval(text) : JSON.parse(text);
        if (result && typeof result !== 'string' && result.type) {
            var ctor = window[result.type];
            result = new ctor(result);
        }
        return result;
    }
    encodings.json = json;
})(encodings || (encodings = {}));
var encodings;
(function (encodings) {
    // https://github.com/LZMA-JS/LZMA-JS [MIT licensed]
    function lzma(text) {
        var arrMark = text.charCodeAt(0) === 42;
        var unbase64 = encodings.base64.atob(text.slice(1));
        var arr = [];
        for (var i = 0; i < unbase64.length; i++) {
            var byte = unbase64.charCodeAt(i);
            arr[i] = (byte & 127) - (byte & 128);
        }
        var rawData = lzma.decompress(arr);
        if (arrMark) {
            for (var i = 0; i < rawData.length; i++) {
                rawData[i] = (rawData[i] + 256) % 256;
            }
            return rawData;
        }
        var str = '';
        for (var i = 0; i < rawData.length; i++) {
            str += String.fromCharCode((rawData[i] + 256) % 256);
        }
        return str;
    }
    encodings.lzma = lzma;
    /// (c) 2015 Nathan Rugg <nmrugg@gmail.com> | MIT
    /// See LICENSE for more details.
    /* jshint noarg:true, boss:true, unused:strict, strict:true, undef:true, noarg: true, forin:true, evil:true, newcap:false, -W041, -W021, worker:true, browser:true, node:true */
    /* global setImmediate, setTimeout, window, onmessage */
    /** xs */
    ///NOTE: This is the master file that is used to generate lzma-c.js and lzma-d.js.
    ///      Comments are used to determine which parts are to be removed.
    ///
    /// cs-ce (compression start-end)
    /// ds-de (decompression start-end)
    /// xs-xe (only in this file start-end)
    /// co    (compression only)
    /// do    (decompression only)
    /** xe */
    /* SLASH
    var LZMA = (function () {
    
        "use strict";
    
    */
    var /** cs */ action_compress = 1, 
    /** ce */
    /** ds */
    action_decompress = 2, 
    /** de */
    action_progress = 3, wait = typeof setImmediate == "function" ? setImmediate : setTimeout, __4294967296 = 4294967296, N1_longLit = [4294967295, -__4294967296], 
    /** cs */
    MIN_VALUE = [0, -9223372036854775808], 
    /** ce */
    P0_longLit = [0, 0], P1_longLit = [1, 0];
    function update_progress(percent, cbn) {
        /* SLASH
          postMessage({
            action: action_progress,
            cbn: cbn,
            result: percent
          });
        */
    }
    function initDim(len) {
        ///NOTE: This is MUCH faster than "new Array(len)" in newer versions of v8 (starting with Node.js 0.11.15, which uses v8 3.28.73).
        var a = [];
        a[len - 1] = undefined;
        return a;
    }
    function add(a, b) {
        return create(a[0] + b[0], a[1] + b[1]);
    }
    /** cs */
    function and(a, b) {
        return makeFromBits(~~Math.max(Math.min(a[1] / __4294967296, 2147483647), -2147483648) & ~~Math.max(Math.min(b[1] / __4294967296, 2147483647), -2147483648), lowBits_0(a) & lowBits_0(b));
    }
    /** ce */
    function compare(a, b) {
        var nega, negb;
        if (a[0] == b[0] && a[1] == b[1]) {
            return 0;
        }
        nega = a[1] < 0;
        negb = b[1] < 0;
        if (nega && !negb) {
            return -1;
        }
        if (!nega && negb) {
            return 1;
        }
        if (sub(a, b)[1] < 0) {
            return -1;
        }
        return 1;
    }
    function create(valueLow, valueHigh) {
        var diffHigh, diffLow;
        valueHigh %= 1.8446744073709552E19;
        valueLow %= 1.8446744073709552E19;
        diffHigh = valueHigh % __4294967296;
        diffLow = Math.floor(valueLow / __4294967296) * __4294967296;
        valueHigh = valueHigh - diffHigh + diffLow;
        valueLow = valueLow - diffLow + diffHigh;
        while (valueLow < 0) {
            valueLow += __4294967296;
            valueHigh -= __4294967296;
        }
        while (valueLow > 4294967295) {
            valueLow -= __4294967296;
            valueHigh += __4294967296;
        }
        valueHigh = valueHigh % 1.8446744073709552E19;
        while (valueHigh > 9223372032559808512) {
            valueHigh -= 1.8446744073709552E19;
        }
        while (valueHigh < -9223372036854775808) {
            valueHigh += 1.8446744073709552E19;
        }
        return [valueLow, valueHigh];
    }
    /** cs */
    function eq(a, b) {
        return a[0] == b[0] && a[1] == b[1];
    }
    /** ce */
    function fromInt(value) {
        if (value >= 0) {
            return [value, 0];
        }
        else {
            return [value + __4294967296, -__4294967296];
        }
    }
    function lowBits_0(a) {
        if (a[0] >= 2147483648) {
            return ~~Math.max(Math.min(a[0] - __4294967296, 2147483647), -2147483648);
        }
        else {
            return ~~Math.max(Math.min(a[0], 2147483647), -2147483648);
        }
    }
    /** cs */
    function makeFromBits(highBits, lowBits) {
        var high, low;
        high = highBits * __4294967296;
        low = lowBits;
        if (lowBits < 0) {
            low += __4294967296;
        }
        return [low, high];
    }
    function pwrAsDouble(n) {
        if (n <= 30) {
            return 1 << n;
        }
        else {
            return pwrAsDouble(30) * pwrAsDouble(n - 30);
        }
    }
    function shl(a, n) {
        var diff, newHigh, newLow, twoToN;
        n &= 63;
        if (eq(a, MIN_VALUE)) {
            if (!n) {
                return a;
            }
            return P0_longLit;
        }
        if (a[1] < 0) {
            throw new Error("Neg");
        }
        twoToN = pwrAsDouble(n);
        newHigh = a[1] * twoToN % 1.8446744073709552E19;
        newLow = a[0] * twoToN;
        diff = newLow - newLow % __4294967296;
        newHigh += diff;
        newLow -= diff;
        if (newHigh >= 9223372036854775807) {
            newHigh -= 1.8446744073709552E19;
        }
        return [newLow, newHigh];
    }
    function shr(a, n) {
        var shiftFact;
        n &= 63;
        shiftFact = pwrAsDouble(n);
        return create(Math.floor(a[0] / shiftFact), a[1] / shiftFact);
    }
    function shru(a, n) {
        var sr;
        n &= 63;
        sr = shr(a, n);
        if (a[1] < 0) {
            sr = add(sr, shl([2, 0], 63 - n));
        }
        return sr;
    }
    /** ce */
    function sub(a, b) {
        return create(a[0] - b[0], a[1] - b[1]);
    }
    function $ByteArrayInputStream(this$static, buf) {
        this$static.buf = buf;
        this$static.pos = 0;
        this$static.count = buf.length;
        return this$static;
    }
    /** ds */
    function $read(this$static) {
        if (this$static.pos >= this$static.count)
            return -1;
        return this$static.buf[this$static.pos++] & 255;
    }
    /** de */
    /** cs */
    function $read_0(this$static, buf, off, len) {
        if (this$static.pos >= this$static.count)
            return -1;
        len = Math.min(len, this$static.count - this$static.pos);
        arraycopy(this$static.buf, this$static.pos, buf, off, len);
        this$static.pos += len;
        return len;
    }
    /** ce */
    function $ByteArrayOutputStream(this$static) {
        this$static.buf = initDim(32);
        this$static.count = 0;
        return this$static;
    }
    function $toByteArray(this$static) {
        var data = this$static.buf;
        data.length = this$static.count;
        return data;
    }
    /** cs */
    function $write(this$static, b) {
        this$static.buf[this$static.count++] = b << 24 >> 24;
    }
    /** ce */
    function $write_0(this$static, buf, off, len) {
        arraycopy(buf, off, this$static.buf, this$static.count, len);
        this$static.count += len;
    }
    /** cs */
    function $getChars(this$static, srcBegin, srcEnd, dst, dstBegin) {
        var srcIdx;
        for (srcIdx = srcBegin; srcIdx < srcEnd; ++srcIdx) {
            dst[dstBegin++] = this$static.charCodeAt(srcIdx);
        }
    }
    /** ce */
    function arraycopy(src, srcOfs, dest, destOfs, len) {
        for (var i = 0; i < len; ++i) {
            dest[destOfs + i] = src[srcOfs + i];
        }
    }
    /** cs */
    function $configure(this$static, encoder) {
        $SetDictionarySize_0(encoder, 1 << this$static.s);
        encoder._numFastBytes = this$static.f;
        $SetMatchFinder(encoder, this$static.m);
        /// lc is always 3
        /// lp is always 0
        /// pb is always 2
        encoder._numLiteralPosStateBits = 0;
        encoder._numLiteralContextBits = 3;
        encoder._posStateBits = 2;
        ///this$static._posStateMask = (1 << pb) - 1;
        encoder._posStateMask = 3;
    }
    function $init(this$static, input, output, length_0, mode) {
        var encoder, i;
        if (compare(length_0, N1_longLit) < 0)
            throw new Error("invalid length " + length_0);
        this$static.length_0 = length_0;
        encoder = $Encoder({});
        $configure(mode, encoder);
        encoder._writeEndMark = typeof lzma.disableEndMark == "undefined";
        $WriteCoderProperties(encoder, output);
        for (i = 0; i < 64; i += 8)
            $write(output, lowBits_0(shr(length_0, i)) & 255);
        this$static.chunker = (encoder._needReleaseMFStream = 0, (encoder._inStream = input, encoder._finished = 0, $Create_2(encoder), encoder._rangeEncoder.Stream = output, $Init_4(encoder), $FillDistancesPrices(encoder), $FillAlignPrices(encoder), encoder._lenEncoder._tableSize = encoder._numFastBytes + 1 - 2, $UpdateTables(encoder._lenEncoder, 1 << encoder._posStateBits), encoder._repMatchLenEncoder._tableSize = encoder._numFastBytes + 1 - 2, $UpdateTables(encoder._repMatchLenEncoder, 1 << encoder._posStateBits), encoder.nowPos64 = P0_longLit, undefined), $Chunker_0({}, encoder));
    }
    function $LZMAByteArrayCompressor(this$static, data, mode) {
        this$static.output = $ByteArrayOutputStream({});
        $init(this$static, $ByteArrayInputStream({}, data), this$static.output, fromInt(data.length), mode);
        return this$static;
    }
    /** ce */
    /** ds */
    function $init_0(this$static, input, output) {
        var decoder, hex_length = "", i, properties = [], r, tmp_length;
        for (i = 0; i < 5; ++i) {
            r = $read(input);
            if (r == -1)
                throw new Error("truncated input");
            properties[i] = r << 24 >> 24;
        }
        decoder = $Decoder({});
        if (!$SetDecoderProperties(decoder, properties)) {
            throw new Error("corrupted input");
        }
        for (i = 0; i < 64; i += 8) {
            r = $read(input);
            if (r == -1)
                throw new Error("truncated input");
            r = r.toString(16);
            if (r.length == 1)
                r = "0" + r;
            hex_length = r + "" + hex_length;
        }
        /// Was the length set in the header (if it was compressed from a stream, the length is all f"s).
        if (/^0+$|^f+$/i.test(hex_length)) {
            /// The length is unknown, so set to -1.
            this$static.length_0 = N1_longLit;
        }
        else {
            ///NOTE: If there is a problem with the decoder because of the length, you can always set the length to -1 (N1_longLit) which means unknown.
            tmp_length = parseInt(hex_length, 16);
            /// If the length is too long to handle, just set it to unknown.
            if (tmp_length > 4294967295) {
                this$static.length_0 = N1_longLit;
            }
            else {
                this$static.length_0 = fromInt(tmp_length);
            }
        }
        this$static.chunker = $CodeInChunks(decoder, input, output, this$static.length_0);
    }
    function $LZMAByteArrayDecompressor(this$static, data) {
        this$static.output = $ByteArrayOutputStream({});
        $init_0(this$static, $ByteArrayInputStream({}, data), this$static.output);
        return this$static;
    }
    /** de */
    /** cs */
    function $Create_4(this$static, keepSizeBefore, keepSizeAfter, keepSizeReserv) {
        var blockSize;
        this$static._keepSizeBefore = keepSizeBefore;
        this$static._keepSizeAfter = keepSizeAfter;
        blockSize = keepSizeBefore + keepSizeAfter + keepSizeReserv;
        if (this$static._bufferBase == null || this$static._blockSize != blockSize) {
            this$static._bufferBase = null;
            this$static._blockSize = blockSize;
            this$static._bufferBase = initDim(this$static._blockSize);
        }
        this$static._pointerToLastSafePosition = this$static._blockSize - keepSizeAfter;
    }
    function $GetIndexByte(this$static, index) {
        return this$static._bufferBase[this$static._bufferOffset + this$static._pos + index];
    }
    function $GetMatchLen(this$static, index, distance, limit) {
        var i, pby;
        if (this$static._streamEndWasReached) {
            if (this$static._pos + index + limit > this$static._streamPos) {
                limit = this$static._streamPos - (this$static._pos + index);
            }
        }
        ++distance;
        pby = this$static._bufferOffset + this$static._pos + index;
        for (i = 0; i < limit && this$static._bufferBase[pby + i] == this$static._bufferBase[pby + i - distance]; ++i) {
        }
        return i;
    }
    function $GetNumAvailableBytes(this$static) {
        return this$static._streamPos - this$static._pos;
    }
    function $MoveBlock(this$static) {
        var i, numBytes, offset;
        offset = this$static._bufferOffset + this$static._pos - this$static._keepSizeBefore;
        if (offset > 0) {
            --offset;
        }
        numBytes = this$static._bufferOffset + this$static._streamPos - offset;
        for (i = 0; i < numBytes; ++i) {
            this$static._bufferBase[i] = this$static._bufferBase[offset + i];
        }
        this$static._bufferOffset -= offset;
    }
    function $MovePos_1(this$static) {
        var pointerToPostion;
        ++this$static._pos;
        if (this$static._pos > this$static._posLimit) {
            pointerToPostion = this$static._bufferOffset + this$static._pos;
            if (pointerToPostion > this$static._pointerToLastSafePosition) {
                $MoveBlock(this$static);
            }
            $ReadBlock(this$static);
        }
    }
    function $ReadBlock(this$static) {
        var numReadBytes, pointerToPostion, size;
        if (this$static._streamEndWasReached)
            return;
        while (1) {
            size = -this$static._bufferOffset + this$static._blockSize - this$static._streamPos;
            if (!size)
                return;
            numReadBytes = $read_0(this$static._stream, this$static._bufferBase, this$static._bufferOffset + this$static._streamPos, size);
            if (numReadBytes == -1) {
                this$static._posLimit = this$static._streamPos;
                pointerToPostion = this$static._bufferOffset + this$static._posLimit;
                if (pointerToPostion > this$static._pointerToLastSafePosition) {
                    this$static._posLimit = this$static._pointerToLastSafePosition - this$static._bufferOffset;
                }
                this$static._streamEndWasReached = 1;
                return;
            }
            this$static._streamPos += numReadBytes;
            if (this$static._streamPos >= this$static._pos + this$static._keepSizeAfter) {
                this$static._posLimit = this$static._streamPos - this$static._keepSizeAfter;
            }
        }
    }
    function $ReduceOffsets(this$static, subValue) {
        this$static._bufferOffset += subValue;
        this$static._posLimit -= subValue;
        this$static._pos -= subValue;
        this$static._streamPos -= subValue;
    }
    var CrcTable = (function () {
        var i, j, r, CrcTable = [];
        for (i = 0; i < 256; ++i) {
            r = i;
            for (j = 0; j < 8; ++j)
                if ((r & 1) != 0) {
                    r = r >>> 1 ^ -306674912;
                }
                else {
                    r >>>= 1;
                }
            CrcTable[i] = r;
        }
        return CrcTable;
    }());
    function $Create_3(this$static, historySize, keepAddBufferBefore, matchMaxLen, keepAddBufferAfter) {
        var cyclicBufferSize, hs, windowReservSize;
        if (historySize < 1073741567) {
            this$static._cutValue = 16 + (matchMaxLen >> 1);
            windowReservSize = ~~((historySize + keepAddBufferBefore + matchMaxLen + keepAddBufferAfter) / 2) + 256;
            $Create_4(this$static, historySize + keepAddBufferBefore, matchMaxLen + keepAddBufferAfter, windowReservSize);
            this$static._matchMaxLen = matchMaxLen;
            cyclicBufferSize = historySize + 1;
            if (this$static._cyclicBufferSize != cyclicBufferSize) {
                this$static._son = initDim((this$static._cyclicBufferSize = cyclicBufferSize) * 2);
            }
            hs = 65536;
            if (this$static.HASH_ARRAY) {
                hs = historySize - 1;
                hs |= hs >> 1;
                hs |= hs >> 2;
                hs |= hs >> 4;
                hs |= hs >> 8;
                hs >>= 1;
                hs |= 65535;
                if (hs > 16777216)
                    hs >>= 1;
                this$static._hashMask = hs;
                ++hs;
                hs += this$static.kFixHashSize;
            }
            if (hs != this$static._hashSizeSum) {
                this$static._hash = initDim(this$static._hashSizeSum = hs);
            }
        }
    }
    function $GetMatches(this$static, distances) {
        var count, cur, curMatch, curMatch2, curMatch3, cyclicPos, delta, hash2Value, hash3Value, hashValue, len, len0, len1, lenLimit, matchMinPos, maxLen, offset, pby1, ptr0, ptr1, temp;
        if (this$static._pos + this$static._matchMaxLen <= this$static._streamPos) {
            lenLimit = this$static._matchMaxLen;
        }
        else {
            lenLimit = this$static._streamPos - this$static._pos;
            if (lenLimit < this$static.kMinMatchCheck) {
                $MovePos_0(this$static);
                return 0;
            }
        }
        offset = 0;
        matchMinPos = this$static._pos > this$static._cyclicBufferSize ? this$static._pos - this$static._cyclicBufferSize : 0;
        cur = this$static._bufferOffset + this$static._pos;
        maxLen = 1;
        hash2Value = 0;
        hash3Value = 0;
        if (this$static.HASH_ARRAY) {
            temp = CrcTable[this$static._bufferBase[cur] & 255] ^ this$static._bufferBase[cur + 1] & 255;
            hash2Value = temp & 1023;
            temp ^= (this$static._bufferBase[cur + 2] & 255) << 8;
            hash3Value = temp & 65535;
            hashValue = (temp ^ CrcTable[this$static._bufferBase[cur + 3] & 255] << 5) & this$static._hashMask;
        }
        else {
            hashValue = this$static._bufferBase[cur] & 255 ^ (this$static._bufferBase[cur + 1] & 255) << 8;
        }
        curMatch = this$static._hash[this$static.kFixHashSize + hashValue] || 0;
        if (this$static.HASH_ARRAY) {
            curMatch2 = this$static._hash[hash2Value] || 0;
            curMatch3 = this$static._hash[1024 + hash3Value] || 0;
            this$static._hash[hash2Value] = this$static._pos;
            this$static._hash[1024 + hash3Value] = this$static._pos;
            if (curMatch2 > matchMinPos) {
                if (this$static._bufferBase[this$static._bufferOffset + curMatch2] == this$static._bufferBase[cur]) {
                    distances[offset++] = maxLen = 2;
                    distances[offset++] = this$static._pos - curMatch2 - 1;
                }
            }
            if (curMatch3 > matchMinPos) {
                if (this$static._bufferBase[this$static._bufferOffset + curMatch3] == this$static._bufferBase[cur]) {
                    if (curMatch3 == curMatch2) {
                        offset -= 2;
                    }
                    distances[offset++] = maxLen = 3;
                    distances[offset++] = this$static._pos - curMatch3 - 1;
                    curMatch2 = curMatch3;
                }
            }
            if (offset != 0 && curMatch2 == curMatch) {
                offset -= 2;
                maxLen = 1;
            }
        }
        this$static._hash[this$static.kFixHashSize + hashValue] = this$static._pos;
        ptr0 = (this$static._cyclicBufferPos << 1) + 1;
        ptr1 = this$static._cyclicBufferPos << 1;
        len0 = len1 = this$static.kNumHashDirectBytes;
        if (this$static.kNumHashDirectBytes != 0) {
            if (curMatch > matchMinPos) {
                if (this$static._bufferBase[this$static._bufferOffset + curMatch + this$static.kNumHashDirectBytes] != this$static._bufferBase[cur + this$static.kNumHashDirectBytes]) {
                    distances[offset++] = maxLen = this$static.kNumHashDirectBytes;
                    distances[offset++] = this$static._pos - curMatch - 1;
                }
            }
        }
        count = this$static._cutValue;
        while (1) {
            if (curMatch <= matchMinPos || count-- == 0) {
                this$static._son[ptr0] = this$static._son[ptr1] = 0;
                break;
            }
            delta = this$static._pos - curMatch;
            cyclicPos = (delta <= this$static._cyclicBufferPos ? this$static._cyclicBufferPos - delta : this$static._cyclicBufferPos - delta + this$static._cyclicBufferSize) << 1;
            pby1 = this$static._bufferOffset + curMatch;
            len = len0 < len1 ? len0 : len1;
            if (this$static._bufferBase[pby1 + len] == this$static._bufferBase[cur + len]) {
                while (++len != lenLimit) {
                    if (this$static._bufferBase[pby1 + len] != this$static._bufferBase[cur + len]) {
                        break;
                    }
                }
                if (maxLen < len) {
                    distances[offset++] = maxLen = len;
                    distances[offset++] = delta - 1;
                    if (len == lenLimit) {
                        this$static._son[ptr1] = this$static._son[cyclicPos];
                        this$static._son[ptr0] = this$static._son[cyclicPos + 1];
                        break;
                    }
                }
            }
            if ((this$static._bufferBase[pby1 + len] & 255) < (this$static._bufferBase[cur + len] & 255)) {
                this$static._son[ptr1] = curMatch;
                ptr1 = cyclicPos + 1;
                curMatch = this$static._son[ptr1];
                len1 = len;
            }
            else {
                this$static._son[ptr0] = curMatch;
                ptr0 = cyclicPos;
                curMatch = this$static._son[ptr0];
                len0 = len;
            }
        }
        $MovePos_0(this$static);
        return offset;
    }
    function $Init_5(this$static) {
        this$static._bufferOffset = 0;
        this$static._pos = 0;
        this$static._streamPos = 0;
        this$static._streamEndWasReached = 0;
        $ReadBlock(this$static);
        this$static._cyclicBufferPos = 0;
        $ReduceOffsets(this$static, -1);
    }
    function $MovePos_0(this$static) {
        var subValue;
        if (++this$static._cyclicBufferPos >= this$static._cyclicBufferSize) {
            this$static._cyclicBufferPos = 0;
        }
        $MovePos_1(this$static);
        if (this$static._pos == 1073741823) {
            subValue = this$static._pos - this$static._cyclicBufferSize;
            $NormalizeLinks(this$static._son, this$static._cyclicBufferSize * 2, subValue);
            $NormalizeLinks(this$static._hash, this$static._hashSizeSum, subValue);
            $ReduceOffsets(this$static, subValue);
        }
    }
    ///NOTE: This is only called after reading one whole gigabyte.
    function $NormalizeLinks(items, numItems, subValue) {
        var i, value;
        for (i = 0; i < numItems; ++i) {
            value = items[i] || 0;
            if (value <= subValue) {
                value = 0;
            }
            else {
                value -= subValue;
            }
            items[i] = value;
        }
    }
    function $SetType(this$static, numHashBytes) {
        this$static.HASH_ARRAY = numHashBytes > 2;
        if (this$static.HASH_ARRAY) {
            this$static.kNumHashDirectBytes = 0;
            this$static.kMinMatchCheck = 4;
            this$static.kFixHashSize = 66560;
        }
        else {
            this$static.kNumHashDirectBytes = 2;
            this$static.kMinMatchCheck = 3;
            this$static.kFixHashSize = 0;
        }
    }
    function $Skip(this$static, num) {
        var count, cur, curMatch, cyclicPos, delta, hash2Value, hash3Value, hashValue, len, len0, len1, lenLimit, matchMinPos, pby1, ptr0, ptr1, temp;
        do {
            if (this$static._pos + this$static._matchMaxLen <= this$static._streamPos) {
                lenLimit = this$static._matchMaxLen;
            }
            else {
                lenLimit = this$static._streamPos - this$static._pos;
                if (lenLimit < this$static.kMinMatchCheck) {
                    $MovePos_0(this$static);
                    continue;
                }
            }
            matchMinPos = this$static._pos > this$static._cyclicBufferSize ? this$static._pos - this$static._cyclicBufferSize : 0;
            cur = this$static._bufferOffset + this$static._pos;
            if (this$static.HASH_ARRAY) {
                temp = CrcTable[this$static._bufferBase[cur] & 255] ^ this$static._bufferBase[cur + 1] & 255;
                hash2Value = temp & 1023;
                this$static._hash[hash2Value] = this$static._pos;
                temp ^= (this$static._bufferBase[cur + 2] & 255) << 8;
                hash3Value = temp & 65535;
                this$static._hash[1024 + hash3Value] = this$static._pos;
                hashValue = (temp ^ CrcTable[this$static._bufferBase[cur + 3] & 255] << 5) & this$static._hashMask;
            }
            else {
                hashValue = this$static._bufferBase[cur] & 255 ^ (this$static._bufferBase[cur + 1] & 255) << 8;
            }
            curMatch = this$static._hash[this$static.kFixHashSize + hashValue];
            this$static._hash[this$static.kFixHashSize + hashValue] = this$static._pos;
            ptr0 = (this$static._cyclicBufferPos << 1) + 1;
            ptr1 = this$static._cyclicBufferPos << 1;
            len0 = len1 = this$static.kNumHashDirectBytes;
            count = this$static._cutValue;
            while (1) {
                if (curMatch <= matchMinPos || count-- == 0) {
                    this$static._son[ptr0] = this$static._son[ptr1] = 0;
                    break;
                }
                delta = this$static._pos - curMatch;
                cyclicPos = (delta <= this$static._cyclicBufferPos ? this$static._cyclicBufferPos - delta : this$static._cyclicBufferPos - delta + this$static._cyclicBufferSize) << 1;
                pby1 = this$static._bufferOffset + curMatch;
                len = len0 < len1 ? len0 : len1;
                if (this$static._bufferBase[pby1 + len] == this$static._bufferBase[cur + len]) {
                    while (++len != lenLimit) {
                        if (this$static._bufferBase[pby1 + len] != this$static._bufferBase[cur + len]) {
                            break;
                        }
                    }
                    if (len == lenLimit) {
                        this$static._son[ptr1] = this$static._son[cyclicPos];
                        this$static._son[ptr0] = this$static._son[cyclicPos + 1];
                        break;
                    }
                }
                if ((this$static._bufferBase[pby1 + len] & 255) < (this$static._bufferBase[cur + len] & 255)) {
                    this$static._son[ptr1] = curMatch;
                    ptr1 = cyclicPos + 1;
                    curMatch = this$static._son[ptr1];
                    len1 = len;
                }
                else {
                    this$static._son[ptr0] = curMatch;
                    ptr0 = cyclicPos;
                    curMatch = this$static._son[ptr0];
                    len0 = len;
                }
            }
            $MovePos_0(this$static);
        } while (--num != 0);
    }
    /** ce */
    /** ds */
    function $CopyBlock(this$static, distance, len) {
        var pos = this$static._pos - distance - 1;
        if (pos < 0) {
            pos += this$static._windowSize;
        }
        for (; len != 0; --len) {
            if (pos >= this$static._windowSize) {
                pos = 0;
            }
            this$static._buffer[this$static._pos++] = this$static._buffer[pos++];
            if (this$static._pos >= this$static._windowSize) {
                $Flush_0(this$static);
            }
        }
    }
    function $Create_5(this$static, windowSize) {
        if (this$static._buffer == null || this$static._windowSize != windowSize) {
            this$static._buffer = initDim(windowSize);
        }
        this$static._windowSize = windowSize;
        this$static._pos = 0;
        this$static._streamPos = 0;
    }
    function $Flush_0(this$static) {
        var size = this$static._pos - this$static._streamPos;
        if (!size) {
            return;
        }
        $write_0(this$static._stream, this$static._buffer, this$static._streamPos, size);
        if (this$static._pos >= this$static._windowSize) {
            this$static._pos = 0;
        }
        this$static._streamPos = this$static._pos;
    }
    function $GetByte(this$static, distance) {
        var pos = this$static._pos - distance - 1;
        if (pos < 0) {
            pos += this$static._windowSize;
        }
        return this$static._buffer[pos];
    }
    function $PutByte(this$static, b) {
        this$static._buffer[this$static._pos++] = b;
        if (this$static._pos >= this$static._windowSize) {
            $Flush_0(this$static);
        }
    }
    function $ReleaseStream(this$static) {
        $Flush_0(this$static);
        this$static._stream = null;
    }
    /** de */
    function GetLenToPosState(len) {
        len -= 2;
        if (len < 4) {
            return len;
        }
        return 3;
    }
    function StateUpdateChar(index) {
        if (index < 4) {
            return 0;
        }
        if (index < 10) {
            return index - 3;
        }
        return index - 6;
    }
    /** cs */
    function $Chunker_0(this$static, encoder) {
        this$static.encoder = encoder;
        this$static.decoder = null;
        this$static.alive = 1;
        return this$static;
    }
    /** ce */
    /** ds */
    function $Chunker(this$static, decoder) {
        this$static.decoder = decoder;
        this$static.encoder = null;
        this$static.alive = 1;
        return this$static;
    }
    /** de */
    function $processChunk(this$static) {
        if (!this$static.alive) {
            throw new Error("bad state");
        }
        if (this$static.encoder) {
            /// do:throw new Error("No encoding");
            /** cs */
            $processEncoderChunk(this$static);
            /** ce */
        }
        else {
            /// co:throw new Error("No decoding");
            /** ds */
            $processDecoderChunk(this$static);
            /** de */
        }
        return this$static.alive;
    }
    /** ds */
    function $processDecoderChunk(this$static) {
        var result = $CodeOneChunk(this$static.decoder);
        if (result == -1) {
            throw new Error("corrupted input");
        }
        this$static.inBytesProcessed = N1_longLit;
        this$static.outBytesProcessed = this$static.decoder.nowPos64;
        if (result || compare(this$static.decoder.outSize, P0_longLit) >= 0 && compare(this$static.decoder.nowPos64, this$static.decoder.outSize) >= 0) {
            $Flush_0(this$static.decoder.m_OutWindow);
            $ReleaseStream(this$static.decoder.m_OutWindow);
            this$static.decoder.m_RangeDecoder.Stream = null;
            this$static.alive = 0;
        }
    }
    /** de */
    /** cs */
    function $processEncoderChunk(this$static) {
        $CodeOneBlock(this$static.encoder, this$static.encoder.processedInSize, this$static.encoder.processedOutSize, this$static.encoder.finished);
        this$static.inBytesProcessed = this$static.encoder.processedInSize[0];
        if (this$static.encoder.finished[0]) {
            $ReleaseStreams(this$static.encoder);
            this$static.alive = 0;
        }
    }
    /** ce */
    /** ds */
    function $CodeInChunks(this$static, inStream, outStream, outSize) {
        this$static.m_RangeDecoder.Stream = inStream;
        $ReleaseStream(this$static.m_OutWindow);
        this$static.m_OutWindow._stream = outStream;
        $Init_1(this$static);
        this$static.state = 0;
        this$static.rep0 = 0;
        this$static.rep1 = 0;
        this$static.rep2 = 0;
        this$static.rep3 = 0;
        this$static.outSize = outSize;
        this$static.nowPos64 = P0_longLit;
        this$static.prevByte = 0;
        return $Chunker({}, this$static);
    }
    function $CodeOneChunk(this$static) {
        var decoder2, distance, len, numDirectBits, posSlot, posState;
        posState = lowBits_0(this$static.nowPos64) & this$static.m_PosStateMask;
        if (!$DecodeBit(this$static.m_RangeDecoder, this$static.m_IsMatchDecoders, (this$static.state << 4) + posState)) {
            decoder2 = $GetDecoder(this$static.m_LiteralDecoder, lowBits_0(this$static.nowPos64), this$static.prevByte);
            if (this$static.state < 7) {
                this$static.prevByte = $DecodeNormal(decoder2, this$static.m_RangeDecoder);
            }
            else {
                this$static.prevByte = $DecodeWithMatchByte(decoder2, this$static.m_RangeDecoder, $GetByte(this$static.m_OutWindow, this$static.rep0));
            }
            $PutByte(this$static.m_OutWindow, this$static.prevByte);
            this$static.state = StateUpdateChar(this$static.state);
            this$static.nowPos64 = add(this$static.nowPos64, P1_longLit);
        }
        else {
            if ($DecodeBit(this$static.m_RangeDecoder, this$static.m_IsRepDecoders, this$static.state)) {
                len = 0;
                if (!$DecodeBit(this$static.m_RangeDecoder, this$static.m_IsRepG0Decoders, this$static.state)) {
                    if (!$DecodeBit(this$static.m_RangeDecoder, this$static.m_IsRep0LongDecoders, (this$static.state << 4) + posState)) {
                        this$static.state = this$static.state < 7 ? 9 : 11;
                        len = 1;
                    }
                }
                else {
                    if (!$DecodeBit(this$static.m_RangeDecoder, this$static.m_IsRepG1Decoders, this$static.state)) {
                        distance = this$static.rep1;
                    }
                    else {
                        if (!$DecodeBit(this$static.m_RangeDecoder, this$static.m_IsRepG2Decoders, this$static.state)) {
                            distance = this$static.rep2;
                        }
                        else {
                            distance = this$static.rep3;
                            this$static.rep3 = this$static.rep2;
                        }
                        this$static.rep2 = this$static.rep1;
                    }
                    this$static.rep1 = this$static.rep0;
                    this$static.rep0 = distance;
                }
                if (!len) {
                    len = $Decode(this$static.m_RepLenDecoder, this$static.m_RangeDecoder, posState) + 2;
                    this$static.state = this$static.state < 7 ? 8 : 11;
                }
            }
            else {
                this$static.rep3 = this$static.rep2;
                this$static.rep2 = this$static.rep1;
                this$static.rep1 = this$static.rep0;
                len = 2 + $Decode(this$static.m_LenDecoder, this$static.m_RangeDecoder, posState);
                this$static.state = this$static.state < 7 ? 7 : 10;
                posSlot = $Decode_0(this$static.m_PosSlotDecoder[GetLenToPosState(len)], this$static.m_RangeDecoder);
                if (posSlot >= 4) {
                    numDirectBits = (posSlot >> 1) - 1;
                    this$static.rep0 = (2 | posSlot & 1) << numDirectBits;
                    if (posSlot < 14) {
                        this$static.rep0 += ReverseDecode(this$static.m_PosDecoders, this$static.rep0 - posSlot - 1, this$static.m_RangeDecoder, numDirectBits);
                    }
                    else {
                        this$static.rep0 += $DecodeDirectBits(this$static.m_RangeDecoder, numDirectBits - 4) << 4;
                        this$static.rep0 += $ReverseDecode(this$static.m_PosAlignDecoder, this$static.m_RangeDecoder);
                        if (this$static.rep0 < 0) {
                            if (this$static.rep0 == -1) {
                                return 1;
                            }
                            return -1;
                        }
                    }
                }
                else
                    this$static.rep0 = posSlot;
            }
            if (compare(fromInt(this$static.rep0), this$static.nowPos64) >= 0 || this$static.rep0 >= this$static.m_DictionarySizeCheck) {
                return -1;
            }
            $CopyBlock(this$static.m_OutWindow, this$static.rep0, len);
            this$static.nowPos64 = add(this$static.nowPos64, fromInt(len));
            this$static.prevByte = $GetByte(this$static.m_OutWindow, 0);
        }
        return 0;
    }
    function $Decoder(this$static) {
        this$static.m_OutWindow = {};
        this$static.m_RangeDecoder = {};
        this$static.m_IsMatchDecoders = initDim(192);
        this$static.m_IsRepDecoders = initDim(12);
        this$static.m_IsRepG0Decoders = initDim(12);
        this$static.m_IsRepG1Decoders = initDim(12);
        this$static.m_IsRepG2Decoders = initDim(12);
        this$static.m_IsRep0LongDecoders = initDim(192);
        this$static.m_PosSlotDecoder = initDim(4);
        this$static.m_PosDecoders = initDim(114);
        this$static.m_PosAlignDecoder = $BitTreeDecoder({}, 4);
        this$static.m_LenDecoder = $Decoder$LenDecoder({});
        this$static.m_RepLenDecoder = $Decoder$LenDecoder({});
        this$static.m_LiteralDecoder = {};
        for (var i = 0; i < 4; ++i) {
            this$static.m_PosSlotDecoder[i] = $BitTreeDecoder({}, 6);
        }
        return this$static;
    }
    function $Init_1(this$static) {
        this$static.m_OutWindow._streamPos = 0;
        this$static.m_OutWindow._pos = 0;
        InitBitModels(this$static.m_IsMatchDecoders);
        InitBitModels(this$static.m_IsRep0LongDecoders);
        InitBitModels(this$static.m_IsRepDecoders);
        InitBitModels(this$static.m_IsRepG0Decoders);
        InitBitModels(this$static.m_IsRepG1Decoders);
        InitBitModels(this$static.m_IsRepG2Decoders);
        InitBitModels(this$static.m_PosDecoders);
        $Init_0(this$static.m_LiteralDecoder);
        for (var i = 0; i < 4; ++i) {
            InitBitModels(this$static.m_PosSlotDecoder[i].Models);
        }
        $Init(this$static.m_LenDecoder);
        $Init(this$static.m_RepLenDecoder);
        InitBitModels(this$static.m_PosAlignDecoder.Models);
        $Init_8(this$static.m_RangeDecoder);
    }
    function $SetDecoderProperties(this$static, properties) {
        var dictionarySize, i, lc, lp, pb, remainder, val;
        if (properties.length < 5)
            return 0;
        val = properties[0] & 255;
        lc = val % 9;
        remainder = ~~(val / 9);
        lp = remainder % 5;
        pb = ~~(remainder / 5);
        dictionarySize = 0;
        for (i = 0; i < 4; ++i) {
            dictionarySize += (properties[1 + i] & 255) << i * 8;
        }
        ///NOTE: If the input is bad, it might call for an insanely large dictionary size, which would crash the script.
        if (dictionarySize > 99999999 || !$SetLcLpPb(this$static, lc, lp, pb)) {
            return 0;
        }
        return $SetDictionarySize(this$static, dictionarySize);
    }
    function $SetDictionarySize(this$static, dictionarySize) {
        if (dictionarySize < 0) {
            return 0;
        }
        if (this$static.m_DictionarySize != dictionarySize) {
            this$static.m_DictionarySize = dictionarySize;
            this$static.m_DictionarySizeCheck = Math.max(this$static.m_DictionarySize, 1);
            $Create_5(this$static.m_OutWindow, Math.max(this$static.m_DictionarySizeCheck, 4096));
        }
        return 1;
    }
    function $SetLcLpPb(this$static, lc, lp, pb) {
        if (lc > 8 || lp > 4 || pb > 4) {
            return 0;
        }
        $Create_0(this$static.m_LiteralDecoder, lp, lc);
        var numPosStates = 1 << pb;
        $Create(this$static.m_LenDecoder, numPosStates);
        $Create(this$static.m_RepLenDecoder, numPosStates);
        this$static.m_PosStateMask = numPosStates - 1;
        return 1;
    }
    function $Create(this$static, numPosStates) {
        for (; this$static.m_NumPosStates < numPosStates; ++this$static.m_NumPosStates) {
            this$static.m_LowCoder[this$static.m_NumPosStates] = $BitTreeDecoder({}, 3);
            this$static.m_MidCoder[this$static.m_NumPosStates] = $BitTreeDecoder({}, 3);
        }
    }
    function $Decode(this$static, rangeDecoder, posState) {
        if (!$DecodeBit(rangeDecoder, this$static.m_Choice, 0)) {
            return $Decode_0(this$static.m_LowCoder[posState], rangeDecoder);
        }
        var symbol = 8;
        if (!$DecodeBit(rangeDecoder, this$static.m_Choice, 1)) {
            symbol += $Decode_0(this$static.m_MidCoder[posState], rangeDecoder);
        }
        else {
            symbol += 8 + $Decode_0(this$static.m_HighCoder, rangeDecoder);
        }
        return symbol;
    }
    function $Decoder$LenDecoder(this$static) {
        this$static.m_Choice = initDim(2);
        this$static.m_LowCoder = initDim(16);
        this$static.m_MidCoder = initDim(16);
        this$static.m_HighCoder = $BitTreeDecoder({}, 8);
        this$static.m_NumPosStates = 0;
        return this$static;
    }
    function $Init(this$static) {
        InitBitModels(this$static.m_Choice);
        for (var posState = 0; posState < this$static.m_NumPosStates; ++posState) {
            InitBitModels(this$static.m_LowCoder[posState].Models);
            InitBitModels(this$static.m_MidCoder[posState].Models);
        }
        InitBitModels(this$static.m_HighCoder.Models);
    }
    function $Create_0(this$static, numPosBits, numPrevBits) {
        var i, numStates;
        if (this$static.m_Coders != null && this$static.m_NumPrevBits == numPrevBits && this$static.m_NumPosBits == numPosBits)
            return;
        this$static.m_NumPosBits = numPosBits;
        this$static.m_PosMask = (1 << numPosBits) - 1;
        this$static.m_NumPrevBits = numPrevBits;
        numStates = 1 << this$static.m_NumPrevBits + this$static.m_NumPosBits;
        this$static.m_Coders = initDim(numStates);
        for (i = 0; i < numStates; ++i)
            this$static.m_Coders[i] = $Decoder$LiteralDecoder$Decoder2({});
    }
    function $GetDecoder(this$static, pos, prevByte) {
        return this$static.m_Coders[((pos & this$static.m_PosMask) << this$static.m_NumPrevBits) + ((prevByte & 255) >>> 8 - this$static.m_NumPrevBits)];
    }
    function $Init_0(this$static) {
        var i, numStates;
        numStates = 1 << this$static.m_NumPrevBits + this$static.m_NumPosBits;
        for (i = 0; i < numStates; ++i) {
            InitBitModels(this$static.m_Coders[i].m_Decoders);
        }
    }
    function $DecodeNormal(this$static, rangeDecoder) {
        var symbol = 1;
        do {
            symbol = symbol << 1 | $DecodeBit(rangeDecoder, this$static.m_Decoders, symbol);
        } while (symbol < 256);
        return symbol << 24 >> 24;
    }
    function $DecodeWithMatchByte(this$static, rangeDecoder, matchByte) {
        var bit, matchBit, symbol = 1;
        do {
            matchBit = matchByte >> 7 & 1;
            matchByte <<= 1;
            bit = $DecodeBit(rangeDecoder, this$static.m_Decoders, (1 + matchBit << 8) + symbol);
            symbol = symbol << 1 | bit;
            if (matchBit != bit) {
                while (symbol < 256) {
                    symbol = symbol << 1 | $DecodeBit(rangeDecoder, this$static.m_Decoders, symbol);
                }
                break;
            }
        } while (symbol < 256);
        return symbol << 24 >> 24;
    }
    function $Decoder$LiteralDecoder$Decoder2(this$static) {
        this$static.m_Decoders = initDim(768);
        return this$static;
    }
    /** de */
    /** cs */
    var g_FastPos = (function () {
        var j, k, slotFast, c = 2, g_FastPos = [0, 1];
        for (slotFast = 2; slotFast < 22; ++slotFast) {
            k = 1 << (slotFast >> 1) - 1;
            for (j = 0; j < k; ++j, ++c)
                g_FastPos[c] = slotFast << 24 >> 24;
        }
        return g_FastPos;
    }());
    function $Backward(this$static, cur) {
        var backCur, backMem, posMem, posPrev;
        this$static._optimumEndIndex = cur;
        posMem = this$static._optimum[cur].PosPrev;
        backMem = this$static._optimum[cur].BackPrev;
        do {
            if (this$static._optimum[cur].Prev1IsChar) {
                $MakeAsChar(this$static._optimum[posMem]);
                this$static._optimum[posMem].PosPrev = posMem - 1;
                if (this$static._optimum[cur].Prev2) {
                    this$static._optimum[posMem - 1].Prev1IsChar = 0;
                    this$static._optimum[posMem - 1].PosPrev = this$static._optimum[cur].PosPrev2;
                    this$static._optimum[posMem - 1].BackPrev = this$static._optimum[cur].BackPrev2;
                }
            }
            posPrev = posMem;
            backCur = backMem;
            backMem = this$static._optimum[posPrev].BackPrev;
            posMem = this$static._optimum[posPrev].PosPrev;
            this$static._optimum[posPrev].BackPrev = backCur;
            this$static._optimum[posPrev].PosPrev = cur;
            cur = posPrev;
        } while (cur > 0);
        this$static.backRes = this$static._optimum[0].BackPrev;
        this$static._optimumCurrentIndex = this$static._optimum[0].PosPrev;
        return this$static._optimumCurrentIndex;
    }
    function $BaseInit(this$static) {
        this$static._state = 0;
        this$static._previousByte = 0;
        for (var i = 0; i < 4; ++i) {
            this$static._repDistances[i] = 0;
        }
    }
    function $CodeOneBlock(this$static, inSize, outSize, finished) {
        var baseVal, complexState, curByte, distance, footerBits, i, len, lenToPosState, matchByte, pos, posReduced, posSlot, posState, progressPosValuePrev, subCoder;
        inSize[0] = P0_longLit;
        outSize[0] = P0_longLit;
        finished[0] = 1;
        if (this$static._inStream) {
            this$static._matchFinder._stream = this$static._inStream;
            $Init_5(this$static._matchFinder);
            this$static._needReleaseMFStream = 1;
            this$static._inStream = null;
        }
        if (this$static._finished) {
            return;
        }
        this$static._finished = 1;
        progressPosValuePrev = this$static.nowPos64;
        if (eq(this$static.nowPos64, P0_longLit)) {
            if (!$GetNumAvailableBytes(this$static._matchFinder)) {
                $Flush(this$static, lowBits_0(this$static.nowPos64));
                return;
            }
            $ReadMatchDistances(this$static);
            posState = lowBits_0(this$static.nowPos64) & this$static._posStateMask;
            $Encode_3(this$static._rangeEncoder, this$static._isMatch, (this$static._state << 4) + posState, 0);
            this$static._state = StateUpdateChar(this$static._state);
            curByte = $GetIndexByte(this$static._matchFinder, -this$static._additionalOffset);
            $Encode_1($GetSubCoder(this$static._literalEncoder, lowBits_0(this$static.nowPos64), this$static._previousByte), this$static._rangeEncoder, curByte);
            this$static._previousByte = curByte;
            --this$static._additionalOffset;
            this$static.nowPos64 = add(this$static.nowPos64, P1_longLit);
        }
        if (!$GetNumAvailableBytes(this$static._matchFinder)) {
            $Flush(this$static, lowBits_0(this$static.nowPos64));
            return;
        }
        while (1) {
            len = $GetOptimum(this$static, lowBits_0(this$static.nowPos64));
            pos = this$static.backRes;
            posState = lowBits_0(this$static.nowPos64) & this$static._posStateMask;
            complexState = (this$static._state << 4) + posState;
            if (len == 1 && pos == -1) {
                $Encode_3(this$static._rangeEncoder, this$static._isMatch, complexState, 0);
                curByte = $GetIndexByte(this$static._matchFinder, -this$static._additionalOffset);
                subCoder = $GetSubCoder(this$static._literalEncoder, lowBits_0(this$static.nowPos64), this$static._previousByte);
                if (this$static._state < 7) {
                    $Encode_1(subCoder, this$static._rangeEncoder, curByte);
                }
                else {
                    matchByte = $GetIndexByte(this$static._matchFinder, -this$static._repDistances[0] - 1 - this$static._additionalOffset);
                    $EncodeMatched(subCoder, this$static._rangeEncoder, matchByte, curByte);
                }
                this$static._previousByte = curByte;
                this$static._state = StateUpdateChar(this$static._state);
            }
            else {
                $Encode_3(this$static._rangeEncoder, this$static._isMatch, complexState, 1);
                if (pos < 4) {
                    $Encode_3(this$static._rangeEncoder, this$static._isRep, this$static._state, 1);
                    if (!pos) {
                        $Encode_3(this$static._rangeEncoder, this$static._isRepG0, this$static._state, 0);
                        if (len == 1) {
                            $Encode_3(this$static._rangeEncoder, this$static._isRep0Long, complexState, 0);
                        }
                        else {
                            $Encode_3(this$static._rangeEncoder, this$static._isRep0Long, complexState, 1);
                        }
                    }
                    else {
                        $Encode_3(this$static._rangeEncoder, this$static._isRepG0, this$static._state, 1);
                        if (pos == 1) {
                            $Encode_3(this$static._rangeEncoder, this$static._isRepG1, this$static._state, 0);
                        }
                        else {
                            $Encode_3(this$static._rangeEncoder, this$static._isRepG1, this$static._state, 1);
                            $Encode_3(this$static._rangeEncoder, this$static._isRepG2, this$static._state, pos - 2);
                        }
                    }
                    if (len == 1) {
                        this$static._state = this$static._state < 7 ? 9 : 11;
                    }
                    else {
                        $Encode_0(this$static._repMatchLenEncoder, this$static._rangeEncoder, len - 2, posState);
                        this$static._state = this$static._state < 7 ? 8 : 11;
                    }
                    distance = this$static._repDistances[pos];
                    if (pos != 0) {
                        for (i = pos; i >= 1; --i) {
                            this$static._repDistances[i] = this$static._repDistances[i - 1];
                        }
                        this$static._repDistances[0] = distance;
                    }
                }
                else {
                    $Encode_3(this$static._rangeEncoder, this$static._isRep, this$static._state, 0);
                    this$static._state = this$static._state < 7 ? 7 : 10;
                    $Encode_0(this$static._lenEncoder, this$static._rangeEncoder, len - 2, posState);
                    pos -= 4;
                    posSlot = GetPosSlot(pos);
                    lenToPosState = GetLenToPosState(len);
                    $Encode_2(this$static._posSlotEncoder[lenToPosState], this$static._rangeEncoder, posSlot);
                    if (posSlot >= 4) {
                        footerBits = (posSlot >> 1) - 1;
                        baseVal = (2 | posSlot & 1) << footerBits;
                        posReduced = pos - baseVal;
                        if (posSlot < 14) {
                            ReverseEncode(this$static._posEncoders, baseVal - posSlot - 1, this$static._rangeEncoder, footerBits, posReduced);
                        }
                        else {
                            $EncodeDirectBits(this$static._rangeEncoder, posReduced >> 4, footerBits - 4);
                            $ReverseEncode(this$static._posAlignEncoder, this$static._rangeEncoder, posReduced & 15);
                            ++this$static._alignPriceCount;
                        }
                    }
                    distance = pos;
                    for (i = 3; i >= 1; --i) {
                        this$static._repDistances[i] = this$static._repDistances[i - 1];
                    }
                    this$static._repDistances[0] = distance;
                    ++this$static._matchPriceCount;
                }
                this$static._previousByte = $GetIndexByte(this$static._matchFinder, len - 1 - this$static._additionalOffset);
            }
            this$static._additionalOffset -= len;
            this$static.nowPos64 = add(this$static.nowPos64, fromInt(len));
            if (!this$static._additionalOffset) {
                if (this$static._matchPriceCount >= 128) {
                    $FillDistancesPrices(this$static);
                }
                if (this$static._alignPriceCount >= 16) {
                    $FillAlignPrices(this$static);
                }
                inSize[0] = this$static.nowPos64;
                outSize[0] = $GetProcessedSizeAdd(this$static._rangeEncoder);
                if (!$GetNumAvailableBytes(this$static._matchFinder)) {
                    $Flush(this$static, lowBits_0(this$static.nowPos64));
                    return;
                }
                if (compare(sub(this$static.nowPos64, progressPosValuePrev), [4096, 0]) >= 0) {
                    this$static._finished = 0;
                    finished[0] = 0;
                    return;
                }
            }
        }
    }
    function $Create_2(this$static) {
        var bt, numHashBytes;
        if (!this$static._matchFinder) {
            bt = {};
            numHashBytes = 4;
            if (!this$static._matchFinderType) {
                numHashBytes = 2;
            }
            $SetType(bt, numHashBytes);
            this$static._matchFinder = bt;
        }
        $Create_1(this$static._literalEncoder, this$static._numLiteralPosStateBits, this$static._numLiteralContextBits);
        if (this$static._dictionarySize == this$static._dictionarySizePrev && this$static._numFastBytesPrev == this$static._numFastBytes) {
            return;
        }
        $Create_3(this$static._matchFinder, this$static._dictionarySize, 4096, this$static._numFastBytes, 274);
        this$static._dictionarySizePrev = this$static._dictionarySize;
        this$static._numFastBytesPrev = this$static._numFastBytes;
    }
    function $Encoder(this$static) {
        var i;
        this$static._repDistances = initDim(4);
        this$static._optimum = [];
        this$static._rangeEncoder = {};
        this$static._isMatch = initDim(192);
        this$static._isRep = initDim(12);
        this$static._isRepG0 = initDim(12);
        this$static._isRepG1 = initDim(12);
        this$static._isRepG2 = initDim(12);
        this$static._isRep0Long = initDim(192);
        this$static._posSlotEncoder = [];
        this$static._posEncoders = initDim(114);
        this$static._posAlignEncoder = $BitTreeEncoder({}, 4);
        this$static._lenEncoder = $Encoder$LenPriceTableEncoder({});
        this$static._repMatchLenEncoder = $Encoder$LenPriceTableEncoder({});
        this$static._literalEncoder = {};
        this$static._matchDistances = [];
        this$static._posSlotPrices = [];
        this$static._distancesPrices = [];
        this$static._alignPrices = initDim(16);
        this$static.reps = initDim(4);
        this$static.repLens = initDim(4);
        this$static.processedInSize = [P0_longLit];
        this$static.processedOutSize = [P0_longLit];
        this$static.finished = [0];
        this$static.properties = initDim(5);
        this$static.tempPrices = initDim(128);
        this$static._longestMatchLength = 0;
        this$static._matchFinderType = 1;
        this$static._numDistancePairs = 0;
        this$static._numFastBytesPrev = -1;
        this$static.backRes = 0;
        for (i = 0; i < 4096; ++i) {
            this$static._optimum[i] = {};
        }
        for (i = 0; i < 4; ++i) {
            this$static._posSlotEncoder[i] = $BitTreeEncoder({}, 6);
        }
        return this$static;
    }
    function $FillAlignPrices(this$static) {
        for (var i = 0; i < 16; ++i) {
            this$static._alignPrices[i] = $ReverseGetPrice(this$static._posAlignEncoder, i);
        }
        this$static._alignPriceCount = 0;
    }
    function $FillDistancesPrices(this$static) {
        var baseVal, encoder, footerBits, i, lenToPosState, posSlot, st, st2;
        for (i = 4; i < 128; ++i) {
            posSlot = GetPosSlot(i);
            footerBits = (posSlot >> 1) - 1;
            baseVal = (2 | posSlot & 1) << footerBits;
            this$static.tempPrices[i] = ReverseGetPrice(this$static._posEncoders, baseVal - posSlot - 1, footerBits, i - baseVal);
        }
        for (lenToPosState = 0; lenToPosState < 4; ++lenToPosState) {
            encoder = this$static._posSlotEncoder[lenToPosState];
            st = lenToPosState << 6;
            for (posSlot = 0; posSlot < this$static._distTableSize; ++posSlot) {
                this$static._posSlotPrices[st + posSlot] = $GetPrice_1(encoder, posSlot);
            }
            for (posSlot = 14; posSlot < this$static._distTableSize; ++posSlot) {
                this$static._posSlotPrices[st + posSlot] += (posSlot >> 1) - 1 - 4 << 6;
            }
            st2 = lenToPosState * 128;
            for (i = 0; i < 4; ++i) {
                this$static._distancesPrices[st2 + i] = this$static._posSlotPrices[st + i];
            }
            for (; i < 128; ++i) {
                this$static._distancesPrices[st2 + i] = this$static._posSlotPrices[st + GetPosSlot(i)] + this$static.tempPrices[i];
            }
        }
        this$static._matchPriceCount = 0;
    }
    function $Flush(this$static, nowPos) {
        $ReleaseMFStream(this$static);
        $WriteEndMarker(this$static, nowPos & this$static._posStateMask);
        for (var i = 0; i < 5; ++i) {
            $ShiftLow(this$static._rangeEncoder);
        }
    }
    function $GetOptimum(this$static, position) {
        var cur, curAnd1Price, curAndLenCharPrice, curAndLenPrice, curBack, curPrice, currentByte, distance, i, len, lenEnd, lenMain, lenRes, lenTest, lenTest2, lenTestTemp, matchByte, matchPrice, newLen, nextIsChar, nextMatchPrice, nextOptimum, nextRepMatchPrice, normalMatchPrice, numAvailableBytes, numAvailableBytesFull, numDistancePairs, offs, offset, opt, optimum, pos, posPrev, posState, posStateNext, price_4, repIndex, repLen, repMatchPrice, repMaxIndex, shortRepPrice, startLen, state, state2, t, price, price_0, price_1, price_2, price_3;
        if (this$static._optimumEndIndex != this$static._optimumCurrentIndex) {
            lenRes = this$static._optimum[this$static._optimumCurrentIndex].PosPrev - this$static._optimumCurrentIndex;
            this$static.backRes = this$static._optimum[this$static._optimumCurrentIndex].BackPrev;
            this$static._optimumCurrentIndex = this$static._optimum[this$static._optimumCurrentIndex].PosPrev;
            return lenRes;
        }
        this$static._optimumCurrentIndex = this$static._optimumEndIndex = 0;
        if (this$static._longestMatchWasFound) {
            lenMain = this$static._longestMatchLength;
            this$static._longestMatchWasFound = 0;
        }
        else {
            lenMain = $ReadMatchDistances(this$static);
        }
        numDistancePairs = this$static._numDistancePairs;
        numAvailableBytes = $GetNumAvailableBytes(this$static._matchFinder) + 1;
        if (numAvailableBytes < 2) {
            this$static.backRes = -1;
            return 1;
        }
        if (numAvailableBytes > 273) {
            numAvailableBytes = 273;
        }
        repMaxIndex = 0;
        for (i = 0; i < 4; ++i) {
            this$static.reps[i] = this$static._repDistances[i];
            this$static.repLens[i] = $GetMatchLen(this$static._matchFinder, -1, this$static.reps[i], 273);
            if (this$static.repLens[i] > this$static.repLens[repMaxIndex]) {
                repMaxIndex = i;
            }
        }
        if (this$static.repLens[repMaxIndex] >= this$static._numFastBytes) {
            this$static.backRes = repMaxIndex;
            lenRes = this$static.repLens[repMaxIndex];
            $MovePos(this$static, lenRes - 1);
            return lenRes;
        }
        if (lenMain >= this$static._numFastBytes) {
            this$static.backRes = this$static._matchDistances[numDistancePairs - 1] + 4;
            $MovePos(this$static, lenMain - 1);
            return lenMain;
        }
        currentByte = $GetIndexByte(this$static._matchFinder, -1);
        matchByte = $GetIndexByte(this$static._matchFinder, -this$static._repDistances[0] - 1 - 1);
        if (lenMain < 2 && currentByte != matchByte && this$static.repLens[repMaxIndex] < 2) {
            this$static.backRes = -1;
            return 1;
        }
        this$static._optimum[0].State = this$static._state;
        posState = position & this$static._posStateMask;
        this$static._optimum[1].Price = ProbPrices[this$static._isMatch[(this$static._state << 4) + posState] >>> 2] + $GetPrice_0($GetSubCoder(this$static._literalEncoder, position, this$static._previousByte), this$static._state >= 7, matchByte, currentByte);
        $MakeAsChar(this$static._optimum[1]);
        matchPrice = ProbPrices[2048 - this$static._isMatch[(this$static._state << 4) + posState] >>> 2];
        repMatchPrice = matchPrice + ProbPrices[2048 - this$static._isRep[this$static._state] >>> 2];
        if (matchByte == currentByte) {
            shortRepPrice = repMatchPrice + $GetRepLen1Price(this$static, this$static._state, posState);
            if (shortRepPrice < this$static._optimum[1].Price) {
                this$static._optimum[1].Price = shortRepPrice;
                $MakeAsShortRep(this$static._optimum[1]);
            }
        }
        lenEnd = lenMain >= this$static.repLens[repMaxIndex] ? lenMain : this$static.repLens[repMaxIndex];
        if (lenEnd < 2) {
            this$static.backRes = this$static._optimum[1].BackPrev;
            return 1;
        }
        this$static._optimum[1].PosPrev = 0;
        this$static._optimum[0].Backs0 = this$static.reps[0];
        this$static._optimum[0].Backs1 = this$static.reps[1];
        this$static._optimum[0].Backs2 = this$static.reps[2];
        this$static._optimum[0].Backs3 = this$static.reps[3];
        len = lenEnd;
        do {
            this$static._optimum[len--].Price = 268435455;
        } while (len >= 2);
        for (i = 0; i < 4; ++i) {
            repLen = this$static.repLens[i];
            if (repLen < 2) {
                continue;
            }
            price_4 = repMatchPrice + $GetPureRepPrice(this$static, i, this$static._state, posState);
            do {
                curAndLenPrice = price_4 + $GetPrice(this$static._repMatchLenEncoder, repLen - 2, posState);
                optimum = this$static._optimum[repLen];
                if (curAndLenPrice < optimum.Price) {
                    optimum.Price = curAndLenPrice;
                    optimum.PosPrev = 0;
                    optimum.BackPrev = i;
                    optimum.Prev1IsChar = 0;
                }
            } while (--repLen >= 2);
        }
        normalMatchPrice = matchPrice + ProbPrices[this$static._isRep[this$static._state] >>> 2];
        len = this$static.repLens[0] >= 2 ? this$static.repLens[0] + 1 : 2;
        if (len <= lenMain) {
            offs = 0;
            while (len > this$static._matchDistances[offs]) {
                offs += 2;
            }
            for (;; ++len) {
                distance = this$static._matchDistances[offs + 1];
                curAndLenPrice = normalMatchPrice + $GetPosLenPrice(this$static, distance, len, posState);
                optimum = this$static._optimum[len];
                if (curAndLenPrice < optimum.Price) {
                    optimum.Price = curAndLenPrice;
                    optimum.PosPrev = 0;
                    optimum.BackPrev = distance + 4;
                    optimum.Prev1IsChar = 0;
                }
                if (len == this$static._matchDistances[offs]) {
                    offs += 2;
                    if (offs == numDistancePairs) {
                        break;
                    }
                }
            }
        }
        cur = 0;
        while (1) {
            ++cur;
            if (cur == lenEnd) {
                return $Backward(this$static, cur);
            }
            newLen = $ReadMatchDistances(this$static);
            numDistancePairs = this$static._numDistancePairs;
            if (newLen >= this$static._numFastBytes) {
                this$static._longestMatchLength = newLen;
                this$static._longestMatchWasFound = 1;
                return $Backward(this$static, cur);
            }
            ++position;
            posPrev = this$static._optimum[cur].PosPrev;
            if (this$static._optimum[cur].Prev1IsChar) {
                --posPrev;
                if (this$static._optimum[cur].Prev2) {
                    state = this$static._optimum[this$static._optimum[cur].PosPrev2].State;
                    if (this$static._optimum[cur].BackPrev2 < 4) {
                        state = (state < 7) ? 8 : 11;
                    }
                    else {
                        state = (state < 7) ? 7 : 10;
                    }
                }
                else {
                    state = this$static._optimum[posPrev].State;
                }
                state = StateUpdateChar(state);
            }
            else {
                state = this$static._optimum[posPrev].State;
            }
            if (posPrev == cur - 1) {
                if (!this$static._optimum[cur].BackPrev) {
                    state = state < 7 ? 9 : 11;
                }
                else {
                    state = StateUpdateChar(state);
                }
            }
            else {
                if (this$static._optimum[cur].Prev1IsChar && this$static._optimum[cur].Prev2) {
                    posPrev = this$static._optimum[cur].PosPrev2;
                    pos = this$static._optimum[cur].BackPrev2;
                    state = state < 7 ? 8 : 11;
                }
                else {
                    pos = this$static._optimum[cur].BackPrev;
                    if (pos < 4) {
                        state = state < 7 ? 8 : 11;
                    }
                    else {
                        state = state < 7 ? 7 : 10;
                    }
                }
                opt = this$static._optimum[posPrev];
                if (pos < 4) {
                    if (!pos) {
                        this$static.reps[0] = opt.Backs0;
                        this$static.reps[1] = opt.Backs1;
                        this$static.reps[2] = opt.Backs2;
                        this$static.reps[3] = opt.Backs3;
                    }
                    else if (pos == 1) {
                        this$static.reps[0] = opt.Backs1;
                        this$static.reps[1] = opt.Backs0;
                        this$static.reps[2] = opt.Backs2;
                        this$static.reps[3] = opt.Backs3;
                    }
                    else if (pos == 2) {
                        this$static.reps[0] = opt.Backs2;
                        this$static.reps[1] = opt.Backs0;
                        this$static.reps[2] = opt.Backs1;
                        this$static.reps[3] = opt.Backs3;
                    }
                    else {
                        this$static.reps[0] = opt.Backs3;
                        this$static.reps[1] = opt.Backs0;
                        this$static.reps[2] = opt.Backs1;
                        this$static.reps[3] = opt.Backs2;
                    }
                }
                else {
                    this$static.reps[0] = pos - 4;
                    this$static.reps[1] = opt.Backs0;
                    this$static.reps[2] = opt.Backs1;
                    this$static.reps[3] = opt.Backs2;
                }
            }
            this$static._optimum[cur].State = state;
            this$static._optimum[cur].Backs0 = this$static.reps[0];
            this$static._optimum[cur].Backs1 = this$static.reps[1];
            this$static._optimum[cur].Backs2 = this$static.reps[2];
            this$static._optimum[cur].Backs3 = this$static.reps[3];
            curPrice = this$static._optimum[cur].Price;
            currentByte = $GetIndexByte(this$static._matchFinder, -1);
            matchByte = $GetIndexByte(this$static._matchFinder, -this$static.reps[0] - 1 - 1);
            posState = position & this$static._posStateMask;
            curAnd1Price = curPrice + ProbPrices[this$static._isMatch[(state << 4) + posState] >>> 2] + $GetPrice_0($GetSubCoder(this$static._literalEncoder, position, $GetIndexByte(this$static._matchFinder, -2)), state >= 7, matchByte, currentByte);
            nextOptimum = this$static._optimum[cur + 1];
            nextIsChar = 0;
            if (curAnd1Price < nextOptimum.Price) {
                nextOptimum.Price = curAnd1Price;
                nextOptimum.PosPrev = cur;
                nextOptimum.BackPrev = -1;
                nextOptimum.Prev1IsChar = 0;
                nextIsChar = 1;
            }
            matchPrice = curPrice + ProbPrices[2048 - this$static._isMatch[(state << 4) + posState] >>> 2];
            repMatchPrice = matchPrice + ProbPrices[2048 - this$static._isRep[state] >>> 2];
            if (matchByte == currentByte && !(nextOptimum.PosPrev < cur && !nextOptimum.BackPrev)) {
                shortRepPrice = repMatchPrice + (ProbPrices[this$static._isRepG0[state] >>> 2] + ProbPrices[this$static._isRep0Long[(state << 4) + posState] >>> 2]);
                if (shortRepPrice <= nextOptimum.Price) {
                    nextOptimum.Price = shortRepPrice;
                    nextOptimum.PosPrev = cur;
                    nextOptimum.BackPrev = 0;
                    nextOptimum.Prev1IsChar = 0;
                    nextIsChar = 1;
                }
            }
            numAvailableBytesFull = $GetNumAvailableBytes(this$static._matchFinder) + 1;
            numAvailableBytesFull = 4095 - cur < numAvailableBytesFull ? 4095 - cur : numAvailableBytesFull;
            numAvailableBytes = numAvailableBytesFull;
            if (numAvailableBytes < 2) {
                continue;
            }
            if (numAvailableBytes > this$static._numFastBytes) {
                numAvailableBytes = this$static._numFastBytes;
            }
            if (!nextIsChar && matchByte != currentByte) {
                t = Math.min(numAvailableBytesFull - 1, this$static._numFastBytes);
                lenTest2 = $GetMatchLen(this$static._matchFinder, 0, this$static.reps[0], t);
                if (lenTest2 >= 2) {
                    state2 = StateUpdateChar(state);
                    posStateNext = position + 1 & this$static._posStateMask;
                    nextRepMatchPrice = curAnd1Price + ProbPrices[2048 - this$static._isMatch[(state2 << 4) + posStateNext] >>> 2] + ProbPrices[2048 - this$static._isRep[state2] >>> 2];
                    offset = cur + 1 + lenTest2;
                    while (lenEnd < offset) {
                        this$static._optimum[++lenEnd].Price = 268435455;
                    }
                    curAndLenPrice = nextRepMatchPrice + (price = $GetPrice(this$static._repMatchLenEncoder, lenTest2 - 2, posStateNext), price + $GetPureRepPrice(this$static, 0, state2, posStateNext));
                    optimum = this$static._optimum[offset];
                    if (curAndLenPrice < optimum.Price) {
                        optimum.Price = curAndLenPrice;
                        optimum.PosPrev = cur + 1;
                        optimum.BackPrev = 0;
                        optimum.Prev1IsChar = 1;
                        optimum.Prev2 = 0;
                    }
                }
            }
            startLen = 2;
            for (repIndex = 0; repIndex < 4; ++repIndex) {
                lenTest = $GetMatchLen(this$static._matchFinder, -1, this$static.reps[repIndex], numAvailableBytes);
                if (lenTest < 2) {
                    continue;
                }
                lenTestTemp = lenTest;
                do {
                    while (lenEnd < cur + lenTest) {
                        this$static._optimum[++lenEnd].Price = 268435455;
                    }
                    curAndLenPrice = repMatchPrice + (price_0 = $GetPrice(this$static._repMatchLenEncoder, lenTest - 2, posState), price_0 + $GetPureRepPrice(this$static, repIndex, state, posState));
                    optimum = this$static._optimum[cur + lenTest];
                    if (curAndLenPrice < optimum.Price) {
                        optimum.Price = curAndLenPrice;
                        optimum.PosPrev = cur;
                        optimum.BackPrev = repIndex;
                        optimum.Prev1IsChar = 0;
                    }
                } while (--lenTest >= 2);
                lenTest = lenTestTemp;
                if (!repIndex) {
                    startLen = lenTest + 1;
                }
                if (lenTest < numAvailableBytesFull) {
                    t = Math.min(numAvailableBytesFull - 1 - lenTest, this$static._numFastBytes);
                    lenTest2 = $GetMatchLen(this$static._matchFinder, lenTest, this$static.reps[repIndex], t);
                    if (lenTest2 >= 2) {
                        state2 = state < 7 ? 8 : 11;
                        posStateNext = position + lenTest & this$static._posStateMask;
                        curAndLenCharPrice = repMatchPrice + (price_1 = $GetPrice(this$static._repMatchLenEncoder, lenTest - 2, posState), price_1 + $GetPureRepPrice(this$static, repIndex, state, posState)) + ProbPrices[this$static._isMatch[(state2 << 4) + posStateNext] >>> 2] + $GetPrice_0($GetSubCoder(this$static._literalEncoder, position + lenTest, $GetIndexByte(this$static._matchFinder, lenTest - 1 - 1)), 1, $GetIndexByte(this$static._matchFinder, lenTest - 1 - (this$static.reps[repIndex] + 1)), $GetIndexByte(this$static._matchFinder, lenTest - 1));
                        state2 = StateUpdateChar(state2);
                        posStateNext = position + lenTest + 1 & this$static._posStateMask;
                        nextMatchPrice = curAndLenCharPrice + ProbPrices[2048 - this$static._isMatch[(state2 << 4) + posStateNext] >>> 2];
                        nextRepMatchPrice = nextMatchPrice + ProbPrices[2048 - this$static._isRep[state2] >>> 2];
                        offset = lenTest + 1 + lenTest2;
                        while (lenEnd < cur + offset) {
                            this$static._optimum[++lenEnd].Price = 268435455;
                        }
                        curAndLenPrice = nextRepMatchPrice + (price_2 = $GetPrice(this$static._repMatchLenEncoder, lenTest2 - 2, posStateNext), price_2 + $GetPureRepPrice(this$static, 0, state2, posStateNext));
                        optimum = this$static._optimum[cur + offset];
                        if (curAndLenPrice < optimum.Price) {
                            optimum.Price = curAndLenPrice;
                            optimum.PosPrev = cur + lenTest + 1;
                            optimum.BackPrev = 0;
                            optimum.Prev1IsChar = 1;
                            optimum.Prev2 = 1;
                            optimum.PosPrev2 = cur;
                            optimum.BackPrev2 = repIndex;
                        }
                    }
                }
            }
            if (newLen > numAvailableBytes) {
                newLen = numAvailableBytes;
                for (numDistancePairs = 0; newLen > this$static._matchDistances[numDistancePairs]; numDistancePairs += 2) { }
                this$static._matchDistances[numDistancePairs] = newLen;
                numDistancePairs += 2;
            }
            if (newLen >= startLen) {
                normalMatchPrice = matchPrice + ProbPrices[this$static._isRep[state] >>> 2];
                while (lenEnd < cur + newLen) {
                    this$static._optimum[++lenEnd].Price = 268435455;
                }
                offs = 0;
                while (startLen > this$static._matchDistances[offs]) {
                    offs += 2;
                }
                for (lenTest = startLen;; ++lenTest) {
                    curBack = this$static._matchDistances[offs + 1];
                    curAndLenPrice = normalMatchPrice + $GetPosLenPrice(this$static, curBack, lenTest, posState);
                    optimum = this$static._optimum[cur + lenTest];
                    if (curAndLenPrice < optimum.Price) {
                        optimum.Price = curAndLenPrice;
                        optimum.PosPrev = cur;
                        optimum.BackPrev = curBack + 4;
                        optimum.Prev1IsChar = 0;
                    }
                    if (lenTest == this$static._matchDistances[offs]) {
                        if (lenTest < numAvailableBytesFull) {
                            t = Math.min(numAvailableBytesFull - 1 - lenTest, this$static._numFastBytes);
                            lenTest2 = $GetMatchLen(this$static._matchFinder, lenTest, curBack, t);
                            if (lenTest2 >= 2) {
                                state2 = state < 7 ? 7 : 10;
                                posStateNext = position + lenTest & this$static._posStateMask;
                                curAndLenCharPrice = curAndLenPrice + ProbPrices[this$static._isMatch[(state2 << 4) + posStateNext] >>> 2] + $GetPrice_0($GetSubCoder(this$static._literalEncoder, position + lenTest, $GetIndexByte(this$static._matchFinder, lenTest - 1 - 1)), 1, $GetIndexByte(this$static._matchFinder, lenTest - (curBack + 1) - 1), $GetIndexByte(this$static._matchFinder, lenTest - 1));
                                state2 = StateUpdateChar(state2);
                                posStateNext = position + lenTest + 1 & this$static._posStateMask;
                                nextMatchPrice = curAndLenCharPrice + ProbPrices[2048 - this$static._isMatch[(state2 << 4) + posStateNext] >>> 2];
                                nextRepMatchPrice = nextMatchPrice + ProbPrices[2048 - this$static._isRep[state2] >>> 2];
                                offset = lenTest + 1 + lenTest2;
                                while (lenEnd < cur + offset) {
                                    this$static._optimum[++lenEnd].Price = 268435455;
                                }
                                curAndLenPrice = nextRepMatchPrice + (price_3 = $GetPrice(this$static._repMatchLenEncoder, lenTest2 - 2, posStateNext), price_3 + $GetPureRepPrice(this$static, 0, state2, posStateNext));
                                optimum = this$static._optimum[cur + offset];
                                if (curAndLenPrice < optimum.Price) {
                                    optimum.Price = curAndLenPrice;
                                    optimum.PosPrev = cur + lenTest + 1;
                                    optimum.BackPrev = 0;
                                    optimum.Prev1IsChar = 1;
                                    optimum.Prev2 = 1;
                                    optimum.PosPrev2 = cur;
                                    optimum.BackPrev2 = curBack + 4;
                                }
                            }
                        }
                        offs += 2;
                        if (offs == numDistancePairs)
                            break;
                    }
                }
            }
        }
    }
    function $GetPosLenPrice(this$static, pos, len, posState) {
        var price, lenToPosState = GetLenToPosState(len);
        if (pos < 128) {
            price = this$static._distancesPrices[lenToPosState * 128 + pos];
        }
        else {
            price = this$static._posSlotPrices[(lenToPosState << 6) + GetPosSlot2(pos)] + this$static._alignPrices[pos & 15];
        }
        return price + $GetPrice(this$static._lenEncoder, len - 2, posState);
    }
    function $GetPureRepPrice(this$static, repIndex, state, posState) {
        var price;
        if (!repIndex) {
            price = ProbPrices[this$static._isRepG0[state] >>> 2];
            price += ProbPrices[2048 - this$static._isRep0Long[(state << 4) + posState] >>> 2];
        }
        else {
            price = ProbPrices[2048 - this$static._isRepG0[state] >>> 2];
            if (repIndex == 1) {
                price += ProbPrices[this$static._isRepG1[state] >>> 2];
            }
            else {
                price += ProbPrices[2048 - this$static._isRepG1[state] >>> 2];
                price += GetPrice(this$static._isRepG2[state], repIndex - 2);
            }
        }
        return price;
    }
    function $GetRepLen1Price(this$static, state, posState) {
        return ProbPrices[this$static._isRepG0[state] >>> 2] + ProbPrices[this$static._isRep0Long[(state << 4) + posState] >>> 2];
    }
    function $Init_4(this$static) {
        $BaseInit(this$static);
        $Init_9(this$static._rangeEncoder);
        InitBitModels(this$static._isMatch);
        InitBitModels(this$static._isRep0Long);
        InitBitModels(this$static._isRep);
        InitBitModels(this$static._isRepG0);
        InitBitModels(this$static._isRepG1);
        InitBitModels(this$static._isRepG2);
        InitBitModels(this$static._posEncoders);
        $Init_3(this$static._literalEncoder);
        for (var i = 0; i < 4; ++i) {
            InitBitModels(this$static._posSlotEncoder[i].Models);
        }
        $Init_2(this$static._lenEncoder, 1 << this$static._posStateBits);
        $Init_2(this$static._repMatchLenEncoder, 1 << this$static._posStateBits);
        InitBitModels(this$static._posAlignEncoder.Models);
        this$static._longestMatchWasFound = 0;
        this$static._optimumEndIndex = 0;
        this$static._optimumCurrentIndex = 0;
        this$static._additionalOffset = 0;
    }
    function $MovePos(this$static, num) {
        if (num > 0) {
            $Skip(this$static._matchFinder, num);
            this$static._additionalOffset += num;
        }
    }
    function $ReadMatchDistances(this$static) {
        var lenRes = 0;
        this$static._numDistancePairs = $GetMatches(this$static._matchFinder, this$static._matchDistances);
        if (this$static._numDistancePairs > 0) {
            lenRes = this$static._matchDistances[this$static._numDistancePairs - 2];
            if (lenRes == this$static._numFastBytes)
                lenRes += $GetMatchLen(this$static._matchFinder, lenRes - 1, this$static._matchDistances[this$static._numDistancePairs - 1], 273 - lenRes);
        }
        ++this$static._additionalOffset;
        return lenRes;
    }
    function $ReleaseMFStream(this$static) {
        if (this$static._matchFinder && this$static._needReleaseMFStream) {
            this$static._matchFinder._stream = null;
            this$static._needReleaseMFStream = 0;
        }
    }
    function $ReleaseStreams(this$static) {
        $ReleaseMFStream(this$static);
        this$static._rangeEncoder.Stream = null;
    }
    function $SetDictionarySize_0(this$static, dictionarySize) {
        this$static._dictionarySize = dictionarySize;
        for (var dicLogSize = 0; dictionarySize > 1 << dicLogSize; ++dicLogSize) { }
        this$static._distTableSize = dicLogSize * 2;
    }
    function $SetMatchFinder(this$static, matchFinderIndex) {
        var matchFinderIndexPrev = this$static._matchFinderType;
        this$static._matchFinderType = matchFinderIndex;
        if (this$static._matchFinder && matchFinderIndexPrev != this$static._matchFinderType) {
            this$static._dictionarySizePrev = -1;
            this$static._matchFinder = null;
        }
    }
    function $WriteCoderProperties(this$static, outStream) {
        this$static.properties[0] = (this$static._posStateBits * 5 + this$static._numLiteralPosStateBits) * 9 + this$static._numLiteralContextBits << 24 >> 24;
        for (var i = 0; i < 4; ++i) {
            this$static.properties[1 + i] = this$static._dictionarySize >> 8 * i << 24 >> 24;
        }
        $write_0(outStream, this$static.properties, 0, 5);
    }
    function $WriteEndMarker(this$static, posState) {
        if (!this$static._writeEndMark) {
            return;
        }
        $Encode_3(this$static._rangeEncoder, this$static._isMatch, (this$static._state << 4) + posState, 1);
        $Encode_3(this$static._rangeEncoder, this$static._isRep, this$static._state, 0);
        this$static._state = this$static._state < 7 ? 7 : 10;
        $Encode_0(this$static._lenEncoder, this$static._rangeEncoder, 0, posState);
        var lenToPosState = GetLenToPosState(2);
        $Encode_2(this$static._posSlotEncoder[lenToPosState], this$static._rangeEncoder, 63);
        $EncodeDirectBits(this$static._rangeEncoder, 67108863, 26);
        $ReverseEncode(this$static._posAlignEncoder, this$static._rangeEncoder, 15);
    }
    function GetPosSlot(pos) {
        if (pos < 2048) {
            return g_FastPos[pos];
        }
        if (pos < 2097152) {
            return g_FastPos[pos >> 10] + 20;
        }
        return g_FastPos[pos >> 20] + 40;
    }
    function GetPosSlot2(pos) {
        if (pos < 131072) {
            return g_FastPos[pos >> 6] + 12;
        }
        if (pos < 134217728) {
            return g_FastPos[pos >> 16] + 32;
        }
        return g_FastPos[pos >> 26] + 52;
    }
    function $Encode(this$static, rangeEncoder, symbol, posState) {
        if (symbol < 8) {
            $Encode_3(rangeEncoder, this$static._choice, 0, 0);
            $Encode_2(this$static._lowCoder[posState], rangeEncoder, symbol);
        }
        else {
            symbol -= 8;
            $Encode_3(rangeEncoder, this$static._choice, 0, 1);
            if (symbol < 8) {
                $Encode_3(rangeEncoder, this$static._choice, 1, 0);
                $Encode_2(this$static._midCoder[posState], rangeEncoder, symbol);
            }
            else {
                $Encode_3(rangeEncoder, this$static._choice, 1, 1);
                $Encode_2(this$static._highCoder, rangeEncoder, symbol - 8);
            }
        }
    }
    function $Encoder$LenEncoder(this$static) {
        this$static._choice = initDim(2);
        this$static._lowCoder = initDim(16);
        this$static._midCoder = initDim(16);
        this$static._highCoder = $BitTreeEncoder({}, 8);
        for (var posState = 0; posState < 16; ++posState) {
            this$static._lowCoder[posState] = $BitTreeEncoder({}, 3);
            this$static._midCoder[posState] = $BitTreeEncoder({}, 3);
        }
        return this$static;
    }
    function $Init_2(this$static, numPosStates) {
        InitBitModels(this$static._choice);
        for (var posState = 0; posState < numPosStates; ++posState) {
            InitBitModels(this$static._lowCoder[posState].Models);
            InitBitModels(this$static._midCoder[posState].Models);
        }
        InitBitModels(this$static._highCoder.Models);
    }
    function $SetPrices(this$static, posState, numSymbols, prices, st) {
        var a0, a1, b0, b1, i;
        a0 = ProbPrices[this$static._choice[0] >>> 2];
        a1 = ProbPrices[2048 - this$static._choice[0] >>> 2];
        b0 = a1 + ProbPrices[this$static._choice[1] >>> 2];
        b1 = a1 + ProbPrices[2048 - this$static._choice[1] >>> 2];
        i = 0;
        for (i = 0; i < 8; ++i) {
            if (i >= numSymbols)
                return;
            prices[st + i] = a0 + $GetPrice_1(this$static._lowCoder[posState], i);
        }
        for (; i < 16; ++i) {
            if (i >= numSymbols)
                return;
            prices[st + i] = b0 + $GetPrice_1(this$static._midCoder[posState], i - 8);
        }
        for (; i < numSymbols; ++i) {
            prices[st + i] = b1 + $GetPrice_1(this$static._highCoder, i - 8 - 8);
        }
    }
    function $Encode_0(this$static, rangeEncoder, symbol, posState) {
        $Encode(this$static, rangeEncoder, symbol, posState);
        if (--this$static._counters[posState] == 0) {
            $SetPrices(this$static, posState, this$static._tableSize, this$static._prices, posState * 272);
            this$static._counters[posState] = this$static._tableSize;
        }
    }
    function $Encoder$LenPriceTableEncoder(this$static) {
        $Encoder$LenEncoder(this$static);
        this$static._prices = [];
        this$static._counters = [];
        return this$static;
    }
    function $GetPrice(this$static, symbol, posState) {
        return this$static._prices[posState * 272 + symbol];
    }
    function $UpdateTables(this$static, numPosStates) {
        for (var posState = 0; posState < numPosStates; ++posState) {
            $SetPrices(this$static, posState, this$static._tableSize, this$static._prices, posState * 272);
            this$static._counters[posState] = this$static._tableSize;
        }
    }
    function $Create_1(this$static, numPosBits, numPrevBits) {
        var i, numStates;
        if (this$static.m_Coders != null && this$static.m_NumPrevBits == numPrevBits && this$static.m_NumPosBits == numPosBits) {
            return;
        }
        this$static.m_NumPosBits = numPosBits;
        this$static.m_PosMask = (1 << numPosBits) - 1;
        this$static.m_NumPrevBits = numPrevBits;
        numStates = 1 << this$static.m_NumPrevBits + this$static.m_NumPosBits;
        this$static.m_Coders = initDim(numStates);
        for (i = 0; i < numStates; ++i) {
            this$static.m_Coders[i] = $Encoder$LiteralEncoder$Encoder2({});
        }
    }
    function $GetSubCoder(this$static, pos, prevByte) {
        return this$static.m_Coders[((pos & this$static.m_PosMask) << this$static.m_NumPrevBits) + ((prevByte & 255) >>> 8 - this$static.m_NumPrevBits)];
    }
    function $Init_3(this$static) {
        var i, numStates = 1 << this$static.m_NumPrevBits + this$static.m_NumPosBits;
        for (i = 0; i < numStates; ++i) {
            InitBitModels(this$static.m_Coders[i].m_Encoders);
        }
    }
    function $Encode_1(this$static, rangeEncoder, symbol) {
        var bit, i, context = 1;
        for (i = 7; i >= 0; --i) {
            bit = symbol >> i & 1;
            $Encode_3(rangeEncoder, this$static.m_Encoders, context, bit);
            context = context << 1 | bit;
        }
    }
    function $EncodeMatched(this$static, rangeEncoder, matchByte, symbol) {
        var bit, i, matchBit, state, same = true, context = 1;
        for (i = 7; i >= 0; --i) {
            bit = symbol >> i & 1;
            state = context;
            if (same) {
                matchBit = matchByte >> i & 1;
                state += 1 + matchBit << 8;
                same = matchBit == bit;
            }
            $Encode_3(rangeEncoder, this$static.m_Encoders, state, bit);
            context = context << 1 | bit;
        }
    }
    function $Encoder$LiteralEncoder$Encoder2(this$static) {
        this$static.m_Encoders = initDim(768);
        return this$static;
    }
    function $GetPrice_0(this$static, matchMode, matchByte, symbol) {
        var bit, context = 1, i = 7, matchBit, price = 0;
        if (matchMode) {
            for (; i >= 0; --i) {
                matchBit = matchByte >> i & 1;
                bit = symbol >> i & 1;
                price += GetPrice(this$static.m_Encoders[(1 + matchBit << 8) + context], bit);
                context = context << 1 | bit;
                if (matchBit != bit) {
                    --i;
                    break;
                }
            }
        }
        for (; i >= 0; --i) {
            bit = symbol >> i & 1;
            price += GetPrice(this$static.m_Encoders[context], bit);
            context = context << 1 | bit;
        }
        return price;
    }
    function $MakeAsChar(this$static) {
        this$static.BackPrev = -1;
        this$static.Prev1IsChar = 0;
    }
    function $MakeAsShortRep(this$static) {
        this$static.BackPrev = 0;
        this$static.Prev1IsChar = 0;
    }
    /** ce */
    /** ds */
    function $BitTreeDecoder(this$static, numBitLevels) {
        this$static.NumBitLevels = numBitLevels;
        this$static.Models = initDim(1 << numBitLevels);
        return this$static;
    }
    function $Decode_0(this$static, rangeDecoder) {
        var bitIndex, m = 1;
        for (bitIndex = this$static.NumBitLevels; bitIndex != 0; --bitIndex) {
            m = (m << 1) + $DecodeBit(rangeDecoder, this$static.Models, m);
        }
        return m - (1 << this$static.NumBitLevels);
    }
    function $ReverseDecode(this$static, rangeDecoder) {
        var bit, bitIndex, m = 1, symbol = 0;
        for (bitIndex = 0; bitIndex < this$static.NumBitLevels; ++bitIndex) {
            bit = $DecodeBit(rangeDecoder, this$static.Models, m);
            m <<= 1;
            m += bit;
            symbol |= bit << bitIndex;
        }
        return symbol;
    }
    function ReverseDecode(Models, startIndex, rangeDecoder, NumBitLevels) {
        var bit, bitIndex, m = 1, symbol = 0;
        for (bitIndex = 0; bitIndex < NumBitLevels; ++bitIndex) {
            bit = $DecodeBit(rangeDecoder, Models, startIndex + m);
            m <<= 1;
            m += bit;
            symbol |= bit << bitIndex;
        }
        return symbol;
    }
    /** de */
    /** cs */
    function $BitTreeEncoder(this$static, numBitLevels) {
        this$static.NumBitLevels = numBitLevels;
        this$static.Models = initDim(1 << numBitLevels);
        return this$static;
    }
    function $Encode_2(this$static, rangeEncoder, symbol) {
        var bit, bitIndex, m = 1;
        for (bitIndex = this$static.NumBitLevels; bitIndex != 0;) {
            --bitIndex;
            bit = symbol >>> bitIndex & 1;
            $Encode_3(rangeEncoder, this$static.Models, m, bit);
            m = m << 1 | bit;
        }
    }
    function $GetPrice_1(this$static, symbol) {
        var bit, bitIndex, m = 1, price = 0;
        for (bitIndex = this$static.NumBitLevels; bitIndex != 0;) {
            --bitIndex;
            bit = symbol >>> bitIndex & 1;
            price += GetPrice(this$static.Models[m], bit);
            m = (m << 1) + bit;
        }
        return price;
    }
    function $ReverseEncode(this$static, rangeEncoder, symbol) {
        var bit, i, m = 1;
        for (i = 0; i < this$static.NumBitLevels; ++i) {
            bit = symbol & 1;
            $Encode_3(rangeEncoder, this$static.Models, m, bit);
            m = m << 1 | bit;
            symbol >>= 1;
        }
    }
    function $ReverseGetPrice(this$static, symbol) {
        var bit, i, m = 1, price = 0;
        for (i = this$static.NumBitLevels; i != 0; --i) {
            bit = symbol & 1;
            symbol >>>= 1;
            price += GetPrice(this$static.Models[m], bit);
            m = m << 1 | bit;
        }
        return price;
    }
    function ReverseEncode(Models, startIndex, rangeEncoder, NumBitLevels, symbol) {
        var bit, i, m = 1;
        for (i = 0; i < NumBitLevels; ++i) {
            bit = symbol & 1;
            $Encode_3(rangeEncoder, Models, startIndex + m, bit);
            m = m << 1 | bit;
            symbol >>= 1;
        }
    }
    function ReverseGetPrice(Models, startIndex, NumBitLevels, symbol) {
        var bit, i, m = 1, price = 0;
        for (i = NumBitLevels; i != 0; --i) {
            bit = symbol & 1;
            symbol >>>= 1;
            price += ProbPrices[((Models[startIndex + m] - bit ^ -bit) & 2047) >>> 2];
            m = m << 1 | bit;
        }
        return price;
    }
    /** ce */
    /** ds */
    function $DecodeBit(this$static, probs, index) {
        var newBound, prob = probs[index];
        newBound = (this$static.Range >>> 11) * prob;
        if ((this$static.Code ^ -2147483648) < (newBound ^ -2147483648)) {
            this$static.Range = newBound;
            probs[index] = prob + (2048 - prob >>> 5) << 16 >> 16;
            if (!(this$static.Range & -16777216)) {
                this$static.Code = this$static.Code << 8 | $read(this$static.Stream);
                this$static.Range <<= 8;
            }
            return 0;
        }
        else {
            this$static.Range -= newBound;
            this$static.Code -= newBound;
            probs[index] = prob - (prob >>> 5) << 16 >> 16;
            if (!(this$static.Range & -16777216)) {
                this$static.Code = this$static.Code << 8 | $read(this$static.Stream);
                this$static.Range <<= 8;
            }
            return 1;
        }
    }
    function $DecodeDirectBits(this$static, numTotalBits) {
        var i, t, result = 0;
        for (i = numTotalBits; i != 0; --i) {
            this$static.Range >>>= 1;
            t = this$static.Code - this$static.Range >>> 31;
            this$static.Code -= this$static.Range & t - 1;
            result = result << 1 | 1 - t;
            if (!(this$static.Range & -16777216)) {
                this$static.Code = this$static.Code << 8 | $read(this$static.Stream);
                this$static.Range <<= 8;
            }
        }
        return result;
    }
    function $Init_8(this$static) {
        this$static.Code = 0;
        this$static.Range = -1;
        for (var i = 0; i < 5; ++i) {
            this$static.Code = this$static.Code << 8 | $read(this$static.Stream);
        }
    }
    /** de */
    function InitBitModels(probs) {
        for (var i = probs.length - 1; i >= 0; --i) {
            probs[i] = 1024;
        }
    }
    /** cs */
    var ProbPrices = (function () {
        var end, i, j, start, ProbPrices = [];
        for (i = 8; i >= 0; --i) {
            start = 1 << 9 - i - 1;
            end = 1 << 9 - i;
            for (j = start; j < end; ++j) {
                ProbPrices[j] = (i << 6) + (end - j << 6 >>> 9 - i - 1);
            }
        }
        return ProbPrices;
    }());
    function $Encode_3(this$static, probs, index, symbol) {
        var newBound, prob = probs[index];
        newBound = (this$static.Range >>> 11) * prob;
        if (!symbol) {
            this$static.Range = newBound;
            probs[index] = prob + (2048 - prob >>> 5) << 16 >> 16;
        }
        else {
            this$static.Low = add(this$static.Low, and(fromInt(newBound), [4294967295, 0]));
            this$static.Range -= newBound;
            probs[index] = prob - (prob >>> 5) << 16 >> 16;
        }
        if (!(this$static.Range & -16777216)) {
            this$static.Range <<= 8;
            $ShiftLow(this$static);
        }
    }
    function $EncodeDirectBits(this$static, v, numTotalBits) {
        for (var i = numTotalBits - 1; i >= 0; --i) {
            this$static.Range >>>= 1;
            if ((v >>> i & 1) == 1) {
                this$static.Low = add(this$static.Low, fromInt(this$static.Range));
            }
            if (!(this$static.Range & -16777216)) {
                this$static.Range <<= 8;
                $ShiftLow(this$static);
            }
        }
    }
    function $GetProcessedSizeAdd(this$static) {
        return add(add(fromInt(this$static._cacheSize), this$static._position), [4, 0]);
    }
    function $Init_9(this$static) {
        this$static._position = P0_longLit;
        this$static.Low = P0_longLit;
        this$static.Range = -1;
        this$static._cacheSize = 1;
        this$static._cache = 0;
    }
    function $ShiftLow(this$static) {
        var temp, LowHi = lowBits_0(shru(this$static.Low, 32));
        if (LowHi != 0 || compare(this$static.Low, [4278190080, 0]) < 0) {
            this$static._position = add(this$static._position, fromInt(this$static._cacheSize));
            temp = this$static._cache;
            do {
                $write(this$static.Stream, temp + LowHi);
                temp = 255;
            } while (--this$static._cacheSize != 0);
            this$static._cache = lowBits_0(this$static.Low) >>> 24;
        }
        ++this$static._cacheSize;
        this$static.Low = shl(and(this$static.Low, [16777215, 0]), 8);
    }
    function GetPrice(Prob, symbol) {
        return ProbPrices[((Prob - symbol ^ -symbol) & 2047) >>> 2];
    }
    /** ce */
    /** ds */
    function decode(utf) {
        var i = 0, j = 0, x, y, z, l = utf.length, buf = [], charCodes = [];
        for (; i < l; ++i, ++j) {
            x = utf[i] & 255;
            if (!(x & 128)) {
                if (!x) {
                    /// It appears that this is binary data, so it cannot be converted to a string, so just send it back.
                    return utf;
                }
                charCodes[j] = x;
            }
            else if ((x & 224) == 192) {
                if (i + 1 >= l) {
                    /// It appears that this is binary data, so it cannot be converted to a string, so just send it back.
                    return utf;
                }
                y = utf[++i] & 255;
                if ((y & 192) != 128) {
                    /// It appears that this is binary data, so it cannot be converted to a string, so just send it back.
                    return utf;
                }
                charCodes[j] = ((x & 31) << 6) | (y & 63);
            }
            else if ((x & 240) == 224) {
                if (i + 2 >= l) {
                    /// It appears that this is binary data, so it cannot be converted to a string, so just send it back.
                    return utf;
                }
                y = utf[++i] & 255;
                if ((y & 192) != 128) {
                    /// It appears that this is binary data, so it cannot be converted to a string, so just send it back.
                    return utf;
                }
                z = utf[++i] & 255;
                if ((z & 192) != 128) {
                    /// It appears that this is binary data, so it cannot be converted to a string, so just send it back.
                    return utf;
                }
                charCodes[j] = ((x & 15) << 12) | ((y & 63) << 6) | (z & 63);
            }
            else {
                /// It appears that this is binary data, so it cannot be converted to a string, so just send it back.
                return utf;
            }
            if (j == 16383) {
                buf.push(String.fromCharCode.apply(String, charCodes));
                j = -1;
            }
        }
        if (j > 0) {
            charCodes.length = j;
            buf.push(String.fromCharCode.apply(String, charCodes));
        }
        return buf.join("");
    }
    /** de */
    /** cs */
    function encode(s) {
        var ch, chars = [], data, elen = 0, i, l = s.length;
        /// Be able to handle binary arrays and buffers.
        if (typeof s == "object") {
            return s;
        }
        else {
            $getChars(s, 0, l, chars, 0);
        }
        /// Add extra spaces in the array to break up the unicode symbols.
        for (i = 0; i < l; ++i) {
            ch = chars[i];
            if (ch >= 1 && ch <= 127) {
                ++elen;
            }
            else if (!ch || ch >= 128 && ch <= 2047) {
                elen += 2;
            }
            else {
                elen += 3;
            }
        }
        data = [];
        elen = 0;
        for (i = 0; i < l; ++i) {
            ch = chars[i];
            if (ch >= 1 && ch <= 127) {
                data[elen++] = ch << 24 >> 24;
            }
            else if (!ch || ch >= 128 && ch <= 2047) {
                data[elen++] = (192 | ch >> 6 & 31) << 24 >> 24;
                data[elen++] = (128 | ch & 63) << 24 >> 24;
            }
            else {
                data[elen++] = (224 | ch >> 12 & 15) << 24 >> 24;
                data[elen++] = (128 | ch >> 6 & 63) << 24 >> 24;
                data[elen++] = (128 | ch & 63) << 24 >> 24;
            }
        }
        return data;
    }
    /** ce */
    function toDouble(a) {
        return a[1] + a[0];
    }
    /** cs */
    function compress(str, mode, on_finish, on_progress) {
        var this$static = {}, percent, cbn, /// A callback number should be supplied instead of on_finish() if we are using Web Workers.
        sync = typeof on_finish == "undefined" && typeof on_progress == "undefined";
        if (typeof on_finish != "function") {
            cbn = on_finish;
            on_finish = on_progress = 0;
        }
        on_progress = on_progress || function (percent) {
            if (typeof cbn == "undefined")
                return;
            return update_progress(percent, cbn);
        };
        on_finish = on_finish || function (res, err) {
            if (typeof cbn == "undefined")
                return;
            /* SLASH
                return postMessage({
                  action: action_compress,
                  cbn: cbn,
                  result: res,
                  error: err
                });
            */
        };
        if (sync) {
            this$static.c = $LZMAByteArrayCompressor({}, encode(str), get_mode_obj(mode));
            while ($processChunk(this$static.c.chunker))
                ;
            return $toByteArray(this$static.c.output);
        }
        try {
            this$static.c = $LZMAByteArrayCompressor({}, encode(str), get_mode_obj(mode));
            on_progress(0);
        }
        catch (err) {
            return on_finish(null, err);
        }
        function do_action() {
            try {
                var res, start = (new Date()).getTime();
                while ($processChunk(this$static.c.chunker)) {
                    percent = toDouble(this$static.c.chunker.inBytesProcessed) / toDouble(this$static.c.length_0);
                    /// If about 200 miliseconds have passed, update the progress.
                    if ((new Date()).getTime() - start > 200) {
                        on_progress(percent);
                        wait(do_action, 0);
                        return 0;
                    }
                }
                on_progress(1);
                res = $toByteArray(this$static.c.output);
                /// delay so we don't catch errors from the on_finish handler
                wait(on_finish.bind(null, res), 0);
            }
            catch (err) {
                on_finish(null, err);
            }
        }
        ///NOTE: We need to wait to make sure it is always async.
        wait(do_action, 0);
    }
    /** ce */
    /** ds */
    function decompress(byte_arr, on_finish, on_progress) {
        var this$static = {}, percent, cbn, /// A callback number should be supplied instead of on_finish() if we are using Web Workers.
        has_progress, len, sync = typeof on_finish == "undefined" && typeof on_progress == "undefined";
        if (typeof on_finish != "function") {
            cbn = on_finish;
            on_finish = on_progress = 0;
        }
        on_progress = on_progress || function (percent) {
            if (typeof cbn == "undefined")
                return;
            return update_progress(has_progress ? percent : -1, cbn);
        };
        on_finish = on_finish || function (res, err) {
            if (typeof cbn == "undefined")
                return;
            /* SLASH
                return postMessage({
                  action: action_decompress,
                  cbn: cbn,
                  result: res,
                  error: err
                });
            */
        };
        if (sync) {
            this$static.d = $LZMAByteArrayDecompressor({}, byte_arr);
            while ($processChunk(this$static.d.chunker))
                ;
            return decode($toByteArray(this$static.d.output));
        }
        try {
            this$static.d = $LZMAByteArrayDecompressor({}, byte_arr);
            len = toDouble(this$static.d.length_0);
            ///NOTE: If the data was created via a stream, it will not have a length value, and therefore we can't calculate the progress.
            has_progress = len > -1;
            on_progress(0);
        }
        catch (err) {
            return on_finish(null, err);
        }
        function do_action() {
            try {
                var res, i = 0, start = (new Date()).getTime();
                while ($processChunk(this$static.d.chunker)) {
                    if (++i % 1000 == 0 && (new Date()).getTime() - start > 200) {
                        if (has_progress) {
                            percent = toDouble(this$static.d.chunker.decoder.nowPos64) / len;
                            /// If about 200 miliseconds have passed, update the progress.
                            on_progress(percent);
                        }
                        ///NOTE: This allows other code to run, like the browser to update.
                        wait(do_action, 0);
                        return 0;
                    }
                }
                on_progress(1);
                res = decode($toByteArray(this$static.d.output));
                /// delay so we don't catch errors from the on_finish handler
                wait(on_finish.bind(null, res), 0);
            }
            catch (err) {
                on_finish(null, err);
            }
        }
        ///NOTE: We need to wait to make sure it is always async.
        wait(do_action, 0);
    }
    /** de */
    /** cs */
    var get_mode_obj = (function () {
        /// s is dictionarySize
        /// f is fb
        /// m is matchFinder
        ///NOTE: Because some values are always the same, they have been removed.
        /// lc is always 3
        /// lp is always 0
        /// pb is always 2
        var modes = [
            { s: 16, f: 64, m: 0 },
            { s: 20, f: 64, m: 0 },
            { s: 19, f: 64, m: 1 },
            { s: 20, f: 64, m: 1 },
            { s: 21, f: 128, m: 1 },
            { s: 22, f: 128, m: 1 },
            { s: 23, f: 128, m: 1 },
            { s: 24, f: 255, m: 1 },
            { s: 25, f: 255, m: 1 }
        ];
        return function (mode) {
            return modes[mode - 1] || modes[6];
        };
    }());
    /** ce */
    /* SLASH
    /// If we're in a Web Worker, create the onmessage() communication channel.
    ///NOTE: This seems to be the most reliable way to detect this.
    if (typeof onmessage != "undefined" && (typeof window == "undefined" || typeof window.document == "undefined")) {
      (function () {
        /* jshint -W020 * /
        /// Create the global onmessage function.
        onmessage = function (e) {
          if (e && e.data) {
    
            /** xs * /
            if (e.data.action == action_decompress) {
              LZMA.decompress(e.data.data, e.data.cbn);
            } else if (e.data.action == action_compress) {
              LZMA.compress(e.data.data, e.data.mode, e.data.cbn);
            }
    
            /** xe * /
            /// co:if (e.data.action == action_compress) {
            /// co:    LZMA.compress(e.data.data, e.data.mode, e.data.cbn);
            /// co:}
            /// do:if (e.data.action == action_decompress) {
            /// do:    LZMA.decompress(e.data.data, e.data.cbn);
            /// do:}
          }
        };
      }());
    }
    
       return {
            /** xs * /
            compress:   compress,
            decompress: decompress,
            /** xe * /
            /// co:compress:   compress
            /// do:decompress: decompress
        };
    }());
    
    /// This is used by browsers that do not support web workers (and possibly Node.js).
    this.LZMA = this.LZMA_WORKER = LZMA;
    */
    lzma.compress = compress;
    lzma.decompress = decompress;
})(encodings || (encodings = {}));
var tests;
(function (tests) {
    tests.buildMetadata = {
        'not null': function () { return assert(persistence.build); },
        'timestamp>=1461014284236': function () { return assert(persistence.build.timestamp >= 1461014284236); },
        '60000>taken>10': function () { return assert(persistence.build.taken > 10 && persistence.build.taken < 60000); },
        'platform is string': function () { return assert.equal('string', typeof persistence.build.platform); }
    };
})(tests || (tests = {}));
;
/// <reference path="../src/API.d.ts"/>
/// <reference path="../src/webSQL.d.ts"/>
var tests;
(function (tests) {
    var attached;
    (function (attached) {
        function _generateAttachedStorageTests(opt) {
            var nowRunKey = 'test' + opt.name + (new Date() + '').replace(/[^a-zA-Z]/g, '');
            function _generateKey() {
                return nowRunKey + '-' + Math.random();
            }
            var predetection_failed = false;
            try {
                var ukey = _generateKey();
                opt.detect(ukey, function (error, detached) {
                    if (error)
                        predetection_failed = true;
                });
            }
            catch (err) {
                predetection_failed = true;
            }
            if (predetection_failed) {
                return {
                    detect_succeeds: function (callback) {
                        var ukey = _generateKey();
                        opt.detect(ukey, function (error, detached) { return callback(error ? new Error(error) : null); });
                    }
                };
            }
            return {
                detect_succeeds: function (callback) {
                    var ukey = _generateKey();
                    opt.detect(ukey, function (error, detached) { return callback(error ? new Error(error) : null); });
                },
                detect_timestamp_null: function (callback) {
                    var ukey = _generateKey();
                    opt.detect(ukey, function (error, detached) {
                        if (error) {
                            return callback(new Error(error));
                        }
                        callback(detached.timestamp ?
                            new Error('Expected null, found ' + detached.timestamp) :
                            null);
                    });
                },
                applyTo: function (callback) {
                    var ukey = _generateKey();
                    opt.detect(ukey, function (error, detached) {
                        if (error) {
                            return callback(new Error(error));
                        }
                        detached.applyTo({
                            timestamp: 0,
                            write: function (name, content, encoding) { return callback(new Error('Detached.apply: unexpected write(' + name + ',' + content + ',' + encoding + '), the store should be empty.')); }
                        }, function (shadow) {
                            callback(null);
                        });
                    });
                },
                write_opt_timestamp_recent: function (callback) {
                    var ukey = _generateKey();
                    opt.detect(ukey, function (error, detached) {
                        if (error) {
                            return callback(new Error(error));
                        }
                        detached.applyTo({
                            timestamp: 0,
                            write: function (name, content, encoding) { return callback(new Error('Detached.apply: unexpected write(' + name + ',' + content + ',' + encoding + '), the store should be empty.')); }
                        }, function (shadow) {
                            var writeTime = +new Date();
                            shadow.timestamp = writeTime;
                            shadow.write('/file.txt', 'value', 'LF');
                            setTimeout(function () {
                                opt.detect(ukey, function (error, detached) {
                                    //if (detached.timestamp!==2398423234)
                                    var now = +new Date();
                                    if (now - detached.timestamp > 2000)
                                        callback(new Error('Timestamp difference over 2 seconds: ' + (now - detached.timestamp) + ', timestamp appears to point to ' + new Date(detached.timestamp) + '.'));
                                    else
                                        callback(null);
                                });
                            }, 5);
                        });
                    });
                },
                write_loadAgain_sameValue_array20: function (callback) {
                    var array20 = [];
                    for (var i = 0; i < 20; i++)
                        array20[i] = 100 + i;
                    _write_loadAgain_sameValue_core('write_loadAgain_sameValue_array20.txt', array20, callback);
                },
                write_loadAgain_sameValue_array40: function (callback) {
                    var array40 = [];
                    for (var i = 0; i < 40; i++)
                        array40[i] = 100 + i;
                    _write_loadAgain_sameValue_core('write_loadAgain_sameValue_array20.txt', array40, callback);
                },
                write_loadAgain_sameValue_array8K: function (callback) {
                    var array8K = [];
                    for (var i = 0; i < 1024 * 8; i++)
                        array8K[i] = (100 + i) % 256;
                    _write_loadAgain_sameValue_core('write_loadAgain_sameValue_array8K.txt', array8K, callback);
                },
                write_loadAgain_sameValue: function (callback) {
                    _write_loadAgain_sameValue_core('write_loadAgain_sameValue.txt', 'value94783', callback);
                },
                write_loadAgain_sameValue_unicodeContent: function (callback) {
                    var unicodeString = 'abc941' +
                        [256, 257, 1024, 1026, 12879, 13879].map(function (m) { return String.fromCharCode(m); }).join('');
                    _write_loadAgain_sameValue_core('write_loadAgain_sameValue_unicodeValue.txt', unicodeString, callback);
                },
                write_loadAgain_sameValue_crlfValue: function (callback) {
                    var crlfString = 'abc941\nasdf3434\r07958\r\n4838hr';
                    _write_loadAgain_sameValue_core('write_loadAgain_sameValue_crlfValue.txt', crlfString, callback);
                },
                write_loadAgain_sameValue_crOnly: function (callback) {
                    _write_loadAgain_sameValue_core('file82263.txt', '\r', callback);
                },
                write_loadAgain_sameValue_lfOnly: function (callback) {
                    _write_loadAgain_sameValue_core('file82263.txt', '\n', callback);
                },
                write_loadAgain_sameValue_crlfOnly: function (callback) {
                    _write_loadAgain_sameValue_core('write_loadAgain_sameValue_lfOnly.txt', '\r\n', callback);
                },
                write_loadAgain_sameValue_zeroCharOnly: function (callback) {
                    _write_loadAgain_sameValue_core('write_loadAgain_sameValue_zeroCharOnly.txt', String.fromCharCode(0), callback);
                },
                write_loadAgain_sameValue_zeroCharPrefix: function (callback) {
                    _write_loadAgain_sameValue_core('write_loadAgain_sameValue_zeroCharOnly.txt', String.fromCharCode(0) + 'abcd', callback);
                },
                write_loadAgain_sameValue_zeroCharSuffix: function (callback) {
                    _write_loadAgain_sameValue_core('write_loadAgain_sameValue_zeroCharOnly.txt', 'abcde' + String.fromCharCode(0), callback);
                },
                write_loadAgain_sameValue_zeroCharMiddle: function (callback) {
                    _write_loadAgain_sameValue_core('write_loadAgain_sameValue_zeroCharOnly.txt', 'abcde' + String.fromCharCode(0) + 'zxcvbnm', callback);
                },
                write_loadAgain_sameValue_charCodesUnder32: function (callback) {
                    var chars = '';
                    for (var i = 0; i < 32; i++)
                        chars + String.fromCharCode(i);
                    _write_loadAgain_sameValue_core('write_loadAgain_sameValue_charCodesUnder32.txt', chars, callback);
                },
                writeTwice_loadAgain_secondValue: function (callback) {
                    var ukey = _generateKey();
                    opt.detect(ukey, function (error, detached) {
                        if (error) {
                            return callback(new Error(error));
                        }
                        detached.applyTo({
                            timestamp: 0,
                            write: function (name, content, encoding) { return callback(new Error('Detached.apply: unexpected write(' + name + ',' + content + ',' + encoding + '), the store should be empty.')); }
                        }, function (shadow) {
                            shadow.write('/file.txt', 'value2', 'LF');
                            shadow.write('/file.txt', 'value4', 'LF');
                            setTimeout(function () {
                                opt.detect(ukey, function (error, detached) {
                                    var files = {};
                                    detached.applyTo({
                                        timestamp: 0,
                                        write: function (name, content, encoding) {
                                            var enc = persistence.encodings[encoding];
                                            files[name] = enc(content);
                                        }
                                    }, function (shadow) {
                                        var fileTxt = files['/file.txt'];
                                        if (!fileTxt) {
                                            callback(new Error('File is not reported on subsequent load.'));
                                        }
                                        else if (fileTxt !== 'value4') {
                                            callback(new Error('Wrong content on re-read ' + fileTxt + ', expected value4.'));
                                        }
                                        else {
                                            callback(null);
                                        }
                                    });
                                });
                            }, 5);
                        });
                    });
                }
            };
            function _write_loadAgain_sameValue_core(fileName, content, callback) {
                var normFilename = /^\//.test(fileName) ? fileName : '/' + fileName;
                var entry = persistence.bestEncode(content);
                var ukey = _generateKey();
                opt.detect(ukey, function (error, detached) {
                    if (error)
                        return callback(typeof error === 'string' ? new Error('Detect failed: ' + error) : error);
                    detached.applyTo({
                        timestamp: 0,
                        write: function (name, content, encoding) { return callback(new Error('Detached.apply: unexpected write(' + name + ',' + content + ',' + encoding + '), the store should be empty.')); }
                    }, function (shadow) {
                        shadow.write(normFilename, entry.content, entry.encoding);
                        setTimeout(function () {
                            opt.detect(ukey, function (error, detect) {
                                if (error)
                                    return callback(typeof error === 'string' ? new Error('Detect failed after shadow.write' + error) : error);
                                var files = {};
                                detect.applyTo({
                                    timestamp: 0,
                                    write: function (name, content, encoding) {
                                        var enc = persistence.encodings[encoding];
                                        files[name] = enc(content);
                                    }
                                }, function (shadow) {
                                    var fileTxt = files[normFilename];
                                    if (!fileTxt && content) {
                                        callback(new Error('File ' + fileName + ' is not reported on subsequent load.'));
                                    }
                                    else if (fileTxt !== content) {
                                        if (fileTxt.length == content.length) {
                                            for (var i = 0; i < fileTxt.length; i++) {
                                                if (fileTxt[i] !== content[i]) {
                                                    callback(new Error('Wrong content on re-read at ' + i + ': ' + fileTxt[i] + '!==' + content[i] + '  [' + fileTxt.length + '] ' + fileTxt + ', expected [' + content.length + '] ' + content + '.'));
                                                    return;
                                                }
                                            }
                                            callback(null);
                                            return;
                                        }
                                        callback(new Error('Wrong content on re-read [' + fileTxt.length + '] ' + fileTxt + ',\n expected [' + content.length + '] ' + content + '.'));
                                    }
                                    else {
                                        callback(null); // success!
                                    }
                                });
                            });
                        }, 5);
                    });
                });
            }
        }
        attached._generateAttachedStorageTests = _generateAttachedStorageTests;
    })(attached = tests.attached || (tests.attached = {}));
})(tests || (tests = {}));
// TODO: re-enable DOM storage too
/*



module teapo.tests.DomStorageTests {

  export function constructor_nullArgs_succeeds() {
    new teapo.storage.attached.dom.DetectStorage(null,null);
  }

  export function constructor_dummyElement_succeeds() {
    var dummyElement = document.createElement('div');
    new teapo.storage.attached.dom.DetectStorage(dummyElement);
  }


  export function detectStorageAsync_whenNullPassedToConstructor_throwsError() {
    var s = new teapo.storage.attached.dom.DetectStorage(null);
    var err: Error;
    s.detectStorageAsync('', (error, loaded) => err = error);

    if (!err)
      throw new Error('No exception.');
  }

  export function detectStorageAsync_whenTwoNullsPassedToConstructor_throwsError() {
    var s = new teapo.storage.attached.dom.DetectStorage(null, null);
    var err: Error;
    s.detectStorageAsync('', (error, loaded) => err = error);

    if (!err)
      throw new Error('No exception.');
  }

  export function detectStorageAsync_dummyElement_editedUTC_falsy(callback: (error: Error) => void) {
    var dummyElement = document.createElement('div');
    var s = new teapo.storage.attached.dom.DetectStorage(dummyElement);

    s.detectStorageAsync('', (error, loaded) => {
      if (error) {
        callback(error);
        return;
      }

      if (loaded.editedUTC)
        callback(new Error(<any>loaded.editedUTC));
      else
        callback(null);
    });
  }


  export var browser;
  {
    var byName: { [name: string]: HTMLElement; } = {};
    function detectStorageAsync(
       uniqueKey: string,
       callback: (error: Error, load: teapo.storage.attached.LoadStorage) => void) {

      var detect = byName[uniqueKey];
      if (!detect)
        byName[uniqueKey] = detect = document.createElement('div');

      var result = new teapo.storage.attached.dom.DetectStorage(detect);
      result.detectStorageAsync(null, callback);

    }

    browser = new AttachedStorageTests({ detectStorageAsync: detectStorageAsync });
  }
}

*/ 
var tests;
(function (tests) {
    var attached;
    (function (attached) {
        attached.indexedDBTests = attached._generateAttachedStorageTests(persistence.attached.indexedDB);
    })(attached = tests.attached || (tests.attached = {}));
})(tests || (tests = {}));
var tests;
(function (tests) {
    var attached;
    (function (attached) {
        attached.localStorageTests = attached._generateAttachedStorageTests(persistence.attached.localStorage);
    })(attached = tests.attached || (tests.attached = {}));
})(tests || (tests = {}));
var tests;
(function (tests) {
    var attached;
    (function (attached) {
        attached.webSQLTests = attached._generateAttachedStorageTests(persistence.attached.webSQL);
    })(attached = tests.attached || (tests.attached = {}));
})(tests || (tests = {}));
var tests;
(function (tests) {
    var dom;
    (function (dom) {
        var base64Encoding;
        (function (base64Encoding) {
            function generateTests() {
                return {
                    parseBase64: parseBase64,
                    parseBase64Star: parseBase64Star
                };
                /*
                    fileContentBase64: data(' /path.txt [base64]\nYmFzZTY0', '/path.txt', 'base64'),
                    fileContentBase64Star: data(' /path.txt [base64]\n*YmFzZTY0', '/path.txt', 'base64')
                */
                function parseBase64() {
                    var html = '<!doctype html>' +
                        '<html><head><title>Dummy page</title></head>' +
                        '<body>' +
                        '<!-- total 12Mb, saved 4 Apr 2016 -->' +
                        '<!-- /path.txt [base64]\nYmFzZTY0-->' +
                        '</body>' +
                        '</html>';
                    var dt = persistence.parseHTML(html);
                    assert.equal(1024 * 1024 * 12, dt.totals.size);
                    assert.equal(1459724400000, dt.totals.timestamp);
                    assert.equal(1, dt.files.length);
                    assert.equal('/path.txt', dt.files[0].path);
                    assert.equal('base64', dt.files[0].content);
                }
                function parseBase64Star() {
                    var html = '<!doctype html>' +
                        '<html><head><title>Dummy page</title></head>' +
                        '<body>' +
                        '<!-- total 12Mb, saved 4 Apr 2016 -->' +
                        '<!-- /path.txt [base64]\n*YmFzZTY0-->' +
                        '</body>' +
                        '</html>';
                    var dt = persistence.parseHTML(html);
                    assert.equal(1024 * 1024 * 12, dt.totals.size);
                    assert.equal(1459724400000, dt.totals.timestamp);
                    assert.equal(1, dt.files.length);
                    assert.equal('/path.txt', dt.files[0].path);
                    var expectedContentStr = 'base64';
                    var expectedContent = [];
                    for (var i = 0; i < expectedContentStr.length; i++) {
                        expectedContent.push(expectedContentStr.charCodeAt(i));
                    }
                    var actualContent = [];
                    var actualContentSrc = dt.files[0].content;
                    for (var i = 0; i < actualContentSrc.length; i++) {
                        actualContent.push(actualContentSrc[i]);
                    }
                    assert.equal(expectedContent.join(','), actualContent.join(','));
                }
            }
            base64Encoding.generateTests = generateTests;
        })(base64Encoding = dom.base64Encoding || (dom.base64Encoding = {}));
    })(dom = tests.dom || (tests.dom = {}));
})(tests || (tests = {}));
var tests;
(function (tests) {
    var dom;
    (function (dom) {
        function data(formatted, path, text) {
            return {
                formatted: formatted,
                path: path,
                text: text
            };
        }
        dom._formattedData = {
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
            fileContentWithCopyright: data(' /path.txt\ncopyright-' + String.fromCharCode(169), '/path.txt', 'copyright-' + String.fromCharCode(169)),
            fileContentWith127: data(' /path.txt\ncopyright-' + String.fromCharCode(127), '/path.txt', 'copyright-' + String.fromCharCode(127)),
            fileContentBinaryJSON: data(' /path.txt [json]\n[98,97,115,101,0,54,52]', '/path.txt', asBinary('base' + String.fromCharCode(0) + '64')),
            fileContentBinaryWithZeroJSON: data(' /path.txt [json]\n[98,97,115,101,54,52]', '/path.txt', asBinary('base64')),
            filteContentBase64Binary: data(' /path.txt [base64]\n*YmFzZTY0LUFCQ0RFRkdISUpLTA==', '/path.txt', asBinary('base64-ABCDEFGHIJKL'))
        };
        function longBinaryString(length) {
            var str = '';
            for (var i = 0; i < length; i++) {
                str += String.fromCharCode(0);
            }
            return str;
        }
        function asBinary(txt) {
            var nums = [];
            for (var i = 0; i < txt.length; i++) {
                nums.push(txt.charCodeAt(i));
            }
            return nums;
        }
    })(dom = tests.dom || (tests.dom = {}));
})(tests || (tests = {}));
var tests;
(function (tests_1) {
    var dom;
    (function (dom) {
        var formatting;
        (function (formatting) {
            function generateTests() {
                var empty = {};
                var tests = {};
                for (var k in dom._formattedData)
                    if (!empty[k]) {
                        createRoundtripTests(dom._formattedData[k], k);
                    }
                return tests;
                function createRoundtripTests(data, name) {
                    tests[name] = test_formatFileInner;
                    tests[name + '_parse'] = test_parseFileInner;
                    function test_formatFileInner() {
                        assert.equal(data.formatted, persistence.formatFileInner(data.path, data.text));
                    }
                    function test_parseFileInner() {
                        var fi = persistence.parseFileInner(data.formatted);
                        assert.equal(data.path, fi.path);
                        assert.equal(data.text, String(fi.read()));
                    }
                }
            }
            formatting.generateTests = generateTests;
        })(formatting = dom.formatting || (dom.formatting = {}));
    })(dom = tests_1.dom || (tests_1.dom = {}));
})(tests || (tests = {}));
var tests;
(function (tests_2) {
    var dom;
    (function (dom) {
        var parsing;
        (function (parsing) {
            function generateTests() {
                var testsMyFile = withFile({ fileMarkup: '/myfile', content: 'Abc' });
                var testsWithSpace = withFile({ fileMarkup: '"/with space"', filePath: '/with space', content: 'Abc' });
                return {
                    testsMyFile: testsMyFile,
                    testsWithSpace: testsWithSpace
                };
                /*
                    fileContentBase64: data(' /path.txt [base64]\nYmFzZTY0', '/path.txt', 'base64'),
                    fileContentBase64Star: data(' /path.txt [base64]\n*YmFzZTY0', '/path.txt', 'base64')
                */
                function withFile(options) {
                    var fileMarkup = options.fileMarkup, filePath = options.filePath, content = options.content;
                    var tests = {
                        parseHTML_timestamp_simpleDate: function () {
                            var html = '<!doctype html>' +
                                '<html><head><title>Dummy page</title></head>' +
                                '<body>' +
                                '<!-- total 12Mb, saved 4 Apr 2016 -->' +
                                '<!-- ' + fileMarkup + '\n' + content + '-->' +
                                '</body>' +
                                '</html>';
                            var dt = persistence.parseHTML(html);
                            assert.equal(1024 * 1024 * 12, dt.totals.size);
                            assert.equal(1459724400000, dt.totals.timestamp);
                            assert.equal(1, dt.files.length);
                            assert.equal(filePath || fileMarkup, dt.files[0].path);
                            assert.equal(content, dt.files[0].content);
                            assert.equal('<!-- ' + fileMarkup + '\n' + content + '-->', html.slice(dt.files[0].start, dt.files[0].end));
                        },
                        parseHTML_timestamp_Date_with_time_222601: function () {
                            var html = '<!doctype html>' +
                                '<html><head><title>Dummy page</title></head>' +
                                '<body>' +
                                '<!-- total 12Mb, saved 4 Apr 2016 22:26:01 -->' +
                                '<!-- ' + fileMarkup + '\n' + content + '-->' +
                                '</body>' +
                                '</html>';
                            var dt = persistence.parseHTML(html);
                            assert.equal(1024 * 1024 * 12, dt.totals.size);
                            assert.equal(1459805161000, dt.totals.timestamp);
                            assert.equal(1, dt.files.length);
                            assert.equal(filePath || fileMarkup, dt.files[0].path);
                            assert.equal(content, dt.files[0].content);
                            assert.equal('<!-- ' + fileMarkup + '\n' + content + '-->', html.slice(dt.files[0].start, dt.files[0].end));
                        },
                        parseHTML_timestamp_Date_with_time_080109: function () {
                            var html = '<!doctype html>' +
                                '<html><head><title>Dummy page</title></head>' +
                                '<body>' +
                                '<!-- total 12Mb, saved 4 Apr 2016 08:01:09 -->' +
                                '<!-- ' + fileMarkup + '\n' +
                                content + '-->' +
                                '</body>' +
                                '</html>';
                            var dt = persistence.parseHTML(html);
                            assert.equal(1024 * 1024 * 12, dt.totals.size);
                            assert.equal(1459753269000, dt.totals.timestamp);
                            assert.equal(1, dt.files.length);
                            assert.equal(filePath || fileMarkup, dt.files[0].path);
                            assert.equal(content, dt.files[0].content);
                            assert.equal('<!-- ' + fileMarkup + '\n' + content + '-->', html.slice(dt.files[0].start, dt.files[0].end));
                        },
                        parseHTML_offsets_removeChunks: function () {
                            var origHTML = '<!doctype html>' +
                                '<html><head><title>Dummy page</title></head>' +
                                '<body>' +
                                '<!-- total 12Mb, saved 4 Apr 2016 08:01:09 -->' +
                                '<!-- /' + fileMarkup + '\n' +
                                content + '-->' +
                                '</body>' +
                                '</html>';
                            var dt = persistence.parseHTML(origHTML);
                            var removeChunksHTML = origHTML.slice(0, dt.totals.start) +
                                'TOTALS' +
                                origHTML.slice(dt.totals.end, dt.files[0].start) +
                                'FILE' +
                                origHTML.slice(dt.files[0].end);
                            var expectedRemoveChunksHTML = '<!doctype html>' +
                                '<html><head><title>Dummy page</title></head>' +
                                '<body>' +
                                'TOTALS' +
                                'FILE' +
                                '</body>' +
                                '</html>';
                        }
                    };
                    return tests;
                }
            }
            parsing.generateTests = generateTests;
        })(parsing = dom.parsing || (dom.parsing = {}));
    })(dom = tests_2.dom || (tests_2.dom = {}));
})(tests || (tests = {}));
