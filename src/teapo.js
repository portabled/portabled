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
        TypeScriptService.prototype.addDocument = function (d) {
            var script = new DocumentState(d);
            this._scriptCache[d.fullPath] = script;
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
        function DocumentState(_d) {
            var _this = this;
            this._d = _d;
            this._version = 0;
            this._changes = [];
            this._simpleText = null;
            CodeMirror.on(this._d.getDoc(), 'change', function (e, change) {
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
            var doc = this._d.getDoc();
            var startPos = doc.posFromIndex(start);
            var lead = start ? this._getTextCore(start - startPos.ch, start) : '';
            var endPos = doc.posFromIndex(end);
            var line = doc.getLine(endPos.line);
            var trail = endPos.ch < line.length ? this._getTextCore(end, end + line.length - endPos.ch) : '';
            var textSmall = text;
            if (textSmall.length > 40)
                textSmall = textSmall.slice(0, 17) + '...' + (text.length) + '...' + textSmall.slice(textSmall.length - 17);
            if (textSmall.indexOf('\n') >= 0)
                textSmall = textSmall.replace(/\n/g, '\\n');
            console.log('DocumentState.getText(', start, ',', end, ') // [' + startPos.line + '] "' + lead + '[' + textSmall + ']' + trail + '"');
            return text;
        };

        DocumentState.prototype._getTextCore = function (start, end) {
            if (this._version === 0)
                return this._getTextWhenNoChanges(start, end);

            var doc = this._d.getDoc();
            var startPos = doc.posFromIndex(start);
            var endPos = doc.posFromIndex(end);
            var text = doc.getRange(startPos, endPos);
            return text;
        };

        DocumentState.prototype._getTextWhenNoChanges = function (start, end) {
            if (this._simpleText === null) {
                this._simpleText = this._d.getDoc().getValue();
            }
            return this._simpleText.slice(start, end);
        };

        DocumentState.prototype.getLength = function () {
            var length = this._getLengthCore();

            // console.log('DocumentState.getLength() // ',length);
            return length;
        };

        DocumentState.prototype._getLengthCore = function () {
            var doc = this._d.getDoc();
            var lineCount = doc.lineCount();
            if (lineCount === 0)
                return 0;

            var lastLineStart = doc.indexFromPos({ line: lineCount - 1, ch: 0 });
            var lastLine = doc.getLine(lineCount - 1);
            var length = lastLineStart + lastLine.length;
            return length;
        };

        DocumentState.prototype.getLineStartPositions = function () {
            var result = [];
            var current = 0;
            var doc = this._d.getDoc();
            doc.eachLine(function (lineHandle) {
                result.push(current);
                current += lineHandle.text.length + 1; // plus EOL character
            });
            return result;
        };

        DocumentState.prototype.getTextChangeRangeSinceVersion = function (scriptVersion) {
            var startVersion = this._version - this._changes.length;

            var doc = this._d.getDoc();

            if (scriptVersion < startVersion) {
                var wholeText = doc.getValue();
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
            var doc = this._d.getDoc();
            var offset = doc.indexFromPos(change.from);
            var oldLength = this._totalLengthOfLines(change.removed);
            var newLength = this._totalLengthOfLines(change.text);

            var ch = new TypeScript.TextChangeRange(TypeScript.TextSpan.fromBounds(offset, offset + oldLength), newLength);

            this._changes.push(ch);

            this._version++;
            this._simpleText = null;
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
    teapo.cursorTimeout = 700;
    teapo.diagnosticsTimeout = 1000;

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
            this._statusText = null;
            this._cursorTimeout = 0;
            this._diagnosticsTimeout = 0;
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
        TypeScriptDocumentMode.prototype.activateEditor = function (editor, fullPath, statusText) {
            var _this = this;
            this._statusText = statusText;
            this._activeFullPath = fullPath;
            this._completionActive = false;
            var onchange = function (instance, change) {
                return _this._onchange(editor, fullPath);
            };
            editor.on('change', onchange);
            var oncursoractivity = function (instance) {
                return _this._cursorActivity(editor, fullPath);
            };
            editor.on('cursorActivity', oncursoractivity);
            editor.addKeyMap(this._keymap);
            this._triggerDiagnostics(editor, fullPath);
            this._cursorActivity(editor, fullPath);
            return {
                dispose: function () {
                    editor.off('change', onchange);
                    editor.off('cursorActivity', oncursoractivity);
                    _this._completionActive = false;
                    if (_this._completionTimeout)
                        clearTimeout(_this._completionTimeout);
                    if (_this._cursorTimeout)
                        clearTimeout(_this._cursorTimeout);
                    if (_this._diagnosticsTimeout)
                        clearTimeout(_this._diagnosticsTimeout);
                    _this._activeFullPath = null;
                    editor.removeKeyMap(_this._keymap);
                    _this._clearGutterMarkers(editor);
                }
            };
        };

        TypeScriptDocumentMode.prototype._clearGutterMarkers = function (editor) {
            editor.clearGutter('teapo-errors');
        };

        TypeScriptDocumentMode.prototype._cursorActivity = function (editor, fullPath) {
            var _this = this;
            if (this._cursorTimeout)
                clearTimeout(this._cursorTimeout);
            this._cursorTimeout = setTimeout(function () {
                return _this._updateCursor(editor, fullPath);
            }, teapo.cursorTimeout);
        };

        TypeScriptDocumentMode.prototype._updateCursor = function (editor, fullPath) {
            var doc = editor.getDoc();
            var pos = doc.getCursor();
            var offset = doc.indexFromPos(pos);
            var str = pos.line + ':' + pos.ch;
            try  {
                var definitions = this._typescript.getDefinitionAtPosition(fullPath, offset);
            } catch (e) {
                str += ' ' + e.message;
            }
            if (definitions && definitions.length > 0) {
                var def = definitions[0];
                str += ' ' + (def.containerName ? def.containerName + '.' : '') + def.name + ' defined in ' + def.fileName;
            }
            this._statusText(str);
        };

        TypeScriptDocumentMode.prototype._ctrlSpace = function (editor) {
            this._triggerCompletion(editor, this._activeFullPath, true);
        };

        TypeScriptDocumentMode.prototype._onchange = function (editor, fullPath) {
            this._triggerCompletion(editor, fullPath, false);
            this._triggerDiagnostics(editor, fullPath);
        };

        TypeScriptDocumentMode.prototype._triggerDiagnostics = function (editor, fullPath) {
            var _this = this;
            if (this._diagnosticsTimeout)
                clearTimeout(this._diagnosticsTimeout);
            this._diagnosticsTimeout = setTimeout(function () {
                return _this._requestDiagnostics(editor, fullPath);
            }, teapo.diagnosticsTimeout);
        };

        TypeScriptDocumentMode.prototype._requestDiagnostics = function (editor, fullPath) {
            var doc = editor.getDoc();
            var pos = doc.getCursor();
            var offset = doc.indexFromPos(pos);
            var existingMarks = doc.getAllMarks();
            if (existingMarks) {
                for (var i = 0; i < existingMarks.length; i++) {
                    existingMarks[i].clear();
                }
            }
            this._clearGutterMarkers(editor);
            var any = false;
            try  {
                var diag = this._typescript.getSyntacticDiagnostics(fullPath);
            } catch (e) {
            }
            if (diag) {
                for (var i = 0; i < diag.length; i++) {
                    this._addErrorMark(i, diag[i], editor, doc, fullPath, 'teapo-syntax-error');
                    any = true;
                }
            }
            var key = i;
            try  {
                diag = this._typescript.getSemanticDiagnostics(fullPath);
            } catch (e) {
            }
            if (diag) {
                for (var i = 0; i < diag.length; i++) {
                    this._addErrorMark(key + i, diag[i], editor, doc, fullPath, 'teapo-semantic-error');
                    any = true;
                }
            }

            var teapoErrorGutter = null;
            var gutterContainer = editor.getGutterElement();
            for (var i = 0; i < gutterContainer.childNodes.length; i++) {
                var e = gutterContainer.childNodes.item(i);
                if (e.className && e.className.indexOf('teapo-errors') >= 0) {
                    teapoErrorGutter = e;
                    break;
                }
            }
            if (teapoErrorGutter) {
                teapoErrorGutter.style.background = any ? 'tomato' : null;
            }
        };

        TypeScriptDocumentMode.prototype._addErrorMark = function (index, d, editor, doc, fullPath, className) {
            if (d.fileName() !== fullPath)
                return;
            var start = { line: d.line(), ch: d.character() };
            var end = { line: start.line, ch: start.ch + d.length() };
            var m = doc.markText(start, end, {
                className: className,
                title: d.text()
            });
            var b = document.createElement('div');
            b.style.width = '10px';
            b.style.height = '10px';
            b.style.background = 'black';
            b.title = d.text();
            editor.setGutterMarker(d.line(), 'teapo-errors', b);
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
                if (nh.leadLength === 0 && nh.tailLength === 0 && nh.prefixChar !== '.')
                    return;
            }

            CodeMirror.showHint(editor, function () {
                return _this._continueCompletion(editor, fullPath, force);
            }, { completeSingle: false });
        };

        TypeScriptDocumentMode.prototype._continueCompletion = function (editor, fullPath, force) {
            var _this = this;
            var nh = this._getNeighborhood(editor);

            try  {
                var completions = this._typescript.getCompletionsAtPosition(fullPath, nh.offset, false);
            } catch (e) {
                console.log(e);
            }

            var from = {
                line: nh.pos.line,
                ch: nh.pos.ch - nh.leadLength
            };
            var to = {
                line: nh.pos.line,
                ch: nh.pos.ch + nh.tailLength
            };
            var lead = nh.line.slice(from.ch, nh.pos.ch);
            var tail = nh.line.slice(nh.pos.ch, to.ch);
            var leadLower = lead.toLowerCase();
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
            var list = filteredList.map(function (e, index) {
                var details = _this._typescript.getCompletionEntryDetails(fullPath, nh.offset, e.name);
                return new CompletionItem(e, details, index, lead, tail);
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

            var tailLength = 0;
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
                tailLength: tailLength,
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

var CompletionItem = (function () {
    function CompletionItem(_completionEntry, _completionEntryDetails, _index, _lead, _tail) {
        this._completionEntry = _completionEntry;
        this._completionEntryDetails = _completionEntryDetails;
        this._index = _index;
        this._lead = _lead;
        this._tail = _tail;
        this.text = this._completionEntry.name;
    }
    CompletionItem.prototype.render = function (element) {
        var kindSpan = document.createElement('span');
        kindSpan.textContent = this._completionEntry.kind + ' ';
        kindSpan.style.opacity = '0.6';
        element.appendChild(kindSpan);

        var nameSpan = document.createElement('span');
        nameSpan.textContent = this.text;
        element.appendChild(nameSpan);

        if (this._completionEntryDetails.type) {
            var typeSpan = document.createElement('span');
            typeSpan.textContent = ' : ' + this._completionEntryDetails.type;
            typeSpan.style.opacity = '0.7';
            element.appendChild(typeSpan);
        }

        if (this._completionEntryDetails.docComment) {
            var commentDiv = document.createElement('div');
            commentDiv.textContent = this._completionEntryDetails.docComment;
            commentDiv.style.opacity = '0.7';
            commentDiv.style.fontStyle = 'italic';
            commentDiv.style.marginLeft = '2em';
            element.appendChild(commentDiv);
        }
    };
    return CompletionItem;
})();
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
            this.mode = null;
            this.active = ko.observable(false);
            this.onselect = null;
            this.onunselect = null;
            this._doc = null;
            this._onchangeHandlers = [];
            this.fullPath = (parent ? parent.fullPath : '/') + name;
            this.mode = teapo.detectDocumentMode(this.fullPath);
            this._doc = new CodeMirror.Doc('', this.mode);
        }
        Document.prototype.populate = function (doc) {
            this._doc.setValue(doc.content);
            if (doc.history) {
                try  {
                    var h = JSON.parse(doc.history);
                    this._doc.setHistory(h);
                } catch (e) {
                }
            }
            if (doc.cursor) {
                try  {
                    var pos = this._doc.posFromIndex(doc.cursor);
                    this._doc.setCursor(pos);
                } catch (e) {
                }
            }
        };

        Document.prototype.getDoc = function () {
            return this._doc;
        };

        Document.prototype.onchange = function (f) {
            this._onchangeHandlers.push(f);
        };

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

        Document.prototype.remove = function () {
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
        var key = w.location.href;
        key = key.split('#')[0];
        if (key.length > 'index.html'.length && key.slice(key.length - 'index.html'.length).toLowerCase() === 'index.html')
            key = key.slice(0, key.length - 'index.html'.length);
        key = '[teapo]' + key;
        return key;
    }
    teapo.getDocumentStoreUniqueKey = getDocumentStoreUniqueKey;

    function appendScriptElement(path, d) {
        if (typeof d === "undefined") { d = document; }
        var element = document.createElement('script');
        element.setAttribute('type', 'text/data');
        if (path)
            element.setAttribute('data-path', path);
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
            this._activeDocumentElement = null;
            this._documentElements = {};
            this._staticDocuments = {};
            for (var i = 0; i < this._document.scripts.length; i++) {
                var s = this._document.scripts[i];
                var path = s.getAttribute('data-path') || '';

                if (path.charAt(0) === '/') {
                    this._documentElements[path] = s;
                } else if (s.id === 'changeDate') {
                    this._changeDateElement = s;
                    try  {
                        this._changeDate = new Date(s.innerHTML);
                    } catch (e) {
                    }
                } else if (s.id === 'activeDocument') {
                    this._activeDocumentElement = s;
                } else if (path.charAt(0) === '#') {
                    this._staticDocuments[path] = s.innerHTML;
                }
            }
        }
        ScriptElementStore.prototype.changeDate = function () {
            return this._changeDate;
        };

        ScriptElementStore.prototype.getActiveDocument = function () {
            return this._activeDocumentElement ? this._activeDocumentElement.innerHTML : null;
        };

        ScriptElementStore.prototype.setActiveDocument = function (name) {
            if (!this._activeDocumentElement)
                this._activeDocumentElement = appendScriptElement('activeDocument');
            this._activeDocumentElement.innerHTML = name;
        };

        ScriptElementStore.prototype.documentNames = function () {
            return Object.keys(this._documentElements);
        };

        ScriptElementStore.prototype.loadDocument = function (name) {
            var element = this._documentElements[name];
            if (!element)
                return null;

            var history = element.getAttribute('history');
            var content = element.innerHTML;
            try  {
                var cursor = parseInt(element.getAttribute('cursor'));
            } catch (e) {
            }
            try  {
                var selectionStart = parseInt(element.getAttribute('selectionStart'));
            } catch (e) {
            }
            try  {
                var selectionEnd = parseInt(element.getAttribute('selectionEnd'));
            } catch (e) {
            }
            try  {
                var scrollTop = parseInt(element.getAttribute('scrollTop'));
            } catch (e) {
            }

            var result = {
                history: history,
                content: content,
                cursor: cursor,
                selectionStart: selectionStart,
                selectionEnd: selectionEnd,
                scrollTop: scrollTop
            };
            return result;
        };

        ScriptElementStore.prototype.saveDocument = function (name, doc) {
            var element = this._documentElements[name];
            if (!element) {
                element = appendScriptElement(name);
                this._documentElements[name] = element;
            }

            if ('content' in doc)
                element.innerHTML = doc.content;
            if ('history' in doc)
                element.setAttribute('history', doc.history);
            if ('cursor' in doc)
                element.setAttribute('cursor', doc.cursor);
            if ('selectionStart' in doc)
                element.setAttribute('selectionStart', doc.selectionStart);
            if ('selectionEnd' in doc)
                element.setAttribute('selectionEnd', doc.selectionEnd);
            if ('scrollTop' in doc)
                element.setAttribute('scrollTop', doc.scrollTop);

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
                this._changeDateElement = appendScriptElement(null);
                this._changeDateElement.id = 'changeDate';
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
            var content = this._localStorage[this._uniqueKey + name];
            if (content !== '' && !content)
                return this._fallbackLoadDocument(name);
            var history = this._localStorage[this._uniqueKey + name + '*history'];
            try  {
                var cursor = parseInt(this._localStorage[this._uniqueKey + name + '*cursor']);
            } catch (e) {
            }
            try  {
                var selectionStart = parseInt(this._localStorage[this._uniqueKey + name + '*selectionStart']);
            } catch (e) {
            }
            try  {
                var selectionEnd = parseInt(this._localStorage[this._uniqueKey + name + '*selectionEnd']);
            } catch (e) {
            }
            try  {
                var scrollTop = parseInt(this._localStorage[this._uniqueKey + name + '*scrollTop']);
            } catch (e) {
            }
            return {
                history: history,
                content: content,
                cursor: cursor,
                selectionStart: selectionStart,
                selectionEnd: selectionEnd,
                scrollTop: scrollTop
            };
        };

        LocalStorageStore.prototype.getActiveDocument = function () {
            return this._localStorage[this._uniqueKey + '*activeDocument'] || this._baseStore.getActiveDocument();
        };

        LocalStorageStore.prototype.setActiveDocument = function (name) {
            this._localStorage[this._uniqueKey + '*activeDocument'] = name;
            this._baseStore.setActiveDocument(name);
        };

        LocalStorageStore.prototype._fallbackLoadDocument = function (name) {
            var files = this.documentNames();
            for (var i = 0; i < files.length; i++) {
                if (files[i] === name)
                    return this._baseStore.loadDocument(name);
            }
            return null;
        };

        LocalStorageStore.prototype.saveDocument = function (name, doc) {
            var wasPreviousContent = this._uniqueKey + name in this._localStorage;

            if ('content' in doc)
                this._localStorage[this._uniqueKey + name] = doc.content;
            if ('history' in doc)
                this._localStorage[this._uniqueKey + name + '*history'] = doc.history;
            if ('cursor' in doc)
                this._localStorage[this._uniqueKey + name + '*cursor'] = doc.cursor;
            if ('selectionStart' in doc)
                this._localStorage[this._uniqueKey + name + '*selectionStart'] = doc.selectionStart;
            if ('selectionEnd' in doc)
                this._localStorage[this._uniqueKey + name + '*selecionEnd'] = doc.selectionEnd;
            if ('scrollTop' in doc)
                this._localStorage[this._uniqueKey + name + '*scrollTop'] = doc.scrollTop;

            this._localStorage[this._uniqueKey + '*changeDate'] = new Date().toUTCString();

            if (!wasPreviousContent) {
                var files = this.documentNames();
                files.push(name);
                this._localStorage[this._uniqueKey + '*files'] = JSON.stringify(files);
            }

            this._baseStore.saveDocument(name, doc);
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
            this.statusText = ko.observable('ready.');
            this._typescript = null;
            this._editor = null;
            this._textarea = null;
            this._tsMode = null;
            this._disposeMode = null;
            this._store = null;
            this._changedFilesToSave = {};
            this._fileChangeTimeout = null;
            var htmlStore = new teapo.ScriptElementStore();

            this._store = new teapo.LocalStorageStore(htmlStore);

            var staticScripts = {};
            var htmlStaticScriptNames = htmlStore.staticDocumentNames();
            for (var i = 0; i < htmlStaticScriptNames.length; i++) {
                staticScripts[htmlStaticScriptNames[i]] = htmlStore.readStaticDocument(htmlStaticScriptNames[i]);
            }

            this._typescript = new teapo.TypeScriptService(staticScripts);

            var fileList = this._store.documentNames();
            for (var i = 0; i < fileList.length; i++) {
                var doc = this._store.loadDocument(fileList[i]);
                this._addDocument(fileList[i], doc);
            }

            this.root.onselectFile = function (f) {
                return _this._selectFile(f);
            };
            this.root.ondeleteFile = function (f) {
                return _this._deleteFile(f);
            };

            this._tsMode = new teapo.TypeScriptDocumentMode(this._typescript.service);
            var activeFilePath = this._store.getActiveDocument();
            if (activeFilePath) {
                var activeDoc = this.root.getDocument(activeFilePath);
                this.activeDocument(activeDoc);
            }
        }
        ApplicationViewModel.prototype.newFile = function () {
            var newPath = prompt('Full path:');
            if (!newPath)
                return;
            var f = this.root.getDocument(newPath);
            this._fileChange(f);
            f.select(null, null);
        };

        ApplicationViewModel.prototype.deleteActiveFile = function () {
            var path = this.activeDocument().fullPath;
            if (!confirm('Are you sure to delete ' + this.activeDocument().fullPath + ' ?'))
                return;

            this.root.removeDocument(path);
            this._store.deleteDocument(path);
            this.activeDocument(null);
            this._typescript.removeDocument(path);
            // TODO: propagate no-active-document state to all the folders down
        };

        ApplicationViewModel.prototype._addDocument = function (file, doc) {
            var _this = this;
            var f = this.root.getDocument(file);
            if (doc)
                f.populate(doc);

            this._typescript.addDocument(f);

            CodeMirror.on(f.getDoc(), 'change', function (instance, change) {
                _this._fileChange(f);
            });
            CodeMirror.on(f.getDoc(), 'cursorActivity', function (instance) {
                _this._cursorChange(f);
            });
        };

        ApplicationViewModel.prototype._fileChange = function (d) {
            var _this = this;
            this._changedFilesToSave[d.fullPath] = d;
            if (this._fileChangeTimeout)
                clearTimeout(this._fileChangeTimeout);
            this._fileChangeTimeout = setTimeout(function () {
                return _this._saveChangedFiles();
            }, 600);
        };

        ApplicationViewModel.prototype._cursorChange = function (d) {
            var doc = d.getDoc();
            var cursorPos = doc.getCursor();
            var cursorOffset = doc.indexFromPos(cursorPos);
            this._store.saveDocument(d.fullPath, { cursor: cursorOffset });
        };

        ApplicationViewModel.prototype._saveChangedFiles = function () {
            for (var f in this._changedFilesToSave)
                if (this._changedFilesToSave.hasOwnProperty(f)) {
                    var d = this._changedFilesToSave[f];
                    var doc = d.getDoc();
                    var hi = doc.getHistory();
                    var hiStr = JSON.stringify(hi);
                    var contentStr = doc.getValue();
                    this._store.saveDocument(f, { history: hiStr, content: contentStr });
                }
            this._changedFilesToSave = {};
        };

        ApplicationViewModel.prototype._selectFile = function (file) {
            this.activeDocument(file);
            this._store.setActiveDocument(file.fullPath);
            this._selectFileCore(file);
        };

        ApplicationViewModel.prototype._selectFileCore = function (file) {
            this._editor.setOption('readOnly', false);
            this._editor.swapDoc(file.getDoc());
            this._editor.focus();

            if (this._disposeMode) {
                this._disposeMode.dispose();
                this._disposeMode = null;
            }
            if (teapo.detectDocumentMode(file.fullPath) === 'text/typescript') {
                this._disposeMode = this._tsMode.activateEditor(this._editor, file.fullPath, this.statusText);
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
                styleActiveLine: true,
                readOnly: 'nocursor',
                tabSize: 2,
                extraKeys: { "Tab": "indentMore", "Shift-Tab": "indentLess" },
                gutters: ['teapo-errors']
            });
            var activeDoc = this.activeDocument();
            if (activeDoc) {
                activeDoc.select(null, null);
            }
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

        var result = null;
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
    }

    function stripOuterSlashes(path) {
        var start = 0;
        while (path.charAt(start) === '/')
            start++;

        var end = Math.max(start, path.length - 1);
        while (end >= start && path.charAt(end) === '/')
            end--;

        var pathMid = start === 0 && end === path.length - 1 ? path : path.slice(start, end);
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
        function DocumentStorage(_typeResolver, _entryResolver, _document, _localStorage) {
            if (typeof _document === "undefined") { _document = document; }
            if (typeof _localStorage === "undefined") { _localStorage = localStorage; }
            this._typeResolver = _typeResolver;
            this._entryResolver = _entryResolver;
            this._document = _document;
            this._localStorage = _localStorage;
            // TODO: apart from localStorage support better local access API
        }
        /**
        * Full paths of all files.
        */
        DocumentStorage.prototype.documentNames = function () {
            return null;
        };

        /**
        * Given a path retrieves an object for reading and writing document state,
        * also exposes runtime features like editor and entry in the file list.
        */
        DocumentStorage.prototype.getDocument = function (fullPath) {
            return null;
        };
        return DocumentStorage;
    })();
    teapo.DocumentStorage = DocumentStorage;

    

    var internal;
    (function (internal) {
        /**
        * Standard implementation of DocumentState.
        * This class is not exposed outside of this module.
        */
        var DocumentState = (function () {
            function DocumentState(_fullPath, _name, _storage, _typeResolver, _entryResolver) {
                this._fullPath = _fullPath;
                this._name = _name;
                this._storage = _storage;
                this._typeResolver = _typeResolver;
                this._entryResolver = _entryResolver;
                this._type = null;
                this._editor = null;
                this._fileEntry = null;
            }
            DocumentState.prototype.fullPath = function () {
                return this._fullPath;
            };
            DocumentState.prototype.name = function () {
                return this._name;
            };

            DocumentState.prototype.type = function () {
                if (!this._type)
                    this._type = this._typeResolver(this._fullPath);
                return this._type;
            };

            DocumentState.prototype.editor = function () {
                if (!this._editor)
                    this._editor = this.type().editDocument(this);
                return this._editor;
            };

            DocumentState.prototype.fileEntry = function () {
                if (this._fileEntry)
                    this._fileEntry = this._entryResolver(this._fullPath);
                return this._fileEntry;
            };

            DocumentState.prototype.getProperty = function (name) {
                return null;
            };

            DocumentState.prototype.setProperty = function (name, value) {
                //
            };

            DocumentState.prototype.getTransientProperty = function (name) {
                return null;
            };

            DocumentState.prototype.setTransientProperty = function (name, value) {
                //
            };
            return DocumentState;
        })();
        internal.DocumentState = DocumentState;
    })(internal || (internal = {}));
})(teapo || (teapo = {}));
/// <reference path='persistence.ts' />
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='ApplicationViewModel.ts' />
/// <reference path='KnockoutBindings.ts' />
/// <reference path='editor.ts' />
/// <reference path='files.ts' />
/// <reference path='persistence.ts' />
window.onload = function () {
    teapo.registerKnockoutBindings(ko);

    var viewModel = new teapo.ApplicationViewModel();

    ko.renderTemplate('bodyTemplate', viewModel, null, document.body);
};
//# sourceMappingURL=teapo.js.map
