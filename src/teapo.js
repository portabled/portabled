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
    * File list or tree ViewModel.
    */
    var FileList = (function () {
        function FileList(_storage) {
            this._storage = _storage;
            this.folders = ko.observableArray();
            this.files = ko.observableArray();
            this.selectedFile = ko.observable(null);
            this._filesByFullPath = {};
            var fileNames = this._storage.documentNames();
            for (var i = 0; i < fileNames.length; i++) {
                this._addFileEntry(fileNames[i]);
            }
        }
        FileList.prototype.getFileEntry = function (fullPath) {
            return this._filesByFullPath[fullPath];
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

            file = new RuntimeFileEntry('/' + pathParts.join('/'), fileName, parent, this, function () {
                return _this._handleFileClick(file);
            });

            files.splice(fileIndex, 0, file);
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
/// <reference path='editor.ts' />
/// <reference path='files.ts' />
var teapo;
(function (teapo) {
    /**
    * Encapsulating all necessary for storing documents, metadata and properties.
    */
    var DocumentStorage = (function () {
        function DocumentStorage() {
            this.document = document;
            this.localStorage = localStorage;
            this.uniqueKey = getUniqueKey();
            this.typeResolver = null;
            this.entryResolver = null;
            this._runtime = null;
        }
        /**
        * Full paths of all files.
        */
        DocumentStorage.prototype.documentNames = function () {
            this._ensureRuntime();
            return Object.keys(this._runtime.docByPath);
        };

        /**
        * Given a path retrieves an object for reading and writing document state,
        * also exposes runtime features like editor and entry in the file list.
        */
        DocumentStorage.prototype.getDocument = function (fullPath) {
            this._ensureRuntime();
            return this._runtime.docByPath[fullPath].doc;
        };

        /**
        * Creates a persisted state for a document, and returns it as a result.
        */
        DocumentStorage.prototype.createDocument = function (fullPath) {
            this._ensureRuntime();

            if (this._runtime.docByPath[fullPath])
                throw new Error('File already exists: ' + fullPath + '.');

            var s = appendScriptElement(this.document);
            var docState = new RuntimeDocumentState(fullPath, true, s, this._runtime);

            this._runtime.docByPath[fullPath] = docState;

            this._runtime.storeFilenamesToLocalStorage();
            this._runtime.storeEdited();

            return docState.doc;
        };

        /**
        * Removes the document and all its state.
        */
        DocumentStorage.prototype.removeDocument = function (fullPath) {
            this._ensureRuntime();

            var docState = this._runtime.docByPath[fullPath];
            if (!docState)
                throw new Error('File does not exist: ' + fullPath + '.');

            docState.storeElement.parentElement.removeChild(docState.storeElement);

            for (var k in this.localStorage)
                if (this.localStorage.hasOwnProperty(k)) {
                    if (k.length >= docState.localStorageKey && k.slice(0, docState.localStorageKey.length) === docState.localStorageKey)
                        delete this.localStorage[k];
                }
        };

        DocumentStorage.prototype._ensureRuntime = function () {
            if (!this._runtime)
                this._runtime = new RuntimeDocumentStorage(this);
        };
        return DocumentStorage;
    })();
    teapo.DocumentStorage = DocumentStorage;

    /**
    * Allows reading, writing properties of the document,
    * and also exposes runtime features like editor and entry in the file list.
    */
    var DocumentState = (function () {
        function DocumentState(docState) {
            this._docState = docState; // cheating against type checks here
        }
        DocumentState.prototype.fullPath = function () {
            return this._docState.fullPath;
        };

        /**
        * Retrieves object encapsulating document type (such as plain text, JavaScript, HTML).
        * Note that type is metadata, so the instance is shared across all of the documents
        * of the same type.
        */
        DocumentState.prototype.type = function () {
            if (!this._docState.type)
                this._docState.type = this._docState.runtime.storage.typeResolver(this._docState.fullPath);
            return this._docState.type;
        };

        /**
        * Retrieves object encapsulating editor behaviour for the document.
        */
        DocumentState.prototype.editor = function () {
            if (!this._docState.editor)
                this._docState.editor = this.type().editDocument(this);
            return this._docState.editor;
        };

        /**
        * Retrieves object representing a node in the file list or tree view.
        */
        DocumentState.prototype.fileEntry = function () {
            if (this._docState.fileEntry)
                this._docState.fileEntry = this._docState.runtime.storage.entryResolver.getFileEntry(this._docState.fullPath);
            return this._docState.fileEntry;
        };

        /**
        * Retrieves property value from whatever persistence mechanism is implemented.
        */
        DocumentState.prototype.getProperty = function (name) {
            if (this._docState.loadFromDom) {
                if (name)
                    return this._docState.storeElement.getAttribute('data-' + name);
                else
                    return this._docState.storeElement.innerHTML;
            } else {
                var slotName = this._docState.localStorageKey + name;
                return this._docState.runtime.storage.localStorage[slotName];
            }
        };

        /**
        * Persists property value.
        */
        DocumentState.prototype.setProperty = function (name, value) {
            this._docState.storeElement.setAttribute('data-' + name, value);
            var slotName = this._docState.localStorageKey + name;
            this._docState.runtime.storage.localStorage[slotName] = value;
            this._docState.runtime.docChanged(this._docState);
        };

        /**
        * Retrieves transient property value from whatever persistence mechanism is implemented.
        * Transient properties live within a local browser setup and are not persisted in HTML DOM.
        */
        DocumentState.prototype.getTransientProperty = function (name) {
            var slotName = this._docState.localStorageKey + '~*' + name;
            return this._docState.runtime.storage.localStorage[slotName];
        };

        /**
        * Persists property value.
        * Transient properties live within a local browser setup and are not persisted in HTML DOM.
        */
        DocumentState.prototype.setTransientProperty = function (name, value) {
            var slotName = this._docState.localStorageKey + '~*' + name;
            this._docState.runtime.storage.localStorage[slotName] = value;
            this._docState.runtime.docChanged(this._docState);
        };
        return DocumentState;
    })();
    teapo.DocumentState = DocumentState;

    var RuntimeDocumentStorage = (function () {
        function RuntimeDocumentStorage(storage) {
            this.storage = storage;
            this.metadataElement = null;
            this.staticContent = {};
            this.docByPath = {};
            var pathElements = this._scanDomScripts();

            var lsEdited = safeParseDate(this._lsGet('edited'));
            var domEdited = this.metadataElement ? safeParseDate(this.metadataElement.getAttribute('edited')) : null;

            if (!lsEdited || domEdited && domEdited > lsEdited)
                this._loadInitialStateFromDom(pathElements);
            else
                this._loadInitialStateFromLocalStorage(pathElements);
        }
        RuntimeDocumentStorage.prototype.docChanged = function (docState) {
            this.storeEdited();
        };

        RuntimeDocumentStorage.prototype.storeFilenamesToLocalStorage = function () {
            var files = Object.keys(this.docByPath);
            var filesStr = files.join('\n');
            this._lsSet('files', filesStr);
        };

        RuntimeDocumentStorage.prototype.storeEdited = function () {
            var edited = new Date().toUTCString();
            this._lsSet('edited', edited);

            if (!this.metadataElement) {
                this.metadataElement = appendScriptElement(this.storage.document);
                this.metadataElement.id = 'path-metadata';
            }

            this.metadataElement.setAttribute('edited', edited);
        };

        RuntimeDocumentStorage.prototype._loadInitialStateFromLocalStorage = function (pathElements) {
            var lsFilenames = this._loadFilenamesFromLocalStorage();
            if (lsFilenames) {
                for (var i = 0; i < lsFilenames.length; i++) {
                    var lsFullPath = lsFilenames[i];
                    var s = pathElements[lsFullPath];
                    if (s) {
                        // TODO: clear DOM attributes
                    } else {
                        s = appendScriptElement(this.storage.document);
                        s.setAttribute('data-path', lsFullPath);
                    }
                    var docState = new RuntimeDocumentState(lsFullPath, false, s, this);
                    this.docByPath[lsFullPath] = docState;

                    // leave only DOM elements that are redundant
                    delete pathElements[lsFullPath];
                }
            }

            for (var fullPath in pathElements)
                if (pathElements.hasOwnProperty(fullPath)) {
                    var s = pathElements[fullPath];
                    s.parentElement.removeChild(s);
                }
        };

        RuntimeDocumentStorage.prototype._loadInitialStateFromDom = function (pathElements) {
            for (var fullPath in pathElements)
                if (pathElements.hasOwnProperty(fullPath)) {
                    var s = pathElements[fullPath];
                    var docState = new RuntimeDocumentState(fullPath, false, s, this);
                    this.docByPath[fullPath] = docState;
                }

            // clean old stuff from localStorage
            var deletePrefix = this.storage.uniqueKey + '/';
            for (var k in this.storage.localStorage)
                if (this.storage.localStorage.hasOwnProperty(k)) {
                    if (k.length >= deletePrefix.length && k.slice(0, deletePrefix.length) === deletePrefix)
                        delete this.storage.localStorage[k];
                }
        };

        RuntimeDocumentStorage.prototype._loadFilenamesFromLocalStorage = function () {
            var filenamesStr = this._lsGet('files');
            if (filenamesStr)
                return filenamesStr.split('\n');
            else
                return null;
        };

        RuntimeDocumentStorage.prototype._scanDomScripts = function () {
            var pathElements = {};

            for (var i = 0; i < this.storage.document.scripts.length; i++) {
                var s = this.storage.document.scripts[i];
                var path = s.getAttribute('data-path');
                if (path) {
                    if (path.charAt(0) === '/') {
                        pathElements[path] = s;
                    } else if (path.charAt(0) === '#') {
                        this.staticContent[path] = s.innerHTML;
                    }
                } else if (s.id === 'storageMetadata') {
                    this.metadataElement = s;
                }
            }

            return pathElements;
        };

        RuntimeDocumentStorage.prototype._lsGet = function (name) {
            return this.storage.localStorage[this.storage.uniqueKey + name];
        };

        RuntimeDocumentStorage.prototype._lsSet = function (name, value) {
            this.storage.localStorage[this.storage.uniqueKey + name] = value;
        };
        return RuntimeDocumentStorage;
    })();

    /**
    * Standard implementation of DocumentState.
    * This class is not exposed outside of this module.
    */
    var RuntimeDocumentState = (function () {
        function RuntimeDocumentState(fullPath, loadFromDom, storeElement, runtime) {
            this.fullPath = fullPath;
            this.loadFromDom = loadFromDom;
            this.storeElement = storeElement;
            this.runtime = runtime;
            this.type = null;
            this.editor = null;
            this.fileEntry = null;
            this.localStorageKey = this.runtime.storage.uniqueKey + fullPath;
            this.doc = new DocumentState(this);
        }
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

    function safeParseDate(str) {
        if (!str)
            return null;
        try  {
            return new Date(str);
        } catch (e) {
            return null;
        }
    }

    function appendScriptElement(doc) {
        var s = doc.createElement('script');
        s.setAttribute('type', 'text/data');
        doc.body.appendChild(doc);
        return s;
    }
})(teapo || (teapo = {}));
/// <reference path='persistence.ts' />
var teapo;
(function (teapo) {
    var DocumentType;

    var TextDocumentType = (function () {
        function TextDocumentType() {
            this._editor = null;
            this._editorElement = null;
        }
        TextDocumentType.prototype.editDocument = function (docState) {
            if (!this._editor)
                this._initEditor();

            return new TextEditor(this._editor, this._editorElement, docState);
        };

        TextDocumentType.prototype._initEditor = function () {
            var _this = this;
            var options = {};

            this._editor = CodeMirror(function (editorElement) {
                return _this._editorElement = editorElement;
            }, options);
        };
        return TextDocumentType;
    })();

    var TextEditor = (function () {
        function TextEditor(_editor, _editorElement, _docState) {
            this._editor = _editor;
            this._editorElement = _editorElement;
            this._docState = _docState;
            this._doc = null;
        }
        TextEditor.prototype.open = function () {
            if (!this._doc) {
                this._doc = this._editor.getDoc();
                this._doc.setValue(this._docState.getProperty(null));

                var historyStr = this._docState.getProperty('history');
                if (historyStr) {
                    try  {
                        var history = JSON.parse(historyStr);
                    } catch (e) {
                    }
                    if (history)
                        this._doc.setHistory(history);
                }
            }

            return this._editorElement;
        };

        TextEditor.prototype.close = function () {
        };
        return TextEditor;
    })();

    DocumentType = {
        "Plain Text": new TextDocumentType()
    };
})(teapo || (teapo = {}));
/// <reference path='typings/knockout.d.ts' />
/// <reference path='editor.ts' />
/// <reference path='files.ts' />
/// <reference path='persistence.ts' />
var teapo;
(function (teapo) {
    var ApplicationShell = (function () {
        function ApplicationShell() {
            var _this = this;
            this.fileList = null;
            this._storage = null;
            this._selectedDocState = null;
            this._editorElement = null;
            this._host = null;
            this._storage = new teapo.DocumentStorage();
            this._storage.entryResolver = this.fileList;

            this.fileList = new teapo.FileList(this._storage);

            this.fileList.selectedFile.subscribe(function (fileEntry) {
                return _this._fileSelected(fileEntry);
            });
        }
        ApplicationShell.prototype._fileSelected = function (fileEntry) {
            var newDocState = null;
            if (fileEntry)
                newDocState = this._storage.getDocument(fileEntry.fullPath());

            if (this._selectedDocState) {
                this._selectedDocState.editor().close();
            }

            var newEditorElement = null;
            if (newDocState) {
                newEditorElement = newDocState.editor().open();
            }

            if (newEditorElement !== this._editorElement) {
                var oldEditorElement = this._editorElement;
                this._editorElement = newEditorElement;
                if (oldEditorElement)
                    this._host.removeChild(oldEditorElement);
                if (newEditorElement)
                    this._host.appendChild(newEditorElement);
            }
        };
        return ApplicationShell;
    })();
    teapo.ApplicationShell = ApplicationShell;
})(teapo || (teapo = {}));
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='ko.ts' />
/// <reference path='shell.ts' />
function start() {
    teapo.registerKnockoutBindings(ko);

    var viewModel = new teapo.ApplicationShell();

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
}

start();
//# sourceMappingURL=teapo.js.map
