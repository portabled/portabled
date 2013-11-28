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

        FileList.prototype.createFileEntry = function (fullPath) {
            this._addFileEntry(fullPath);
            return this.getFileEntry(fullPath);
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
                this._docState.type = this._docState.runtime.storage.typeResolver.getType(this._docState.fullPath);
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

        DocumentState.prototype.currentEditor = function () {
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
                var slotName = this._docState.localStorageKey + (name ? name : '');
                return this._docState.runtime.storage.localStorage[slotName];
            }
        };

        /**
        * Persists property value.
        */
        DocumentState.prototype.setProperty = function (name, value) {
            var valueStr = value ? value : '';
            if (name)
                this._docState.storeElement.setAttribute('data-' + name, valueStr);
            else
                this._docState.storeElement.innerHTML = valueStr;

            var slotName = this._docState.localStorageKey + (name ? name : '');
            this._docState.runtime.storage.localStorage[slotName] = valueStr;

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
            this.storeFilenamesToLocalStorage();

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
                    var docState = new RuntimeDocumentState(fullPath, true, s, this);
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
        doc.body.appendChild(s);
        return s;
    }
})(teapo || (teapo = {}));
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='persistence.ts' />
var teapo;
(function (teapo) {
    (function (EditorType) {
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
/// <reference path='editor.ts' />
/// <reference path='files.ts' />
/// <reference path='persistence.ts' />
var teapo;
(function (teapo) {
    var ApplicationShell = (function () {
        function ApplicationShell() {
            var _this = this;
            this.saveDelay = 600;
            this.fileList = null;
            this._storage = null;
            this._selectedDocState = null;
            this._editorElement = null;
            this._host = null;
            this._saveTimeout = 0;
            this._saveSelectedFileClosure = function () {
                return _this._invokeSaveSelectedFile();
            };
            this._storage = new teapo.DocumentStorage();
            this._storage.entryResolver = this.fileList;
            this._storage.typeResolver = teapo.EditorType;

            this.fileList = new teapo.FileList(this._storage);

            this.fileList.selectedFile.subscribe(function (fileEntry) {
                return _this._fileSelected(fileEntry);
            });
        }
        ApplicationShell.prototype.newFileClick = function () {
            var fileName = prompt('New file');
            if (!fileName)
                return;

            var fileEntry = this.fileList.createFileEntry(fileName);
            this._storage.createDocument(fileName);
            fileEntry.handleClick();
        };

        ApplicationShell.prototype.deleteSelectedFile = function () {
            if (!this.fileList.selectedFile())
                return;

            if (!confirm('Are you sure dleting ' + this.fileList.selectedFile().name()))
                return;
            // TODO: delete the selected file, switch selection somewhere
        };

        ApplicationShell.prototype.saveFileName = function () {
            var urlParts = window.location.pathname.split('/');
            return decodeURI(urlParts[urlParts.length - 1]);
        };

        ApplicationShell.prototype.saveZip = function () {
        };

        ApplicationShell.prototype.attachToHost = function (host) {
            this._host = host;
            if (this._editorElement) {
                this._host.innerHTML = '';
                this._host.appendChild(this._editorElement);
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

                if (oldEditorElement && this._host) {
                    this._host.removeChild(oldEditorElement);
                }

                this._host.innerHTML = ''; // removing the initial startup decoration

                if (newEditorElement && this._host)
                    this._host.appendChild(newEditorElement);
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
                // readOnly: 'nocursor',
                tabSize: 2,
                extraKeys: { "Tab": "indentMore", "Shift-Tab": "indentLess" }
            };
        };

        CodeMirrorEditor.prototype.open = function (onchange) {
            this._invokeonchange = onchange;

            var editor = this.editor();

            var element = this._shared.element;
            if (element && !element.parentElement)
                setTimeout(function () {
                    return editor.refresh();
                }, 1);

            editor.swapDoc(this.doc());

            this.handleOpen();

            return element;
        };

        CodeMirrorEditor.prototype.save = function () {
            this.handleSave();
        };

        CodeMirrorEditor.prototype.close = function () {
            this._invokeonchange = null;
            this.handleClose();
        };

        CodeMirrorEditor.prototype.doc = function () {
            if (!this._doc)
                this._initDoc();

            return this._doc;
        };

        CodeMirrorEditor.prototype.editor = function () {
            if (!this._shared.editor)
                this._initEditor();

            return this._shared.editor;
        };

        CodeMirrorEditor.prototype.text = function () {
            if (!this._text) {
                if (this._doc)
                    this._text = this._doc.getValue();
                else
                    this._text = this.docState.getProperty(null);
            }
            return this._text;
        };

        CodeMirrorEditor.prototype.handleOpen = function () {
        };

        CodeMirrorEditor.prototype.handleChange = function (change) {
        };

        CodeMirrorEditor.prototype.handleClose = function () {
        };

        CodeMirrorEditor.prototype.handleLoad = function () {
            if (this.docState) {
                this.doc().setValue(this.docState.getProperty(null) || '');
                this.doc().clearHistory();
            }
        };

        CodeMirrorEditor.prototype.handleSave = function () {
            if (this.docState)
                this.docState.setProperty(null, this.text());
        };

        CodeMirrorEditor.prototype._initEditor = function () {
            var _this = this;
            var options = this._shared.options || CodeMirrorEditor.standardEditorConfiguration();
            this._shared.editor = CodeMirror(function (element) {
                return _this._shared.element = element;
            }, options);
        };

        CodeMirrorEditor.prototype._initDoc = function () {
            var _this = this;
            this._doc = new CodeMirror.Doc('');
            this.handleLoad();
            CodeMirror.on(this._doc, 'change', function (instance, change) {
                _this._text = null;
                _this._invokeonchange();
                _this.handleChange(change);
            });
        };
        return CodeMirrorEditor;
    })();
    teapo.CodeMirrorEditor = CodeMirrorEditor;

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
        EditorType.PlainText = new PlainTextEditorType();
    })(teapo.EditorType || (teapo.EditorType = {}));
    var EditorType = teapo.EditorType;
})(teapo || (teapo = {}));
/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='typings/codemirror.d.ts' />
var teapo;
(function (teapo) {
    var TypeScriptService = (function () {
        function TypeScriptService() {
            this.logLevels = {
                information: true,
                debug: true,
                warning: true,
                error: true,
                fatal: true
            };
            this.compilationSettings = new TypeScript.CompilationSettings();
            this.scripts = {};
            var factory = new TypeScript.Services.TypeScriptServicesFactory();
            this.service = factory.createPullLanguageService(this._createLanguageServiceHost());
        }
        TypeScriptService.prototype._createLanguageServiceHost = function () {
            var _this = this;
            return {
                getCompilationSettings: function () {
                    return _this.compilationSettings;
                },
                getScriptFileNames: function () {
                    var result = Object.keys(_this.scripts);

                    //console.log('...getScriptFileNames():',result);
                    return result;
                },
                getScriptVersion: function (fileName) {
                    var script = _this.scripts[fileName];
                    if (script.changes)
                        return script.changes.length;
                    return 0;
                },
                getScriptIsOpen: function (fileName) {
                    return true;
                },
                getScriptByteOrderMark: function (fileName) {
                    return 0 /* None */;
                },
                getScriptSnapshot: function (fileName) {
                    var script = _this.scripts[fileName];
                    if (!script.cachedSnapshot)
                        script.cachedSnapshot = new TypeScriptDocumentState(script);
                    return script.cachedSnapshot;
                },
                getDiagnosticsObject: function () {
                    return { log: function (text) {
                            return _this._log(text);
                        } };
                },
                getLocalizedDiagnosticMessages: function () {
                    return null;
                },
                information: function () {
                    return _this.logLevels.information;
                },
                debug: function () {
                    return _this.logLevels.debug;
                },
                warning: function () {
                    return _this.logLevels.warning;
                },
                error: function () {
                    return _this.logLevels.error;
                },
                fatal: function () {
                    return _this.logLevels.fatal;
                },
                log: function (text) {
                    return _this._log(text);
                },
                resolveRelativePath: function (path) {
                    var result = path;

                    //console.log('...resolveRelativePath('+path+'):', result);
                    return result;
                },
                fileExists: function (path) {
                    // don't issue a full resolve,
                    // this might be a mere probe for a file
                    return _this.scripts[path] ? true : false;
                },
                directoryExists: function (path) {
                    return true;
                },
                getParentDirectory: function (path) {
                    path = TypeScript.switchToForwardSlashes(path);
                    var slashPos = path.lastIndexOf('/');
                    if (slashPos === path.length - 1)
                        slashPos = path.lastIndexOf('/', path.length - 2);
                    if (slashPos > 0)
                        return path.slice(0, slashPos);
                    else
                        return '/';
                }
            };
        };

        TypeScriptService.prototype._log = function (text) {
            // console.log(text);
        };
        return TypeScriptService;
    })();
    teapo.TypeScriptService = TypeScriptService;

    var TypeScriptDocumentState = (function () {
        function TypeScriptDocumentState(scriptData) {
            this.scriptData = scriptData;
        }
        TypeScriptDocumentState.prototype.getText = function (start, end) {
            var text = this._getText();
            var result = text.slice(start, end);
            return result;
        };

        TypeScriptDocumentState.prototype.getLength = function () {
            var text = this._getText();
            return text.length;
        };

        TypeScriptDocumentState.prototype.getLineStartPositions = function () {
            var text = this._getText();
            var result = TypeScript.TextUtilities.parseLineStarts(text);
            return result;
        };

        TypeScriptDocumentState.prototype.getTextChangeRangeSinceVersion = function (scriptVersion) {
            if (!this.scriptData.changes)
                return TypeScript.TextChangeRange.unchanged;

            var chunk = this.scriptData.changes.slice(scriptVersion);

            var result = TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(chunk);
            return result;
        };

        TypeScriptDocumentState.prototype._getText = function () {
            return this.scriptData.text ? this.scriptData.text() : this.scriptData;
        };
        return TypeScriptDocumentState;
    })();
})(teapo || (teapo = {}));
/// <reference path='typings/codemirror.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
/// <reference path='editor-std.ts' />
/// <reference path='TypeScriptService.ts' />
var teapo;
(function (teapo) {
    var TypeScriptEditorType = (function () {
        function TypeScriptEditorType(_typescript) {
            if (typeof _typescript === "undefined") { _typescript = new teapo.TypeScriptService(); }
            this._typescript = _typescript;
            this._shared = {
                options: TypeScriptEditorType.editorConfiguration()
            };
        }
        TypeScriptEditorType.editorConfiguration = function () {
            var options = teapo.CodeMirrorEditor.standardEditorConfiguration();
            options.mode = "text/typescript";
            options.gutters = ['teapo-errors'];
            return options;
        };

        TypeScriptEditorType.prototype.canEdit = function (fullPath) {
            return fullPath && fullPath.length > 3 && fullPath.slice(fullPath.length - 3).toLowerCase() === '.ts';
        };

        TypeScriptEditorType.prototype.editDocument = function (docState) {
            var editor = new TypeScriptEditor(this._typescript.service, this._shared, docState);

            this._typescript.scripts[docState.fullPath()] = editor;

            return editor;
        };
        return TypeScriptEditorType;
    })();

    var TypeScriptEditor = (function (_super) {
        __extends(TypeScriptEditor, _super);
        function TypeScriptEditor(_typescript, shared, docState) {
            var _this = this;
            _super.call(this, shared, docState);
            this._typescript = _typescript;
            this.changes = [];
            this.cachedSnapshot = null;
            this._syntacticDiagnostics = [];
            this._semanticDiagnostics = [];
            this._updateDiagnosticsTimeout = -1;
            this._updateDiagnosticsClosure = function () {
                return _this._updateDiagnostics();
            };
            this._teapoErrorsGutterElement = null;
        }
        TypeScriptEditor.prototype.handleOpen = function () {
            this._updateGutter();

            if (this._updateDiagnosticsTimeout) {
                this._updateDiagnosticsTimeout = 0;
                this._triggerDiagnosticsUpdate();
            }
        };

        TypeScriptEditor.prototype.handleClose = function () {
            if (this._updateDiagnosticsTimeout) {
                if (this._updateDiagnosticsTimeout !== -1)
                    clearTimeout(this._updateDiagnosticsTimeout);

                this._updateDiagnosticsTimeout = -1;
            }
        };

        TypeScriptEditor.prototype.handleChange = function (change) {
            var doc = this.doc();
            var offset = doc.indexFromPos(change.from);
            var oldLength = this._totalLengthOfLines(change.removed);
            var newLength = this._totalLengthOfLines(change.text);

            var ch = new TypeScript.TextChangeRange(TypeScript.TextSpan.fromBounds(offset, offset + oldLength), newLength);

            this.changes.push(ch);

            this._triggerDiagnosticsUpdate();
        };

        TypeScriptEditor.prototype.handleLoad = function () {
            _super.prototype.handleLoad.call(this);

            this._updateDocDiagnostics();
        };

        TypeScriptEditor.prototype._triggerDiagnosticsUpdate = function () {
            if (this._updateDiagnosticsTimeout)
                clearTimeout(this._updateDiagnosticsTimeout);
            this._updateDiagnosticsTimeout = setTimeout(this._updateDiagnosticsClosure, TypeScriptEditor.updateDiagnosticsDelay);
        };

        TypeScriptEditor.prototype._updateDiagnostics = function () {
            this._updateDiagnosticsTimeout = 0;

            this._syntacticDiagnostics = this._typescript.getSyntacticDiagnostics(this.docState.fullPath());
            this._semanticDiagnostics = this._typescript.getSemanticDiagnostics(this.docState.fullPath());

            this._updateGutter();
            this._updateDocDiagnostics();
        };

        TypeScriptEditor.prototype._updateDocDiagnostics = function () {
            var doc = this.doc();

            if (this._syntacticDiagnostics) {
                for (var i = 0; i < this._syntacticDiagnostics.length; i++) {
                    this._markDocError(this._syntacticDiagnostics[i], 'teapo-syntax-error', doc);
                }
            }

            if (this._semanticDiagnostics) {
                for (var i = 0; i < this._semanticDiagnostics.length; i++) {
                    this._markDocError(this._semanticDiagnostics[i], 'teapo-semantic-error', doc);
                }
            }
        };

        TypeScriptEditor.prototype._markDocError = function (error, className, doc) {
            var from = { line: error.line(), ch: error.character() };
            var to = { line: error.line(), ch: from.ch + error.length() };

            doc.markText(from, to, {
                className: className,
                title: error.text()
            });
        };

        TypeScriptEditor.prototype._updateGutter = function () {
            var editor = this.editor();

            editor.clearGutter('teapo-errors');

            var gutterElement = this._getTeapoErrorsGutterElement();
            var gutterClassName = 'teapo-errors';
            if (this._syntacticDiagnostics && this._syntacticDiagnostics.length) {
                gutterClassName += ' teapo-errors-syntactic';

                for (var i = 0; i < this._syntacticDiagnostics.length; i++) {
                    this._markError(this._syntacticDiagnostics[i], 'teapo-gutter-syntax-error', editor);
                }
            }

            if (this._semanticDiagnostics && this._semanticDiagnostics.length) {
                gutterClassName += ' teapo-errors-semantic';

                for (var i = 0; i < this._semanticDiagnostics.length; i++) {
                    this._markError(this._semanticDiagnostics[i], 'teapo-gutter-semantic-error', editor);
                }
            }

            gutterElement.className = gutterClassName;
        };

        TypeScriptEditor.prototype._markError = function (error, className, editor) {
            var lineNumber = error.line();
            var errorElement = document.createElement('div');
            errorElement.className = className;
            errorElement.title = error.text();
            errorElement.onclick = function () {
                return alert(error.text() + '\nat ' + (lineNumber + 1) + ':' + (error.character() + 1) + '.');
            };

            editor.setGutterMarker(lineNumber, 'teapo-errors', errorElement);
            //doc.markText(from: { error.line
        };

        TypeScriptEditor.prototype._getTeapoErrorsGutterElement = function () {
            if (!this._teapoErrorsGutterElement)
                this._teapoErrorsGutterElement = this._findGutterElement('teapo-errors');

            return this._teapoErrorsGutterElement;
        };

        TypeScriptEditor.prototype._findGutterElement = function (className) {
            var gutterElement = this.editor().getGutterElement();

            for (var i = 0; i < gutterElement.children.length; i++) {
                var candidate = gutterElement.children[i];
                if (candidate.className && candidate.className.indexOf(className) >= 0)
                    return candidate;
            }

            return null;
        };

        TypeScriptEditor.prototype._totalLengthOfLines = function (lines) {
            var length = 0;
            for (var i = 0; i < lines.length; i++) {
                if (i > 0)
                    length++; // '\n'

                length += lines[i].length;
            }
            return length;
        };
        TypeScriptEditor.updateDiagnosticsDelay = 1000;
        return TypeScriptEditor;
    })(teapo.CodeMirrorEditor);

    (function (EditorType) {
        EditorType.TypeScript = new TypeScriptEditorType();
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
