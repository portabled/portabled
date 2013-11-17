/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='typings/codemirror.d.ts' />
var teapo;
(function (teapo) {
    var TypeScriptService = (function () {
        function TypeScriptService(staticScripts) {
            if (typeof staticScripts === "undefined") { staticScripts = {}; }
            this.logLevels = {
                information: true,
                debug: true,
                warning: true,
                error: true,
                fatal: true
            };
            this.compilationSettings = new TypeScript.CompilationSettings();
            this._scriptCache = {};
            this._staticScripts = {};
            if (staticScripts) {
                for (var s in staticScripts)
                    if (staticScripts.hasOwnProperty(s)) {
                        var script = TypeScript.ScriptSnapshot.fromString(staticScripts[s] + '');
                        this._staticScripts[s] = script;
                    }
            }

            var factory = new TypeScript.Services.TypeScriptServicesFactory();
            this.service = factory.createPullLanguageService(this._createLanguageServiceHost());
        }
        TypeScriptService.prototype.addDocument = function (fileName, doc) {
            var script = new DocumentState(doc);
            this._scriptCache[fileName] = script;
        };

        TypeScriptService.prototype.removeDocument = function (fileName) {
            delete this._scriptCache[fileName];
        };

        TypeScriptService.prototype._createLanguageServiceHost = function () {
            var _this = this;
            return {
                getCompilationSettings: function () {
                    return _this.compilationSettings;
                },
                getScriptFileNames: function () {
                    var result = Object.keys(_this._scriptCache);
                    for (var s in _this._staticScripts)
                        if (_this._staticScripts.hasOwnProperty(s)) {
                            if (!_this._scriptCache.hasOwnProperty(s))
                                result.push(s);
                        }

                    //console.log('...getScriptFileNames():',result);
                    return result;
                },
                getScriptVersion: function (fileName) {
                    var script = _this._scriptCache[fileName];
                    if (script)
                        return script.getVersion();
                    return -1;
                },
                getScriptIsOpen: function (fileName) {
                    return true;
                },
                getScriptByteOrderMark: function (fileName) {
                    return 0 /* None */;
                },
                getScriptSnapshot: function (fileName) {
                    var script = _this._scriptCache[fileName] || _this._staticScripts[fileName];
                    return script;
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
                    return _this._scriptCache[path] || _this._staticScripts[path] ? true : false;
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
        TypeScriptService._emptySnapshot = {
            getText: function (start, end) {
                return '';
            },
            getLength: function () {
                return 0;
            },
            getLineStartPositions: function () {
                return [];
            },
            getTextChangeRangeSinceVersion: function (scriptVersion) {
                return TypeScript.TextChangeRange.unchanged;
            }
        };
        return TypeScriptService;
    })();
    teapo.TypeScriptService = TypeScriptService;

    var DocumentState = (function () {
        function DocumentState(_doc) {
            var _this = this;
            this._doc = _doc;
            this._version = 0;
            this._changes = [];
            CodeMirror.on(this._doc, 'change', function (e, change) {
                return _this._onChange(change);
            });
        }
        /**
        * Not a part of IScriptSnapshot, unlike other public methods here.
        * Need to find out who's calling into this (and kill them, naturally).
        */
        DocumentState.prototype.getVersion = function () {
            // console.log('DocumentState.getVersion() // ',this._version);
            return this._version;
        };

        DocumentState.prototype.getText = function (start, end) {
            var text = this._getTextCore(start, end);
            var lead = start ? this._getTextCore(0, start) : '';
            var length = this._getLengthCore();
            var trail = length > end ? this._getTextCore(end, length) : '';

            // console.log('DocumentState.getText(',start,',',end,') // "'+lead+'['+text+']'+trail+'"');
            return text;
        };

        DocumentState.prototype._getTextCore = function (start, end) {
            var startPos = this._doc.posFromIndex(start);
            var endPos = this._doc.posFromIndex(end);
            var text = this._doc.getRange(startPos, endPos);
            return text;
        };

        DocumentState.prototype.getLength = function () {
            var length = this._getLengthCore();

            // console.log('DocumentState.getLength() // ',length);
            return length;
        };
        DocumentState.prototype._getLengthCore = function () {
            var lineCount = this._doc.lineCount();
            if (lineCount === 0)
                return 0;

            var lastLineStart = this._doc.indexFromPos({ line: lineCount - 1, ch: 0 });
            var lastLine = this._doc.getLine(lineCount - 1);
            var length = lastLineStart + lastLine.length;
            return length;
        };

        DocumentState.prototype.getLineStartPositions = function () {
            var result = [];
            var current = 0;
            this._doc.eachLine(function (lineHandle) {
                result.push(current);
                current += lineHandle.text.length + 1; // plus EOL character
            });
            return result;
        };

        DocumentState.prototype.getTextChangeRangeSinceVersion = function (scriptVersion) {
            var startVersion = this._version - this._changes.length;

            if (scriptVersion < startVersion) {
                var wholeText = this._doc.getValue();
                return new TypeScript.TextChangeRange(TypeScript.TextSpan.fromBounds(0, 0), wholeText.length);
            }

            var chunk;

            if (scriptVersion = startVersion)
                chunk = this._changes;
            else
                chunk = this._changes.slice(scriptVersion - startVersion);

            //this._changes.length = 0;
            var result = TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(this._changes);
            return result;
        };

        DocumentState.prototype._onChange = function (change) {
            var offset = this._doc.indexFromPos(change.from);
            var oldLength = this._totalLengthOfLines(change.removed);
            var newLength = this._totalLengthOfLines(change.text);

            var ch = new TypeScript.TextChangeRange(TypeScript.TextSpan.fromBounds(offset, offset + oldLength), newLength);

            this._changes.push(ch);

            this._version++;
        };

        DocumentState.prototype._totalLengthOfLines = function (lines) {
            var length = 0;
            for (var i = 0; i < lines.length; i++) {
                if (i > 0)
                    length++; // '\n'

                length += lines[i].length;
            }
            return length;
        };
        return DocumentState;
    })();
})(teapo || (teapo = {}));
/// <reference path='typings/knockout.d.ts' />
/// <reference path='Document.ts' />
var teapo;
(function (teapo) {
    var Folder = (function () {
        function Folder(name, parent) {
            this.name = name;
            this.parent = parent;
            this.folders = ko.observableArray();
            this.files = ko.observableArray();
            this.expanded = ko.observable(true);
            this.containsActiveDocument = ko.observable(false);
            this.onselectFile = null;
            this.onunselectFile = null;
            this.ondeleteFile = null;
            this.fullPath = (parent ? parent.fullPath : '/') + (name ? name + '/' : '');
            this.nestLevel = parent ? parent.nestLevel + 1 : 0;
        }
        Folder.prototype.getDocument = function (path) {
            if (!path)
                return null;

            var parts = this._normalizePath(path);
            if (parts.lead) {
                var index = this._indexOfEntry(this.folders(), parts.lead);
                var subfolder = this.folders()[index];
                if (!subfolder || subfolder.name !== parts.lead) {
                    subfolder = new teapo.Folder(parts.lead, this);
                    this.folders.splice(index, 0, subfolder);
                }
                return subfolder.getDocument(parts.tail);
            } else {
                var index = this._indexOfEntry(this.folders(), parts.tail);
                var folderInTheWay = this.folders()[index];
                if (folderInTheWay && folderInTheWay.name === parts.tail)
                    throw new Error('Cannot retrieve file "' + path + '", "' + folderInTheWay.name + '" in the way.');

                var index = this._indexOfEntry(this.files(), parts.tail);
                var file = this.files()[index];
                if (!file || file.name !== parts.tail) {
                    file = new teapo.Document(parts.tail, this);
                    this.files.splice(index, 0, file);
                }
                return file;
            }
        };

        Folder.prototype.getFolder = function (path) {
            if (!path)
                return null;

            var parts = this._normalizePath(path);

            var subfolderName = parts.lead || parts.tail;
            var index = this._indexOfEntry(this.folders(), subfolderName);
            var subfolder = this.folders()[index];
            if (!subfolder || subfolder.name !== subfolderName) {
                subfolder = new teapo.Folder(subfolderName, this);
                this.folders.splice(index, 0, subfolder);
            }

            if (parts.lead)
                return subfolder.getFolder(parts.tail);
            else
                return subfolder;
        };

        Folder.prototype.removeDocument = function (path) {
            if (!path)
                return null;

            var parts = this._normalizePath(path);
            if (parts.lead) {
                var index = this._indexOfEntry(this.folders(), parts.lead);
                var subfolder = this.folders()[index];
                if (!subfolder || subfolder.name !== parts.lead)
                    return null;
            } else {
                var index = this._indexOfEntry(this.files(), parts.tail);
                var file = this.files()[index];
                if (!file || file.name !== parts.tail)
                    return null;

                this.files.splice(index, 1);
                file.parent = null;

                return file;
            }
        };

        Folder.prototype.removeFolder = function (path) {
            if (!path)
                return null;

            var parts = this._normalizePath(path);

            var subfolderName = parts.lead || parts.tail;
            var index = this._indexOfEntry(this.folders(), subfolderName);
            var subfolder = this.folders()[index];
            if (!subfolder || subfolder.name !== subfolderName)
                return null;

            if (parts.lead)
                return subfolder.removeFolder(parts.tail);

            this.folders.splice(index, 1);
            subfolder.parent = null;
            return subfolder;
        };

        Folder.prototype._normalizePath = function (path) {
            while (path[0] === '/')
                path = path.slice(1);
            while (path[path.length - 1] === '/')
                path = path.slice(0, path.length - 1);
            var slashPos = path.indexOf('/');
            if (slashPos < 0)
                return { lead: null, tail: path };
            else
                return { lead: path.slice(0, slashPos), tail: path.slice(slashPos + 1) };
        };

        Folder.prototype._indexOfEntry = function (list, name) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].name >= name)
                    return i;
            }
            return list.length;
        };
        return Folder;
    })();
    teapo.Folder = Folder;
})(teapo || (teapo = {}));
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />
var teapo;
(function (teapo) {
    teapo.completionDelayMsec = 200;
    teapo.maxCompletions = 24;

    function detectDocumentMode(fullPath) {
        switch (getFileExtensionLowerCase(fullPath)) {
            case '.ts':
                return 'text/typescript';
            case '.html':
            case '.htm':
                return 'text/html';
            case '.css':
                return 'text/css';
            case '.xml':
                return 'text/xml';
            case '.js':
                return 'text/javascript';
            default:
                return null;
        }
    }
    teapo.detectDocumentMode = detectDocumentMode;

    function getFileExtensionLowerCase(fullPath) {
        if (!fullPath)
            return '';
        var dotPos = fullPath.lastIndexOf('.');
        if (dotPos < 0)
            return '';
        var ext = fullPath.slice(dotPos);
        return ext.toLowerCase();
    }

    var TypeScriptDocumentMode = (function () {
        function TypeScriptDocumentMode(_typescript) {
            var _this = this;
            this._typescript = _typescript;
            this._cookie = 0;
            this._completionTimeout = 0;
            this._completionActive = false;
            this._keymap = null;
            this._activeFullPath = null;
            this.mode = 'text/typescript';
            this._keymap = {
                'Ctrl-Space': function (cm) {
                    return _this._ctrlSpace(cm);
                },
                'Cmd-Space': function (cm) {
                    return _this._ctrlSpace(cm);
                }
            };
        }
        TypeScriptDocumentMode.prototype.activateEditor = function (editor, fullPath) {
            var _this = this;
            this._activeFullPath = fullPath;
            this._completionActive = false;
            var onchange = function (instance, change) {
                return _this._triggerCompletion(editor, fullPath, false);
            };
            editor.on('change', onchange);
            editor.addKeyMap(this._keymap);
            return {
                dispose: function () {
                    editor.off('change', onchange);
                    _this._completionActive = false;
                    _this._activeFullPath = null;
                    editor.removeKeyMap(_this._keymap);
                }
            };
        };

        TypeScriptDocumentMode.prototype._ctrlSpace = function (editor) {
            this._triggerCompletion(editor, this._activeFullPath, true);
        };

        TypeScriptDocumentMode.prototype._triggerCompletion = function (editor, fullPath, force) {
            var _this = this;
            if (this._completionActive)
                return;

            var delay = force ? 1 : teapo.completionDelayMsec;

            this._cookie++;
            var triggerCookie = this._cookie;
            if (this._completionTimeout)
                clearTimeout(this._completionTimeout);

            this._completionTimeout = setTimeout(function () {
                clearTimeout(_this._completionTimeout);
                if (_this._completionActive || triggerCookie !== _this._cookie)
                    return;
                _this._startCompletion(editor, fullPath, force);
            }, delay);
        };

        TypeScriptDocumentMode.prototype._startCompletion = function (editor, fullPath, force) {
            var _this = this;
            if (!force) {
                var nh = this._getNeighborhood(editor);
                if (nh.leadLength === 0 && nh.trailLength === 0 && nh.prefixChar !== '.')
                    return;
            }

            CodeMirror.showHint(editor, function () {
                return _this._continueCompletion(editor, fullPath, force);
            }, { completeSingle: false });
        };

        TypeScriptDocumentMode.prototype._continueCompletion = function (editor, fullPath, force) {
            var _this = this;
            var nh = this._getNeighborhood(editor);

            var completions = this._typescript.getCompletionsAtPosition(fullPath, nh.offset, false);

            var from = {
                line: nh.pos.line,
                ch: nh.pos.ch - nh.leadLength
            };
            var to = {
                line: nh.pos.line,
                ch: nh.pos.ch + nh.trailLength
            };
            var leadLower = nh.line.slice(from.ch, nh.pos.ch).toLowerCase();
            var leadFirstChar = leadLower[0];
            var filteredList = (completions ? completions.entries : []).filter(function (e) {
                if (leadLower.length === 0)
                    return true;
                if (!e.name)
                    return false;
                if (e.name.length < leadLower.length)
                    return false;
                if (e.name[0].toLowerCase() !== leadFirstChar)
                    return false;
                if (e.name.slice(0, leadLower.length).toLowerCase() !== leadLower)
                    return false;
                return true;
            });
            if (filteredList.length > teapo.maxCompletions)
                filteredList.length = teapo.maxCompletions;
            var list = filteredList.map(function (e) {
                return e.name;
            });
            if (list.length) {
                if (!this._completionActive) {
                    // only set active when we have a completion
                    var onendcompletion = function () {
                        CodeMirror.off(editor, 'endCompletion', onendcompletion);
                        setTimeout(function () {
                            return _this._completionActive = false;
                        }, 1);
                    };
                    CodeMirror.on(editor, 'endCompletion', onendcompletion);
                    this._completionActive = true;
                }
            }

            return {
                list: list,
                from: from,
                to: to
            };
        };

        TypeScriptDocumentMode.prototype._isWordChar = function (ch) {
            if (ch.toLowerCase() !== ch.toUpperCase())
                return true;
            else if (ch === '_' || ch === '$')
                return true;
            else if (ch >= '0' && ch <= '9')
                return true;
            else
                return false;
        };

        TypeScriptDocumentMode.prototype._getNeighborhood = function (editor) {
            var doc = editor.getDoc();
            var pos = doc.getCursor();
            var offset = doc.indexFromPos(pos);
            var line = doc.getLine(pos.line);

            var leadLength = 0;
            var prefixChar = '';
            var whitespace = false;
            for (var i = pos.ch - 1; i >= 0; i--) {
                var ch = line[i];
                if (!whitespace && this._isWordChar(ch)) {
                    leadLength++;
                    continue;
                }

                whitespace = /\s/.test(ch);
                if (!whitespace) {
                    prefixChar = ch;
                    break;
                }
            }

            var trailLength = 0;
            var suffixChar = '';
            whitespace = false;
            for (var i = pos.ch; i < line.length; i++) {
                var ch = line[i];
                if (!whitespace && this._isWordChar(ch)) {
                    leadLength++;
                    continue;
                }

                whitespace = /\s/.test(ch);
                if (!whitespace) {
                    suffixChar = ch;
                    break;
                }
            }

            return {
                pos: pos,
                offset: offset,
                line: line,
                leadLength: leadLength,
                prefixChar: prefixChar,
                trailLength: trailLength,
                suffixChar: suffixChar
            };
        };
        return TypeScriptDocumentMode;
    })();
    teapo.TypeScriptDocumentMode = TypeScriptDocumentMode;

    var JavaScriptDocumentMode = (function () {
        function JavaScriptDocumentMode() {
            this.mode = 'text/html';
        }
        JavaScriptDocumentMode.prototype.activateEditor = function (editor, fullPath) {
            return null;
        };
        return JavaScriptDocumentMode;
    })();
    teapo.JavaScriptDocumentMode = JavaScriptDocumentMode;

    var XmlDocumentMode = (function () {
        function XmlDocumentMode() {
            this.mode = 'text/html';
        }
        XmlDocumentMode.prototype.activateEditor = function (editor, fullPath) {
            return null;
        };
        return XmlDocumentMode;
    })();
    teapo.XmlDocumentMode = XmlDocumentMode;

    var HtmlDocumentMode = (function () {
        function HtmlDocumentMode() {
            this.mode = 'text/html';
        }
        HtmlDocumentMode.prototype.activateEditor = function (editor, fullPath) {
            return null;
        };
        return HtmlDocumentMode;
    })();
    teapo.HtmlDocumentMode = HtmlDocumentMode;

    var CssDocumentMode = (function () {
        function CssDocumentMode() {
            this.mode = 'text/html';
        }
        CssDocumentMode.prototype.activateEditor = function (editor, fullPath) {
            return null;
        };
        return CssDocumentMode;
    })();
    teapo.CssDocumentMode = CssDocumentMode;
})(teapo || (teapo = {}));
/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='Folder.ts' />
/// <reference path='modes.ts' />
var teapo;
(function (teapo) {
    var Document = (function () {
        function Document(name, parent) {
            this.name = name;
            this.parent = parent;
            this.fullPath = null;
            this.doc = null;
            this.mode = null;
            this.active = ko.observable(false);
            this.onselect = null;
            this.onunselect = null;
            this._persistElement = null;
            this.fullPath = (parent ? parent.fullPath : '/') + name;
            this.mode = teapo.detectDocumentMode(this.fullPath);
            this.doc = new CodeMirror.Doc('', this.mode);
        }
        Document.prototype.select = function (self, e) {
            if (e) {
                e.handled = true;
                if (e.preventDefault)
                    e.preventDefault();
            }

            this.active(true);
            if (this.parent)
                this._setContainsActiveDocument(this.parent, null);

            if (this.onselect)
                this.onselect();
        };

        Document.prototype.delete = function () {
            var p = this.parent;
            while (p) {
                if (p.ondeleteFile)
                    p.ondeleteFile(this);
                p = p.parent;
            }
        };

        Document.prototype.unselect = function () {
            this.active(false);

            if (this.onunselect)
                this.onunselect();
        };

        Document.prototype._setContainsActiveDocument = function (folder, activeSubfolder) {
            var currentMark = folder.containsActiveDocument();
            folder.containsActiveDocument(true);
            if (folder.onselectFile)
                folder.onselectFile(this);

            var files = folder.files();
            for (var i = 0; i < files.length; i++) {
                if (files[i] !== this && files[i].active())
                    files[i].unselect();
            }

            var folders = folder.folders();
            for (var i = 0; i < folders.length; i++) {
                if (folders[i] !== activeSubfolder && folders[i].containsActiveDocument()) {
                    this._resetContainsActiveDocument(folders[i]);
                }
            }

            if (folder.parent)
                this._setContainsActiveDocument(folder.parent, folder);
        };

        Document.prototype._resetContainsActiveDocument = function (folder) {
            folder.containsActiveDocument(false);
            if (folder.onunselectFile)
                folder.onunselectFile();

            var files = folder.files();
            for (var i = 0; i < files.length; i++) {
                if (files[i].active())
                    files[i].unselect();
            }

            var folders = folder.folders();
            for (var i = 0; i < folders.length; i++) {
                if (folders[i].containsActiveDocument()) {
                    this._resetContainsActiveDocument(folders[i]);
                }
            }
        };
        return Document;
    })();
    teapo.Document = Document;
})(teapo || (teapo = {}));
/// <reference path='typings/codemirror.d.ts' />
var teapo;
(function (teapo) {
    function getDocumentStoreUniqueKey(w) {
        if (typeof w === "undefined") { w = window; }
        var url = w.location + '';
        var posHash = url.indexOf('#');
        if (posHash >= 0)
            url = url.slice(0, posHash);
        return url;
    }
    teapo.getDocumentStoreUniqueKey = getDocumentStoreUniqueKey;

    function appendScriptElement(id, d) {
        if (typeof d === "undefined") { d = document; }
        var element = document.createElement('script');
        element.setAttribute('type', 'text/data');
        element.id = id;
        document.head.appendChild(element);
        return element;
    }
    teapo.appendScriptElement = appendScriptElement;

    var ScriptElementStore = (function () {
        function ScriptElementStore(_document) {
            if (typeof _document === "undefined") { _document = document; }
            this._document = _document;
            this._changeDate = null;
            this._changeDateElement = null;
            this._documentElements = {};
            this._staticDocuments = {};
            for (var i = 0; i < this._document.scripts.length; i++) {
                var s = this._document.scripts[i];
                if (!s.id)
                    continue;

                if (s.id.charAt(0) === '/') {
                    this._documentElements[s.id] = s;
                } else if (s.id === 'changeDate') {
                    this._changeDateElement = s;
                    try  {
                        this._changeDate = new Date(s.innerHTML);
                    } catch (e) {
                    }
                } else if (s.id.charAt(0) === '#') {
                    this._staticDocuments[s.id] = s.innerHTML;
                }
            }
        }
        ScriptElementStore.prototype.changeDate = function () {
            return this._changeDate;
        };

        ScriptElementStore.prototype.documentNames = function () {
            return Object.keys(this._documentElements);
        };

        ScriptElementStore.prototype.loadDocument = function (name) {
            var element = this._documentElements[name];
            if (!element)
                return null;
            var result = {
                history: element.getAttribute('history'),
                content: element.innerHTML
            };
            return result;
        };

        ScriptElementStore.prototype.saveDocument = function (name, history, content) {
            var element = this._documentElements[name];
            if (!element) {
                element = appendScriptElement(name);
                this._documentElements[name] = element;
            }

            element.setAttribute('history', history);
            element.innerHTML = content;

            this._updateChangeDate();
        };

        ScriptElementStore.prototype.deleteDocument = function (name) {
            var element = this._documentElements[name];
            if (!element)
                return;

            document.head.removeChild(element);
            delete this._documentElements[name];

            this._updateChangeDate();
        };

        ScriptElementStore.prototype.staticDocumentNames = function () {
            return Object.keys(this._staticDocuments);
        };

        ScriptElementStore.prototype.readStaticDocument = function (name) {
            return this._staticDocuments[name];
        };

        ScriptElementStore.prototype._updateChangeDate = function () {
            if (!this._changeDateElement) {
                this._changeDateElement = appendScriptElement('changeDate');
            }
            this._changeDateElement.innerHTML = new Date().toUTCString();
        };
        return ScriptElementStore;
    })();
    teapo.ScriptElementStore = ScriptElementStore;

    var LocalStorageStore = (function () {
        function LocalStorageStore(_baseStore, _uniqueKey, _localStorage) {
            if (typeof _uniqueKey === "undefined") { _uniqueKey = getDocumentStoreUniqueKey(); }
            if (typeof _localStorage === "undefined") { _localStorage = localStorage; }
            this._baseStore = _baseStore;
            this._uniqueKey = _uniqueKey;
            this._localStorage = _localStorage;
        }
        LocalStorageStore.prototype.changeDate = function () {
            var str = this._localStorage[this._uniqueKey + 'changeDate'];
            if (!str)
                return this._baseStore.changeDate();
            try  {
                return new Date(str);
            } catch (e) {
                return this._baseStore.changeDate();
            }
        };

        LocalStorageStore.prototype.documentNames = function () {
            var filesStr = this._localStorage[this._uniqueKey + '*files'];
            if (!filesStr)
                return this._baseStore.documentNames();
            try  {
                return JSON.parse(filesStr);
            } catch (ignoreJsonErrors) {
                return this._baseStore.documentNames();
            }
        };

        LocalStorageStore.prototype.loadDocument = function (name) {
            var strContent = this._localStorage[this._uniqueKey + name];
            if (strContent !== '' && !strContent)
                return this._fallbackLoadDocument(name);
            var strHistory = this._localStorage[this._uniqueKey + name + '*history'];
            return {
                history: strHistory,
                content: strContent
            };
        };

        LocalStorageStore.prototype._fallbackLoadDocument = function (name) {
            var files = this.documentNames();
            for (var i = 0; i < files.length; i++) {
                if (files[i] === name)
                    return this._baseStore.loadDocument(name);
            }
            return null;
        };

        LocalStorageStore.prototype.saveDocument = function (name, history, content) {
            var previousContent = this._localStorage[this._uniqueKey + name];
            this._localStorage[this._uniqueKey + name] = content;
            this._localStorage[this._uniqueKey + name + '*history'] = history;
            this._localStorage[this._uniqueKey + '*changeDate'] = new Date().toUTCString();
            if (typeof previousContent !== 'string') {
                var files = this.documentNames();
                files.push(name);
                this._localStorage[this._uniqueKey + '*files'] = files;
            }
        };

        LocalStorageStore.prototype.deleteDocument = function (name) {
            var mangled = this._uniqueKey + name;
            if (!this._localStorage[mangled])
                return;

            delete this._localStorage[mangled];
            this._localStorage[this._uniqueKey + 'changeDate'] = new Date().toUTCString();
        };
        return LocalStorageStore;
    })();
    teapo.LocalStorageStore = LocalStorageStore;
})(teapo || (teapo = {}));
/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='TypeScriptService.ts' />
/// <reference path='Document.ts' />
/// <reference path='Folder.ts' />
/// <reference path='DocumentPersistence.ts' />
/// <reference path='modes.ts' />
var teapo;
(function (teapo) {
    var ApplicationViewModel = (function () {
        function ApplicationViewModel(_document) {
            if (typeof _document === "undefined") { _document = document; }
            var _this = this;
            this._document = _document;
            this.activeDocument = ko.observable();
            this.root = new teapo.Folder(null, null);
            this._typescript = null;
            this._editor = null;
            this._textarea = null;
            this._tsMode = null;
            this._disposeMode = null;
            this._htmlStore = new teapo.ScriptElementStore();
            this._lsStore = null;
            this._changedFilesToSave = {};
            this._fileChangeTimeout = null;
            this._lsStore = new teapo.LocalStorageStore(this._htmlStore);

            var staticScripts = {};
            var htmlStaticScriptNames = this._htmlStore.staticDocumentNames();
            for (var i = 0; i < htmlStaticScriptNames.length; i++) {
                staticScripts[htmlStaticScriptNames[i]] = this._htmlStore.readStaticDocument(htmlStaticScriptNames[i]);
            }

            this._typescript = new teapo.TypeScriptService(staticScripts);

            var fileList = this._lsStore.documentNames();
            for (var i = 0; i < fileList.length; i++) {
                var doc = this._lsStore.loadDocument(fileList[i]);
                this._addDocument(fileList[i], doc);
            }

            this.root.onselectFile = function (f) {
                return _this._selectFile(f);
            };
            this.root.ondeleteFile = function (f) {
                return _this._deleteFile(f);
            };

            this._tsMode = new teapo.TypeScriptDocumentMode(this._typescript.service);
        }
        ApplicationViewModel.prototype.newFile = function () {
            var newPath = prompt('Full path:');
            if (!newPath)
                return;
            var f = this.root.getDocument(newPath);
            this._fileChange(f.fullPath, f.doc);
            this._selectFile(f);
        };

        ApplicationViewModel.prototype.deleteActiveFile = function () {
            if (!confirm('Are you sure to delete ' + this.activeDocument().fullPath + ' ?'))
                return;
            this.root.removeDocument(this.activeDocument().fullPath);
            this.activeDocument(null);
            // TODO: propagate no-active-document state to all the folders down
            // TODO: remove from TypeScript too
        };

        ApplicationViewModel.prototype._addDocument = function (file, doc) {
            var _this = this;
            var f = this.root.getDocument(file);
            f.doc.setValue(doc.content);
            if (doc.history) {
                try  {
                    var h = JSON.parse(doc.history);
                    f.doc.setHistory(h);
                } catch (e) {
                }
            }
            this._typescript.addDocument(file, f.doc);

            CodeMirror.on(f.doc, 'change', function (instance, change) {
                _this._fileChange(file, f.doc);
            });
        };

        ApplicationViewModel.prototype._fileChange = function (file, doc) {
            var _this = this;
            this._changedFilesToSave[file] = doc;
            if (this._fileChangeTimeout)
                clearTimeout(this._fileChangeTimeout);
            this._fileChangeTimeout = setTimeout(function () {
                return _this._saveChangedFiles();
            }, 600);
        };

        ApplicationViewModel.prototype._saveChangedFiles = function () {
            for (var f in this._changedFilesToSave)
                if (this._changedFilesToSave.hasOwnProperty(f)) {
                    var doc = this._changedFilesToSave[f];
                    var hi = doc.getHistory();
                    var hiStr = JSON.stringify(hi);
                    var contentStr = doc.getValue();
                    this._htmlStore.saveDocument(f, hiStr, contentStr);
                    this._lsStore.saveDocument(f, hiStr, contentStr);
                }
            this._changedFilesToSave = {};
        };

        ApplicationViewModel.prototype._selectFile = function (file) {
            this.activeDocument(file);

            this._editor.swapDoc(file.doc);
            this._editor.focus();

            if (this._disposeMode) {
                this._disposeMode.dispose();
                this._disposeMode = null;
            }
            if (teapo.detectDocumentMode(file.fullPath) === 'text/typescript') {
                this._disposeMode = this._tsMode.activateEditor(this._editor, file.fullPath);
            }
        };

        ApplicationViewModel.prototype._deleteFile = function (file) {
        };

        ApplicationViewModel.prototype.attachTextarea = function (textarea) {
            this._textarea = textarea;
            this._editor = CodeMirror.fromTextArea(textarea, {
                lineNumbers: true,
                matchBrackets: true,
                autoCloseBrackets: true,
                matchTags: true,
                showTrailingSpace: true,
                autoCloseTags: true,
                styleActiveLine: true
            });
        };
        return ApplicationViewModel;
    })();
    teapo.ApplicationViewModel = ApplicationViewModel;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    function cleanContent(element) {
        if (element.tagName.toLowerCase() === 'body') {
            cleanBodyContent(element);
            return;
        }

        if ('innerHTML' in element)
            element.innerHTML = '';
        else if ('textContent' in element)
            element.textContent = '';
        else if ('innerText' in element)
            element.innerText = '';
    }
    teapo.cleanContent = cleanContent;

    function cleanBodyContent(body) {
        var children = [];
        for (var i = 0; i < document.body.children.length; i++) {
            children[i] = document.body.children[i];
        }
        for (var i = 0; i < children.length; i++) {
            if (children[i].tagName.toLowerCase() === 'script')
                continue;
            document.body.removeChild(children[i]);
        }
    }
})(teapo || (teapo = {}));
/// <reference path='typings/knockout.d.ts' />
/// <reference path='layout.ts' />
var teapo;
(function (teapo) {
    function registerKnockoutBindings(ko) {
        ko.bindingHandlers.child = {
            update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
                teapo.cleanContent(element);
                var value = valueAccessor();
                if (value.childNodes) {
                    element.appendChild(value);
                } else if (element !== null && typeof element !== 'undefined') {
                    if ('textContent' in element)
                        element.textContent = value;
                    else if ('innerText' in element)
                        element.innerText = value;
                }
            }
        };

        ko.bindingHandlers.codemirror = {
            init: function (element, valueAccessor) {
                if (!element)
                    return;

                var codemirror;
                if (element.tagName.toLowerCase() === 'textarea') {
                    codemirror = CodeMirror.fromTextArea(element);
                } else {
                    codemirror = CodeMirror(element);
                }

                var observable = valueAccessor();
                if (observable)
                    observable(codemirror);
            }
        };

        ko.bindingHandlers.attach = {
            update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
                valueAccessor();
            }
        };
    }
    teapo.registerKnockoutBindings = registerKnockoutBindings;
})(teapo || (teapo = {}));
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='ApplicationViewModel.ts' />
/// <reference path='KnockoutBindings.ts' />
window.onload = function () {
    teapo.registerKnockoutBindings(ko);

    var viewModel = new teapo.ApplicationViewModel();

    ko.renderTemplate('bodyTemplate', viewModel, null, document.body);
};
//# sourceMappingURL=teapo.js.map
