/// <reference path='typings/knockout.d.ts' />
var teapo;
(function (teapo) {
    function registerKnockoutBindings(ko) {
        ko.bindingHandlers.attach = {
            init: function (element, valueAccessor) {
                valueAccessor();
            }
        };
    }
    teapo.registerKnockoutBindings = registerKnockoutBindings;
})(teapo || (teapo = {}));
/// <reference path='typings/knockout.d.ts' />
/// <reference path='persistence.ts' />
var teapo;
(function (teapo) {
    

    

    /**
    * File list/tree ViewModel.
    */
    var FileList = (function () {
        function FileList(_storage) {
            this._storage = _storage;
            /**
            * Top level folders.
            */
            this.folders = ko.observableArray();
            /**
            * Files directly in the root folder.
            */
            this.files = ko.observableArray();
            /**
            * Currently selected file. Should not be modified externally.
            */
            this.selectedFile = ko.observable(null);
            this._filesByFullPath = {};
            var fileNames = this._storage.documentNames();
            for (var i = 0; i < fileNames.length; i++) {
                if (fileNames[i].charAt(0) !== '/')
                    continue;

                this._addFileEntry(fileNames[i]);
            }
        }
        /**
        * Find a file from its path.
        */
        FileList.prototype.getFileEntry = function (fullPath) {
            if (fullPath.charAt(0) !== '/')
                return null;

            return this._filesByFullPath[fullPath];
        };

        /**
        * Create a file entry (throwing an exception if one already exists).
        * Note that only the list/tree structures are created,
        * not touching editor nor persistence part of cocerns.
        */
        FileList.prototype.createFileEntry = function (fullPath) {
            return this._addFileEntry(fullPath);
        };

        /**
        * Deletes a file entry (returning deleted entry or null if none exists).
        * Note that only the list/tree structures are deleted,
        * not touching editor nor persistence part of concerns.
        */
        FileList.prototype.removeFileEntry = function (fullPath) {
            var fileEntry = this.getFileEntry(fullPath);
            if (!fileEntry)
                return null;

            if (fileEntry.parent()) {
                var wasSelected = fileEntry.isSelected();

                var fo = fileEntry.parent();
                fo.files.remove(fileEntry);

                while (fo.parent()) {
                    var pa = fo.parent();
                    fo.containsSelectedFile(false);
                    fo = pa;
                }

                fo.containsSelectedFile(false);
            } else {
                this.files.remove(fileEntry);
            }

            this.selectedFile(null);
        };

        FileList.prototype._addFileEntry = function (fullPath) {
            var _this = this;
            var pathParts = normalizePath(fullPath);
            if (pathParts.length === 0)
                return;

            var parent = null;
            var folders = this.folders;
            var files = this.files;

            for (var i = 0; i < pathParts.length - 1; i++) {
                var folder = this._insertOrLookupFolder(parent, folders, pathParts, i);

                folders = folder.folders;
                files = folder.files;
                parent = folder;
            }

            var fileName = pathParts[pathParts.length - 1];

            var fileArray = files();
            var fileIndex = insertionIndexOfEntry(fileArray, fileName);
            var file = fileArray[fileIndex];

            if (file && file.name() === fileName)
                throw new Error('File already exists: ' + file.fullPath() + '.');

            var fullPath = '/' + pathParts.join('/');
            file = new RuntimeFileEntry(fullPath, fileName, parent, this, function () {
                return _this._handleFileClick(file);
            });

            files.splice(fileIndex, 0, file);
            this._filesByFullPath[fullPath] = file;

            return file;
        };

        FileList.prototype._insertOrLookupFolder = function (parent, folders, pathParts, i) {
            var _this = this;
            var folderName = pathParts[i];

            var folderArray = folders();
            var folderIndex = insertionIndexOfEntry(folderArray, folderName);
            var folder = folderArray[folderIndex];

            if (!folder || folder.name() !== folderName) {
                var folderPath = '/' + pathParts.slice(0, i + 1).join('/');
                folder = new RuntimeFolderEntry(folderPath, folderName, parent, this, function () {
                    return _this._handleFolderClick(folder);
                });
                folders.splice(folderIndex, 0, folder);
            }

            return folder;
        };

        FileList.prototype._handleFolderClick = function (folder) {
        };

        FileList.prototype._handleFileClick = function (file) {
            if (this.selectedFile() === file)
                return;

            this._updateSelectionProperties(file);
        };

        FileList.prototype._updateSelectionProperties = function (newSelectedFile) {
            var selectFolders = {};
            if (newSelectedFile) {
                var f = newSelectedFile.parent();
                while (f) {
                    selectFolders[f.fullPath()] = f;
                    if (!f.containsSelectedFile())
                        f.containsSelectedFile(true);
                    f = f.parent();
                }
                newSelectedFile.isSelected(true);
            }

            if (this.selectedFile()) {
                var f = this.selectedFile().parent();
                while (f) {
                    if (!selectFolders[f.fullPath()] && f.containsSelectedFile())
                        f.containsSelectedFile(false);
                    f = f.parent();
                }
                this.selectedFile().isSelected(false);
            }

            this.selectedFile(newSelectedFile);
        };
        return FileList;
    })();
    teapo.FileList = FileList;

    var RuntimeFolderEntry = (function () {
        function RuntimeFolderEntry(_fullPath, _name, _parent, _owner, _handleClick) {
            this._fullPath = _fullPath;
            this._name = _name;
            this._parent = _parent;
            this._owner = _owner;
            this._handleClick = _handleClick;
            this.folders = ko.observableArray();
            this.files = ko.observableArray();
            this.containsSelectedFile = ko.observable(false);
            //
        }
        RuntimeFolderEntry.prototype.fullPath = function () {
            return this._fullPath;
        };
        RuntimeFolderEntry.prototype.name = function () {
            return this._name;
        };
        RuntimeFolderEntry.prototype.parent = function () {
            return this._parent;
        };

        RuntimeFolderEntry.prototype.nestLevel = function () {
            return this._parent ? this._parent.nestLevel() + 1 : 0;
        };

        RuntimeFolderEntry.prototype.handleClick = function () {
            this._handleClick();
        };
        return RuntimeFolderEntry;
    })();

    var RuntimeFileEntry = (function () {
        function RuntimeFileEntry(_fullPath, _name, _parent, _owner, _handleClick) {
            this._fullPath = _fullPath;
            this._name = _name;
            this._parent = _parent;
            this._owner = _owner;
            this._handleClick = _handleClick;
            this.isSelected = ko.observable(false);
            //
        }
        RuntimeFileEntry.prototype.fullPath = function () {
            return this._fullPath;
        };
        RuntimeFileEntry.prototype.name = function () {
            return this._name;
        };
        RuntimeFileEntry.prototype.parent = function () {
            return this._parent;
        };

        RuntimeFileEntry.prototype.nestLevel = function () {
            return this._parent ? this._parent.nestLevel() + 1 : 0;
        };

        RuntimeFileEntry.prototype.handleClick = function () {
            this._handleClick();
        };
        return RuntimeFileEntry;
    })();

    function insertionIndexOfEntry(entries, name) {
        for (var i = 0; i < entries.length; i++) {
            var entryName = entries[i].name();
            if (entryName >= name)
                return i;
        }
        return entries.length;
    }

    /**
    * Convert string path into an array of path parts,
    * processing '..' as necessary.
    */
    function normalizePath(path) {
        if (!path)
            return [];

        var pathMid = stripOuterSlashes(path);
        var split = pathMid.split('/');

        var result = [];
        for (var i = 0; i < split.length; i++) {
            if (split[i] === '..') {
                if (result.length)
                    result.length--;
                continue;
            } else if (split[i] === '.' || split[i] === '') {
                continue;
            } else {
                result.push(split[i]);
            }
        }
        return result;
    }

    function stripOuterSlashes(path) {
        var start = 0;
        while (path.charAt(start) === '/')
            start++;

        var end = Math.max(start, path.length - 1);
        while (end > start && path.charAt(end) === '/')
            end--;

        var pathMid = start === 0 && end === path.length - 1 ? path : path.slice(start, end + 1);
        return pathMid;
    }
})(teapo || (teapo = {}));
/// <reference path='typings/websql.d.ts' />
/// <reference path='editor.ts' />
/// <reference path='files.ts' />
var teapo;
(function (teapo) {
    /**
    * Initialize storage loading the state from HTML DOM, WebSQL
    * and getting everything in a running state.
    * The API is asynchronous, provide handler.documentStorageCreated function
    * to receive the callback.
    * @param handler All necessary parameters and overrides
    * for instantiating DocumentStorage.
    */
    function openStorage(handler) {
        var storage = new RuntimeDocumentStorage(handler);
    }
    teapo.openStorage = openStorage;

    

    

    

    var RuntimeDocumentStorage = (function () {
        function RuntimeDocumentStorage(handler) {
            var _this = this;
            this.handler = handler;
            this.document = null;
            this._metadataElement = null;
            this._metadataProperties = null;
            this._docByPath = {};
            this._executeSql = null;
            this._insertMetadataSql = '';
            this._updateMetadataSql = '';
            this.document = this.handler.document ? this.handler.document : document;

            var pathElements = this._scanDomScripts();
            if (!this._metadataElement) {
                this._metadataElement = appendScriptElement(this.document);
                this._metadataElement.id = 'storageMetadata';
            }

            var openDatabase = this.handler.openDatabase || getOpenDatabase();
            if (typeof openDatabase === 'function') {
                var dbName = this.handler.uniqueKey ? this.handler.uniqueKey : getUniqueKey();
                var db = openDatabase(dbName, 1, null, 1024 * 1024 * 5);

                this._executeSql = function (sqlStatement, args, callback, errorCallback) {
                    var errorCallbackSafe = errorCallback;
                    if (!errorCallbackSafe)
                        errorCallbackSafe = function (t, e) {
                            return alert(e + ' ' + e.message + '\n' + sqlStatement + '\n' + args);
                        };
                    db.transaction(function (t) {
                        return t.executeSql(sqlStatement, args, callback, errorCallbackSafe);
                    });
                };
                this._insertMetadataSql = 'INSERT INTO "*metadata" (name, value) VALUES(?,?)';
                this._updateMetadataSql = 'UPDATE "*metadata" SET value=? WHERE name=?';

                this._metadataProperties = {};
                this._loadTableListFromWebsql(function (tableList) {
                    var metadataTableExists = false;
                    for (var i = 0; i < tableList.length; i++) {
                        if (tableList[i] === '*metadata') {
                            metadataTableExists = true;
                            break;
                        }
                    }
                    if (!metadataTableExists) {
                        _this._loadInitialStateFromDom(pathElements);
                        return;
                    }

                    loadPropertiesFromWebSql('*metadata', _this._metadataElement, _this._metadataProperties, _this._executeSql, function () {
                        var wsEdited = safeParseInt(_this._metadataProperties.edited);
                        var domEdited = _this._metadataElement ? safeParseInt(_this._metadataElement.getAttribute('edited')) : null;
                        if (!wsEdited || domEdited && domEdited > wsEdited)
                            _this._loadInitialStateFromDom(pathElements);
                        else
                            _this._loadInitialStateFromWebSql(pathElements);
                    });
                });
            } else {
                this._loadInitialStateFromDom(pathElements);
            }
        }
        RuntimeDocumentStorage.prototype.documentNames = function () {
            return Object.keys(this._docByPath);
        };

        RuntimeDocumentStorage.prototype.getDocument = function (fullPath) {
            return this._docByPath[fullPath];
        };

        RuntimeDocumentStorage.prototype.createDocument = function (fullPath) {
            if (this._docByPath[fullPath])
                throw new Error('File already exists: ' + fullPath + '.');

            var s = appendScriptElement(document);
            s.setAttribute('data-path', fullPath);

            var docState = new RuntimeDocumentState(fullPath, s, this._executeSql, this, null);

            this._docByPath[fullPath] = docState;

            return docState;
        };

        RuntimeDocumentStorage.prototype.removeDocument = function (fullPath) {
            var docState = this._docByPath[fullPath];

            if (docState) {
                docState._removeStorage();
                delete this._docByPath[fullPath];
            }

            return docState;
        };

        RuntimeDocumentStorage.prototype.getProperty = function (name) {
            return this._metadataProperties[name || ''];
        };

        RuntimeDocumentStorage.prototype.setProperty = function (name, value) {
            name = name || '';
            if (value === this._metadataProperties[name])
                return;

            var existingProperty = this._metadataProperties.hasOwnProperty(name);
            this._metadataProperties[name] = value;

            if (name)
                this._metadataElement.setAttribute(name, value);
            else
                this._metadataElement.innerHTML = encodeForInnerHTML(value);

            if (this._executeSql) {
                if (existingProperty)
                    this._executeSql(this._updateMetadataSql, [value, name]);
                else
                    this._executeSql(this._insertMetadataSql, [name, value]);
            }

            if (name !== 'edited')
                this.setProperty('edited', Date.now());
        };

        RuntimeDocumentStorage.prototype._loadInitialStateFromDom = function (pathElements) {
            var _this = this;
            /** pull from DOM assuming webSQL state is clean of any tables */
            var loadInClearState = function () {
                for (var fullPath in pathElements)
                    if (pathElements.hasOwnProperty(fullPath)) {
                        var s = pathElements[fullPath];

                        var docState = new RuntimeDocumentState(fullPath, s, _this._executeSql, _this, null);

                        _this._docByPath[fullPath] = docState;
                    }

                if (_this._executeSql) {
                    _this._executeSql('CREATE TABLE "*metadata" (name TEXT, value TEXT)', [], null, null);
                }

                _this.handler.documentStorageCreated(null, _this);
            };

            if (this._executeSql) {
                this._dropAllTables(loadInClearState);
            } else {
                loadInClearState();
            }
        };

        RuntimeDocumentStorage.prototype._dropAllTables = function (completed) {
            var _this = this;
            this._loadTableListFromWebsql(function (tableList) {
                for (var i = 0; i < tableList.length; i++) {
                    _this._executeSql('DROP TABLE "' + tableList[i] + '"', [], null, null);
                }

                completed();
            });
        };

        RuntimeDocumentStorage.prototype._loadInitialStateFromWebSql = function (pathElements) {
            var _this = this;
            for (var k in pathElements)
                if (pathElements.hasOwnProperty(k)) {
                    var s = pathElements[k];
                    s.parentElement.removeChild(s);
                }

            // retrieving data from WebSQL and creating documents
            this._loadTableListFromWebsql(function (tables) {
                var files = tables.filter(function (tab) {
                    return tab.charAt(0) === '/' || tab.charAt(0) === '#';
                });
                var completedFileCount = 0;
                for (var i = 0; i < files.length; i++) {
                    var fullPath = files[i];

                    var s = appendScriptElement(_this.document);
                    s.setAttribute('data-path', fullPath);

                    var docState = new RuntimeDocumentState(fullPath, s, _this._executeSql, _this, function () {
                        completedFileCount++;

                        if (completedFileCount === files.length) {
                            _this.handler.documentStorageCreated(null, _this);
                        }
                    });

                    _this._docByPath[fullPath] = docState;
                }
            });
        };

        RuntimeDocumentStorage.prototype._scanDomScripts = function () {
            var pathElements = {};

            for (var i = 0; i < document.scripts.length; i++) {
                var s = document.scripts[i];
                var path = s.getAttribute('data-path');
                if (path) {
                    if (path.charAt(0) === '/' || path.charAt(0) === '#') {
                        pathElements[path] = s;
                    }
                } else if (s.id === 'storageMetadata') {
                    this._metadataElement = s;
                }
            }

            return pathElements;
        };

        RuntimeDocumentStorage.prototype._loadTableListFromWebsql = function (callback) {
            var sql = 'SELECT name FROM sqlite_master WHERE type=\'table\'';
            this._executeSql(sql, [], function (t, result) {
                var files = [];
                for (var i = 0; i < result.rows.length; i++) {
                    var tableName = result.rows.item(i).name;
                    if (tableName.charAt(0) === '/' || tableName.charAt(0) === '#' || tableName.charAt(0) === '*') {
                        files.push(tableName);
                    }
                }
                callback(files);
            });
        };
        return RuntimeDocumentStorage;
    })();

    /**
    * Standard implementation of DocumentState.
    * This class is not exposed outside of this module.
    */
    var RuntimeDocumentState = (function () {
        function RuntimeDocumentState(_fullPath, _storeElement, _executeSql, _storage, loadFromWebsqlCallback) {
            var _this = this;
            this._fullPath = _fullPath;
            this._storeElement = _storeElement;
            this._executeSql = _executeSql;
            this._storage = _storage;
            this._type = null;
            this._editor = null;
            this._fileEntry = null;
            this._properties = {};
            this._updateSql = '';
            this._insertSql = '';
            var tableName = this._fullPath;
            if (this._executeSql) {
                this._insertSql = 'INSERT INTO "' + tableName + '" (name, value) VALUES(?,?)';
                this._updateSql = 'UPDATE "' + tableName + '" SET value=? WHERE name=?';
            }

            if (loadFromWebsqlCallback) {
                loadPropertiesFromWebSql(tableName, this._storeElement, this._properties, this._executeSql, function () {
                    loadFromWebsqlCallback(_this);
                });
            } else {
                loadPropertiesFromDom(tableName, this._storeElement, this._properties, this._executeSql);
            }
        }
        RuntimeDocumentState.prototype.fullPath = function () {
            return this._fullPath;
        };

        RuntimeDocumentState.prototype.type = function () {
            if (!this._type)
                this._type = this._storage.handler.getType(this._fullPath);

            return this._type;
        };

        RuntimeDocumentState.prototype.fileEntry = function () {
            if (!this._fileEntry)
                this._fileEntry = this._storage.handler.getFileEntry(this._fullPath);

            return this._fileEntry;
        };

        RuntimeDocumentState.prototype.editor = function () {
            if (!this._editor)
                this._editor = this.type().editDocument(this);

            return this._editor;
        };

        RuntimeDocumentState.prototype.currentEditor = function () {
            return this._editor;
        };

        RuntimeDocumentState.prototype.getProperty = function (name) {
            return this._properties[name || ''];
        };

        RuntimeDocumentState.prototype.setProperty = function (name, value) {
            var name = name || '';
            if (value === this._properties[name])
                return;

            var existingProperty = this._properties.hasOwnProperty(name);
            this._properties[name] = value;

            if (name)
                this._storeElement.setAttribute(name, value);
            else
                this._storeElement.innerHTML = encodeForInnerHTML(value);

            if (this._executeSql) {
                if (existingProperty)
                    this._executeSql(this._updateSql, [value, name]);
                else
                    this._executeSql(this._insertSql, [name, value]);
            }

            this._storage.setProperty('edited', Date.now());
        };

        RuntimeDocumentState.prototype._removeStorage = function () {
            if (this._editor)
                this._editor.remove();

            this._storeElement.parentElement.removeChild(this._storeElement);
            if (this._executeSql) {
                this._executeSql('DROP TABLE "' + this._fullPath + '"');
            }
        };
        return RuntimeDocumentState;
    })();

    function getUniqueKey() {
        var key = window.location.href;

        key = key.split('?')[0];
        key = key.split('#')[0];

        if (key.length > 'index.html'.length && key.slice(key.length - 'index.html'.length).toLowerCase() === 'index.html')
            key = key.slice(0, key.length - 'index.html'.length);

        key += '*';

        return key;
    }

    function getOpenDatabase() {
        return typeof openDatabase == 'undefined' ? null : openDatabase;
    }

    function safeParseInt(str) {
        if (!str)
            return null;
        if (typeof str === 'number')
            return str;
        try  {
            return parseInt(str);
        } catch (e) {
            return null;
        }
    }

    function appendScriptElement(doc) {
        var s = doc.createElement('script');
        s.setAttribute('type', 'text/data');
        doc.body.appendChild(s);
        return s;
    }

    function loadPropertiesFromDom(tableName, script, properties, executeSql) {
        if (executeSql) {
            executeSql('CREATE TABLE "' + tableName + '" ( name TEXT, value TEXT)');
        }

        var insertSQL = 'INSERT INTO "' + tableName + '" (name, value) VALUES(?,?)';

        for (var i = 0; i < script.attributes.length; i++) {
            var a = script.attributes.item(i);

            if (a.name === 'id' || a.name === 'data-path' || a.name === 'type')
                continue;

            properties[a.name] = a.value;

            if (executeSql)
                executeSql(insertSQL, [a.name, a.value]);
        }

        // restore HTML-safe conversions
        var contentStr = decodeFromInnerHTML(script.innerHTML);
        properties[''] = contentStr;
        if (executeSql)
            executeSql(insertSQL, ['', contentStr]);
    }

    function loadPropertiesFromWebSql(tableName, script, properties, executeSql, completed) {
        executeSql('SELECT name, value from "' + tableName + '"', [], function (t, results) {
            var rowCount = results.rows.length;
            for (var i = 0; i < rowCount; i++) {
                var row = results.rows.item(i);
                properties[row.name] = row.value || '';
                if (row.name)
                    script.setAttribute(row.name, row.value || '');
                else
                    script.innerHTML = encodeForInnerHTML(row.value);
            }

            completed();
        });
    }

    /**
    * Escape unsafe character sequences like a closing script tag.
    */
    function encodeForInnerHTML(content) {
        return content.replace(/<\/script/g, '<//script');
    }

    /**
    * Unescape character sequences wrapped with encodeForInnerHTML for safety.
    */
    function decodeFromInnerHTML(innerHTML) {
        return innerHTML.replace(/<\/\/script/g, '</script');
    }
})(teapo || (teapo = {}));
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='persistence.ts' />
var teapo;
(function (teapo) {
    

    

    // types are registered by adding variables/properties to this module
    (function (EditorType) {
        /**
        * Resolve to a type that accepts this file.
        */
        function getType(fullPath) {
            // must iterate in reverse, so more generic types get used last
            var reverse = Object.keys(EditorType);
            for (var i = reverse.length - 1; i >= 0; i--) {
                var t = this[reverse[i]];
                if (t.canEdit && t.canEdit(fullPath))
                    return t;
            }

            return null;
        }
        EditorType.getType = getType;
    })(teapo.EditorType || (teapo.EditorType = {}));
    var EditorType = teapo.EditorType;
})(teapo || (teapo = {}));
/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/zip.js.d.ts' />
/// <reference path='editor.ts' />
/// <reference path='files.ts' />
/// <reference path='persistence.ts' />
var teapo;
(function (teapo) {
    /**
    * Hadles high-level application behavior,
    * creates and holds DocumentStorage and FileList,
    * that in turn manage persistence and file list/tree.
    *
    * Note that ApplicationShell serves as a top-level
    * ViewModel used in Knockout.js bindings.
    */
    var ApplicationShell = (function () {
        function ApplicationShell(_storage) {
            var _this = this;
            this._storage = _storage;
            this.saveDelay = 1500;
            this.fileList = null;
            this._selectedDocState = null;
            this._editorElement = null;
            this._editorHost = null;
            this._saveTimeout = 0;
            this._saveSelectedFileClosure = function () {
                return _this._invokeSaveSelectedFile();
            };
            this.fileList = new teapo.FileList(this._storage);

            this.fileList.selectedFile.subscribe(function (fileEntry) {
                return _this._fileSelected(fileEntry);
            });

            // loading editors for all the files
            var allFiles = this._storage.documentNames();
            for (var i = 0; i < allFiles.length; i++) {
                var docState = this._storage.getDocument(allFiles[i]);
                docState.editor();
            }
        }
        /**
        * Prompts user for a name, creates a new file and opens it in the editor.
        * Exposed as a button bound using Knockout.
        */
        ApplicationShell.prototype.newFileClick = function () {
            var fileName = prompt('New file');
            if (!fileName)
                return;

            var fileEntry = this.fileList.createFileEntry(fileName);
            this._storage.createDocument(fileEntry.fullPath());

            fileEntry.handleClick();
        };

        /**
        * Pops a confirmation dialog up, then deletes the currently selected file.
        * Exposed as a button bound using Knockout.
        */
        ApplicationShell.prototype.deleteSelectedFile = function () {
            var selectedFileEntry = this.fileList.selectedFile();
            if (!selectedFileEntry)
                return;

            if (!confirm('Are you sure deleting ' + selectedFileEntry.name()))
                return;

            this._storage.removeDocument(selectedFileEntry.fullPath());
            this.fileList.removeFileEntry(selectedFileEntry.fullPath());

            if (this._editorHost) {
                this._editorHost.innerHTML = '';
            }
        };

        /**
        * Suggested name for file save operation.
        */
        ApplicationShell.prototype.saveFileName = function () {
            var urlParts = window.location.pathname.split('/');
            return decodeURI(urlParts[urlParts.length - 1]);
        };

        /**
        * Triggers a download of the whole current HTML, which contains the filesystem state and all the necessary code.
        * Relies on blob URLs, doesn't work in old browsers.
        * Exposed as a button bound using Knockout.
        */
        ApplicationShell.prototype.saveHtml = function () {
            var filename = this.saveFileName();
            var blob = new Blob([document.documentElement.outerHTML], { type: 'application/octet-stream' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.setAttribute('download', filename);
            a.click();
        };

        /**
        * Packs the current filesystem content in a zip, then triggers a download.
        * Relies on blob URLs and Zip.js, doesn't work in old browsers.
        * Exposed as a button bound using Knockout.
        */
        ApplicationShell.prototype.saveZip = function () {
            var _this = this;
            zip.useWebWorkers = false;
            var filename = this.saveFileName();
            if (filename.length > '.html'.length && filename.slice(filename.length - '.html'.length).toLowerCase() === '.html')
                filename = filename.slice(0, filename.length - '.html'.length);
            else if (filename.length > '.htm'.length && filename.slice(filename.length - '.htm'.length).toLowerCase() === '.htm')
                filename = filename.slice(0, filename.length - '.htm'.length);
            filename += '.zip';

            zip.createWriter(new zip.BlobWriter(), function (zipWriter) {
                var files = _this._storage.documentNames();
                var completedCount = 0;

                for (var i = 0; i < files.length; i++) {
                    var docState = _this._storage.getDocument(files[i]);
                    var content = docState.getProperty(null);

                    var zipRelativePath = files[i].slice(1);

                    zipWriter.add(zipRelativePath, new zip.TextReader(content), function () {
                        completedCount++;
                        if (completedCount === files.length) {
                            zipWriter.close(function (blob) {
                                var url = URL.createObjectURL(blob);
                                var a = document.createElement('a');
                                a.href = url;
                                a.setAttribute('download', filename);
                                a.click();
                            });
                        }
                    });
                }
            });
        };

        /**
        * Invoked from the Knockout/view side to pass the editor host DIV
        * to ApplicationShell.
        */
        ApplicationShell.prototype.attachToHost = function (editorHost) {
            this._editorHost = editorHost;
            if (this._editorElement) {
                this._editorHost.innerHTML = '';
                this._editorHost.appendChild(this._editorElement);
            }
        };

        ApplicationShell.prototype._fileSelected = function (fileEntry) {
            var _this = this;
            var newDocState = null;
            if (fileEntry)
                newDocState = this._storage.getDocument(fileEntry.fullPath());

            if (this._selectedDocState) {
                // save file if needed before switching
                if (this._saveTimeout) {
                    clearTimeout(this._saveTimeout);
                    this._selectedDocState.editor().save();
                }

                // close file before switching
                this._selectedDocState.editor().close();
            }

            var newEditorElement = null;
            if (newDocState) {
                var onchanged = function () {
                    return _this._selectedFileEditorChanged();
                };
                newEditorElement = newDocState.editor().open(onchanged);
            }

            if (newEditorElement !== this._editorElement) {
                var oldEditorElement = this._editorElement;

                this._editorElement = newEditorElement;

                if (oldEditorElement && this._editorHost) {
                    this._editorHost.removeChild(oldEditorElement);
                }

                this._editorHost.innerHTML = ''; // removing the initial startup decoration

                if (newEditorElement && this._editorHost)
                    this._editorHost.appendChild(newEditorElement);
            }
        };

        ApplicationShell.prototype._selectedFileEditorChanged = function () {
            if (this._saveTimeout)
                clearTimeout(this._saveTimeout);

            this._saveTimeout = setTimeout(this._saveSelectedFileClosure, this.saveDelay);
        };

        ApplicationShell.prototype._invokeSaveSelectedFile = function () {
            var selectedFileEntry = this.fileList.selectedFile();
            if (!selectedFileEntry)
                return;

            var docState = this._storage.getDocument(selectedFileEntry.fullPath());
            docState.editor().save();
        };
        return ApplicationShell;
    })();
    teapo.ApplicationShell = ApplicationShell;
})(teapo || (teapo = {}));
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
var teapo;
(function (teapo) {
    /**
    * Basic implementation for a text-based editor.
    */
    var CodeMirrorEditor = (function () {
        function CodeMirrorEditor(_shared, docState) {
            this._shared = _shared;
            this.docState = docState;
            this._doc = null;
            this._text = null;
        }
        CodeMirrorEditor.standardEditorConfiguration = function () {
            return {
                lineNumbers: true,
                matchBrackets: true,
                autoCloseBrackets: true,
                matchTags: true,
                showTrailingSpace: true,
                autoCloseTags: true,
                highlightSelectionMatches: { showToken: /\w/ },
                styleActiveLine: true,
                tabSize: 2,
                extraKeys: { "Tab": "indentMore", "Shift-Tab": "indentLess" }
            };
        };

        /**
        * Invoked when a file is selected in the file list/tree and brought open.
        */
        CodeMirrorEditor.prototype.open = function (onchange) {
            this._shared.editor = this;

            // storing passed function
            // (it should be invoked for any change to trigger saving)
            this._invokeonchange = onchange;

            // this may actually create CodeMirror instance
            var editor = this.editor();

            editor.swapDoc(this.doc());

            // invoking overridable logic
            this.handleOpen();

            var element = this._shared.element;
            if (element && !element.parentElement)
                setTimeout(function () {
                    return editor.refresh();
                }, 1);
            return element;
        };

        /**
        * Invoked when file needs to be saved.
        */
        CodeMirrorEditor.prototype.save = function () {
            // invoking overridable logic
            this.handleSave();
        };

        /**
        * Invoked when file is closed (normally it means another one is being opened).
        */
        CodeMirrorEditor.prototype.close = function () {
            if (this._shared.editor === this)
                this._shared.editor = null;

            // should not try triggering a save when not opened
            this._invokeonchange = null;
            this.handleClose();
        };

        CodeMirrorEditor.prototype.remove = function () {
            this.handleRemove();
        };

        /**
        * Retrieve CodeMirror.Doc that is solely used for this document editing.
        */
        CodeMirrorEditor.prototype.doc = function () {
            if (!this._doc)
                this._initDoc();

            return this._doc;
        };

        /**
        * Retrieve CodeMirror editor that normally is shared with other documents of the same type.
        * Be careful not to use it when this specific document is closed.
        */
        CodeMirrorEditor.prototype.editor = function () {
            // note that editor instance is shared
            if (!this._shared.cm)
                this._initEditor();

            return this._shared.cm;
        };

        /**
        * Retrieve the text of this document.
        * This property is cached, so retrieving the text is cheap between the edits.
        * If the document has never been edited, the text is retrieved from the storage instead,
        * which is much cheaper still.
        */
        CodeMirrorEditor.prototype.text = function () {
            if (!this._text) {
                if (this._doc)
                    this._text = this._doc.getValue();
                else
                    this._text = this.docState.getProperty(null) || '';
            }
            return this._text;
        };

        /**
        * Overridable method, invoked when the document is being opened.
        */
        CodeMirrorEditor.prototype.handleOpen = function () {
        };

        /**
        * Overridable method, invoked when the document has been changed.
        * CodeMirrorEditor subscribes to corresponding event internally, and does some internal handling before invoking handleChange.
        */
        CodeMirrorEditor.prototype.handleChange = function (change) {
        };

        /**
        * Overridable method, invoked when the document is being closed.
        */
        CodeMirrorEditor.prototype.handleClose = function () {
        };

        /**
        * Overridable method, invoked when the file was removed and the editor needs to be destroyed.
        */
        CodeMirrorEditor.prototype.handleRemove = function () {
        };

        /**
        * Overridable method, invoked when the document is being loaded first time from the storage.
        * The default implementation fetches 'null' property from the storage.
        * Keep calling super.handleLoad() if that is the desired behavior.
        */
        CodeMirrorEditor.prototype.handleLoad = function () {
            if (this.docState) {
                this.doc().setValue(this.docState.getProperty(null) || '');
                this.doc().clearHistory();
            }
        };

        /**
        * Overridable method, invoked when the document needs to be saved.
        * The default implementation stores into 'null' property of the storage.
        * Keep calling super.handleSave() if that is the desired behavior.
        */
        CodeMirrorEditor.prototype.handleSave = function () {
            if (this.docState)
                this.docState.setProperty(null, this.text());
        };

        CodeMirrorEditor.prototype._initEditor = function () {
            var _this = this;
            var options = this._shared.options || CodeMirrorEditor.standardEditorConfiguration();
            this._shared.cm = new CodeMirror(function (element) {
                return _this._shared.element = element;
            }, options);
        };

        CodeMirrorEditor.prototype._initDoc = function () {
            var _this = this;
            // resolve options (allow override)
            var options = this._shared.options || CodeMirrorEditor.standardEditorConfiguration();
            this._doc = options.mode ? new CodeMirror.Doc('', options.mode) : new CodeMirror.Doc('');

            // invoke overridable handleLoad()
            this.handleLoad();

            // subscribe to change event
            CodeMirror.on(this._doc, 'change', function (instance, change) {
                // it is critical that _text is cleared on any change
                _this._text = null;

                // notify the external logic that the document was changed
                _this._invokeonchange();

                _this.handleChange(change);
            });
        };
        return CodeMirrorEditor;
    })();
    teapo.CodeMirrorEditor = CodeMirrorEditor;

    /**
    * Simple document type using CodeMirrorEditor, usable as a default type for text files.
    */
    var PlainTextEditorType = (function () {
        function PlainTextEditorType() {
            this._shared = {};
        }
        PlainTextEditorType.prototype.canEdit = function (fullPath) {
            return true;
        };

        PlainTextEditorType.prototype.editDocument = function (docState) {
            return new CodeMirrorEditor(this._shared, docState);
        };
        return PlainTextEditorType;
    })();

    (function (EditorType) {
        /**
        * Registering PlainTextEditorType.
        */
        EditorType.PlainText = new PlainTextEditorType();
    })(teapo.EditorType || (teapo.EditorType = {}));
    var EditorType = teapo.EditorType;
})(teapo || (teapo = {}));
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='ko.ts' />
/// <reference path='shell.ts' />
/// <reference path='editor-std.ts' />
/// <reference path='editor-ts.ts' />
function start() {
    var storage = null;
    var viewModel = null;

    var storageLoaded = function () {
        teapo.registerKnockoutBindings(ko);

        viewModel = new teapo.ApplicationShell(storage);

        var pageElement = null;

        for (var i = 0; i < document.body.childNodes.length; i++) {
            var e = document.body.childNodes.item(i);
            if (e && e.tagName && e.tagName.toLowerCase() !== 'script') {
                if (e.className && e.className.indexOf('teapo-page') >= 0) {
                    pageElement = e;
                    continue;
                }

                document.body.removeChild(e);
                i--;
            }
        }

        ko.renderTemplate('page-template', viewModel, null, pageElement);
    };

    teapo.openStorage({
        documentStorageCreated: function (error, s) {
            storage = s;
            storageLoaded();
        },
        getType: function (fullPath) {
            return teapo.EditorType.getType(fullPath);
        },
        getFileEntry: function (fullPath) {
            return viewModel.fileList.getFileEntry(fullPath);
        }
    });
}

// TODO: remove this ridiculous timeout (need to insert scripts above teapo.js)
setTimeout(start, 100);
//# sourceMappingURL=teapo.js.map
