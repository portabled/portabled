function eq80() {
eq80.build = {
  timestamp: 1459069751303, // Sun Mar 27 2016 10:09:11 GMT+0100 (GMT Daylight Time)
  taken: 9326,
  platform: "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36"
}

var persistence=eq80.persistence={};

/*var persistence;*/
(function (persistence) {
    var BootState = (function () {
        function BootState(_document, _uniqueKey, _optionalDrives) {
            if (_optionalDrives === void 0) { _optionalDrives = [persistence.attached.indexedDB, persistence.attached.webSQL, persistence.attached.localStorage]; }
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
            this._byPath = {};
            this._totals = null;
            this._completion = null;
            this._anticipationSize = 0;
            this._lastNode = null;
            this._parseHead = null;
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
            var cmheader = new persistence.dom.CommentHeader(node);
            var file = persistence.dom.DOMFile.tryParse(cmheader);
            if (file) {
                this._processFileNode(file);
                return;
            }
            var totals = persistence.dom.DOMTotals.tryParse(cmheader);
            if (totals) {
                this._processTotalsNode(totals);
                return;
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
            if (this._byPath[file.path]) {
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
            this.domTotalSize = Math.min(this.domTotalSize, this.domLoadedSize);
        };
        BootState.prototype._removeNode = function (node) {
            var parent = node.parentElement || node.parentNode;
            if (parent)
                parent.removeChild(node);
        };
        BootState.prototype._continueParsingDOM = function (toCompletion) {
            this.domLoadedSize -= this._anticipationSize;
            this._anticipationSize = 0;
            if (!this._lastNode) {
                this._parseHead = this._document.head || this._document.getElementsByTagName('head')[0];
                if (!this._parseHead
                    && (!this._document.body || !this._document.body.children.length))
                    return; // expect head before body
                this._lastNode = this._parseHead.firstChild;
                if (!this._lastNode)
                    return;
            }
            while (true) {
                var nextNode = this._getNextNode();
                if (!nextNode && !toCompletion) {
                    // do not consume nodes at the very end of the document until whole document loaded
                    if (this._lastNode.nodeType === 8) {
                        var cmheader = new persistence.dom.CommentHeader(this._lastNode);
                        var speculativeFile = persistence.dom.DOMFile.tryParse(cmheader);
                        if (speculativeFile) {
                            this._anticipationSize = speculativeFile.contentLength;
                            this.domLoadedSize = this.domLoadedSize + this._anticipationSize;
                            this.domTotalSize = Math.min(this.domTotalSize, this.domLoadedSize); // total should not become less that loaded
                        }
                    }
                    return;
                }
                if (this._lastNode.nodeType === 8) {
                    this._processNode(this._lastNode);
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
                    if (!path || path.charCodeAt(0) !== 47)
                        continue; // expect leading slash
                    var content = this._toUpdateDOM[path];
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
                            var modified = f.write(content);
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
                            var f = new persistence.dom.DOMFile(comment, path, null, 0, 0);
                            f.write(content);
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
            var nextNode = this._lastNode.nextSibling;
            if (!nextNode && this._parseHead && this._document.body && (nextNode = this._document.body.firstChild))
                this._parseHead = null;
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
                    write: function (path, content) {
                        _this._applyShadowToDOM(path, content);
                    }
                }, function (shadow) {
                    _this._shadow = shadow;
                    _this._finishOptionalDetection();
                });
            }
        };
        BootState.prototype._applyShadowToDOM = function (path, content) {
            if (this._domFinished) {
                var file = this._byPath[path];
                if (file) {
                    if (content === null) {
                        this._removeNode(file.node);
                        delete this._byPath[path];
                    }
                    else {
                        var modified = file.write(content);
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
                        var f = new persistence.dom.DOMFile(comment, path, null, 0, 0);
                        f.write(content);
                        this._document.body.insertBefore(f.node, anchor);
                        this._byPath[path] = f;
                        this._newDOMFileCache[path] = true;
                    }
                }
                this._newStorageFileCache[path] = true;
            }
            else {
                this._toUpdateDOM[path] = content;
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
            var domDrive = new persistence.dom.DOMDrive(this._totals, domFiles, this._document);
            var mountDrive = new MountedDrive(domDrive, this._shadow);
            this._completion(mountDrive);
        };
        return BootState;
    }());
    persistence.BootState = BootState;
    var MountedDrive = (function () {
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
            this._dom.write(file, content);
            if (this._shadow) {
                this._shadow.timestamp = this.timestamp;
                this._shadow.write(file, content);
            }
        };
        return MountedDrive;
    }());
})(persistence || (persistence = {}));
/*var persistence;*/
(function (persistence) {
    function getIndexedDB() {
        return typeof indexedDB === 'undefined' || typeof indexedDB.open !== 'function' ? null : indexedDB;
    }
    var attached;
    (function (attached) {
        var indexedDB;
        (function (indexedDB) {
            indexedDB.name = 'indexedDB';
            function detect(uniqueKey, callback) {
                try {
                    detectCore(uniqueKey, callback);
                }
                catch (error) {
                    callback(error.message, null);
                }
            }
            indexedDB.detect = detect;
            function detectCore(uniqueKey, callback) {
                var indexedDBInstance = getIndexedDB();
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
            var IndexedDBDetached = (function () {
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
                    var countRequest = filesStore.count();
                    countRequest.onerror = function (errorEvent) {
                        if (typeof console !== 'undefined' && console && typeof console.error === 'function')
                            console.error('Could not count files store: ', errorEvent);
                        callback(new IndexedDBShadow(_this._db, _this.timestamp));
                    };
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
                                        mainDrive.write(result.path, result.content);
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
                return IndexedDBDetached;
            }());
            var IndexedDBShadow = (function () {
                function IndexedDBShadow(_db, timestamp) {
                    this._db = _db;
                    this.timestamp = timestamp;
                }
                IndexedDBShadow.prototype.write = function (file, content) {
                    var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');
                    var filesStore = transaction.objectStore('files');
                    var metadataStore = transaction.objectStore('metadata');
                    // no file deletion here: we need to keep account of deletions too!
                    var fileData = {
                        path: file,
                        content: content,
                        state: null
                    };
                    var putFile = filesStore.put(fileData);
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
    })(attached = persistence.attached || (persistence.attached = {}));
})(persistence || (persistence = {}));
/*var persistence;*/
(function (persistence) {
    function getLocalStorage() {
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
                var localStorageInstance = getLocalStorage();
                if (!localStorageInstance) {
                    callback('Variable localStorage is not available.', null);
                    return;
                }
                var access = new LocalStorageAccess(localStorageInstance, uniqueKey);
                var dt = new LocalStorageDetached(access);
                callback(null, dt);
            }
            var LocalStorageAccess = (function () {
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
            var LocalStorageDetached = (function () {
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
                        if (k.charAt(0) === '/') {
                            var value = this._access.get(k);
                            mainDrive.write(k, value);
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
            var LocalStorageShadow = (function () {
                function LocalStorageShadow(_access, timestamp) {
                    this._access = _access;
                    this.timestamp = timestamp;
                }
                LocalStorageShadow.prototype.write = function (file, content) {
                    this._access.set(file, content);
                    this._access.set('*timestamp', this.timestamp);
                };
                LocalStorageShadow.prototype.forget = function (file) {
                    this._access.remove(file);
                };
                return LocalStorageShadow;
            }());
        })(localStorage = attached.localStorage || (attached.localStorage = {}));
    })(attached = persistence.attached || (persistence.attached = {}));
})(persistence || (persistence = {}));
/*var persistence;*/
(function (persistence) {
    function getOpenDatabase() {
        return typeof openDatabase !== 'function' ? null : openDatabase;
    }
    var attached;
    (function (attached) {
        var webSQL;
        (function (webSQL) {
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
                                }
                            }
                            else if (typeof editedValueStr === 'number') {
                                editedValue = editedValueStr;
                            }
                        }
                        callback(null, new WebSQLDetached(db, editedValue || 0, true));
                    }, function (transaction, sqlError) {
                        // no data
                        callback(null, new WebSQLDetached(db, 0, false));
                    });
                }, function (sqlError) {
                    // failed to load
                    callback('Loading from metadata table failed: ' + sqlError.message, null);
                });
            }
            var WebSQLDetached = (function () {
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
                                    mainDrive.write(file, null);
                                else if (typeof row.value === 'string')
                                    mainDrive.write(file, fromSqlText(row.value));
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
            var WebSQLShadow = (function () {
                function WebSQLShadow(_db, timestamp, _metadataTableIsValid) {
                    var _this = this;
                    this._db = _db;
                    this.timestamp = timestamp;
                    this._metadataTableIsValid = _metadataTableIsValid;
                    this._cachedUpdateStatementsByFile = {};
                    this._closures = {
                        updateMetadata: function (transaction) { return _this._updateMetadata(transaction); }
                    };
                }
                WebSQLShadow.prototype.write = function (file, content) {
                    if (content || typeof content === 'string') {
                        this._updateCore(file, content);
                    }
                    else {
                        this._deleteAllFromTable(file);
                    }
                };
                WebSQLShadow.prototype.forget = function (file) {
                    this._dropFileTable(file);
                };
                WebSQLShadow.prototype._updateCore = function (file, content) {
                    var _this = this;
                    var updateSQL = this._cachedUpdateStatementsByFile[file];
                    if (!updateSQL) {
                        var tableName = mangleDatabaseObjectName(file);
                        updateSQL = this._createUpdateStatement(file, tableName);
                    }
                    this._db.transaction(function (transaction) {
                        transaction.executeSql(updateSQL, ['content', content], _this._closures.updateMetadata, function (transaction, sqlError) { return _this._createTableAndUpdate(transaction, file, tableName, updateSQL, content); });
                    }, function (sqlError) {
                        reportSQLError('Transaction failure updating file "' + file + '".', sqlError);
                    });
                };
                WebSQLShadow.prototype._createTableAndUpdate = function (transaction, file, tableName, updateSQL, content) {
                    var _this = this;
                    if (!tableName)
                        tableName = mangleDatabaseObjectName(file);
                    transaction.executeSql('CREATE TABLE "' + tableName + '" (name PRIMARY KEY, value)', [], function (transaction, result) {
                        transaction.executeSql(updateSQL, ['content', content], _this._closures.updateMetadata, function (transaction, sqlError) {
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
                    var updateMetadataSQL = 'INSERT OR REPLACE INTO "*metadata" VALUES (?,?)';
                    transaction.executeSql(updateMetadataSQL, ['editedUTC', this.timestamp], function (transaction, result) { }, // TODO: generate closure statically
                    function (transaction, error) {
                        transaction.executeSql('CREATE TABLE "*metadata" (name PRIMARY KEY, value)', [], function (transaction, result) {
                            transaction.executeSql(updateMetadataSQL, [], function () { }, function () { });
                        }, function (transaction, sqlError) {
                            reportSQLError('Failed to update metadata table after creation.', sqlError);
                        });
                    });
                };
                WebSQLShadow.prototype._createUpdateStatement = function (file, tableName) {
                    return this._cachedUpdateStatementsByFile[file] =
                        'INSERT OR REPLACE INTO "' + tableName + '" VALUES (?,?)';
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
            webSQL.listAllTables = listAllTables;
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
    })(attached = persistence.attached || (persistence.attached = {}));
})(persistence || (persistence = {}));
/*var persistence;*/
(function (persistence) {
    function bestEncode(content, escapePath) {
        if (content.length > 1024 * 16) {
        }
        if (typeof content !== 'string')
            return { content: encodeArrayOrSimilarAsJSON(content), encoding: 'json' };
        var needsEscaping;
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
            return { content: encodeUnusualStringAsJSON(content), encoding: 'json' };
        }
        else {
            return { content: content, encoding: 'LF' };
        }
    }
    persistence.bestEncode = bestEncode;
    function encodeUnusualStringAsJSON(content) {
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
    function encodeArrayOrSimilarAsJSON(content) {
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
})(persistence || (persistence = {}));
/*var persistence;*/
(function (persistence) {
    var dom;
    (function (dom) {
        var CommentHeader = (function () {
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
                            if (posEOL === nextChunk.length - 1) {
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
                    posEOL + 2 :
                    posEOL + 1; // ends with singular CR or LF
                this.header = wholeCommentText.slice(0, posEOL),
                    this.contentLength = wholeCommentText.length - this.contentOffset;
            }
            return CommentHeader;
        }());
        dom.CommentHeader = CommentHeader;
    })(dom = persistence.dom || (persistence.dom = {}));
})(persistence || (persistence = {}));
/*var persistence;*/
(function (persistence) {
    var dom;
    (function (dom) {
        var DOMDrive = (function () {
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
                    this._totals = new dom.DOMTotals(0, this._totalSize, comment);
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
                var file = persistence.normalizePath(file);
                var f = this._byPath[file];
                if (!f)
                    return null;
                else
                    return f.read();
            };
            DOMDrive.prototype.storedSize = function (file) {
                var file = persistence.normalizePath(file);
                var f = this._byPath[file];
                if (!f)
                    return null;
                else
                    return f.contentLength;
            };
            DOMDrive.prototype.write = function (file, content) {
                var totalDelta = 0;
                var file = persistence.normalizePath(file);
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
                    if (f) {
                        var lengthBefore = f.contentLength;
                        if (!f.write(content))
                            return; // no changes - no update for timestamp/totals
                        totalDelta += f.contentLength - lengthBefore;
                    }
                    else {
                        var comment = document.createComment('');
                        var f = new dom.DOMFile(comment, file, null, 0, 0);
                        f.write(content);
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
                if (!anchor || anchor.parentElement != this._document.body) {
                    // this happens when filesystem is empty, or nodes got removed
                    // - we try not to bubble above scripts, so prompt UI loading is attempted on slow connections
                    var scripts = this._document.body.getElementsByTagName('script');
                    anchor = scripts[scripts.length - 1];
                    if (anchor)
                        anchor = getNextNode(anchor);
                    if (anchor)
                        this._anchorNode = anchor;
                }
            };
            return DOMDrive;
        }());
        dom.DOMDrive = DOMDrive;
        function getNextNode(node) {
            var result = node.nextSibling;
            if (!result && node.parentNode)
                result = node.parentNode.nextSibling;
            return result;
        }
    })(dom = persistence.dom || (persistence.dom = {}));
})(persistence || (persistence = {}));
/*var persistence;*/
(function (persistence) {
    var dom;
    (function (dom) {
        var DOMFile = (function () {
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
                else {
                    if (encodingName) {
                        // regex above won't strip trailing whitespace from filePath if encoding is specified
                        // (because whitespace matches 'non-bracket' class too)
                        filePath = filePath.slice(0, filePath.search(/\S(\s*)$/) + 1);
                    }
                }
                var encoding = persistence.encodings[encodingName || 'LF'];
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
            DOMFile.prototype.write = function (content) {
                var encoded = persistence.bestEncode(content);
                var protectedText = encoded.content.
                    replace(/\-\-(\**)\>/g, '--*$1>').
                    replace(/\<(\**)\!/g, '<*$1!');
                if (!this._encodedPath) {
                    // most cases path is path,
                    // but if anything is weird, it's going to be quoted
                    // (actually encoded with JSON format)
                    var encp = persistence.bestEncode(this.path, true /*escapePath*/);
                    this._encodedPath = encp.content;
                }
                var leadText = ' ' + this._encodedPath + (encoded.encoding === 'LF' ? '' : ' [' + encoded.encoding + ']') + '\n';
                var html = leadText + protectedText;
                if (!this.node)
                    return html; // can be used without backing 'node' for formatting purpose
                if (html === this.node.nodeValue)
                    return false;
                this.node.nodeValue = html;
                this._encoding = persistence.encodings[encoded.encoding || 'LF'];
                this._contentOffset = leadText.length;
                this.contentLength = content.length;
                return true;
            };
            return DOMFile;
        }());
        dom.DOMFile = DOMFile;
    })(dom = persistence.dom || (persistence.dom = {}));
})(persistence || (persistence = {}));
/*var persistence;*/
(function (persistence) {
    var dom;
    (function (dom) {
        var monthsPrettyCase = ('Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec').split('|');
        var monthsUpperCase = ('Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec').toUpperCase().split('|');
        var DOMTotals = (function () {
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
                    var savedFmt = /^\s*saved\s+(\d+)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)\s+(\d+)\:(\d+)(\:(\d+(\.(\d+))?))\s*(GMT\s*[\-\+]?\d+\:?\d*)?\s*$/i;
                    var savedMatch = savedFmt.exec(parts[i]);
                    if (savedMatch) {
                        // 25 Apr 2015 22:52:01.231
                        try {
                            var savedDay = parseInt(savedMatch[1]);
                            var savedMonth = indexOf(monthsUpperCase, savedMatch[2].toUpperCase());
                            var savedYear = parseInt(savedMatch[3]);
                            if (savedYear < 100)
                                savedYear += 2000; // no 19xx notation anymore :-(
                            var savedHour = parseInt(savedMatch[4]);
                            var savedMinute = parseInt(savedMatch[5]);
                            var savedSecond = savedMatch[7] ? parseFloat(savedMatch[7]) : 0;
                            timestamp = new Date(savedYear, savedMonth, savedDay, savedHour, savedMinute, savedSecond | 0).valueOf();
                            timestamp += (savedSecond - (savedSecond | 0)) * 1000; // milliseconds
                            var savedGMTStr = savedMatch[10];
                            if (savedGMTStr) {
                                var gmtColonPos = savedGMTStr.indexOf(':');
                                if (gmtColonPos > 0) {
                                    var gmtH = parseInt(savedGMTStr.slice(0, gmtColonPos));
                                    timestamp += gmtH * 60 /*min*/ * 60 /*sec*/ * 1000 /*msec*/;
                                    var gmtM = parseInt(savedGMTStr.slice(gmtColonPos + 1));
                                    timestamp += gmtM * 60 /*sec*/ * 1000 /*msec*/;
                                }
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
                var formatted = date.getDate() + ' ' +
                    monthsPrettyCase[date.getMonth()] + ' ' +
                    date.getFullYear() + ' ' +
                    num2(date.getHours()) + ':' +
                    num2(date.getMinutes()) + ':' +
                    num2(date.getSeconds()) + '.' +
                    (+date).toString().slice(-3) +
                    (gmtMatch && gmtMatch[1] !== 'GMT+0000' ? ' ' + gmtMatch[1] : '');
                return formatted;
            };
            return DOMTotals;
        }());
        dom.DOMTotals = DOMTotals;
        function num2(n) {
            return n <= 9 ? '0' + n : '' + n;
        }
        function indexOf(array, item) {
            if (array.indexOf)
                return array.indexOf(item);
            for (var i = 0; i < array.length; i++) {
                if (array[i] === item)
                    return i;
            }
            return -1;
        }
    })(dom = persistence.dom || (persistence.dom = {}));
})(persistence || (persistence = {}));
/*var persistence;*/
(function (persistence) {
    var encodings;
    (function (encodings) {
        function CR(text) {
            return text.
                replace(/\r\n|\n/g, '\r');
        }
        encodings.CR = CR;
    })(encodings = persistence.encodings || (persistence.encodings = {}));
})(persistence || (persistence = {}));
/*var persistence;*/
(function (persistence) {
    var encodings;
    (function (encodings) {
        function CRLF(text) {
            return text.
                replace(/\r|\n/g, '\r\n');
        }
        encodings.CRLF = CRLF;
    })(encodings = persistence.encodings || (persistence.encodings = {}));
})(persistence || (persistence = {}));
/*var persistence;*/
(function (persistence) {
    var encodings;
    (function (encodings) {
        function LF(text) {
            return text.
                replace(/\r\n|\r/g, '\n');
        }
        encodings.LF = LF;
    })(encodings = persistence.encodings || (persistence.encodings = {}));
})(persistence || (persistence = {}));
/*var persistence;*/
(function (persistence) {
    var encodings;
    (function (encodings) {
        function base64(text) {
            // TODO: convert from base64 to text
            // TODO: invent a prefix to signify binary data
            throw new Error('Base64 encoding is not implemented yet.');
        }
        encodings.base64 = base64;
    })(encodings = persistence.encodings || (persistence.encodings = {}));
})(persistence || (persistence = {}));
/*var persistence;*/
(function (persistence) {
    var encodings;
    (function (encodings) {
        function eval(text) {
            return (0, window['eval'])(text);
        }
        encodings.eval = eval;
    })(encodings = persistence.encodings || (persistence.encodings = {}));
})(persistence || (persistence = {}));
/*var persistence;*/
(function (persistence) {
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
    })(encodings = persistence.encodings || (persistence.encodings = {}));
})(persistence || (persistence = {}));
/*var persistence;*/
(function (persistence) {
    function normalizePath(path) {
        if (!path)
            return '/'; // empty paths converted to root
        if (path.charAt(0) !== '/')
            path = '/' + path;
        path = path.replace(/\/\/*/g, '/'); // replacing duplicate slashes with single
        return path;
    }
    persistence.normalizePath = normalizePath;
})(persistence || (persistence = {}));
function boot() {
    window.onerror = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        alert('UNHANDLED\n' + args.join('\n'));
    };
    function onkeeploading() {
        if (document.title === '/:')
            document.title = '/:.';
        if (!eq80.timings.domStarted
            && (bootDrive.domLoadedSize || bootDrive.domTotalSize))
            eq80.timings.domStarted = +new Date();
        removeSpyElements();
        sz.update();
        var prevLoadedSize = bootDrive.domLoadedSize;
        var prevTotalSize = bootDrive.domTotalSize;
        bootDrive.continueLoading();
        updateBootStateProps();
        if (bootDrive.newDOMFiles.length || bootDrive.newStorageFiles.length
            || prevLoadedSize !== bootDrive.domLoadedSize || prevTotalSize !== bootDrive.domTotalSize) {
            if (document.title === '/:' || document.title === '/:.')
                document.title = '//';
            for (var i = 0; i < progressCallbacks.length; i++) {
                var callback = progressCallbacks[i];
                callback(bootDrive);
            }
        }
    }
    function updateBootStateProps() {
        if (!eq80.bootState)
            eq80.bootState = {};
        for (var k in bootDrive)
            if (k && bootDrive.hasOwnProperty(k) && k.charAt(0) !== '_') {
                eq80.bootState[k] = bootDrive[k];
            }
        if (!eq80.bootState.read)
            eq80.bootState.read = function (path) { return bootDrive.read(path); };
    }
    function window_onload() {
        function onfinishloading(drive) {
            updateBootStateProps();
            eq80.bootState.read = function (file) { return drive.read(file); };
            eq80.timings.driveLoaded = +new Date();
            eq80.drive = drive;
            if (loadedCallbacks && loadedCallbacks.length) {
                if (document.title === '/:' || document.title === '/:.' || document.title === '//')
                    document.title = '//.';
                for (var i = 0; i < loadedCallbacks.length; i++) {
                    var callback = loadedCallbacks[i];
                    callback(drive);
                }
            }
            else {
                if (document.title === '/:' || document.title === '/:.' || document.title === '//')
                    document.title = '//,';
                fadeToUI();
            }
        }
        if (typeof eq80 === 'undefined' || eq80.window !== window)
            return;
        clearInterval(keepLoading);
        removeSpyElements();
        eq80.timings.documentLoaded = +new Date();
        sz.update();
        bootDrive.finishParsing(onfinishloading);
    }
    function fadeToUI() {
        sz.update();
        ui.style.opacity = '0';
        ui.style.filter = 'alpha(opacity=0)';
        ui.style.display = 'block';
        var start = +new Date();
        var fadeintTime = Math.min(500, (start - eq80.timings.start) / 2);
        var animateFadeIn = setInterval(function () {
            var passed = (+new Date()) - start;
            var opacity = Math.min(passed, fadeintTime) / fadeintTime;
            boot.style.opacity = (1 - opacity).toString();
            boot.style.filter = 'alpha(opacity=' + (((1 - opacity) * 100) | 0) + ')';
            ui.style.opacity = opacity;
            ui.style.filter = 'alpha(opacity=' + ((opacity * 100) | 0) + ')';
            if (passed >= fadeintTime) {
                ui.style.opacity = 1;
                ui.style.filter = 'alpha(opacity=100)';
                boot.style.opacity = 0;
                boot.style.filter = 'alpha(opacity=0)';
                if (animateFadeIn) {
                    sz.update();
                    clearInterval(animateFadeIn);
                    animateFadeIn = 0;
                    setTimeout(function () {
                        sz.update();
                        if (boot.parentElement)
                            boot.parentElement.removeChild(boot);
                        ui.style.opacity = null;
                        ui.style.filter = null;
                        if (document.title === '//.')
                            document.title = '//:';
                    }, 1);
                }
            }
        }, 20);
    } // fadeToUI
    function on(eventName, callback, _more) {
        if (typeof eventName === 'string') {
            if (typeof callback !== 'function')
                return;
            switch (eventName) {
                case 'progress':
                    progressCallbacks.push(callback);
                    break;
                case 'load':
                    if (loadedCallbacks)
                        loadedCallbacks.push(callback);
                    else
                        setTimeout(function () { callback(eq80.drive); }, 1);
                    break;
                case 'resize':
                    resizeCallbacks.push(callback);
                    resizeReportCallbacks.push(callback);
                    if (resizeReportCallbacks.length === 1) {
                        setTimeout(function () {
                            for (var i = 0; i < resizeReportCallbacks.length; i++) {
                                var cb = resizeReportCallbacks[i];
                                cb(sz);
                            }
                            resizeReportCallbacks = [];
                        }, 1);
                    }
                    break;
            }
            return;
        }
        var obj = eventName;
        eventName = callback;
        callback = _more;
        if (obj.addEventListener) {
            try {
                obj.addEventListener(eventName, callback, false);
                return;
            }
            catch (e) { }
        }
        else if (obj.attachEvent) {
            try {
                obj.attachEvent('on' + eventName, callback);
                return;
            }
            catch (e) { }
        }
        obj['on' + eventName] = function (e) { return callback(e || window.event); };
    } // on
    function off(obj, eventName, callback) {
        if (obj.removeEventListener) {
            obj.removeEventListener(eventName, callback, false);
        }
        else if (obj.detachEvent) {
            obj.detachEvent('on' + eventName, callback);
        }
        else {
            if (obj['on' + eventName])
                obj['on' + eventName] = null;
        }
    } // off
    function fitresize() {
        var needResize = false;
        var forceResize = false;
        var newSize = {
            windowWidth: 0,
            windowHeight: 0,
            scrollX: 0,
            scrollY: 0
        };
        on(window, 'scroll', global_resize_detect);
        on(window, 'resize', global_resize_detect);
        if (window.document) {
            var body = window.document.body;
            var docElem;
            if (docElem = window.document.documentElement || (body ? body.parentElement || body.parentNode : null)) {
                on(docElem, 'resize', global_resize_detect);
                on(docElem, 'scroll', global_resize_detect);
            }
            if (body) {
                on(body, 'resize', global_resize_detect);
                on(body, 'scroll', global_resize_detect);
            }
        }
        var state = {
            update: update,
            fitframe: fitframe,
            windowWidth: 0,
            windowHeight: 0,
            scrollX: 0,
            scrollY: 0,
            onresize: null
        };
        getMetrics(state);
        return state;
        function update() {
            check_resize_now();
        }
        function fitframe(frame) {
            var frwindow = frame.contentWindow || frame.window;
            var frdoc = frwindow.document;
            var frbody = frdoc ? frdoc.body : null;
            var docs = [frdoc, frbody, frwindow];
            var events = ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointerup', 'pointerout', 'keydown', 'keyup'];
            for (var i = 0; i < docs.length; i++) {
                if (!docs[i])
                    continue;
                for (var j = 0; j < events.length; j++) {
                    on(docs[i], events[j], global_resize_detect);
                }
            }
            fitFrameList.push(frame);
            forceResize = true;
            global_resize_detect();
        }
        function global_resize_detect() {
            if (needResize)
                return;
            needResize = true;
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(check_resize_now);
            }
            else {
                setTimeout(check_resize_now, 5);
            }
        }
        function getMetrics(metrics) {
            metrics.windowWidth = window.innerWidth || (document.body ? (document.body.parentElement ? document.body.parentElement.clientWidth : 0) || document.body.clientWidth : null);
            metrics.windowHeight = window.innerHeight || (document.body ? (document.body.parentElement ? document.body.parentElement.clientHeight : 0) || document.body.clientHeight : null);
            metrics.scrollX = window.scrollX || window.pageXOffset || (document.body ? document.body.scrollLeft || (document.body.parentElement ? document.body.parentElement.scrollLeft : 0) || 0 : null);
            metrics.scrollY = window.scrollY || window.pageYOffset || (document.body ? document.body.scrollTop || (document.body.parentElement ? document.body.parentElement.scrollTop : 0) || 0 : null);
        }
        function check_resize_now() {
            getMetrics(newSize);
            if (!forceResize
                && newSize.windowWidth === state.windowWidth
                && newSize.windowHeight === state.windowHeight
                && newSize.scrollX === state.scrollX
                && newSize.scrollY === state.scrollY) {
                needResize = false;
                return;
            }
            forceResize = false;
            apply_new_size_now();
            needResize = false;
        }
        function apply_new_size_now() {
            state.windowWidth = newSize.windowWidth;
            state.windowHeight = newSize.windowHeight;
            state.scrollX = newSize.scrollX;
            state.scrollY = newSize.scrollY;
            var wpx = state.windowWidth + 'px';
            var hpx = state.windowHeight + 'px';
            var xpx = state.scrollX + 'px';
            var ypx = state.scrollY + 'px';
            for (var i = 0; i < fitFrameList.length; i++) {
                var fr = fitFrameList[i];
                if (!fr.parentElement && !fr.parentNode)
                    continue;
                fr.style.left = xpx;
                fr.style.top = ypx;
                fr.style.width = wpx;
                fr.style.height = hpx;
            }
            if (resizeCallbacks.length) {
                if (resizeReportCallbacks.length)
                    resizeReportCallbacks = [];
                var sz = {
                    windowWidth: state.windowWidth,
                    windowHeight: state.windowHeight,
                    scrollX: state.scrollX,
                    scrollY: state.scrollY
                };
                for (var i = 0; i < resizeCallbacks.length; i++) {
                    var cb = resizeCallbacks[i];
                    cb(sz);
                }
            }
        }
    } // fitresize
    function createFrame() {
        var iframe = document.createElement('iframe');
        iframe.application = 'yes';
        iframe.__knownFrame = true;
        iframe.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%; border:none;display:none;';
        iframe.src = 'about:blank';
        iframe.frameBorder = '0';
        window.document.body.appendChild(iframe);
        var ifrwin = iframe.contentWindow || (iframe.contentWindow = iframe.window);
        var ifrdoc = ifrwin.document;
        if (ifrdoc.open)
            ifrdoc.open();
        ifrdoc.write('<' + '!doctype html><' + 'html><' + 'head><' + 'style>' +
            'html{margin:0;padding:0;border:none;height:100%;border:none;overflow:hidden;}' +
            'body{margin:0;padding:0;border:none;height:100%;border:none;overflow:hidden;}' +
            '*,*:before,*:after{box-sizing:inherit;}' +
            'html{box-sizing:border-box;}' +
            '</' + 'style><' + 'body>' +
            '<' + 'body></' + 'html>');
        if (ifrdoc.close)
            ifrdoc.close();
        //(<any>ifrwin).eval = 23;
        fitFrameList.push(iframe);
        return iframe;
    } // createFrame
    function deriveUniqueKey(locationSeed) {
        var key = (locationSeed + '').split('?')[0].split('#')[0].toLowerCase();
        var posIndexTrail = key.search(/\/index\.html$/);
        if (posIndexTrail > 0)
            key = key.slice(0, posIndexTrail);
        if (key.charAt(0) === '/')
            key = key.slice(1);
        if (key.slice(-1) === '/')
            key = key.slice(0, key.length - 1);
        // extract readable part
        var colonSplit = key.split(':');
        var readableKey = colonSplit[colonSplit.length - 1].replace(/[^a-zA-Z0-9\/]/g, '').replace(/\/\//g, '/').replace(/^\//, '').replace(/\/$/, '').replace(/\.html$/, '');
        var readableSlashPos = readableKey.indexOf('/');
        if (readableSlashPos > 0 && readableSlashPos < readableKey.length / 2)
            readableKey = readableKey.slice(readableSlashPos + 1);
        readableKey = readableKey.replace('/', '_');
        if (!readableKey)
            readableKey = 'po';
        return readableKey + '_' + smallHash(key) + 'H' + smallHash(key.slice(1) + 'a');
        function smallHash(key) {
            for (var h = 0, i = 0; i < key.length; i++) {
                h = Math.pow(31, h + 31 / key.charCodeAt(i));
                h -= h | 0;
            }
            return (h * 2000000000) | 0;
        }
    }
    function removeSpyElements() {
        removeElements('iframe');
        removeElements('style');
        removeElements('script');
        function removeElements(tagName) {
            var list = document.getElementsByTagName(tagName);
            for (var i = 0; i < list.length; i++) {
                var elem = list[i] || list.item(i);
                if (elem.__knownFrame)
                    continue;
                if (elem && elem.parentElement && elem.getAttribute && elem.getAttribute('data-legit') !== 'mi') {
                    if ((ui && elem === ui) || (boot && elem === boot))
                        continue;
                    try {
                        elem.parentElement.removeChild(elem);
                        i--;
                    }
                    catch (error) { }
                }
            }
        }
    }
    var fitFrameList = [];
    eq80.timings = {
        start: +new Date()
    };
    eq80.window = window;
    document.title = '.';
    removeSpyElements();
    document.title = ':';
    // creates both frames invisible
    var boot = eq80.boot = createFrame();
    boot.style.zIndex = 100;
    var ui = eq80.ui = createFrame();
    ui.style.zIndex = 10;
    document.title = '/';
    var sz = fitresize();
    sz.fitframe(boot);
    sz.fitframe(ui);
    document.title = '/.';
    eq80.on = on; // supported events: progress, load, resize
    eq80.fadeToUI = fadeToUI;
    var progressCallbacks = [];
    var loadedCallbacks = [];
    var resizeCallbacks = [];
    var resizeReportCallbacks = [];
    var uniqueKey = deriveUniqueKey(location);
    var bootDrive = new eq80.persistence.BootState(document, uniqueKey);
    document.title = '/:';
    if (window.addEventListener) {
        window.addEventListener('load', window_onload, true);
    }
    else if (window.attachEvent) {
        window.attachEvent('onload', window_onload);
    }
    else {
        window.onload = window_onload;
    }
    var keepLoading = setInterval(onkeeploading, 30);
}


if (typeof window!=="undefined" && window && window.document) boot();
}
eq80();//# sourceURL=eq80.js