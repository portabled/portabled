/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='typings/codemirror.d.ts' />
var teapo;
(function (teapo) {
    /**
    * Pubic API exposing access to TypeScript language  services
    * (see its service property)
    * and handling the interfaces TypeScript requires
    * to access to the source code and the changes.
    */
    var TypeScriptService = (function () {
        function TypeScriptService() {
            /** Set of booleans for each log severity level. */
            this.logLevels = {
                information: false,
                debug: false,
                warning: true,
                error: true,
                fatal: true
            };
            /** TypeScript custom settings. */
            this.compilationSettings = new TypeScript.CompilationSettings();
            /** Files added to the compiler/parser scope, by full path. */
            this.scripts = {};
            this.log = null;
            this._logLevel = null;
            var factory = new TypeScript.Services.TypeScriptServicesFactory();
            this.service = factory.createPullLanguageService(this._createLanguageServiceHost());
        }
        /**
        * The main API required by TypeScript for talking to the host environment. */
        TypeScriptService.prototype._createLanguageServiceHost = function () {
            var _this = this;
            return {
                getCompilationSettings: function () {
                    return _this.compilationSettings;
                },
                getScriptFileNames: function () {
                    var result = Object.keys(_this.scripts).filter(function (k) {
                        return _this.scripts.hasOwnProperty(k);
                    }).sort();

                    //console.log('...getScriptFileNames():',result);
                    return result;
                },
                getScriptVersion: function (fileName) {
                    var script = _this.scripts[fileName];
                    if (script.changes)
                        return script.changes().length;
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
                    var snapshot = script._cachedSnapshot;

                    // checking if snapshot is out of date
                    if (!snapshot || (script.changes && snapshot.version < script.changes().length)) {
                        script._cachedSnapshot = snapshot = new TypeScriptDocumentSnapshot(script);
                    }

                    return snapshot;
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
                    _this._logLevel = 'information';
                    return _this.logLevels.information;
                },
                debug: function () {
                    _this._logLevel = 'debug';
                    return _this.logLevels.debug;
                },
                warning: function () {
                    _this._logLevel = 'warning';
                    return _this.logLevels.warning;
                },
                error: function () {
                    _this._logLevel = 'error';
                    return _this.logLevels.error;
                },
                fatal: function () {
                    _this._logLevel = 'fatal';
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
            if (this.logLevels[this._logLevel]) {
                console.log(this._logLevel, text);
                if (this.log) {
                    var msg = {
                        logLevel: this._logLevel,
                        text: text
                    };
                    this.log.push(msg);
                }
            }
        };
        return TypeScriptService;
    })();
    teapo.TypeScriptService = TypeScriptService;

    var TypeScriptDocumentSnapshot = (function () {
        function TypeScriptDocumentSnapshot(scriptData) {
            this.scriptData = scriptData;
            this.version = 0;
            this._text = null;
            if (this.scriptData.changes)
                this.version = this.scriptData.changes().length;
        }
        TypeScriptDocumentSnapshot.prototype.getText = function (start, end) {
            var text = this._getText();
            var result = text.slice(start, end);
            return result;
        };

        TypeScriptDocumentSnapshot.prototype.getLength = function () {
            var text = this._getText();
            return text.length;
        };

        TypeScriptDocumentSnapshot.prototype.getLineStartPositions = function () {
            var text = this._getText();
            var result = TypeScript.TextUtilities.parseLineStarts(text);
            return result;
        };

        TypeScriptDocumentSnapshot.prototype.getTextChangeRangeSinceVersion = function (scriptVersion) {
            if (!this.scriptData.changes)
                return TypeScript.TextChangeRange.unchanged;

            // TODO: check that we are not called for changes on old snapshots
            var chunk = this.scriptData.changes().slice(scriptVersion);

            var result = TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(chunk);
            return result;
        };

        TypeScriptDocumentSnapshot.prototype._getText = function () {
            if (!this._text)
                this._text = this.scriptData.text ? this.scriptData.text() : this.scriptData;
            return this._text;
        };
        return TypeScriptDocumentSnapshot;
    })();
})(teapo || (teapo = {}));
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
            this._positionOnOpen = false;
            this.statusText = ko.observable(null);
        }
        CodeMirrorEditor.standardEditorConfiguration = function () {
            return {
                lineNumbers: true,
                matchBrackets: true,
                autoCloseBrackets: true,
                matchTags: true,
                showTrailingSpace: true,
                autoCloseTags: true,
                //highlightSelectionMatches: {showToken: /\w/},
                styleActiveLine: true,
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                tabSize: 2,
                extraKeys: { "Tab": "indentMore", "Shift-Tab": "indentLess", "Ctrl-/": "toggleComment", "Ctrl-?": "toggleComment" }
            };
        };

        /**
        * Invoked when a file is selected in the file list/tree and brought open.
        */
        CodeMirrorEditor.prototype.open = function (onchange, statusText) {
            var _this = this;
            this._shared.editor = this;
            this.statusText = statusText;

            // storing passed function
            // (it should be invoked for any change to trigger saving)
            this._invokeonchange = onchange;

            // this may actually create CodeMirror instance
            var editor = this.editor();
            var doc = this.doc();

            editor.swapDoc(doc);

            // invoking overridable logic
            this.handleOpen();

            var element = this._shared.element;
            if (element && !element.parentElement) {
                setTimeout(function () {
                    editor.refresh();
                    editor.focus();

                    if (_this._positionOnOpen) {
                        _this._positionOnOpen = false;
                        var posStr = _this.docState.getProperty('pos');
                        if (typeof posStr === 'string' && posStr) {
                            try  {
                                var pos = JSON.parse(posStr);
                                _this._doc.setCursor(pos);
                                editor.scrollIntoView(doc.getCursor());
                            } catch (parsePosError) {
                            }
                        }
                    }
                }, 1);
            } else {
                setTimeout(function () {
                    return editor.focus();
                }, 1);
            }
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

        /**
        * Retrieves parts of the line before and after current cursor,
        * looking for indentifier and whitespace boundaries.
        * Needed for correct handling of completion context.
        */
        CodeMirrorEditor.prototype.getNeighborhood = function () {
            var doc = this.doc();
            var pos = doc.getCursor();
            var offset = doc.indexFromPos(pos);
            var line = doc.getLine(pos.line);

            var leadLength = 0;
            var prefixChar = '';
            var whitespace = false;
            for (var i = pos.ch - 1; i >= 0; i--) {
                var ch = line[i];
                if (!whitespace && this._isIdentifierChar(ch)) {
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
                if (!whitespace && this._isIdentifierChar(ch)) {
                    tailLength++;
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

        /** More specifially, number or identifier (numbers, letters, underscore and dollar). */
        CodeMirrorEditor.prototype._isIdentifierChar = function (ch) {
            if (ch.toLowerCase() !== ch.toUpperCase())
                return true;
            else if (ch === '_' || ch === '$')
                return true;
            else if (ch >= '0' && ch <= '9')
                return true;
            else
                return false;
        };

        CodeMirrorEditor.prototype._initEditor = function () {
            var _this = this;
            var options = this._shared.options || CodeMirrorEditor.standardEditorConfiguration();
            this._shared.cm = new CodeMirror(function (element) {
                return _this._shared.element = element;
            }, options);

            // avoid zoom on focus
            this._shared.cm.getInputField().style.fontSize = '16px';
        };

        CodeMirrorEditor.prototype._initDoc = function () {
            var _this = this;
            // resolve options (allow override)
            var options = this._shared.options || CodeMirrorEditor.standardEditorConfiguration();
            this._doc = options.mode ? new CodeMirror.Doc('', options.mode) : new CodeMirror.Doc('');

            this._positionOnOpen = true;

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
        CodeMirrorEditor.positionSaveDelay = 400;
        return CodeMirrorEditor;
    })();
    teapo.CodeMirrorEditor = CodeMirrorEditor;
})(teapo || (teapo = {}));
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var teapo;
(function (teapo) {
    var CompletionCodeMirrorEditor = (function (_super) {
        __extends(CompletionCodeMirrorEditor, _super);
        function CompletionCodeMirrorEditor(shared, docState) {
            var _this = this;
            _super.call(this, CompletionCodeMirrorEditor.injectCompletionShortcuts(shared), docState);
            this._completionTimeout = 0;
            this._completionClosure = function () {
                return _this._performCompletion();
            };
            this._forcedCompletion = false;
            this._acceptSingleCompletion = false;
            this._positionSaveTimeout = 0;
            this._positionSaveClosure = function () {
                return _this._performPositionSave();
            };
            this._triggerCompletionPos = null;
        }
        /**
        * Subscribing to cursor activity.
        */
        CompletionCodeMirrorEditor.prototype.handleLoad = function () {
            var _this = this;
            _super.prototype.handleLoad.call(this); // fetches the text from docState

            CodeMirror.on(this.doc(), 'cursorActivity', function (instance) {
                return _this._oncursorActivity();
            });
        };

        CompletionCodeMirrorEditor.prototype.handleClose = function () {
            // completion should be cancelled outright
            if (this._completionTimeout) {
                clearTimeout(this._completionTimeout);

                this._completionTimeout = 0;
            }
        };

        CompletionCodeMirrorEditor.prototype.handleCursorActivity = function () {
        };

        CompletionCodeMirrorEditor.prototype.handlePerformCompletion = function (forced, acceptSingle) {
        };

        CompletionCodeMirrorEditor.prototype.handleChange = function (change) {
            this.triggerCompletion(false);
        };

        CompletionCodeMirrorEditor.prototype.triggerCompletion = function (forced, acceptSingle) {
            if (typeof acceptSingle === "undefined") { acceptSingle = false; }
            if (this._completionTimeout)
                clearTimeout(this._completionTimeout);

            if (forced)
                this._forcedCompletion = true;
            if (acceptSingle)
                this._acceptSingleCompletion = true;

            var delay = forced ? 1 : CompletionCodeMirrorEditor.completionDelay;

            this._completionTimeout = setTimeout(this._completionClosure, delay);
            this._triggerCompletionPos = this.doc().getCursor();
        };

        CompletionCodeMirrorEditor.prototype.cancelCompletion = function () {
            // completion should be cancelled outright
            if (this._completionTimeout) {
                clearTimeout(this._completionTimeout);

                this._completionTimeout = 0;
            }

            this._forcedCompletion = false;
            this._acceptSingleCompletion = false;
        };

        CompletionCodeMirrorEditor.prototype._performCompletion = function () {
            this._completionTimeout = 0;

            if (!this._forcedCompletion) {
                // if user didn't ask for completion, only do it within an identifier
                // or after dot
                var nh = this.getNeighborhood();
                if (nh.leadLength === 0 && nh.prefixChar !== '.')
                    return;
            }

            var forced = this._forcedCompletion;
            var acceptSingle = this._acceptSingleCompletion;
            this._forcedCompletion = false;
            this._acceptSingleCompletion = false;
            this.handlePerformCompletion(forced, acceptSingle);
        };

        CompletionCodeMirrorEditor.prototype._oncursorActivity = function () {
            // cancel completion in case of cursor activity
            var pos = this.doc().getCursor();
            if (this._triggerCompletionPos && (this._triggerCompletionPos.ch !== pos.ch || this._triggerCompletionPos.line !== pos.line)) {
                if (!this._forcedCompletion && this._completionTimeout) {
                    clearTimeout(this._completionTimeout);
                    this._completionTimeout = 0;
                }
            }

            this.handleCursorActivity();

            if (this._positionSaveTimeout)
                clearTimeout(this._positionSaveTimeout);
            this._positionSaveTimeout = setTimeout(this._positionSaveClosure, teapo.CodeMirrorEditor.positionSaveDelay);
        };

        CompletionCodeMirrorEditor.prototype._performPositionSave = function () {
            if (this._positionSaveTimeout) {
                clearTimeout(this._positionSaveTimeout);
                this._positionSaveTimeout = 0;
            }

            // save current position
            var pos = this.editor().getDoc().getCursor();
            var posStr = JSON.stringify(pos);
            this.docState.setProperty('pos', posStr);
        };

        CompletionCodeMirrorEditor.injectCompletionShortcuts = function (shared) {
            var triggerEditorCompletion = function () {
                var editor = shared.editor;
                if (!editor)
                    return;
                editor.triggerCompletion(true, true);
            };

            var completionShortcuts = ['Ctrl-Space', 'Cmd-Space', 'Alt-Space', 'Ctrl-J', 'Alt-J', 'Cmd-J'];
            var extraKeys = shared.options.extraKeys;
            if (!extraKeys)
                extraKeys = shared.options.extraKeys = {};

            for (var i = 0; i < completionShortcuts.length; i++) {
                var key = completionShortcuts[i];
                if (key in extraKeys)
                    continue;
                extraKeys[key] = triggerEditorCompletion;
            }

            return shared;
        };
        CompletionCodeMirrorEditor.completionDelay = 400;

        CompletionCodeMirrorEditor._noSingleAutoCompletion = { completeSingle: false };
        return CompletionCodeMirrorEditor;
    })(teapo.CodeMirrorEditor);
    teapo.CompletionCodeMirrorEditor = CompletionCodeMirrorEditor;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    /**
    * Handling detection of .js files.
    */
    var CssEditorType = (function () {
        function CssEditorType() {
            this._shared = {
                options: CssEditorType.editorConfiguration()
            };
        }
        CssEditorType.editorConfiguration = function () {
            var options = teapo.CodeMirrorEditor.standardEditorConfiguration();
            options.mode = "text/css";
            return options;
        };

        CssEditorType.prototype.canEdit = function (fullPath) {
            var dotParts = fullPath.split('.');
            return dotParts.length > 1 && dotParts[dotParts.length - 1].toLowerCase() === 'css';
        };

        CssEditorType.prototype.editDocument = function (docState) {
            return new teapo.CodeMirrorEditor(this._shared, docState);
        };
        return CssEditorType;
    })();

    (function (EditorType) {
        /**
        * Registering CssEditorType.
        */
        EditorType.Css = new CssEditorType();
    })(teapo.EditorType || (teapo.EditorType = {}));
    var EditorType = teapo.EditorType;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    

    // types are registered by adding variables/properties to this module
    (function (EditorType) {
        /**
        * Resolve to a type that accepts this file.
        */
        function getType(fullPath) {
            // must iterate in reverse, so more generic types get used last
            var keys = Object.keys(EditorType);
            for (var i = 0; i < keys.length; i++) {
                var t = this[keys[i]];
                if (t.canEdit && t.canEdit(fullPath))
                    return t;
            }

            return null;
        }
        EditorType.getType = getType;
    })(teapo.EditorType || (teapo.EditorType = {}));
    var EditorType = teapo.EditorType;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    /**
    * Handling detection of .html and .htm files.
    */
    var HtmlEditorType = (function () {
        /** Optional argument can be used to mock TypeScriptService in testing scenarios. */
        function HtmlEditorType() {
            this._shared = HtmlEditorType.createShared();
            this.storageForBuild = null;
        }
        HtmlEditorType.createShared = function () {
            var options = teapo.CodeMirrorEditor.standardEditorConfiguration();
            var shared = { options: options };

            options.mode = "text/html";
            options.gutters = ['teapo-errors'];

            var debugClosure = function () {
                var editor = shared.editor;
                if (!editor)
                    return;

                editor.assembleBuild();
            };

            var extraKeys = options.extraKeys || (options.extraKeys = {});
            var shortcuts = ['Ctrl-B', 'Alt-B', 'Cmd-B', 'Shift-Ctrl-B', 'Ctrl-Alt-B', 'Shift-Alt-B', 'Shift-Cmd-B', 'Cmd-Alt-B'];
            for (var i = 0; i < shortcuts.length; i++) {
                var k = shortcuts[i];
                if (k in extraKeys)
                    continue;

                extraKeys[k] = debugClosure;
            }

            return shared;
        };

        HtmlEditorType.prototype.canEdit = function (fullPath) {
            var dotParts = fullPath.split('.');
            return dotParts.length > 1 && (dotParts[dotParts.length - 1].toLowerCase() === 'html' || dotParts[dotParts.length - 1].toLowerCase() === 'htm');
        };

        HtmlEditorType.prototype.editDocument = function (docState) {
            return new HtmlEditor(this._shared, docState, this.storageForBuild);
        };
        return HtmlEditorType;
    })();

    var HtmlEditor = (function (_super) {
        __extends(HtmlEditor, _super);
        function HtmlEditor(shared, docState, _storageForBuild) {
            _super.call(this, shared, docState);
            this._storageForBuild = _storageForBuild;
        }
        HtmlEditor.prototype.handleChange = function (change) {
            _super.prototype.handleChange.call(this, change);

            if (change.text.length === 1 && (change.text[0] === '<' || change.text[0] === '/'))
                this.triggerCompletion(true);
        };

        HtmlEditor.prototype.handlePerformCompletion = function (force, acceptSingle) {
            CodeMirror.showHint(this.editor(), CodeMirror.hint.html);
        };

        HtmlEditor.prototype.assembleBuild = function () {
            if (!this._storageForBuild)
                return;

            var html = this.text();
            var convertedOutput = [];
            var offset = 0;
            var srcRegex = /###(.*)###/g;
            var match;

            while (match = srcRegex.exec(html)) {
                var inlineFullPath = match[1];
                var verb = null;

                if (inlineFullPath.lastIndexOf(':') >= 0) {
                    verb = inlineFullPath.slice(inlineFullPath.lastIndexOf(':') + 1);
                    inlineFullPath = inlineFullPath.slice(0, inlineFullPath.length - verb.length - 1);
                }

                if (inlineFullPath.charAt(0) !== '/' && inlineFullPath.charAt(0) !== '#')
                    inlineFullPath = '/' + inlineFullPath;

                var inlineDocState = this._storageForBuild.getDocument(inlineFullPath);
                if (!inlineDocState) {
                    console.log('Inlining ' + inlineFullPath + ' failed: cannot find.');
                    continue;
                }

                convertedOutput.push(html.slice(offset, match.index));

                var embedContent;
                if (verb && verb in inlineDocState.editor()) {
                    embedContent = inlineDocState.editor()[verb]();
                } else {
                    embedContent = inlineDocState.getProperty(null);
                }

                embedContent = embedContent.replace(/<\/script/g, '</script');
                convertedOutput.push(embedContent);
                offset = match.index + match[0].length;

                var shortName = match[1];
                shortName = shortName.slice(shortName.lastIndexOf('/') + 1);
            }

            if (offset < html.length)
                convertedOutput.push(html.slice(offset));

            var filename = this.docState.fileEntry().name();
            var blob = new Blob(convertedOutput, { type: 'text/html' });
            var url = URL.createObjectURL(blob);
            window.open(url, '_blank' + Date.now());
        };
        return HtmlEditor;
    })(teapo.CompletionCodeMirrorEditor);

    (function (EditorType) {
        /**
        * Registering HtmlEditorType.
        */
        EditorType.Html = new HtmlEditorType();
    })(teapo.EditorType || (teapo.EditorType = {}));
    var EditorType = teapo.EditorType;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    /**
    * Handling detection of .js files.
    */
    var JavaScriptEditorType = (function () {
        function JavaScriptEditorType(tern) {
            if (typeof tern === "undefined") { tern = new CodeMirror.TernServer(); }
            this._shared = JavaScriptEditorType.createShared();
            this._shared.tern = tern;
        }
        JavaScriptEditorType.createShared = function () {
            var options = teapo.CodeMirrorEditor.standardEditorConfiguration();
            var shared = { options: options, tern: null };

            options.mode = "text/javascript";
            options.gutters = ['teapo-errors'];

            var debugClosure = function () {
                var editor = shared.editor;
                if (!editor)
                    return;

                editor.run();
            };

            var extraKeys = options.extraKeys || (options.extraKeys = {});
            var shortcuts = ['Ctrl-B', 'Alt-B', 'Cmd-B', 'Shift-Ctrl-B', 'Ctrl-Alt-B', 'Shift-Alt-B', 'Shift-Cmd-B', 'Cmd-Alt-B'];
            for (var i = 0; i < shortcuts.length; i++) {
                var k = shortcuts[i];
                if (k in extraKeys)
                    continue;

                extraKeys[k] = debugClosure;
            }

            return shared;
        };

        JavaScriptEditorType.prototype.canEdit = function (fullPath) {
            var dotParts = fullPath.split('.');
            return dotParts.length > 1 && dotParts[dotParts.length - 1].toLowerCase() === 'js';
        };

        JavaScriptEditorType.prototype.editDocument = function (docState) {
            return new JavaScriptEditor(this._shared, docState);
        };
        return JavaScriptEditorType;
    })();

    var JavaScriptEditor = (function (_super) {
        __extends(JavaScriptEditor, _super);
        function JavaScriptEditor(shared, docState) {
            _super.call(this, shared, docState);
            this._tern = null;
            this._tern = shared.tern;

            this._tern.server.addFile(this.docState.fullPath(), this.text());
        }
        JavaScriptEditor.prototype.run = function () {
            var editor = this;
            eval(this.text());
        };

        JavaScriptEditor.prototype.handleLoad = function () {
            _super.prototype.handleLoad.call(this);

            this._tern.delDoc(this.docState.fullPath());
            this._tern.addDoc(this.docState.fullPath(), this.doc());
        };

        JavaScriptEditor.prototype.handlePerformCompletion = function (forced, acceptSingle) {
            var _this = this;
            CodeMirror.showHint(this.editor(), function (cm, c) {
                try  {
                    return _this._tern.getHint(cm, c);
                } catch (error) {
                    alert('getHint ' + error + '\n' + error.stack);
                }
            }, {
                async: true,
                completeSingle: acceptSingle
            });
        };
        JavaScriptEditor._ternInitFailure = false;
        return JavaScriptEditor;
    })(teapo.CompletionCodeMirrorEditor);

    (function (EditorType) {
        /**
        * Registering HtmlEditorType.
        */
        EditorType.JavaScript = new JavaScriptEditorType();
    })(teapo.EditorType || (teapo.EditorType = {}));
    var EditorType = teapo.EditorType;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    /**
    * Handling detection of .ts files and creation of TypeScriptEditor,
    * as well as storing the shared instance of TypeScriptService.
    */
    var TypeScriptEditorType = (function () {
        /** Optional argument can be used to mock TypeScriptService in testing scenarios. */
        function TypeScriptEditorType(_typescript) {
            if (typeof _typescript === "undefined") { _typescript = null; }
            this._typescript = _typescript;
            this._shared = TypeScriptEditorType.createShared();
            this._initDocQueue = [];
        }
        TypeScriptEditorType.createShared = function () {
            var options = teapo.CodeMirrorEditor.standardEditorConfiguration();
            var shared = { options: options };

            options.mode = "text/typescript";
            if (options.gutters) {
                options.gutters = options.gutters.concat(['teapo-errors']);
            } else {
                options.gutters = ['teapo-errors'];
            }

            function addShortcuts(shortcuts, handler) {
                var debugClosure = function () {
                    var editor = shared.editor;
                    if (!editor)
                        return;

                    handler(editor);
                };

                var extraKeys = options.extraKeys || (options.extraKeys = {});
                for (var i = 0; i < shortcuts.length; i++) {
                    var k = shortcuts[i];
                    if (k in extraKeys)
                        continue;

                    extraKeys[k] = debugClosure;
                }
            }

            addShortcuts(['Ctrl-K', 'Alt-K', 'Cmd-K', 'Shift-Ctrl-K', 'Ctrl-Alt-K', 'Shift-Alt-K', 'Shift-Cmd-K', 'Cmd-Alt-K'], function (editor) {
                return editor.debug();
            });
            addShortcuts(['Ctrl-,', 'Alt-,', 'Cmd-,', 'Shift-Ctrl-Up', 'Ctrl-Alt-Up', 'Shift-Alt-Up', 'Shift-Cmd-Up', 'Cmd-Alt-Up'], function (editor) {
                return editor.jumpSymbol(-1);
            });
            addShortcuts(['Ctrl-.', 'Alt-.', 'Cmd-.', 'Shift-Ctrl-Down', 'Ctrl-Alt-Down', 'Shift-Alt-Down', 'Shift-Cmd-Down', 'Cmd-Alt-Down'], function (editor) {
                return editor.jumpSymbol(+1);
            });

            return shared;
        };

        TypeScriptEditorType.prototype.canEdit = function (fullPath) {
            return fullPath && fullPath.length > 3 && fullPath.slice(fullPath.length - 3).toLowerCase() === '.ts';
        };

        TypeScriptEditorType.prototype.editDocument = function (docState) {
            if (!this._typescript)
                this._initTypescript();

            var editor = new TypeScriptEditor(this._typescript, this._shared, docState);

            this._initDocStateWithTypeScript(docState);
            this._typescript.scripts[docState.fullPath()] = editor;

            return editor;
        };

        /**
        * Invoke some basic functions on a script, to make TS compiler read the file once.
        * The logic here makes sure the documents are processed in the deterministic sequential order.
        */
        TypeScriptEditorType.prototype._initDocStateWithTypeScript = function (docState) {
            var _this = this;
            if (this._initDocQueue.length > 0) {
                this._initDocQueue.push(docState);
            } else {
                this._initDocQueue.push(docState);
                setTimeout(function () {
                    return _this._processDocQueue();
                }, 5);
            }
        };

        TypeScriptEditorType.prototype._processDocQueue = function () {
            var _this = this;
            var dequeueDocState = null;
            for (var i = 0; i < this._initDocQueue.length; i++) {
                dequeueDocState = this._initDocQueue[i];
                if (dequeueDocState)
                    break;
            }

            if (dequeueDocState) {
                this._initDocQueue = [];
                return;
            }

            this._typescript.service.getSyntacticDiagnostics(dequeueDocState.fullPath());
            setTimeout(function () {
                _this._typescript.service.getSignatureAtPosition(dequeueDocState.fullPath(), 0);

                _this._initDocQueue[i] = null;

                setTimeout(function () {
                    return _this._processDocQueue();
                }, 5);
            }, 5);
        };

        TypeScriptEditorType.prototype._initTypescript = function () {
            this._typescript = new teapo.TypeScriptService();
            this._typescript.compilationSettings.outFileOption = '/out.ts';
        };
        return TypeScriptEditorType;
    })();

    /**
    * Implements rich code-aware editing for TypeScript files.
    */
    var TypeScriptEditor = (function (_super) {
        __extends(TypeScriptEditor, _super);
        function TypeScriptEditor(_typescript, shared, docState) {
            var _this = this;
            _super.call(this, shared, docState);
            this._typescript = _typescript;
            this._changes = [];
            this._bufferChanges = [];
            /** Required as part of interface to TypeScriptService. */
            this._cachedSnapshot = null;
            this._syntacticDiagnostics = [];
            this._semanticDiagnostics = [];
            this._updateDiagnosticsTimeout = -1;
            this._updateDiagnosticsClosure = function () {
                return _this._updateDiagnostics();
            };
            this._teapoErrorsGutterElement = null;
            this._docErrorMarks = [];
            this._docSymbolMarks = [];
            this._currentSymbolMarkIndex = -1;
            this._updateSymbolMarksTimeout = 0;
            this._updateSymbolMarksClosure = function () {
                return _this._updateSymbolMarks();
            };
            this._applyingEdits = false;
            this._completionActive = false;
            this._delayedHandleChangeClosure = function () {
                return _this._delayedHandleChanges();
            };
            this._delayedHandleChangeTimeout = 0;
            this._delayedHandleChangeArg = null;
            this._delayedHandleCursorActivityClosure = function () {
                return _this._delayedHandleCursorActivity();
            };
            this._delayedHandleCursorActivityTimeout = 0;
        }
        TypeScriptEditor.prototype.changes = function () {
            if (this._bufferChanges.length) {
                var collapsedBuffer = TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(this._bufferChanges);
                this._changes.push(collapsedBuffer);

                //console.log('collapse ',this._bufferChanges,' into ',this._changes);
                this._bufferChanges = [];
            }
            return this._changes;
        };

        /**
        * Overriding opening of the file, refreshing error marks.
        */
        TypeScriptEditor.prototype.handleOpen = function () {
            this._updateGutter();
            this._triggerStatusUpdate();

            // handling situation where an error refresh was queued,
            // but did not finish when the document was closed last time
            if (this._updateDiagnosticsTimeout) {
                this._updateDiagnosticsTimeout = 0;
                this._triggerDiagnosticsUpdate();
            }
        };

        /**
        * Overringin closing of the file, stopping queued requests.
        */
        TypeScriptEditor.prototype.handleClose = function () {
            _super.prototype.handleClose.call(this);

            // if error refresh is queued, cancel it, but keep a special value as a flag
            if (this._updateDiagnosticsTimeout) {
                if (this._updateDiagnosticsTimeout !== -1)
                    clearTimeout(this._updateDiagnosticsTimeout);

                this._updateDiagnosticsTimeout = -1;
            }

            if (this._delayedHandleCursorActivityTimeout) {
                clearTimeout(this._delayedHandleCursorActivityTimeout);
                this._delayedHandleCursorActivityTimeout = 0;
            }
        };

        /**
        * Storing changes for TypeScript incremental compilation/parsing,
        * queueing refresh of errors and code completion.
        */
        TypeScriptEditor.prototype.handleChange = function (change) {
            _super.prototype.handleChange.call(this, change);

            // convert change from CodeMirror to TypeScript format
            var doc = this.doc();
            var offset = doc.indexFromPos(change.from);

            var oldLength = this._totalLengthOfLines(change.removed);
            var newLength = this._totalLengthOfLines(change.text);

            var ch = new TypeScript.TextChangeRange(TypeScript.TextSpan.fromBounds(offset, offset + oldLength), newLength);

            // store the change for TypeScript
            this._bufferChanges.push(ch);

            this._delayedHandleChangeArg = change;
            if (this._delayedHandleChangeTimeout)
                clearTimeout(this._delayedHandleChangeTimeout);
            this._delayedHandleChangeTimeout = setTimeout(this._delayedHandleChangeClosure, 1);
        };

        TypeScriptEditor.prototype._delayedHandleChanges = function () {
            this._delayedHandleChangeTimeout = 0;
            var change = this._delayedHandleChangeArg;
            this._delayedHandleChangeArg = null;

            var doc = this.doc();
            var offset = doc.indexFromPos(change.from);

            this._clearSymbolMarks();

            var removedText = change.removed.join('\n');
            var addedText = change.text.join('\n');

            //console.log('[' + removedText.replace(/\n/g, '\\n') + '] -> [' + addedText.replace(/\n/g, '\\n') + '] - TextChangeRange:', this._bufferChanges[this._bufferChanges.length-1]);
            if (addedText === '.') {
                var codbg = this._typescript.service.getCompletionsAtPosition(this.docState.fullPath(), offset + addedText.length, true);
                this.triggerCompletion(true);
            } else if (addedText === ';' || addedText === '}' || addedText === '{}') {
                var codbg = this._typescript.service.getCompletionsAtPosition(this.docState.fullPath(), offset + addedText.length, true);

                //console.log('_formatOnKey');
                this._formatOnKey(addedText, removedText, change);
            } else if (addedText.length > 3 || addedText === '\n') {
                var codbg = this._typescript.service.getCompletionsAtPosition(this.docState.fullPath(), offset, true);

                //console.log('_formatOnPaste');
                this._formatOnPaste(addedText, removedText, change);
            }

            // trigger error refresh and completion
            this._triggerDiagnosticsUpdate();

            // trigger status update -- do it after normal reaction, so it settles a bit
            this._triggerStatusUpdate();
        };

        TypeScriptEditor.prototype.handleRemove = function () {
            delete this._typescript.scripts[this.docState.fullPath()];
        };

        TypeScriptEditor.prototype.handlePerformCompletion = function (forced, acceptSingle) {
            var _this = this;
            CodeMirror.showHint(this.editor(), function () {
                return _this._continueCompletion(forced);
            }, { completeSingle: acceptSingle });
        };

        TypeScriptEditor.prototype.handleCursorActivity = function () {
            if (this._docSymbolMarks.length) {
                var doc = this.doc();
                var cursorPos = doc.getCursor();

                this._triggerStatusUpdate();

                for (var i = 0; i < this._docSymbolMarks.length; i++) {
                    var mpos = this._docSymbolMarks[i].find();
                    if (!mpos)
                        continue;

                    if ((mpos.from.line < cursorPos.line || (mpos.from.line == cursorPos.line && mpos.from.ch <= cursorPos.ch)) && (mpos.to.line > cursorPos.line || (mpos.to.line == cursorPos.line && mpos.to.ch >= cursorPos.ch)))
                        return;
                }

                this._clearSymbolMarks();
            }

            if (this._updateSymbolMarksTimeout)
                clearTimeout(this._updateDiagnosticsTimeout);

            this._updateDiagnosticsTimeout = setTimeout(this._updateSymbolMarksClosure, TypeScriptEditor.symbolUpdateDelay);
        };

        TypeScriptEditor.prototype._triggerStatusUpdate = function () {
            if (this._delayedHandleCursorActivityTimeout)
                clearTimeout(this._delayedHandleCursorActivityTimeout);
            this._delayedHandleCursorActivityTimeout = setTimeout(this._delayedHandleCursorActivityClosure, 200);
        };

        TypeScriptEditor.prototype._delayedHandleCursorActivity = function () {
            this._delayedHandleCursorActivityTimeout = 0;

            this._updateStatusText();
        };

        TypeScriptEditor.prototype._updateStatusText = function () {
            var doc = this.doc();
            var cur = doc.getCursor();
            var offset = doc.indexFromPos(cur);

            var statusText = cur.line + ':' + cur.ch;
            var def = this._typescript.service.getTypeAtPosition(this.docState.fullPath(), offset);
            if (def)
                statusText += ' ' + def.kind + ' ' + def.memberName;

            var sig = this._typescript.service.getSignatureAtPosition(this.docState.fullPath(), offset);
            if (sig && sig.formal && sig.formal[sig.activeFormal]) {
                var sigg = sig.formal[sig.activeFormal];
                statusText += ' ' + sigg.signatureInfo + (sigg.docComment ? '\n/** ' + sigg.docComment + ' */' : '');
            } else if (def && def.docComment) {
                statusText += '\n/**' + def.docComment + '*/';
            }

            this.statusText(statusText);
        };

        TypeScriptEditor.prototype.debug = function () {
            var emits = this._typescript.service.getEmitOutput(this.docState.fullPath());
            for (var i = 0; i < emits.outputFiles.length; i++) {
                var e = emits.outputFiles[i];
                alert(e.name + '\n\n' + e.text);
            }
        };

        TypeScriptEditor.prototype.build = function () {
            this._typescript.log = [];

            var emits = this._typescript.service.getEmitOutput(this.docState.fullPath());

            if (this._typescript.log.length || emits.emitOutputResult !== 0 /* Succeeded */) {
                var msg = 'Building ' + this.docState.fullPath() + ' ' + emits.emitOutputResult + '\n' + this._typescript.log.map(function (msg) {
                    return msg.logLevel + ' ' + msg.text;
                }).join('\n');

                alert(msg);
            }

            this._typescript.log = null;

            for (var i = 0; i < emits.outputFiles.length; i++) {
                var ou = emits.outputFiles[i];
                return ou.text;
            }

            return null;
        };

        TypeScriptEditor.prototype._formatOnKey = function (addedText, removedText, change) {
            if (this._applyingEdits)
                return;
            var doc = this.doc();
            var offset = doc.indexFromPos(change.from);
            offset += addedText.length;

            var fullPath = this.docState.fullPath();
            var key = addedText.charAt(addedText.length - 1);

            var options = new TypeScript.Services.FormatCodeOptions();
            options.IndentSize = 2;
            options.TabSize = 2;
            options.ConvertTabsToSpaces = true;
            options.NewLineCharacter = '\n';

            var edits = this._typescript.service.getFormattingEditsAfterKeystroke(fullPath, offset, key, options);

            this._applyEdits(edits);
        };

        TypeScriptEditor.prototype._formatOnPaste = function (addedText, removedText, change) {
            if (this._applyingEdits)
                return;
            var doc = this.doc();
            var offset = doc.indexFromPos(change.from);

            var fullPath = this.docState.fullPath();
            var key = addedText.charAt(addedText.length - 1);

            var options = new TypeScript.Services.FormatCodeOptions();
            options.IndentSize = 2;
            options.TabSize = 2;
            options.ConvertTabsToSpaces = true;
            options.NewLineCharacter = '\n';

            var edits = this._typescript.service.getFormattingEditsOnPaste(fullPath, offset, offset + addedText.length, options);

            this._applyEdits(edits);
        };

        TypeScriptEditor.prototype._applyEdits = function (edits) {
            if (!edits.length)
                return;

            //console.log('_applyEdits('+edits.length+')...');
            this._applyingEdits = true;
            var doc = this.doc();
            var orderedEdits = edits.sort(function (e1, e2) {
                return e1.minChar < e2.minChar ? +1 : e1.minChar == e2.minChar ? 0 : -1;
            });
            for (var i = 0; i < orderedEdits.length; i++) {
                var e = orderedEdits[i];
                doc.replaceRange(e.text, doc.posFromIndex(e.minChar), doc.posFromIndex(e.limChar));
            }
            this._applyingEdits = false;
            //console.log('_applyEdits('+edits.length+') - complete.');
        };

        /**
        * Invoked from CodeMirror's completion logic
        * either at completion start, or on typing.
        * Expected to return a set of completions plus extra metadata.
        */
        TypeScriptEditor.prototype._continueCompletion = function (forced) {
            var _this = this;
            var editor = this.editor();
            var fullPath = this.docState.fullPath();
            var nh = this.getNeighborhood();

            var completions = this._typescript.service.getCompletionsAtPosition(fullPath, nh.offset, false);

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

            // filter by lead/prefix (case-insensitive)
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

            // TODO: consider maxCompletions while filtering, to avoid excessive processing of long lists
            // limit the size of the completion list
            if (filteredList.length > TypeScriptEditor.maxCompletions)
                filteredList.length = TypeScriptEditor.maxCompletions;

            // convert from TypeScript details objects to CodeMirror completion API shape
            var list = filteredList.map(function (e, index) {
                var details = _this._typescript.service.getCompletionEntryDetails(fullPath, nh.offset, e.name);
                return new CompletionItem(e, details, index, lead, tail);
            });

            if (list.length === 1 && list[0].text === lead && !forced && nh.tailLength == 0)
                list.length = 0; // no need to complete stuff that's already done

            if (list.length) {
                if (!this._completionActive) {
                    var onendcompletion = function () {
                        CodeMirror.off(editor, 'endCompletion', onendcompletion);
                        setTimeout(function () {
                            // clearing _completionActive bit and further completions
                            // (left with delay to settle possible race with change handling)
                            _this._completionActive = false;
                            _this.cancelCompletion();
                        }, 1);
                    };

                    // first completion result: set _completionActive bit
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

        TypeScriptEditor.prototype._triggerDiagnosticsUpdate = function () {
            if (this._updateDiagnosticsTimeout)
                clearTimeout(this._updateDiagnosticsTimeout);

            this._updateDiagnosticsTimeout = setTimeout(this._updateDiagnosticsClosure, TypeScriptEditor.updateDiagnosticsDelay);
        };

        TypeScriptEditor.prototype._updateDiagnostics = function () {
            var _this = this;
            this._updateDiagnosticsTimeout = 0;

            this._syntacticDiagnostics = this._typescript.service.getSyntacticDiagnostics(this.docState.fullPath());

            setTimeout(function () {
                if (_this._updateDiagnosticsTimeout)
                    return;

                _this._semanticDiagnostics = _this._typescript.service.getSemanticDiagnostics(_this.docState.fullPath());
                setTimeout(function () {
                    if (_this._updateDiagnosticsTimeout)
                        return;

                    _this._updateGutter();
                    _this._updateDocDiagnostics();
                }, 10);
            }, 10);
        };

        TypeScriptEditor.prototype._updateDocDiagnostics = function () {
            var doc = this.doc();
            for (var i = 0; i < this._docErrorMarks.length; i++) {
                this._docErrorMarks[i].clear();
            }
            this._docErrorMarks = [];

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

        TypeScriptEditor.prototype._clearSymbolMarks = function () {
            for (var i = 0; i < this._docSymbolMarks.length; i++) {
                this._docSymbolMarks[i].clear();
            }
            this._docSymbolMarks = [];
            this._currentSymbolMarkIndex = -1;
        };

        TypeScriptEditor.prototype._updateSymbolMarks = function () {
            this._updateSymbolMarksTimeout = 0;

            var doc = this.doc();
            var cursorPos = doc.getCursor();
            var cursorOffset = doc.indexFromPos(cursorPos);

            var fullPath = this.docState.fullPath();
            var symbols = this._typescript.service.getOccurrencesAtPosition(fullPath, cursorOffset);

            if (!symbols)
                return;
            var existingMarks = [];
            var orderedSymbols = symbols.sort(function (s1, s2) {
                return s1.minChar < s2.minChar ? -1 : s1.minChar > s2.minChar ? 1 : 0;
            });
            for (var i = 0; i < orderedSymbols.length; i++) {
                var s = symbols[i];
                if (fullPath !== s.fileName)
                    continue;

                if (existingMarks[s.minChar])
                    continue;
                existingMarks[s.minChar] = true;

                var from = doc.posFromIndex(s.minChar);
                var to = doc.posFromIndex(s.limChar);

                var cls = 'teapo-symbol teapo-symbol-nocursor';
                if (s.minChar <= cursorOffset && s.limChar >= cursorOffset) {
                    cls = 'teapo-symbol teapo-symbol-cursor';
                    this._currentSymbolMarkIndex = i;
                }

                var m = doc.markText(from, to, {
                    className: cls
                });

                this._docSymbolMarks.push(m);
            }
        };

        TypeScriptEditor.prototype.jumpSymbol = function (direction) {
            if (this._updateSymbolMarksTimeout) {
                clearTimeout(this._updateSymbolMarksTimeout);
                this._updateSymbolMarksTimeout = 0;

                this._updateSymbolMarks();
            }

            if (!this._docSymbolMarks.length || this._currentSymbolMarkIndex < 0)
                return;

            var doc = this.doc();
            var cursorPos = doc.getCursor();
            var currentMark = this._docSymbolMarks[this._currentSymbolMarkIndex];
            var currentMarkPos = currentMark.find();
            var innerOffset = doc.indexFromPos(cursorPos) - doc.indexFromPos(currentMarkPos.from);

            var newMarkIndex = this._currentSymbolMarkIndex + direction;
            if (newMarkIndex >= this._docSymbolMarks.length)
                newMarkIndex = 0;
            else if (newMarkIndex < 0)
                newMarkIndex = this._docSymbolMarks.length - 1;

            var newMark = this._docSymbolMarks[newMarkIndex];
            var newMarkPos = newMark.find();

            var newCursorPos = doc.posFromIndex(doc.indexFromPos(newMarkPos.from) + innerOffset);

            currentMark.clear();
            newMark.clear();

            var updatedCurrentMark = doc.markText(currentMarkPos.from, currentMarkPos.to, { className: 'teapo-symbol teapo-symbol-nocursor' });
            var updatedNewMark = doc.markText(newMarkPos.from, newMarkPos.to, { className: 'teapo-symbol teapo-symbol-cursor' });

            this._docSymbolMarks[this._currentSymbolMarkIndex] = updatedCurrentMark;
            this._docSymbolMarks[newMarkIndex] = updatedNewMark;

            this._currentSymbolMarkIndex = newMarkIndex;

            doc.setCursor(newCursorPos);
        };

        TypeScriptEditor.prototype._markDocError = function (error, className, doc) {
            var from = { line: error.line(), ch: error.character() };
            var to = { line: error.line(), ch: from.ch + error.length() };

            var m = doc.markText(from, to, {
                className: className,
                title: error.text()
            });
            this._docErrorMarks.push(m);
        };

        TypeScriptEditor.prototype._updateGutter = function () {
            var editor = this.editor();

            editor.clearGutter('teapo-errors');

            var gutterElement = this._getTeapoErrorsGutterElement();

            var gutterClassName = 'teapo-errors';
            var lineErrors = [];

            var sources = [
                { kind: 'syntax', errors: this._syntacticDiagnostics },
                { kind: 'semantic', errors: this._semanticDiagnostics }
            ];

            for (var iSrc = 0; iSrc < sources.length; iSrc++) {
                var src = sources[iSrc];

                if (src.errors.length)
                    gutterClassName += ' teapo-errors-' + src.kind;

                for (var i = 0; i < src.errors.length; i++) {
                    var err = src.errors[i];
                    var info = err.info();

                    var lnerr = lineErrors[err.line()];
                    var text = '[' + TypeScript.DiagnosticCategory[info.category] + '] ' + err.text();
                    if (lnerr) {
                        lnerr.text += '\n' + text;
                    } else {
                        lnerr = { text: text, classNames: {} };
                        lineErrors[err.line()] = lnerr;
                    }

                    lnerr.classNames['teapo-gutter-' + src.kind + '-error'] = '';
                }
            }

            function createClickHandler(text) {
                return function () {
                    return alert(text);
                };
            }

            for (var i = 0; i < lineErrors.length; i++) {
                var lnerr = lineErrors[i];
                if (!lnerr)
                    continue;

                var errorElement = document.createElement('div');
                errorElement.className = Object.keys(lnerr.classNames).join(' ');
                errorElement.title = lnerr.text;

                errorElement.onclick = createClickHandler(lnerr.text);

                editor.setGutterMarker(i, 'teapo-errors', errorElement);
            }

            gutterElement.className = gutterClassName;
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
        TypeScriptEditor.updateDiagnosticsDelay = 2000;
        TypeScriptEditor.maxCompletions = 20;
        TypeScriptEditor.symbolUpdateDelay = 3000;
        return TypeScriptEditor;
    })(teapo.CompletionCodeMirrorEditor);

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

            if (this._completionEntryDetails && this._completionEntryDetails.type) {
                var typeSpan = document.createElement('span');
                typeSpan.textContent = ' : ' + this._completionEntryDetails.type;
                typeSpan.style.opacity = '0.7';
                element.appendChild(typeSpan);
            }

            if (this._completionEntryDetails && this._completionEntryDetails.docComment) {
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

    function comparePos(a, b) {
        if (a.line < b.line)
            return -1;
        if (a.line === b.line && a.ch < b.ch)
            return -1;
        if (a.line === b.line && a.ch === b.ch)
            return 0;
        return 1;
    }

    function rangeContains(range, pos) {
        return comparePos(pos, range.from) <= 0 && comparePos(pos, range.to) >= 0;
    }

    (function (EditorType) {
        EditorType.TypeScript = new TypeScriptEditorType();
    })(teapo.EditorType || (teapo.EditorType = {}));
    var EditorType = teapo.EditorType;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
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
            return new teapo.CodeMirrorEditor(this._shared, docState);
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

        FileList.prototype.treeClick = function (data_unused, event) {
            var src = event.srcElement;
            while (src) {
                var data = ko.dataFor(src);
                if (data && typeof data.handleClick === 'function') {
                    data.handleClick();
                    return;
                }
            }
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
            this.isExpanded = ko.observable(false);
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
            this.toggleExpand();
            this._handleClick();
        };

        RuntimeFolderEntry.prototype.toggleExpand = function () {
            this.isExpanded(this.isExpanded() ? false : true);
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
var teapo;
(function (teapo) {
    (function (files) {
        /**
        * Node in the project tree widget representing a file as a ViewModel for Knockout.js.
        */
        var FileEntry = (function () {
            function FileEntry(/** May be null for a file in the root directory. */
            parent, /** Simple name (without path but with fot-extension if any). See also path for full path. */
            name) {
                this.parent = parent;
                this.name = name;
                /** Meant as read-only for KO bindings. Modified internally, when clicking handlers are processed.. */
                this.isSelected = ko.observable(false);
                /** Meant as read-only for KO bindings. Modified by DocumentHandler for this file. */
                this.iconClass = ko.observable('teapo-default-file-icon');
                this.path = parent ? (parent.path + name) : ('/' + name);
            }
            return FileEntry;
        })();
        files.FileEntry = FileEntry;
    })(teapo.files || (teapo.files = {}));
    var files = teapo.files;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (_files) {
        /**
        * Whole file tree ViewModel for Knockout.js.
        */
        var FileList = (function () {
            function FileList(files) {
                /** Immediate children of the root folder. */
                this.folders = ko.observableArray([]);
                /** Files in the root folder. */
                this.files = ko.observableArray([]);
                /** Selected FileEntry (null if nothing is selected). */
                this.selectedFile = ko.observable(null);
                this._fileByPath = {};
                if (files) {
                    for (var i = 0; i < files.length; i++) {
                        this.file(files[i]);
                    }
                }
            }
            /** Get or create file entry for a path. Creating FileEntry doesn't affect actual stored files, that is managed elsewhere. */
            FileList.prototype.file = function (path) {
                var entry = this._fileByPath[path];
                if (entry)
                    return entry;

                var pathParts = _files.normalizePath(path);
                if (!pathParts.length)
                    return null;

                var folder;
                for (var i = 0; i < pathParts.length - 1; i++) {
                    folder = this._addOrGetFolderEntry(pathParts[i], folder);
                }

                entry = this._addFileEntry(pathParts[pathParts.length - 1], folder);

                this._fileByPath[entry.path] = entry;

                return entry;
            };

            FileList.prototype._addOrGetFolderEntry = function (name, parent) {
                var _this = this;
                var folders = parent ? parent.folders : this.folders;
                var result = teapo.find(folders(), function (f, index) {
                    if (f.name < name)
                        return;
                    if (f.name === name)
                        return f;
                    var result = _this._createFolderEntry(parent, name);
                    folders.splice(index, 0, result);
                    return result;
                });
                if (!result) {
                    result = this._createFolderEntry(parent, name);
                    folders.push(result);
                }
                return result;
            };

            FileList.prototype._addFileEntry = function (name, parent) {
                var _this = this;
                var siblings = parent ? parent.files : this.files;

                var result = teapo.find(siblings(), function (f, index) {
                    if (f.name < name)
                        return;
                    if (f.name === name)
                        return f;
                    var result = _this._createChildFileEntry(parent, name);
                    siblings.splice(index, 0, result);
                    return result;
                });

                if (!result) {
                    result = this._createChildFileEntry(parent, name);
                    siblings.push(result);
                }

                return result;
            };

            FileList.prototype._createFolderEntry = function (parent, name) {
                var f = new _files.FolderEntry(parent, name);
                return f;
            };

            FileList.prototype._createChildFileEntry = function (parent, name) {
                var f = new _files.FileEntry(parent, name);
                return f;
            };
            return FileList;
        })();
        _files.FileList = FileList;
    })(teapo.files || (teapo.files = {}));
    var files = teapo.files;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (files) {
        /**
        * Node in the project tree widget representing a folder as a ViewModel for Knockout.js.
        * Note that root folder is not represented a a folder.
        */
        var FolderEntry = (function () {
            function FolderEntry(parent, name) {
                this.parent = parent;
                this.name = name;
                /** List of subfolders in this folder. */
                this.folders = ko.observableArray([]);
                /** List of files in this folder (not including files in subfolders). */
                this.files = ko.observableArray([]);
                /** Expand state for tree node, preserved even if parent folder is being collapsed. */
                this.isExpanded = ko.observable(false);
                /** Whether selected file is in this folder. Meant to be read-only from KO. */
                this.containsSelection = ko.observable(false);
                /** Color is computed from the name hash. Meant to assign shades of color pseudo-randomly to improve visual navigation. */
                this.color = '';
                this.path = parent ? (parent.path + name + '/') : ('/' + name + '/');
                this.color = FolderEntry.calculateColor(this.name);
            }
            /** Function used to calculate pseudo-random color. Exposed for easier testing. */
            FolderEntry.calculateColor = function (name) {
                var chan = [1, 1, 1];

                var dist = 29;
                if (name) {
                    for (var i = 0; i < name.length; i++) {
                        var ch = i % 3;
                        var v = name.charCodeAt(i) % dist;
                        var range = 1 / Math.floor(1 + i / 3);
                        var chValue = v * range / dist;
                        chan[i] -= chValue;
                    }
                }

                var delta = 37;
                var r = chan[0], g = chan[1], b = chan[2];
                r = 255 - delta + delta * r;
                g = 255 - delta + delta * g;
                b = 255 - delta + delta * b;
                var color = (r << 16) + (g << 8) + b;
                color = color | 0x1000000;

                var colorText = '#' + color.toString(16).slice(1);
                return colorText;
            };
            return FolderEntry;
        })();
        files.FolderEntry = FolderEntry;
    })(teapo.files || (teapo.files = {}));
    var files = teapo.files;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (files) {
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
        files.normalizePath = normalizePath;

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
    })(teapo.files || (teapo.files = {}));
    var files = teapo.files;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    function addEventListener(element, type, listener) {
        if (element.addEventListener) {
            element.addEventListener(type, listener);
        } else {
            var ontype = 'on' + type;

            if (element.attachEvent) {
                element.attachEvent('on' + type, listener);
            } else if (element[ontype]) {
                element[ontype] = listener;
            }
        }
    }
    teapo.addEventListener = addEventListener;

    function addEventListenerWithDelay(element, type, listener) {
        var queued = false;
        var storedEvent;

        var listenerClosure = function () {
            queued = false;
            listener(storedEvent);
            storedEvent = null;
        };

        addEventListener(element, type, function (event) {
            storedEvent = event;
            if (!queued) {
                queued = true;
                if (typeof requestAnimationFrame === 'function')
                    requestAnimationFrame(listenerClosure);
                else
                    setTimeout(listenerClosure, 1);
            }
        });
    }
    teapo.addEventListenerWithDelay = addEventListenerWithDelay;

    function find(array, predicate) {
        var result = null;
        for (var i = 0; i < array.length; i++) {
            var x = array[i];
            var p = predicate(x, i);
            if (p)
                return p;
        }
    }
    teapo.find = find;
})(teapo || (teapo = {}));
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
    function openStorage(handler, forceLoadFromDom) {
        if (typeof forceLoadFromDom === "undefined") { forceLoadFromDom = false; }
        try  {
            throw null;
        } catch (e) {
        }
        var storage = new RuntimeDocumentStorage(handler, forceLoadFromDom);
    }
    teapo.openStorage = openStorage;

    

    

    

    var RuntimeDocumentStorage = (function () {
        function RuntimeDocumentStorage(handler, forceLoadFromDom) {
            var _this = this;
            this.handler = handler;
            this.document = null;
            this._metadataElement = null;
            this._metadataProperties = null;
            this._docByPath = {};
            this._executeSql = null;
            this._insertMetadataSql = '';
            this._updateMetadataSql = '';
            this._savingCache = new FileSavingCache();
            this.savingFiles = this._savingCache.savingFiles;
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
                    var errorCallbackSafe = function (t, e) {
                        alert(e + ' ' + e.message + '\n' + sqlStatement + '\n' + args);
                        errorCallback(t, e);
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
                    if (!metadataTableExists || forceLoadFromDom) {
                        _this._loadInitialStateFromDom(pathElements);
                        return;
                    }

                    var domEdited = _this._metadataElement ? safeParseInt(_this._metadataElement.getAttribute('edited')) : null;

                    loadPropertiesFromWebSql('*metadata', _this._metadataElement, _this._metadataProperties, _this._executeSql, function (sqlError) {
                        if (sqlError) {
                            _this.handler.documentStorageCreated(new Error('loadPropertiesFromWebSql:*metadata: ' + sqlError.message), null);
                            return;
                        }

                        var wsEdited = safeParseInt(_this._metadataProperties.edited);
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
            var _this = this;
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
                if (existingProperty) {
                    this._savingCache.beginSave('*metadata');
                    this._executeSql(this._updateMetadataSql, [value, name], function (t, result) {
                        _this._savingCache.endSave('*metadata');
                        if (name !== 'edited')
                            _this.setProperty('edited', Date.now());
                    }, function (t, sqlError) {
                        alert('setProperty(' + name + ',' + value + ') ' + _this._updateMetadataSql + ' [' + value + ',' + name + '] ' + sqlError.message);
                        _this._savingCache.endSave('*metadata');
                    });
                } else {
                    this._savingCache.beginSave('*metadata');
                    this._executeSql(this._insertMetadataSql, [name, value], function (t, result) {
                        _this._savingCache.endSave('*metadata');
                        if (name !== 'edited')
                            _this.setProperty('edited', Date.now());
                    }, function (t, sqlError) {
                        alert('setProperty(' + name + ',' + value + ') ' + _this._insertMetadataSql + ' [' + name + ',' + value + '] ' + sqlError.message);
                        _this._savingCache.endSave('*metadata');
                    });
                }
            }
        };

        RuntimeDocumentStorage.prototype._loadInitialStateFromDom = function (pathElements) {
            var _this = this;
            this.handler.setStatus('Loading files from HTML...');
            setTimeout(function () {
                return _this._loadInitialStateFromDomCore(pathElements);
            }, 1);
        };

        RuntimeDocumentStorage.prototype._loadInitialStateFromDomCore = function (pathElements) {
            var _this = this;
            /** pull from DOM assuming webSQL state is clean of any tables */
            var loadInClearState = function () {
                var fullPathList = Object.keys(pathElements);
                var addedFileCount = 0;

                var completedAdding = function () {
                    if (_this._executeSql) {
                        _this.handler.setStatus('Loading files from HTML: ' + addedFileCount + ' of ' + fullPathList.length + '... metadata...');
                        _this._executeSql('CREATE TABLE "*metadata" (name TEXT, value TEXT)', [], function (tr, r) {
                            _this.handler.documentStorageCreated(null, _this);
                        }, function (tr, e) {
                            alert('create *metadata ' + e.message);
                        });
                    } else {
                        _this.handler.documentStorageCreated(null, _this);
                    }
                };

                var continueAdding = function () {
                    if (addedFileCount === fullPathList.length) {
                        completedAdding();
                        return;
                    }

                    var fullPath = fullPathList[addedFileCount];
                    var s = pathElements[fullPath];

                    var docState = new RuntimeDocumentState(fullPath, s, _this._executeSql, _this, null);

                    _this._docByPath[fullPath] = docState;

                    addedFileCount++;
                    _this.handler.setStatus('Loading files from HTML: ' + addedFileCount + ' of ' + fullPathList.length + '...');

                    setTimeout(continueAdding, 1);
                };

                continueAdding();
            };

            if (this._executeSql) {
                this.handler.setStatus('Loading files from HTML: deleting cached data...');
                this._dropAllTables(function (sqlError) {
                    if (sqlError) {
                        _this.handler.documentStorageCreated(new Error('Deleting existing table ' + sqlError.message), null);
                        return;
                    }

                    loadInClearState();
                });
            } else {
                loadInClearState();
            }
        };

        RuntimeDocumentStorage.prototype._dropAllTables = function (completed) {
            var _this = this;
            this._loadTableListFromWebsql(function (tableList) {
                if (!tableList || !tableList.length) {
                    completed(null);
                    return;
                }

                var deletedCount = 0;
                var failed = false;
                for (var i = 0; i < tableList.length; i++) {
                    _this._executeSql('DROP TABLE "' + tableList[i] + '"', [], function (tr, r) {
                        deletedCount++;
                        _this.handler.setStatus('Loading files from HTML: deleting cached data (' + deletedCount + ' of ' + tableList.length + ')...');
                        if (deletedCount == tableList.length)
                            completed(null);
                    }, function (tr, error) {
                        if (!failed) {
                            failed = true;
                            completed(error);
                        }
                    });
                }
            });
        };

        RuntimeDocumentStorage.prototype._loadInitialStateFromWebSql = function (pathElements) {
            var _this = this;
            this.handler.setStatus('Loading files from temporary storage...');

            setTimeout(function () {
                return _this._loadInitialStateFromWebSqlCore(pathElements);
            }, 1);
        };

        RuntimeDocumentStorage.prototype._loadInitialStateFromWebSqlCore = function (pathElements) {
            var _this = this;
            // retrieving data from WebSQL and creating documents
            this._loadTableListFromWebsql(function (tables) {
                var files = tables.filter(function (tab) {
                    return tab.charAt(0) === '/' || tab.charAt(0) === '#';
                });
                var completedFileCount = 0;

                var continueAdding = function () {
                    var fullPath = files[completedFileCount];

                    var s = pathElements[fullPath];
                    if (s) {
                        removeAttributes(s);
                        delete pathElements[fullPath]; // all remaining elements will be destroyed
                    } else {
                        s = appendScriptElement(_this.document);
                        s.setAttribute('data-path', fullPath);
                    }

                    var docState = new RuntimeDocumentState(fullPath, s, _this._executeSql, _this, function () {
                        completedFileCount++;
                        _this.handler.setStatus('Loading files from temporary storage: ' + completedFileCount + ' of ' + files.length + '...');

                        if (completedFileCount === files.length) {
                            for (var k in pathElements)
                                if (pathElements.hasOwnProperty(k)) {
                                    var s = pathElements[k];
                                    removeScriptElement(s);
                                }

                            _this.handler.documentStorageCreated(null, _this);
                        } else {
                            setTimeout(continueAdding, 1);
                        }
                    });

                    _this._docByPath[fullPath] = docState;
                };

                continueAdding();
            });
        };

        RuntimeDocumentStorage.prototype._scanDomScripts = function () {
            var pathElements = {};

            for (var i = 0; i < document.scripts.length; i++) {
                var s = document.scripts[i];
                var path = s.getAttribute('data-path');
                if (typeof path === 'string' && path.length > 0) {
                    if (path.charAt(0) === '/' || path.charAt(0) === '#') {
                        pathElements[path] = s;
                    }
                } else if (s.id === 'storageMetadata') {
                    this._metadataElement = s;
                }
            }

            for (var i = 0; i < document.styleSheets.length; i++) {
                var sty = document.styleSheets.item(i).ownerNode;
                var path = sty.getAttribute('data-path');
                if (typeof path === 'string' && path.length > 0) {
                    if (path.charAt(0) === '/' || path.charAt(0) === '#') {
                        pathElements[path] = sty;
                    }
                }
            }

            return pathElements;
        };

        RuntimeDocumentStorage.prototype._loadTableListFromWebsql = function (callback) {
            var _this = this;
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
            }, function (t, error) {
                _this.handler.documentStorageCreated(new Error('_loadTableListFromWebsql ' + sql + ' ' + error.message), null);
            });
        };
        return RuntimeDocumentStorage;
    })();

    var FileSavingCache = (function () {
        function FileSavingCache() {
            this.savingFiles = ko.observableArray();
            this._cache = {};
        }
        FileSavingCache.prototype.beginSave = function (fullPath) {
            var num = this._cache[fullPath];
            if (num) {
                this._cache[fullPath]++;
            } else {
                this.savingFiles.push(fullPath);
                this._cache[fullPath] = 1;
            }
        };

        FileSavingCache.prototype.endSave = function (fullPath) {
            var _this = this;
            setTimeout(function () {
                var num = _this._cache[fullPath];
                if (!num || !(num - 1)) {
                    delete _this._cache[fullPath];
                    _this.savingFiles.remove(fullPath);
                } else {
                    _this._cache[fullPath]--;
                }
            }, 400);
        };
        return FileSavingCache;
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
            var _this = this;
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
                if (existingProperty) {
                    this._storage._savingCache.beginSave(this.fullPath());
                    this._executeSql(this._updateSql, [value, name], function (tr, r) {
                        _this._storage._savingCache.endSave(_this.fullPath());
                        return;
                    }, function (tr, e) {
                        alert(_this._fullPath + ' setProperty(' + name + ',' + value + ') ' + _this._updateSql + ' ' + e.message);
                        _this._storage._savingCache.endSave(_this.fullPath());
                    });
                } else {
                    this._executeSql(this._insertSql, [name, value], function (tr, r) {
                        _this._storage._savingCache.endSave(_this.fullPath());
                        return;
                    }, function (tr, e) {
                        alert(_this._fullPath + 'setProperty(' + name + ',' + value + ') ' + _this._insertSql + ' ' + e.message);
                        _this._storage._savingCache.endSave(_this.fullPath());
                    });
                }
            }

            this._storage.setProperty('edited', Date.now());
        };

        RuntimeDocumentState.prototype._removeStorage = function () {
            var _this = this;
            if (this._editor)
                this._editor.remove();

            removeScriptElement(this._storeElement);

            if (this._executeSql) {
                this._executeSql('DROP TABLE "' + this._fullPath + '"', null, function (tr, r) {
                    return null;
                }, function (tr, e) {
                    alert('drop table ' + _this._fullPath + ' ' + e.message);
                });
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
        doc.body.insertBefore(s, doc.body.children[0]);
        return s;
    }

    function removeScriptElement(script) {
        var keepElement;
        if (script.tagName.toLowerCase() === 'style') {
            keepElement = true;
        } else if (script.tagName.toLowerCase() === 'script') {
            var type = script.getAttribute('type');
            if (!type || type.indexOf('javascript') > 0) {
                keepElement = true;
            } else {
                if (script.id === 'page-template' || script.id === 'folder-template' || script.id === 'file-template')
                    keepElement = true;
            }
        }

        if (keepElement) {
            script.removeAttribute('data-path');
        } else {
            script.parentElement.removeChild(script);
        }
    }

    function loadPropertiesFromDom(tableName, script, properties, executeSql) {
        function afterCreateTable(after) {
            if (executeSql) {
                executeSql('CREATE TABLE "' + tableName + '" ( name TEXT, value TEXT)', [], function (tr, r) {
                    after();
                }, null);
            } else {
                after();
            }
        }

        afterCreateTable(function () {
            var insertSQL = 'INSERT INTO "' + tableName + '" (name, value) VALUES(?,?)';

            for (var i = 0; i < script.attributes.length; i++) {
                var a = script.attributes.item(i);

                if (a.name === 'id' || a.name === 'data-path' || a.name === 'type')
                    continue;

                properties[a.name] = a.value;

                if (executeSql) {
                    executeSql(insertSQL, [a.name, a.value], function (tr, r) {
                        return;
                    }, function (tr, e) {
                        alert('loadPropertiesFromDom(' + tableName + ') ' + insertSQL + ' [' + a.name + ',' + a.value + '] ' + e.message);
                    });
                }
            }

            // restore HTML-safe conversions
            var contentStr = decodeFromInnerHTML(script.innerHTML);
            properties[''] = contentStr;
            if (executeSql)
                executeSql(insertSQL, ['', contentStr], function (tr, r) {
                    return;
                }, function (tr, e) {
                    alert('loadPropertiesFromDom(' + tableName + ') ' + insertSQL + ' [,' + contentStr + '] ' + e.message);
                });
        });
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

            completed(null);
        }, function (t, sqlError) {
            completed(sqlError);
        });
    }

    function removeAttributes(element) {
        for (var i = 0; i < element.attributes.length; i++) {
            var a = element.attributes[i];
            if (a.name === 'id' || a.name === 'type' || a.name === 'data-path')
                continue;
            element.removeAttribute(a.name);
            i--;
        }
    }

    /**
    * Escape unsafe character sequences like a closing script tag.
    */
    function encodeForInnerHTML(content) {
        // matching script closing tag with *one* or more consequtive slashes
        return content.replace(/<\/+script/g, function (match) {
            return '</' + match.slice(1);
        });
    }
    teapo.encodeForInnerHTML = encodeForInnerHTML;

    /**
    * Unescape character sequences wrapped with encodeForInnerHTML for safety.
    */
    function decodeFromInnerHTML(innerHTML) {
        // matching script closing tag with *t*wo or more consequtive slashes
        return innerHTML.replace(/<\/\/+script/g, function (match) {
            return '<' + match.slice(2);
        });
    }
    teapo.decodeFromInnerHTML = decodeFromInnerHTML;
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
            this.toolbarExpanded = ko.observable(false);
            this.statusText = ko.observable('ready.');
            this._selectedDocState = null;
            this._editorElement = null;
            this._editorHost = null;
            this._saveTimeout = 0;
            this._saveSelectedFileClosure = function () {
                return _this._invokeSaveSelectedFile();
            };
            this.savingFiles = this._storage.savingFiles;

            this.fileList = new teapo.FileList(this._storage);

            this.fileList.selectedFile.subscribe(function (fileEntry) {
                return _this._fileSelected(fileEntry);
            });

            // loading editors for all the files
            var allFilenames = this._storage.documentNames();
            allFilenames.sort();
            for (var i = 0; i < allFilenames.length; i++) {
                var docState = this._storage.getDocument(allFilenames[i]);
                docState.editor();
            }
        }
        ApplicationShell.prototype.keyDown = function (self, e) {
            switch (e.keyCode) {
                case 78:
                    if (e.cmdKey || e.ctrlKey || e.altKey) {
                        this.newFileClick();

                        if (e.preventDefault)
                            e.preventDefault();
                        if ('cancelBubble' in e)
                            e.cancelBubble = true;
                        return false;
                    }
                    break;
            }
            return true;
        };

        ApplicationShell.prototype.toggleToolbar = function () {
            this.toolbarExpanded(this.toolbarExpanded() ? false : true);
        };

        ApplicationShell.prototype.loadText = function () {
            this._loadToDoc(function (fileReader, file) {
                return fileReader.readAsText(file);
            }, function (data, docState) {
                return docState.setProperty(null, data);
            });
        };

        ApplicationShell.prototype.loadBase64 = function () {
            this._loadToDoc(function (fileReader, file) {
                return fileReader.readAsArrayBuffer(file);
            }, function (data, docState) {
                var binary = [];
                var bytes = new Uint8Array(data);
                var len = bytes.byteLength;
                for (var i = 0; i < len; i++) {
                    binary.push(String.fromCharCode(bytes[i]));
                }
                var text = window.btoa(binary.join(''));

                docState.setProperty(null, text);
            });
        };

        ApplicationShell.prototype.loadZip = function () {
            var _this = this;
            this._load(function (fileReader, file) {
                return fileReader.readAsArrayBuffer(file);
            }, function (data, file) {
                zip.useWebWorkers = false;
                zip.createReader(new zip.BlobReader(file), function (reader) {
                    reader.getEntries(function (entries) {
                        var folder = prompt('Add ' + entries.length + ' files from zip to a virtual folder:', '/');

                        if (!folder)
                            return;

                        if (folder.charAt(0) !== '/')
                            folder = '/' + folder;
                        if (folder.charAt(folder.length - 1) !== '/')
                            folder = folder + '/';

                        var completeCount = 0;
                        var overwriteCount = 0;
                        entries.forEach(function (entry) {
                            if (entry.directory)
                                return;

                            var writer = new zip.TextWriter();
                            entry.getData(writer, function (text) {
                                var virtFilename = folder + entry.filename;

                                var isOverwrite = false;

                                var fileEntry = _this.fileList.getFileEntry(virtFilename);
                                if (fileEntry)
                                    isOverwrite = true;
                                else
                                    fileEntry = _this.fileList.createFileEntry(virtFilename);

                                var docStorage = _this._storage.getDocument(fileEntry.fullPath());
                                if (docStorage)
                                    isOverwrite = true;
                                else
                                    docStorage = _this._storage.createDocument(fileEntry.fullPath());

                                docStorage.setProperty(null, text);

                                completeCount++;
                                if (isOverwrite)
                                    overwriteCount++;

                                if (completeCount == entries.length) {
                                    alert(completeCount + ' imported into ' + folder + (overwriteCount ? ', ' + overwriteCount + ' existing files overwritten' : ''));
                                }
                            });
                        });
                    });
                }, function (error) {
                    alert('Zip file error: ' + error);
                });
            });
        };

        ApplicationShell.prototype.showTests = function () {
            var testContainer = document.createElement('div');
            testContainer.style.position = 'fixed';
            testContainer.style.left = testContainer.style.top = testContainer.style.right = testContainer.style.bottom = '2em';
            testContainer.style.border = 'solid 1px silver';
            testContainer.style.background = 'white';
            testContainer.style.overflow = 'auto';
            testContainer.style.padding = '1em';
            var closeButton = document.createElement('button');
            closeButton.textContent = closeButton.innerText = ' x ';
            closeButton.style.float = 'right';
            testContainer.appendChild(closeButton);
            var host = document.body;
            host.appendChild(testContainer);
            closeButton.onclick = function () {
                host.removeChild(testContainer);
            };

            var testbed = document.createElement('div');
            testContainer.appendChild(testbed);
            testbed.textContent = 'ok ok ok';

            var tests = new teapo.tests.TestPage();

            ko.renderTemplate('TestPage', tests, null, testbed);

            this.toolbarExpanded(false);
        };

        ApplicationShell.prototype._load = function (requestLoad, processData) {
            this.toolbarExpanded(false);

            var input = document.createElement('input');
            input.type = 'file';

            input.onchange = function () {
                if (!input.files || !input.files.length)
                    return;

                var fileReader = new FileReader();
                fileReader.onerror = function (error) {
                    alert('read ' + error.message);
                };
                fileReader.onloadend = function () {
                    if (fileReader.readyState !== 2) {
                        alert('read ' + fileReader.readyState + fileReader.error);
                        return;
                    }

                    processData(fileReader.result, input.files[0]);
                };

                requestLoad(fileReader, input.files[0]);
            };

            input.click();
        };

        ApplicationShell.prototype._loadToDoc = function (requestLoad, applyData) {
            var _this = this;
            this._load(requestLoad, function (data, file) {
                try  {
                    var filename = prompt('Suggested filename:', file.name);

                    if (!filename)
                        return;

                    var fileEntry = _this.fileList.createFileEntry(filename);
                    var docStorage = _this._storage.createDocument(fileEntry.fullPath());

                    applyData(data, docStorage);
                } catch (error) {
                    alert('parsing ' + error.message + ' ' + error.stack);
                }
            });
        };

        /**
        * Prompts user for a name, creates a new file and opens it in the editor.
        * Exposed as a button bound using Knockout.
        */
        ApplicationShell.prototype.newFileClick = function () {
            this.toolbarExpanded(false);

            var fileName = prompt('New file');
            if (!fileName)
                return;

            var fileEntry = this.fileList.createFileEntry(fileName);
            this._storage.createDocument(fileEntry.fullPath());

            // expand to newly created
            var folder = fileEntry.parent();
            while (folder) {
                folder.isExpanded(true);
                folder = folder.parent();
            }

            fileEntry.handleClick();
        };

        /**
        * Pops a confirmation dialog up, then deletes the currently selected file.
        * Exposed as a button bound using Knockout.
        */
        ApplicationShell.prototype.deleteSelectedFile = function () {
            this.toolbarExpanded(false);

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
            var currentFileName = decodeURI(urlParts[urlParts.length - 1]);
            var lastDot = currentFileName.indexOf('.');
            if (lastDot > 0) {
                currentFileName = currentFileName.slice(0, lastDot) + '.html';
            } else {
                currentFileName += '.html';
            }
            return currentFileName;
        };

        /**
        * Triggers a download of the whole current HTML, which contains the filesystem state and all the necessary code.
        * Relies on blob URLs, doesn't work in old browsers.
        * Exposed as a button bound using Knockout.
        */
        ApplicationShell.prototype.saveHtml = function () {
            this.toolbarExpanded(false);

            var filename = this.saveFileName();
            var blob = new Blob(['<!doctype html>\n', document.documentElement.outerHTML], { type: 'application/octet-stream' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.setAttribute('download', filename);
            try  {
                // safer save method, supposed to work with FireFox
                var evt = document.createEvent("MouseEvents");
                evt.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                a.dispatchEvent(evt);
            } catch (e) {
                a.click();
            }
        };

        /**
        * Packs the current filesystem content in a zip, then triggers a download.
        * Relies on blob URLs and Zip.js, doesn't work in old browsers.
        * Exposed as a button bound using Knockout.
        */
        ApplicationShell.prototype.saveZip = function () {
            var _this = this;
            this.toolbarExpanded(false);

            zip.useWebWorkers = false;
            var filename = this.saveFileName();
            if (filename.length > '.html'.length && filename.slice(filename.length - '.html'.length).toLowerCase() === '.html')
                filename = filename.slice(0, filename.length - '.html'.length);
            else if (filename.length > '.htm'.length && filename.slice(filename.length - '.htm'.length).toLowerCase() === '.htm')
                filename = filename.slice(0, filename.length - '.htm'.length);
            filename += '.zip';

            var blobWriter = new zip.BlobWriter();
            zip.createWriter(blobWriter, function (zipWriter) {
                var files = _this._storage.documentNames();
                var completedCount = 0;

                var zipwritingCompleted = function () {
                    zipWriter.close(function (blob) {
                        var url = URL.createObjectURL(blob);
                        var a = document.createElement('a');
                        a.href = url;
                        a.setAttribute('download', filename);
                        a.click();
                    });
                };

                var continueWriter = function () {
                    if (completedCount === files.length) {
                        zipwritingCompleted();
                        return;
                    }

                    var docState = _this._storage.getDocument(files[completedCount]);
                    var content = docState.getProperty(null);

                    var zipRelativePath = files[completedCount].slice(1);

                    zipWriter.add(zipRelativePath, new zip.TextReader(content), function () {
                        completedCount++;

                        setTimeout(continueWriter, 1);
                    });
                };

                continueWriter();
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
                newEditorElement = newDocState.editor().open(onchanged, this.statusText);
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
var teapo;
(function (teapo) {
    (function (storage) {
        (function (attached) {
            (function (_indexedDB) {
                var DetectStorage = (function () {
                    function DetectStorage(_window) {
                        if (typeof _window === "undefined") { _window = window; }
                        this._window = _window;
                    }
                    DetectStorage.prototype.detectStorageAsync = function (uniqueKey, callback) {
                        if (!this._window.indexedDB) {
                            callback(new Error('No indexedDB object exposed from window.'), null);
                            return;
                        }

                        if (typeof this._window.indexedDB.open !== 'function') {
                            callback(new Error('No open method exposed on indexedDB object.'), null);
                            return;
                        }

                        var dbName = uniqueKey || 'teapo';

                        var openRequest = this._window.indexedDB.open(dbName, 1);
                        openRequest.onerror = function (errorEvent) {
                            return callback(_indexedDB.wrapErrorEvent(errorEvent, 'detectStorageAsync-open'), null);
                        };

                        openRequest.onupgradeneeded = function (versionChangeEvent) {
                            var db = openRequest.result;
                            var filesStore = db.createObjectStore('files', { keyPath: 'path' });
                            var metadataStore = db.createObjectStore('metadata', { keyPath: 'property' });
                        };

                        openRequest.onsuccess = function (event) {
                            var db = openRequest.result;

                            var transaction = db.transaction('metadata');
                            transaction.onerror = function (errorEvent) {
                                return callback(_indexedDB.wrapErrorEvent(errorEvent, 'detectStorageAsync-openRequest.onsuccess-transaction'), null);
                            };

                            var metadataStore = transaction.objectStore('metadata');

                            var editedUTCRequest = metadataStore.get('editedUTC');
                            editedUTCRequest.onerror = function (errorEvent) {
                                callback(null, new _indexedDB.LoadStorage(null, db));
                            };

                            editedUTCRequest.onsuccess = function (event) {
                                var result = editedUTCRequest.result;
                                callback(null, new _indexedDB.LoadStorage(result && typeof result.value === 'number' ? result.value : null, db));
                            };
                        };
                    };
                    return DetectStorage;
                })();
                _indexedDB.DetectStorage = DetectStorage;
            })(attached.indexedDB || (attached.indexedDB = {}));
            var indexedDB = attached.indexedDB;
        })(storage.attached || (storage.attached = {}));
        var attached = storage.attached;
    })(teapo.storage || (teapo.storage = {}));
    var storage = teapo.storage;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (storage) {
        (function (attached) {
            (function (indexedDB) {
                var LoadStorage = (function () {
                    function LoadStorage(editedUTC, _db) {
                        this.editedUTC = editedUTC;
                        this._db = _db;
                    }
                    LoadStorage.prototype.load = function (recipient) {
                        var _this = this;
                        var transaction = this._db.transaction('files');
                        transaction.onerror = function (errorEvent) {
                            return recipient.failed(indexedDB.wrapErrorEvent(errorEvent, 'load: transaction'));
                        };
                        var filesStore = transaction.objectStore('files');
                        var cursorRequest = filesStore.openCursor();
                        cursorRequest.onerror = function (errorEvent) {
                            return recipient.failed(indexedDB.wrapErrorEvent(errorEvent, 'load: objectStore-openCursor'));
                        };
                        cursorRequest.onsuccess = function (event) {
                            var cursor = cursorRequest.result;

                            if (!cursor) {
                                recipient.completed(new indexedDB.UpdateStorage(_this._db));
                                return;
                            }

                            var result = cursor.value;
                            if (result && result.properties) {
                                recipient.file(result.path, result.properties);
                            }

                            cursor['continue']();
                        };
                    };

                    LoadStorage.prototype.migrate = function (editedUTC, filesByName, callback) {
                        var _this = this;
                        var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');
                        transaction.onerror = function (errorEvent) {
                            return callback(indexedDB.wrapErrorEvent(errorEvent, 'migrate: transaction'), null);
                        };
                        var filesStore = transaction.objectStore('files');
                        var clearFiles = filesStore.clear();
                        clearFiles.onerror = function (errorEvent) {
                            return callback(indexedDB.wrapErrorEvent(errorEvent, 'migrate: objectStore(files)-clear'), null);
                        };
                        clearFiles.onsuccess = function (event) {
                            var metadataStore = transaction.objectStore('metadata');
                            var clearMetadata = metadataStore.clear();
                            clearMetadata.onerror = function (errorEvent) {
                                return callback(indexedDB.wrapErrorEvent(errorEvent, 'migrate: objectStore(files)/clear-objectStore(metadata)-clear'), null);
                            };
                            clearMetadata.onsuccess = function (event) {
                                var putEditedUTC = metadataStore.put({ property: 'editedUTC', value: editedUTC });
                                putEditedUTC.onerror = function (errorEvent) {
                                    return callback(indexedDB.wrapErrorEvent(errorEvent, 'migrate: objectStore(files)/clear-objectStore(metadata)/clear-put(' + editedUTC + ')'), null);
                                };
                                putEditedUTC.onsuccess = function (event) {
                                    var filenames = [];
                                    for (var k in filesByName)
                                        if (filesByName.hasOwnProperty(k)) {
                                            filenames.push(k);
                                        }

                                    if (!filenames.length) {
                                        var update = new indexedDB.UpdateStorage(_this._db);
                                        callback(null, update);
                                        return;
                                    }

                                    var completedFiles = 0;
                                    var anyError = false;
                                    filenames.forEach(function (file) {
                                        if (anyError)
                                            return;

                                        var fileData = { path: file, properties: filesByName[file] };
                                        var putFile = filesStore.put(fileData);
                                        putFile.onerror = function (errorEvent) {
                                            if (anyError)
                                                return;
                                            anyError = true;
                                            callback(indexedDB.wrapErrorEvent(errorEvent, ''), null);
                                        };
                                        putFile.onsuccess = function (event) {
                                            completedFiles++;

                                            if (completedFiles === filenames.length) {
                                                var update = new indexedDB.UpdateStorage(_this._db);
                                                callback(null, update);
                                            }
                                        };
                                    });
                                };
                            };
                        };
                    };
                    return LoadStorage;
                })();
                indexedDB.LoadStorage = LoadStorage;
            })(attached.indexedDB || (attached.indexedDB = {}));
            var indexedDB = attached.indexedDB;
        })(storage.attached || (storage.attached = {}));
        var attached = storage.attached;
    })(teapo.storage || (teapo.storage = {}));
    var storage = teapo.storage;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (storage) {
        (function (attached) {
            (function (indexedDB) {
                var UpdateStorage = (function () {
                    function UpdateStorage(_db) {
                        this._db = _db;
                    }
                    UpdateStorage.prototype.update = function (file, property, value, callback) {
                        var _this = this;
                        var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');
                        transaction.onerror = function (errorEvent) {
                            return callback(indexedDB.wrapErrorEvent(errorEvent, 'update: transaction'));
                        };
                        var filesStore = transaction.objectStore('files');
                        var getFile = filesStore.get(file);
                        getFile.onerror = function (errorEvent) {
                            return callback(indexedDB.wrapErrorEvent(errorEvent, 'update: objectStore(files).get(' + file + ')'));
                        };
                        getFile.onsuccess = function (event) {
                            var fileData = getFile.result || { path: file, properties: {} };
                            var properties = fileData.properties || (fileData.properties = {});
                            properties[property] = value;

                            var putFile = filesStore.put(fileData);
                            putFile.onerror = function (errorEvent) {
                                return callback(indexedDB.wrapErrorEvent(errorEvent, 'update: objectStore(files).get(' + file + ')-put(' + property + ',' + value + ')'));
                            };
                            putFile.onsuccess = function (event) {
                                return _this._updateEditedUTC(Date.now(), transaction, function (errorEvent) {
                                    return callback(indexedDB.wrapErrorEvent(errorEvent, 'update: _updateEditedUTC'));
                                });
                            };
                        };
                    };

                    UpdateStorage.prototype.remove = function (file, callback) {
                        var _this = this;
                        var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');
                        transaction.onerror = function (errorEvent) {
                            return callback(indexedDB.wrapErrorEvent(errorEvent, 'update: transaction'));
                        };
                        var filesStore = transaction.objectStore('files');
                        var deleteFile = filesStore['delete'](file);
                        deleteFile.onerror = function (errorEvent) {
                            return callback(indexedDB.wrapErrorEvent(errorEvent, 'update: objectStore(files).get(' + file + ')'));
                        };
                        deleteFile.onsuccess = function (event) {
                            return _this._updateEditedUTC(Date.now(), transaction, function (errorEvent) {
                                return callback(indexedDB.wrapErrorEvent(errorEvent, 'update: _updateEditedUTC'));
                            });
                        };
                    };

                    UpdateStorage.prototype._updateEditedUTC = function (now, transaction, callback) {
                        var metadataStore = transaction.objectStore('metadata');

                        var metadataData = { property: 'editedUTC', value: Date.now() };
                        var putMetadata = metadataStore.put(metadataData);
                        putMetadata.onerror = function (errorEvent) {
                            return callback(errorEvent);
                        };
                        putMetadata.onsuccess = function (event) {
                            return callback(null);
                        };
                    };
                    return UpdateStorage;
                })();
                indexedDB.UpdateStorage = UpdateStorage;
            })(attached.indexedDB || (attached.indexedDB = {}));
            var indexedDB = attached.indexedDB;
        })(storage.attached || (storage.attached = {}));
        var attached = storage.attached;
    })(teapo.storage || (teapo.storage = {}));
    var storage = teapo.storage;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (storage) {
        (function (attached) {
            (function (indexedDB) {
                function wrapErrorEvent(errorEvent, details) {
                    if (!errorEvent)
                        return null;

                    return new Error(details + ' ' + errorEvent.message + ' ' + errorEvent.lineno);
                }
                indexedDB.wrapErrorEvent = wrapErrorEvent;
            })(attached.indexedDB || (attached.indexedDB = {}));
            var indexedDB = attached.indexedDB;
        })(storage.attached || (storage.attached = {}));
        var attached = storage.attached;
    })(teapo.storage || (teapo.storage = {}));
    var storage = teapo.storage;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (_storage) {
        (function (attached) {
            (function (_localStorage) {
                var DetectStorage = (function () {
                    function DetectStorage(_window) {
                        if (typeof _window === "undefined") { _window = window; }
                        this._window = _window;
                    }
                    DetectStorage.prototype.detectStorageAsync = function (uniqueKey, callback) {
                        var localStorage = this._window.localStorage;

                        if (!localStorage) {
                            callback(new Error('Browser does not expose localStorage.'), null);
                            return;
                        }

                        var absentFunctions = [];
                        if (typeof localStorage.length !== 'number')
                            absentFunctions.push('length');
                        if (!localStorage.getItem)
                            absentFunctions.push('getItem');
                        if (!localStorage.setItem)
                            absentFunctions.push('setItem');
                        if (!localStorage.removeItem)
                            absentFunctions.push('removeItem');

                        if (absentFunctions.length) {
                            callback(new Error('Incorrect shape of localStorage (' + absentFunctions.join(', ') + ' ' + (absentFunctions.length == 1 ? 'is' : 'are') + ' absent).'), null);
                            return;
                        }

                        var storage = new _localStorage.LoadStorage(uniqueKey, localStorage);
                        callback(null, storage);
                    };
                    return DetectStorage;
                })();
                _localStorage.DetectStorage = DetectStorage;
            })(attached.localStorage || (attached.localStorage = {}));
            var localStorage = attached.localStorage;
        })(_storage.attached || (_storage.attached = {}));
        var attached = _storage.attached;
    })(teapo.storage || (teapo.storage = {}));
    var storage = teapo.storage;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (storage) {
        (function (attached) {
            (function (localStorage) {
                var LoadStorage = (function () {
                    function LoadStorage(uniqueKey, _localStorage) {
                        this._localStorage = _localStorage;
                        this._prefix = uniqueKey ? uniqueKey + '#' : 'teapo#';

                        var editedValue = this._localStorage.getItem(this._prefix + '#edited');
                        if (editedValue) {
                            try  {
                                this.editedUTC = parseInt(editedValue);
                            } catch (parseError) {
                            }
                        }
                    }
                    LoadStorage.prototype.load = function (recipient) {
                        var docs = {};

                        for (var i = 0; i < this._localStorage.length; i++) {
                            var key = this._localStorage.key(i);
                            if (!startsWith(key, this._prefix))
                                continue;

                            var starPos = key.indexOf('*', this._prefix.length);
                            if (starPos < 0)
                                continue;

                            var filename = key.slice(this._prefix.length, starPos);
                            var propertyName = key.slice(starPos + 1);
                            var value = this._localStorage.getItem(key);

                            var doc = docs[filename] || (docs[filename] = {});
                            doc[propertyName] = value;
                        }

                        for (var k in docs)
                            if (docs.hasOwnProperty(k)) {
                                recipient.file(k, docs[k]);
                            }

                        recipient.completed(new localStorage.UpdateStorage(this._prefix, this._localStorage, this._prefix + '#edited'));
                    };

                    LoadStorage.prototype.migrate = function (editedUTC, filesByName, callback) {
                        var _this = this;
                        // will remove all unneeded entries after collecting
                        var validKeys = {};

                        for (var file in filesByName)
                            if (filesByName.hasOwnProperty(file)) {
                                var properties = filesByName[file];
                                for (var propertyName in properties)
                                    if (properties.hasOwnProperty(propertyName)) {
                                        var value = properties[propertyName];

                                        var key = this._prefix + file + '*' + propertyName;
                                        this._localStorage.setItem(key, value);
                                        validKeys[key] = true;
                                    }
                            }

                        // clean entries that don't match filesByName
                        var removeKeys = [];
                        for (var i = 0; i < this._localStorage.length; i++) {
                            var key = this._localStorage.key(i);
                            if (!validKeys[key])
                                removeKeys.push(key);
                        }

                        removeKeys.forEach(function (rk) {
                            return _this._localStorage.removeItem(rk);
                        });

                        var editedKey = this._prefix + '#edited';
                        this._localStorage.setItem(editedKey, editedUTC.toString());

                        callback(null, new localStorage.UpdateStorage(this._prefix, this._localStorage, editedKey));
                    };
                    return LoadStorage;
                })();
                localStorage.LoadStorage = LoadStorage;
            })(attached.localStorage || (attached.localStorage = {}));
            var localStorage = attached.localStorage;
        })(storage.attached || (storage.attached = {}));
        var attached = storage.attached;
    })(teapo.storage || (teapo.storage = {}));
    var storage = teapo.storage;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (storage) {
        (function (attached) {
            (function (localStorage) {
                var UpdateStorage = (function () {
                    function UpdateStorage(_prefix, _localStorage, _editedKey) {
                        this._prefix = _prefix;
                        this._localStorage = _localStorage;
                        this._editedKey = _editedKey;
                        this._nameCache = {};
                    }
                    UpdateStorage.prototype.update = function (file, propertyName, value, callback) {
                        var cacheLine = this._nameCache[file] || (this._nameCache[file] = {});
                        var key = cacheLine[propertyName] || (cacheLine[propertyName] = this._prefix + file + '*' + propertyName);
                        this._localStorage.setItem(key, value);

                        this._updateEdited(Date.now());

                        if (callback)
                            callback(null);
                    };

                    UpdateStorage.prototype.remove = function (file, callback) {
                        var _this = this;
                        var removeKeys = [];
                        var prefix = this._prefix + file + '*';
                        for (var i = 0; i < this._localStorage.length; i++) {
                            var key = this._localStorage.key(i);
                            if (startsWith(key, prefix))
                                removeKeys.push(key);
                        }

                        removeKeys.forEach(function (k) {
                            return _this._localStorage.removeItem(k);
                        });
                        delete this._nameCache[file];

                        this._updateEdited(Date.now());

                        if (callback)
                            callback(null);
                    };

                    UpdateStorage.prototype._updateEdited = function (editedUTC) {
                        this._localStorage.setItem(this._editedKey, editedUTC.toString());
                    };
                    return UpdateStorage;
                })();
                localStorage.UpdateStorage = UpdateStorage;
            })(attached.localStorage || (attached.localStorage = {}));
            var localStorage = attached.localStorage;
        })(storage.attached || (storage.attached = {}));
        var attached = storage.attached;
    })(teapo.storage || (teapo.storage = {}));
    var storage = teapo.storage;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (storage) {
        (function (attached) {
            (function (webSQL) {
                var DetectStorage = (function () {
                    function DetectStorage(_window) {
                        if (typeof _window === "undefined") { _window = window; }
                        this._window = _window;
                    }
                    DetectStorage.prototype.detectStorageAsync = function (uniqueKey, callback) {
                        var openDatabase = this._window.openDatabase;

                        if (!openDatabase) {
                            callback(new Error('Browser does not expose openDatabase.'), null);
                            return;
                        }

                        if (typeof openDatabase !== 'function') {
                            callback(new Error('Function type expected for openDatabase (' + (typeof openDatabase) + ' found).'), null);
                            return;
                        }

                        var dbName = uniqueKey || 'teapo';
                        var db = openDatabase(dbName, 1, 'Teapo virtual filesystem data', 1024 * 1024);

                        db.readTransaction(function (transaction) {
                            transaction.executeSql('SELECT value from "*metadata" WHERE name=\'edited\'', [], function (transaction, result) {
                                var editedValue = null;
                                if (result.rows && result.rows.length === 1) {
                                    var editedValueStr = result.rows.item(0).value;
                                    if (typeof editedValueStr === 'string') {
                                        try  {
                                            editedValue = parseInt(editedValueStr);
                                        } catch (error) {
                                        }
                                    }
                                }

                                callback(null, new webSQL.LoadStorage(editedValue, db, true));
                            }, function (transaction, sqlError) {
                                // no data
                                callback(null, new webSQL.LoadStorage(null, db, false));
                            });
                        }, function (sqlError) {
                            callback(webSQL.wrapSQLError(sqlError, 'SELECT FROM *metadata'), null);
                        });
                    };
                    return DetectStorage;
                })();
                webSQL.DetectStorage = DetectStorage;
            })(attached.webSQL || (attached.webSQL = {}));
            var webSQL = attached.webSQL;
        })(storage.attached || (storage.attached = {}));
        var attached = storage.attached;
    })(teapo.storage || (teapo.storage = {}));
    var storage = teapo.storage;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (storage) {
        (function (attached) {
            (function (webSQL) {
                var LoadStorage = (function () {
                    function LoadStorage(editedUTC, _db, _metadataTableExists) {
                        this.editedUTC = editedUTC;
                        this._db = _db;
                        this._metadataTableExists = _metadataTableExists;
                    }
                    LoadStorage.prototype.load = function (recipient) {
                        var _this = this;
                        if (typeof this.editedUTC !== 'number') {
                            this._createUpdateStorage([], function (error, update) {
                                if (error)
                                    recipient.failed(error);
                                else
                                    recipient.completed(update);
                            });
                            return;
                        }

                        this._db.readTransaction(function (transaction) {
                            webSQL.listAllTables(transaction, function (tableNames) {
                                return _this._processTableNames(transaction, tableNames, recipient);
                            }, function (sqlError) {
                                return recipient.failed(webSQL.wrapSQLError(sqlError, 'load: listAllTables'));
                            });
                        }, function (sqlError) {
                            return recipient.failed(webSQL.wrapSQLError(sqlError, 'load: readTransaction'));
                        });
                    };

                    LoadStorage.prototype.migrate = function (editedUTC, filesByName, callback) {
                        var _this = this;
                        this._db.transaction(function (transaction) {
                            _this._dropAllTables(transaction, function (error) {
                                if (error) {
                                    callback(webSQL.wrapSQLError(error, 'migrate:dropAllTables'), null);
                                    return;
                                }

                                var migratedTables = 0;
                                var anyError = false;
                                var filenames = [];

                                for (var file in filesByName)
                                    if (filesByName.hasOwnProperty(file)) {
                                        filenames.push(file);
                                    }

                                var completeMigration = function () {
                                    // all tables deleted, so metadata does not exist
                                    _this._createMetadata(transaction, function () {
                                        return webSQL.updateEdited(editedUTC, transaction, function (sqlError) {
                                            if (sqlError) {
                                                callback(webSQL.wrapSQLError(sqlError, 'migrate: updateEdited(' + editedUTC + ')'), null);
                                            } else {
                                                _this._createUpdateStorage(filenames, callback);
                                            }
                                        });
                                    }, function (sqlError) {
                                        return callback(webSQL.wrapSQLError(sqlError, 'migrate: _createMetadata'), null);
                                    });
                                };

                                if (!filenames.length) {
                                    completeMigration();
                                    return;
                                }

                                filenames.forEach(function (file) {
                                    _this._migrateTable(transaction, file, filesByName[file], function (sqlError) {
                                        if (error) {
                                            if (!anyError) {
                                                anyError = true;
                                                callback(webSQL.wrapSQLError(error, 'migrate: _migrateTable(' + file + ')'), null);
                                            }
                                            return;
                                        }

                                        migratedTables++;

                                        if (!anyError && migratedTables === filenames.length) {
                                            completeMigration();
                                        }
                                    });
                                });
                            });
                        }, function (sqlError) {
                            return callback(webSQL.wrapSQLError(sqlError, 'migrate: transaction'), null);
                        });
                    };

                    LoadStorage.prototype._createUpdateStorage = function (fileNames, callback) {
                        var _this = this;
                        if (this._metadataTableExists) {
                            callback(null, new webSQL.UpdateStorage(this._db, fileNames));
                            return;
                        }

                        this._db.transaction(function (transaction) {
                            return _this._createMetadata(transaction, function () {
                                return callback(null, new webSQL.UpdateStorage(_this._db, fileNames));
                            }, function (sqlError) {
                                return callback(webSQL.wrapSQLError(sqlError, '_createUpdateStorage: _createMetadata'), null);
                            });
                        }, function (sqlError) {
                            return callback(webSQL.wrapSQLError(sqlError, '_createUpdateStorage: transaction'), null);
                        });
                    };

                    LoadStorage.prototype._createMetadata = function (transaction, callback, errorCallback) {
                        var _this = this;
                        transaction.executeSql('CREATE TABLE "*metadata" (name PRIMARY KEY, value)', [], function (transaction, result) {
                            _this._metadataTableExists = true;
                            callback();
                        }, function (tranaction, sqlError) {
                            return errorCallback(sqlError);
                        });
                    };

                    LoadStorage.prototype._dropAllTables = function (transaction, callback) {
                        var _this = this;
                        webSQL.listAllTables(transaction, function (allTableNames) {
                            var tableNames = allTableNames;

                            if (!tableNames.length) {
                                _this._metadataTableExists = false;
                                callback(null);
                                return;
                            }

                            var anyError = false;
                            var dropped = 0;
                            tableNames.forEach(function (table) {
                                return transaction.executeSql('DROP TABLE "' + table + '"', [], function (transaction, result) {
                                    if (anyError)
                                        return;
                                    dropped++;
                                    if (dropped === tableNames.length) {
                                        _this._metadataTableExists = false;
                                        callback(null);
                                    }
                                }, function (transaction, sqlError) {
                                    if (anyError)
                                        return;
                                    anyError = true;
                                    callback(sqlError);
                                });
                            });
                        }, callback);
                    };

                    LoadStorage.prototype._migrateTable = function (transaction, file, properties, callback) {
                        transaction.executeSql('CREATE TABLE "' + webSQL.mangleDatabaseObjectName(file) + '" (name PRIMARY KEY, value)', [], function (transaction, result) {
                            var updateSql = 'INSERT INTO "' + webSQL.mangleDatabaseObjectName(file) + '" (name,value) VALUES (?,?)';

                            var propertiesToUpdate = 0;
                            var updatedProperties = 0;
                            var allPropertiesPassed = false;
                            var anyError = false;

                            for (var propertyName in properties)
                                if (properties.hasOwnProperty(propertyName)) {
                                    var value = properties[propertyName];

                                    propertiesToUpdate++;

                                    transaction.executeSql(updateSql, [propertyName, value], function (transaction, result) {
                                        updatedProperties++;
                                        if (!anyError && allPropertiesPassed && updatedProperties === propertiesToUpdate)
                                            callback(null);
                                    }, function (transaction, sqlError) {
                                        if (anyError)
                                            return;
                                        anyError = true;
                                        callback(sqlError);
                                    });
                                }

                            allPropertiesPassed = true;
                            if (!anyError && updatedProperties == propertiesToUpdate)
                                callback(null);
                        }, function (transaction, sqlError) {
                            return callback(sqlError);
                        });
                    };

                    LoadStorage.prototype._processTableNames = function (transaction, tableNames, recipient) {
                        var _this = this;
                        var ftab = tableNames.map(function (table) {
                            return {
                                table: table,
                                file: webSQL.unmangleDatabaseObjectName(table)
                            };
                        }).filter(function (ft) {
                            return ft.file;
                        });

                        if (!ftab.length) {
                            recipient.completed(new webSQL.UpdateStorage(this._db, []));
                            return;
                        }

                        var anyError = false;
                        var reportedFileCount = 0;

                        ftab.forEach(function (ft) {
                            transaction.executeSql('SELECT * FROM "' + ft.table + '"', [], function (transaction, result) {
                                if (anyError)
                                    return;

                                var properties = _this._extractFileProperties(result);

                                recipient.file(ft.file, properties);
                                reportedFileCount++;

                                if (reportedFileCount === ftab.length)
                                    _this._createUpdateStorage(ftab.map(function (ft) {
                                        return ft.file;
                                    }), function (error, update) {
                                        if (error)
                                            recipient.failed(error);
                                        else
                                            recipient.completed(update);
                                    });
                            }, function (transaction, sqlError) {
                                anyError = true;
                                recipient.failed(webSQL.wrapSQLError(sqlError, '_processTableNames: SELECT FROM ' + ft.table));
                            });
                        });
                    };

                    LoadStorage.prototype._extractFileProperties = function (result) {
                        var properties = {};
                        if (result.rows) {
                            for (var i = 0; i < result.rows.length; i++) {
                                var row = result.rows.item(i);
                                properties[row.name] = webSQL.fromSqlText(row.value);
                            }
                        }

                        return properties;
                    };
                    return LoadStorage;
                })();
                webSQL.LoadStorage = LoadStorage;
            })(attached.webSQL || (attached.webSQL = {}));
            var webSQL = attached.webSQL;
        })(storage.attached || (storage.attached = {}));
        var attached = storage.attached;
    })(teapo.storage || (teapo.storage = {}));
    var storage = teapo.storage;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (storage) {
        (function (attached) {
            (function (webSQL) {
                var UpdateStorage = (function () {
                    function UpdateStorage(_db, existingFiles) {
                        var _this = this;
                        this._db = _db;
                        this._cachedUpdateStatementsByFile = {};
                        this._unhandledClosure = function (e) {
                            return _this.unhandledSQLError(e);
                        };
                        this._unhandledTransClosure = function (t, e) {
                            return _this.unhandledSQLError(e);
                        };
                        existingFiles.forEach(function (file) {
                            return _this._createUpdateStatement(file);
                        });
                    }
                    UpdateStorage.prototype.update = function (file, property, value, callback) {
                        var _this = this;
                        var updateSQL = this._cachedUpdateStatementsByFile[file];
                        if (typeof updateSQL === 'string') {
                            this._updateCore(updateSQL, property, value, callback);
                        } else {
                            this._createTable(webSQL.mangleDatabaseObjectName(file), function (transaction) {
                                updateSQL = _this._createUpdateStatement(file);
                                _this._updateCore(updateSQL, property, value, callback);
                            }, function (sqlError) {
                                return callback(webSQL.wrapSQLError(sqlError, 'update: _createTable'));
                            });
                        }
                    };

                    UpdateStorage.prototype.remove = function (file, callback) {
                        this._db.transaction(function (transaction) {
                            return transaction.executeSql('DROP TABLE "' + webSQL.mangleDatabaseObjectName(file) + '"', [], function (transaction, result) {
                                return webSQL.updateEdited(Date.now(), transaction, function (sqlError) {
                                    return callback(webSQL.wrapSQLError(sqlError, 'remove: updateEdited'));
                                });
                            }, function (transaction, sqlError) {
                                return callback(webSQL.wrapSQLError(sqlError, 'remove: DROP TABLE ~' + file));
                            });
                        }, function (sqlError) {
                            return callback(webSQL.wrapSQLError(sqlError, 'remove: transaction'));
                        });
                    };

                    UpdateStorage.prototype.unhandledSQLError = function (sqlError) {
                        if (typeof console !== 'undefined' && console && console.error)
                            console.error(sqlError);
                    };

                    UpdateStorage.prototype._updateCore = function (updateSQL, property, value, callback) {
                        var sqlCallback = function (sqlError) {
                            return callback(sqlError ? webSQL.wrapSQLError(sqlError, '_updateCore: ' + updateSQL) : null);
                        };
                        this._db.transaction(function (transaction) {
                            return transaction.executeSql(updateSQL, [property, webSQL.toSqlText(value)], function (transaction, result) {
                                return webSQL.updateEdited(Date.now(), transaction, sqlCallback);
                            }, function (transaction, sqlError) {
                                return sqlCallback(sqlError);
                            });
                        });
                    };

                    UpdateStorage.prototype._createUpdateStatement = function (file) {
                        return this._cachedUpdateStatementsByFile[file] = 'INSERT OR REPLACE INTO "' + webSQL.mangleDatabaseObjectName(file) + '" VALUES (?,?)';
                    };

                    UpdateStorage.prototype._createTable = function (tableName, callback, errorCallback) {
                        if (typeof errorCallback === "undefined") { errorCallback = this._unhandledClosure; }
                        this._db.transaction(function (transaction) {
                            return transaction.executeSql('CREATE TABLE "' + tableName + '" (name PRIMARY KEY, value)', [], function (transaction, result) {
                                return callback(transaction);
                            }, function (transaction, error) {
                                return errorCallback(error);
                            });
                        }, errorCallback);
                    };
                    return UpdateStorage;
                })();
                webSQL.UpdateStorage = UpdateStorage;
            })(attached.webSQL || (attached.webSQL = {}));
            var webSQL = attached.webSQL;
        })(storage.attached || (storage.attached = {}));
        var attached = storage.attached;
    })(teapo.storage || (teapo.storage = {}));
    var storage = teapo.storage;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (storage) {
        (function (attached) {
            (function (webSQL) {
                function mangleDatabaseObjectName(name) {
                    return '=' + btoa(name);
                }
                webSQL.mangleDatabaseObjectName = mangleDatabaseObjectName;

                function unmangleDatabaseObjectName(name) {
                    if (!name || name.charAt(0) !== '=')
                        return null;

                    try  {
                        return atob(name.slice(1));
                    } catch (error) {
                        return null;
                    }
                }
                webSQL.unmangleDatabaseObjectName = unmangleDatabaseObjectName;

                function wrapSQLError(sqlError, context) {
                    if (!sqlError)
                        return null;
                    return new Error(context + ' ' + sqlError.message + ' [' + sqlError.code + ']');
                }
                webSQL.wrapSQLError = wrapSQLError;

                function listAllTables(transaction, callback, errorCallback) {
                    transaction.executeSql('SELECT tbl_name  from sqlite_master WHERE type=\'table\'', [], function (transaction, result) {
                        var tables = [];
                        for (var i = 0; i < result.rows.length; i++) {
                            var row = result.rows.item(i);
                            var table = row.tbl_name;
                            if (!table || (table[0] !== '*' && table.charAt(0) !== '='))
                                continue;
                            tables.push(row.tbl_name);
                        }
                        callback(tables);
                    }, function (transaction, sqlError) {
                        return errorCallback(sqlError);
                    });
                }
                webSQL.listAllTables = listAllTables;

                function updateEdited(editedUTC, transaction, callback) {
                    transaction.executeSql('INSERT OR REPLACE INTO "*metadata" VALUES(\'edited\',?)', [editedUTC.toString()], function (transaction, result) {
                        return callback(null);
                    }, function (transaction, sqlError) {
                        return callback(sqlError);
                    });
                }
                webSQL.updateEdited = updateEdited;

                function toSqlText(text) {
                    if (text.indexOf('\u00FF') < 0 && text.indexOf('\u0000') < 0)
                        return text;

                    return text.replace(/\u00FF/g, '\u00FFf').replace(/\u0000/g, '\u00FF0');
                }
                webSQL.toSqlText = toSqlText;

                function fromSqlText(sqlText) {
                    if (sqlText.indexOf('\u00FF') < 0 && sqlText.indexOf('\u0000') < 0)
                        return sqlText;

                    return sqlText.replace(/\u00FFf/g, '\u00FF').replace(/\u00FF0/g, '\u0000');
                }
                webSQL.fromSqlText = fromSqlText;
            })(attached.webSQL || (attached.webSQL = {}));
            var webSQL = attached.webSQL;
        })(storage.attached || (storage.attached = {}));
        var attached = storage.attached;
    })(teapo.storage || (teapo.storage = {}));
    var storage = teapo.storage;
})(teapo || (teapo = {}));
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='ko.ts' />
/// <reference path='shell.ts' />
/// <reference path='editor-std.ts' />
/// <reference path='editor-x-ts.ts' />
/// <reference path='editor-x-html.ts' />
/// <reference path='editor-x-js.ts' />
/// <reference path='editor-x-css.ts' />
(function () {
    var loadingDiv = document.createElement('div');
    loadingDiv.className = 'teapo-boot';
    loadingDiv.textContent = loadingDiv.innerText = 'Loading...';

    var pageElement = null;

    for (var i = 0; i < document.body.childNodes.length; i++) {
        var e = document.body.childNodes.item(i);
        if (e && e.tagName && e.tagName.toLowerCase() && e.className && e.className.indexOf('teapo-page') >= 0) {
            pageElement = e;
            pageElement.appendChild(loadingDiv);
            break;
        }
    }

    function start() {
        loadingDiv.textContent = 'Loading storage...';

        var storage = null;
        var viewModel = null;

        pageElement.appendChild(loadingDiv);

        function storageLoaded() {
            loadingDiv.textContent += ' rendering...';

            setTimeout(function () {
                teapo.registerKnockoutBindings(ko);
                teapo.EditorType.Html.storageForBuild = storage;

                viewModel = new teapo.ApplicationShell(storage);
                window.debugShell = viewModel;

                ko.renderTemplate('page-template', viewModel, null, pageElement);
            }, 1);
        }

        var forceLoadFromDom = window.location.hash && window.location.hash.toLowerCase() === '#resettodom';

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
            },
            setStatus: function (text) {
                return loadingDiv.textContent = text;
            }
        }, forceLoadFromDom);
    }

    if (window.addEventListener) {
        window.addEventListener('load', start, true);
    } else {
        window.onload = start;
    }
})();
var teapo;
(function (teapo) {
    (function (tests) {
        var TestCase = (function () {
            function TestCase(name, _this_, _test) {
                this.name = name;
                this._this_ = _this_;
                this._test = _test;
                this.state = ko.observable(0 /* NotStarted */);
                this.runtime = ko.observable(null);
                this.failure = ko.observable(null);
                this._started = -1;
                this.async = this._test.length ? true : false;
            }
            TestCase.prototype.start = function (callback) {
                if (this.state() !== 0 /* NotStarted */)
                    throw new Error('Test case already started (' + TestCase.State[this.state()] + ').');

                if (this.async) {
                    this._startAsync(callback);
                } else {
                    this._startSync();
                    if (callback)
                        callback();
                }
            };

            TestCase.prototype.updateTimes = function (now) {
                if (this.state() === 1 /* Running */)
                    this.runtime(now - this._started);
            };

            TestCase.prototype._startSync = function () {
                this.state(1 /* Running */);
                this.runtime(0);
                this._started = Date.now();

                var failure;
                var failed = false;
                try  {
                    this._test.apply(this._this_);
                } catch (error) {
                    failed = true;
                    failure = error;
                }

                this.runtime(Date.now() - this._started);

                if (failed) {
                    this.failure(failure);
                    this.state(3 /* Failed */);
                } else {
                    this.state(2 /* Succeeded */);
                }
            };

            TestCase.prototype._startAsync = function (callback) {
                var _this = this;
                this.state(1 /* Running */);
                this.runtime(0);
                this._started = Date.now();

                var failure;
                var failedSynchrously = false;
                try  {
                    this._test.apply(this._this_, [function (failure) {
                            _this.runtime(Date.now() - _this._started);

                            if (failure) {
                                _this.failure(failure);
                                _this.state(3 /* Failed */);
                            } else {
                                _this.state(2 /* Succeeded */);
                            }

                            if (callback)
                                callback();
                        }]);
                } catch (error) {
                    failedSynchrously = true;
                    failure = error;
                }

                this.runtime(Date.now() - this._started);

                if (failedSynchrously) {
                    this.failure(failure);
                    this.state(3 /* Failed */);

                    if (callback)
                        callback();
                }
            };
            return TestCase;
        })();
        tests.TestCase = TestCase;

        (function (TestCase) {
            (function (State) {
                State[State["NotStarted"] = 0] = "NotStarted";
                State[State["Running"] = 1] = "Running";
                State[State["Succeeded"] = 2] = "Succeeded";
                State[State["Failed"] = 3] = "Failed";
            })(TestCase.State || (TestCase.State = {}));
            var State = TestCase.State;
        })(tests.TestCase || (tests.TestCase = {}));
        var TestCase = tests.TestCase;
    })(teapo.tests || (teapo.tests = {}));
    var tests = teapo.tests;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (tests) {
        var TestPage = (function () {
            function TestPage(namespace, _queueWorkItem) {
                if (typeof namespace === "undefined") { namespace = teapo.tests; }
                if (typeof _queueWorkItem === "undefined") { _queueWorkItem = function (action) {
                    return setTimeout(action, 10);
                }; }
                var _this = this;
                this._queueWorkItem = _queueWorkItem;
                this.all = [];
                this.notStarted = ko.observableArray([]);
                this.running = ko.observableArray([]);
                this.succeeded = ko.observableArray([]);
                this.failed = ko.observableArray([]);
                this.workQuantum = 50;
                this._continueStartingClosure = function () {
                    return _this._continueStarting();
                };
                this._updateTimesInterval = null;
                this._loadTests(namespace);
            }
            TestPage.prototype.start = function () {
                var _this = this;
                if (this._updateTimesInterval) {
                    clearInterval(this._updateTimesInterval);
                    this._updateTimesInterval = null;
                }

                if (this.all.length) {
                    this._updateTimesInterval = setInterval(function () {
                        return _this._updateTimes();
                    }, 100);
                }

                this._continueStarting();
            };

            TestPage.prototype._updateTimes = function () {
                if (this.running().length + this.notStarted().length === 0) {
                    clearInterval(this._updateTimesInterval);
                    this._updateTimesInterval = 0;
                    return;
                }

                var now = Date.now();
                this.running().forEach(function (t) {
                    return t.updateTimes(now);
                });
            };

            TestPage.prototype._continueStarting = function () {
                var now = Date.now();
                this.running().forEach(function (t) {
                    t.updateTimes(now);
                });

                var nextRest = Date.now() + this.workQuantum;
                while (true) {
                    if (!this.notStarted().length)
                        return;

                    this._startOne();

                    if (!this.notStarted().length)
                        return;

                    if (Date.now() >= nextRest) {
                        this._queueWorkItem(this._continueStartingClosure);
                        return;
                    }
                }
            };

            TestPage.prototype._startOne = function () {
                var _this = this;
                var nextTest = this.notStarted.shift();
                this.running.push(nextTest);

                nextTest.start(function () {
                    _this.running.remove(nextTest);

                    var newState = nextTest.state();

                    var targetCollection = newState === 2 /* Succeeded */ ? _this.succeeded : newState === 3 /* Failed */ ? _this.failed : null;

                    if (targetCollection) {
                        var targetCollectionArray = targetCollection();

                        for (var i = targetCollectionArray.length - 1; i >= 0; i--) {
                            var t = targetCollectionArray[i];
                            if (nextTest.name > t.name) {
                                targetCollection.splice(i + 1, 0, nextTest);
                                return;
                            }
                        }

                        targetCollection.unshift(nextTest);
                    }
                });
            };

            TestPage.prototype._loadTests = function (namespace) {
                var _this = this;
                var byName = {};
                var names = [];

                TestPage.forEachTest(namespace, function (name, _this_, test) {
                    var testCase = new tests.TestCase(name, _this_, test);
                    byName[name] = testCase;
                    names.push(name);
                });

                names.sort();
                names.forEach(function (name) {
                    var testCase = byName[name];
                    _this.all.push(testCase);
                });

                this.notStarted(this.all);
            };

            TestPage.forEachTest = function (namespace, callback) {
                for (var k in namespace) {
                    if (!k || k[0] === '_' || Object.prototype[k])
                        continue;

                    var t = namespace[k];
                    if (typeof t === 'function') {
                        var isClass = false;
                        for (var k in t.prototype) {
                            if (!k || Object.prototype[k])
                                continue;

                            isClass = true;
                            break;
                        }

                        if (isClass) {
                            if (!t.length)
                                TestPage.forEachTest(new t(), function (name, _this_, test) {
                                    return callback(k + '.' + name, _this_, test);
                                });
                        } else {
                            callback(k, namespace, t);
                        }
                    } else if (typeof t === 'object') {
                        TestPage.forEachTest(t, function (name, _this_, test) {
                            return callback(k + '.' + name, _this_, test);
                        });
                    }
                }
            };
            return TestPage;
        })();
        tests.TestPage = TestPage;
    })(teapo.tests || (teapo.tests = {}));
    var tests = teapo.tests;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    /**
    * All tests are stashed away in teapo.tests module.
    * Teapo is an application, not a library, so all the tests are tests of the application pieces and parts.
    */
    (function (tests) {
        function sampleTest() {
            return;
        }
        tests.sampleTest = sampleTest;

        function sampleAsyncTest(callback) {
            callback(null);
        }
        tests.sampleAsyncTest = sampleAsyncTest;

        (function (sampleModule) {
            function sampleTest() {
            }
            sampleModule.sampleTest = sampleTest;
        })(tests.sampleModule || (tests.sampleModule = {}));
        var sampleModule = tests.sampleModule;
    })(teapo.tests || (teapo.tests = {}));
    var tests = teapo.tests;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (tests) {
        (function (FileListTests) {
            function constructor_succeeds() {
                var fl = new teapo.files.FileList();
            }
            FileListTests.constructor_succeeds = constructor_succeeds;

            function constructor_null_succeeds() {
                var fl = new teapo.files.FileList(null);
            }
            FileListTests.constructor_null_succeeds = constructor_null_succeeds;

            function constructor_empty_succeeds() {
                var fl = new teapo.files.FileList([]);
            }
            FileListTests.constructor_empty_succeeds = constructor_empty_succeeds;

            function constructor_single_simple() {
                var fl = new teapo.files.FileList(['root.txt']);
                if (fl.folders().length)
                    throw new Error('Should not have any folders, ' + fl.folders().length);
                if (fl.files().length !== 1)
                    throw new Error('File expected, found ' + fl.files().length);
                if (fl.files()[0].name !== 'root.txt')
                    throw new Error('Expected "root.txt", ' + fl.files()[0].name);
                if (fl.files()[0].path !== '/root.txt')
                    throw new Error('Expected "/root.txt", ' + fl.files()[0].path);
            }
            FileListTests.constructor_single_simple = constructor_single_simple;

            function constructor_single_root() {
                var fl = new teapo.files.FileList(['/root.txt']);
                if (fl.folders().length)
                    throw new Error('Should not have any folders, ' + fl.folders().length);
                if (fl.files().length !== 1)
                    throw new Error('File expected, found ' + fl.files().length);
                if (fl.files()[0].name !== 'root.txt')
                    throw new Error('Expected "root.txt", ' + fl.files()[0].name);
                if (fl.files()[0].path !== '/root.txt')
                    throw new Error('Expected "/root.txt", ' + fl.files()[0].path);
            }
            FileListTests.constructor_single_root = constructor_single_root;

            function constructor_single_rootAndTrailSlash() {
                var fl = new teapo.files.FileList(['/root.txt/']);
                if (fl.folders().length)
                    throw new Error('Should not have any folders, ' + fl.folders().length);
                if (fl.files().length !== 1)
                    throw new Error('File expected, found ' + fl.files().length);
                if (fl.files()[0].name !== 'root.txt')
                    throw new Error('Expected "root.txt", ' + fl.files()[0].name);
                if (fl.files()[0].path !== '/root.txt')
                    throw new Error('Expected "/root.txt", ' + fl.files()[0].path);
            }
            FileListTests.constructor_single_rootAndTrailSlash = constructor_single_rootAndTrailSlash;

            function constructor_single_nest1() {
                var fl = new teapo.files.FileList(['/fold/root.txt']);
                if (fl.files().length)
                    throw new Error('No root files expected, ' + fl.files().length);
                if (fl.folders().length !== 1)
                    throw new Error('Folder expected, found ' + fl.folders().length);
                var fold = fl.folders()[0];
                if (fold.name !== 'fold')
                    throw new Error('Expected "fold", ' + fold.name);
                if (fold.path !== '/fold/')
                    throw new Error('Expected "/fold/", ' + fold.path);
                if (fold.folders().length)
                    throw new Error('Shoud not have subfolders, ' + fold.folders().length);

                if (fold.files().length !== 1)
                    throw new Error('File expected, found ' + fold.files().length);
                if (fold.files()[0].name !== 'root.txt')
                    throw new Error('Expected "root.txt", ' + fold.files()[0].name);
                if (fold.files()[0].path !== '/fold/root.txt')
                    throw new Error('Expected "/fold/root.txt", ' + fold.files()[0].path);
            }
            FileListTests.constructor_single_nest1 = constructor_single_nest1;

            function file_simple() {
                var fl = new teapo.files.FileList();
                fl.file('root.txt');
                if (fl.folders().length)
                    throw new Error('Should not have any folders, ' + fl.folders().length);
                if (fl.files().length !== 1)
                    throw new Error('File expected, found ' + fl.files().length);
                if (fl.files()[0].name !== 'root.txt')
                    throw new Error('Expected "root.txt", ' + fl.files()[0].name);
                if (fl.files()[0].path !== '/root.txt')
                    throw new Error('Expected "/root.txt", ' + fl.files()[0].path);
            }
            FileListTests.file_simple = file_simple;

            function file_root() {
                var fl = new teapo.files.FileList();
                fl.file('/root.txt');
                if (fl.folders().length)
                    throw new Error('Should not have any folders, ' + fl.folders().length);
                if (fl.files().length !== 1)
                    throw new Error('File expected, found ' + fl.files().length);
                if (fl.files()[0].name !== 'root.txt')
                    throw new Error('Expected "root.txt", ' + fl.files()[0].name);
                if (fl.files()[0].path !== '/root.txt')
                    throw new Error('Expected "/root.txt", ' + fl.files()[0].path);
            }
            FileListTests.file_root = file_root;

            function file_rootAndTrailSlash() {
                var fl = new teapo.files.FileList();
                fl.file('/root.txt/');
                if (fl.folders().length)
                    throw new Error('Should not have any folders, ' + fl.folders().length);
                if (fl.files().length !== 1)
                    throw new Error('File expected, found ' + fl.files().length);
                if (fl.files()[0].name !== 'root.txt')
                    throw new Error('Expected "root.txt", ' + fl.files()[0].name);
                if (fl.files()[0].path !== '/root.txt')
                    throw new Error('Expected "/root.txt", ' + fl.files()[0].path);
            }
            FileListTests.file_rootAndTrailSlash = file_rootAndTrailSlash;

            function file_nest1() {
                var fl = new teapo.files.FileList();
                fl.file('/fold/root.txt');
                if (fl.files().length)
                    throw new Error('No root files expected, ' + fl.files().length);
                if (fl.folders().length !== 1)
                    throw new Error('Folder expected, found ' + fl.folders().length);
                var fold = fl.folders()[0];
                if (fold.name !== 'fold')
                    throw new Error('Expected "fold", ' + fold.name);
                if (fold.path !== '/fold/')
                    throw new Error('Expected "/fold/", ' + fold.path);
                if (fold.folders().length)
                    throw new Error('Shoud not have subfolders, ' + fold.folders().length);

                if (fold.files().length !== 1)
                    throw new Error('File expected, found ' + fold.files().length);
                if (fold.files()[0].name !== 'root.txt')
                    throw new Error('Expected "root.txt", ' + fold.files()[0].name);
                if (fold.files()[0].path !== '/fold/root.txt')
                    throw new Error('Expected "/fold/root.txt", ' + fold.files()[0].path);
            }
            FileListTests.file_nest1 = file_nest1;

            function file1_file2() {
                var fl = new teapo.files.FileList();

                fl.file('file1.txt');
                fl.file('/folder/file2.txt');

                if (fl.files().length !== 1)
                    throw new Error('Files expected, found ' + fl.files().length);
                if (fl.folders().length !== 1)
                    throw new Error('Folder expected, found ' + fl.folders().length);
                var file1 = fl.files()[0];
                var file2 = fl.folders()[0].files()[0];

                if (file1.path !== '/file1.txt')
                    throw new Error('Expected "/file1.txt", ' + file1.path);
                if (file2.path !== '/folder/file2.txt')
                    throw new Error('Expected "/folder/file2.txt", ' + file2.path);
            }
            FileListTests.file1_file2 = file1_file2;
        })(tests.FileListTests || (tests.FileListTests = {}));
        var FileListTests = tests.FileListTests;
    })(teapo.tests || (teapo.tests = {}));
    var tests = teapo.tests;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (tests) {
        var AttachedStorageTests = (function () {
            function AttachedStorageTests(_detect) {
                this._detect = _detect;
                //
            }
            AttachedStorageTests.prototype.detectStorageAsync_succeeds = function (callback) {
                var ukey = this._generateKey();
                this._detect.detectStorageAsync(ukey, function (error, load) {
                    return callback(error);
                });
            };

            AttachedStorageTests.prototype.detectStorageAsync_editedUTC_null = function (callback) {
                var ukey = this._generateKey();
                this._detect.detectStorageAsync(ukey, function (error, load) {
                    return callback(load.editedUTC ? new Error('Expected null, found ' + load.editedUTC) : null);
                });
            };

            AttachedStorageTests.prototype.load = function (callback) {
                var ukey = this._generateKey();
                this._detect.detectStorageAsync(ukey, function (error, load) {
                    load.load({
                        file: function (name, values) {
                            return callback(new Error('LoadStorageRecipient.file should not be called.'));
                        },
                        completed: function (updater) {
                            return callback(null);
                        },
                        failed: function (error) {
                            return callback(error);
                        }
                    });
                });
            };

            AttachedStorageTests.prototype.update = function (callback) {
                var ukey = this._generateKey();
                this._detect.detectStorageAsync(ukey, function (error, load) {
                    load.load({
                        file: function (name, values) {
                            return callback(new Error('LoadStorageRecipient.file should not be called.'));
                        },
                        completed: function (updater) {
                            updater.update('file.txt', 'property', 'value', callback);
                        },
                        failed: function (error) {
                            return callback(error);
                        }
                    });
                });
            };

            AttachedStorageTests.prototype.update_detectStorageAsync_editedUTC_recent = function (callback) {
                var _this = this;
                var ukey = this._generateKey();
                this._detect.detectStorageAsync(ukey, function (error, load) {
                    load.load({
                        file: function (name, values) {
                            return callback(new Error('LoadStorageRecipient.file should not be called.'));
                        },
                        completed: function (updater) {
                            updater.update('file.txt', 'property', 'value', function (error) {
                                _this._detect.detectStorageAsync(ukey, function (error, load) {
                                    return callback(load.editedUTC ? null : new Error('Expected non-null.'));
                                });
                            });
                        },
                        failed: function (error) {
                            return callback(error);
                        }
                    });
                });
            };

            AttachedStorageTests.prototype.update_loadAgain_sameValue = function (callback) {
                this._update_loadAgain_sameValue_core('update_loadAgain_sameValue.txt', 'property234', 'value94783', callback);
            };

            AttachedStorageTests.prototype.update_loadAgain_sameValue_unicodeValue = function (callback) {
                var unicodeString = 'abc941' + [256, 257, 1024, 1026, 12879, 13879].map(function (m) {
                    return String.fromCharCode(m);
                }).join('');

                this._update_loadAgain_sameValue_core('update_loadAgain_sameValue_unicodeValue.txt', 'property83784', unicodeString, callback);
            };

            AttachedStorageTests.prototype.update_loadAgain_sameValue_unicodeProperty = function (callback) {
                var unicodeString = 'abc6253' + [256, 257, 1024, 1026, 12879, 13879].map(function (m) {
                    return String.fromCharCode(m);
                }).join('');

                this._update_loadAgain_sameValue_core('update_loadAgain_sameValue_unicodeProperty.txt', unicodeString, 'value345634', callback);
            };

            AttachedStorageTests.prototype.update_loadAgain_sameValue_crlfValue = function (callback) {
                var crlfString = 'abc941\nasdf3434\r07958\r\n4838hr';

                this._update_loadAgain_sameValue_core('update_loadAgain_sameValue_crlfValue.txt', 'property83784', crlfString, callback);
            };

            AttachedStorageTests.prototype.update_loadAgain_sameValue_crOnly = function (callback) {
                this._update_loadAgain_sameValue_core('file82263.txt', 'property83784', '\r', callback);
            };

            AttachedStorageTests.prototype.update_loadAgain_sameValue_lfOnly = function (callback) {
                this._update_loadAgain_sameValue_core('file82263.txt', 'property83784', '\n', callback);
            };

            AttachedStorageTests.prototype.update_loadAgain_sameValue_crlfOnly = function (callback) {
                this._update_loadAgain_sameValue_core('update_loadAgain_sameValue_lfOnly.txt', 'property83784', '\r\n', callback);
            };

            AttachedStorageTests.prototype.update_loadAgain_sameValue_zeroCharOnly = function (callback) {
                this._update_loadAgain_sameValue_core('update_loadAgain_sameValue_zeroCharOnly.txt', 'property83784', String.fromCharCode(0), callback);
            };

            AttachedStorageTests.prototype.update_loadAgain_sameValue_zeroCharPrefix = function (callback) {
                this._update_loadAgain_sameValue_core('update_loadAgain_sameValue_zeroCharOnly.txt', 'property83784', String.fromCharCode(0) + 'abcd', callback);
            };

            AttachedStorageTests.prototype.update_loadAgain_sameValue_zeroCharSuffix = function (callback) {
                this._update_loadAgain_sameValue_core('update_loadAgain_sameValue_zeroCharOnly.txt', 'property83784', 'abcde' + String.fromCharCode(0), callback);
            };

            AttachedStorageTests.prototype.update_loadAgain_sameValue_zeroCharMiddle = function (callback) {
                this._update_loadAgain_sameValue_core('update_loadAgain_sameValue_zeroCharOnly.txt', 'property83784', 'abcde' + String.fromCharCode(0) + 'zxcvbnm', callback);
            };

            AttachedStorageTests.prototype.update_loadAgain_sameValue_charCodesUnder32 = function (callback) {
                var chars = '';
                for (var i = 0; i < 32; i++)
                    chars + String.fromCharCode(i);
                this._update_loadAgain_sameValue_core('update_loadAgain_sameValue_charCodesUnder32.txt', 'property83784', chars, callback);
            };

            AttachedStorageTests.prototype._update_loadAgain_sameValue_core = function (fileName, property, value, callback) {
                var _this = this;
                var ukey = this._generateKey();
                this._detect.detectStorageAsync(ukey, function (error, load) {
                    load.load({
                        file: function (name, values) {
                            return callback(new Error('LoadStorageRecipient.file should not be called.'));
                        },
                        completed: function (updater) {
                            updater.update(fileName, property, value, function (error) {
                                _this._detect.detectStorageAsync(ukey, function (error, load) {
                                    var files = {};
                                    load.load({
                                        file: function (name, values) {
                                            return files[name] = values;
                                        },
                                        completed: function (updater) {
                                            var fileTxt = files[fileName];
                                            if (!fileTxt) {
                                                callback(new Error('File is not reported on subsequent load.'));
                                            } else {
                                                var propertyValue = fileTxt[property];
                                                callback(propertyValue === value ? null : new Error('Wrong value ' + JSON.stringify(propertyValue) + ' instead of ' + JSON.stringify(value)));
                                            }
                                        },
                                        failed: function (error) {
                                            return callback(error);
                                        }
                                    });
                                });
                            });
                        },
                        failed: function (error) {
                            return callback(error);
                        }
                    });
                });
            };

            AttachedStorageTests.prototype.migrate = function (callback) {
                var ukey = this._generateKey();
                this._detect.detectStorageAsync(ukey, function (error, load) {
                    load.migrate(2345, { "file.txt": { property: "value" } }, function (error, update) {
                        return callback(error);
                    });
                });
            };

            AttachedStorageTests.prototype.migrate_load_sameValue = function (callback) {
                var _this = this;
                var ukey = this._generateKey();
                this._detect.detectStorageAsync(ukey, function (error, load) {
                    load.migrate(2345, { "file.txt": { property: "value" } }, function (error, update) {
                        _this._detect.detectStorageAsync(ukey, function (error, load) {
                            var files = {};
                            load.load({
                                file: function (name, values) {
                                    return files[name] = values;
                                },
                                completed: function (updater) {
                                    var fileTxt = files['file.txt'];
                                    if (!fileTxt) {
                                        callback(new Error('File is not reported on subsequent load.'));
                                    } else {
                                        var propertyValue = fileTxt['property'];
                                        callback(propertyValue === 'value' ? null : new Error('Wrong value ' + propertyValue));
                                    }
                                },
                                failed: function (error) {
                                    return callback(error);
                                }
                            });
                        });
                    });
                });
            };

            AttachedStorageTests.prototype.migrate_remove_detectStorageAsync_editedUTC_isrecent = function (callback) {
                var _this = this;
                var ukey = this._generateKey();
                this._detect.detectStorageAsync(ukey, function (error, load) {
                    load.migrate(2345, { "file.txt": { property: "value" } }, function (error, update) {
                        update.remove('file.txt', function (error) {
                            if (error) {
                                callback(error);
                                return;
                            }

                            _this._detect.detectStorageAsync(ukey, function (error, load) {
                                var now = Date.now();
                                callback(Math.abs(now - load.editedUTC) < 10000 ? null : new Error('Recent editedUTC expected, ' + load.editedUTC + ' (now ' + now + ', diff ' + (now - load.editedUTC) + ').'));
                            });
                        });
                    });
                });
            };

            AttachedStorageTests.prototype.migrate_remove_load_nofile = function (callback) {
                var _this = this;
                var ukey = this._generateKey();
                this._detect.detectStorageAsync(ukey, function (error, load) {
                    load.migrate(2345, { "file.txt": { property: "value" } }, function (error, update) {
                        update.remove('file.txt', function (error) {
                            if (error) {
                                callback(error);
                                return;
                            }

                            _this._detect.detectStorageAsync(ukey, function (error, load) {
                                var filenames = [];
                                load.load({
                                    file: function (name, values) {
                                        return filenames.push(name);
                                    },
                                    completed: function (updater) {
                                        if (filenames.length) {
                                            callback(new Error('Should not have any files: ' + filenames.join(', ') + '.'));
                                        } else {
                                            callback(null);
                                        }
                                    },
                                    failed: function (error) {
                                        return callback(error);
                                    }
                                });
                            });
                        });
                    });
                });
            };

            AttachedStorageTests.prototype.migrate_detectStorageAsync_editedUTC = function (callback) {
                var _this = this;
                var ukey = this._generateKey();
                this._detect.detectStorageAsync(ukey, function (error, load) {
                    load.migrate(2345, { "file.txt": { property: "value" } }, function (error, update) {
                        _this._detect.detectStorageAsync(ukey, function (error, load) {
                            callback(load.editedUTC === 2345 ? null : new Error('Incorrect editedUTC value ' + load.editedUTC + ' (expected 2345).'));
                        });
                    });
                });
            };

            AttachedStorageTests.prototype.updateTwice_loadAgain_secondValue = function (callback) {
                var _this = this;
                var ukey = this._generateKey();
                this._detect.detectStorageAsync(ukey, function (error, load) {
                    load.load({
                        file: function (name, values) {
                            return callback(new Error('LoadStorageRecipient.file should not be called.'));
                        },
                        completed: function (updater) {
                            updater.update('file.txt', 'property1', 'value2', function (error) {
                                return updater.update('file.txt', 'property1', 'value4', function (error) {
                                    _this._detect.detectStorageAsync(ukey, function (error, load) {
                                        var files = {};
                                        load.load({
                                            file: function (name, values) {
                                                return files[name] = values;
                                            },
                                            completed: function (updater) {
                                                var fileTxt = files['file.txt'];
                                                if (!fileTxt) {
                                                    callback(new Error('File is not reported on subsequent load.'));
                                                } else {
                                                    var propertyValue = fileTxt['property1'];
                                                    callback(propertyValue === 'value4' ? null : new Error('Wrong value ' + propertyValue));
                                                }
                                            },
                                            failed: function (error) {
                                                return callback(error);
                                            }
                                        });
                                    });
                                });
                            });
                        },
                        failed: function (error) {
                            return callback(error);
                        }
                    });
                });
            };

            AttachedStorageTests.prototype._generateKey = function () {
                return Math.random() + '-' + Math.random();
            };
            return AttachedStorageTests;
        })();
        tests.AttachedStorageTests = AttachedStorageTests;
    })(teapo.tests || (teapo.tests = {}));
    var tests = teapo.tests;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (tests) {
        (function (IndexedDBStorageTests) {
            IndexedDBStorageTests.browser;

            if (typeof indexedDB !== 'undefined' && indexedDB && typeof indexedDB.open === 'function')
                IndexedDBStorageTests.browser = new tests.AttachedStorageTests(new teapo.storage.attached.indexedDB.DetectStorage());
        })(tests.IndexedDBStorageTests || (tests.IndexedDBStorageTests = {}));
        var IndexedDBStorageTests = tests.IndexedDBStorageTests;
    })(teapo.tests || (teapo.tests = {}));
    var tests = teapo.tests;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (tests) {
        (function (LocalStorageStorageTests) {
            function constructor_noArgs_succeeds() {
                new teapo.storage.attached.localStorage.DetectStorage();
            }
            LocalStorageStorageTests.constructor_noArgs_succeeds = constructor_noArgs_succeeds;

            function constructor_null_succeeds() {
                new teapo.storage.attached.localStorage.DetectStorage(null);
            }
            LocalStorageStorageTests.constructor_null_succeeds = constructor_null_succeeds;

            function constructor_empty_succeeds() {
                new teapo.storage.attached.localStorage.DetectStorage({});
            }
            LocalStorageStorageTests.constructor_empty_succeeds = constructor_empty_succeeds;

            function detectStorageAsync_whenNullPassedToConstructor_throwsError() {
                var s = new teapo.storage.attached.localStorage.DetectStorage(null);
                try  {
                    s.detectStorageAsync('', function (error, loaded) {
                    });
                } catch (error) {
                    // fine, expected
                    return;
                }

                throw new Error('No exception.');
            }
            LocalStorageStorageTests.detectStorageAsync_whenNullPassedToConstructor_throwsError = detectStorageAsync_whenNullPassedToConstructor_throwsError;

            function detectStorageAsync_noLocalStorage_passesError(callback) {
                var s = new teapo.storage.attached.localStorage.DetectStorage({});

                s.detectStorageAsync('', function (error, loaded) {
                    return callback(error ? null : new Error('No error passed. State: ' + loaded));
                });
            }
            LocalStorageStorageTests.detectStorageAsync_noLocalStorage_passesError = detectStorageAsync_noLocalStorage_passesError;

            function detectStorageAsync_localStorageNoMethods_passesError(callback) {
                var s = new teapo.storage.attached.localStorage.DetectStorage({ localStorage: {} });

                s.detectStorageAsync('', function (error, loaded) {
                    return callback(error ? null : new Error('No error passed. State: ' + loaded));
                });
            }
            LocalStorageStorageTests.detectStorageAsync_localStorageNoMethods_passesError = detectStorageAsync_localStorageNoMethods_passesError;

            function detectStorageAsync_localStorageLengthGetItemSetItemRemoveItem_passesResult(callback) {
                var localStorage = {
                    length: 0,
                    getItem: function () {
                    },
                    setItem: function () {
                    },
                    removeItem: function () {
                    }
                };

                var s = new teapo.storage.attached.localStorage.DetectStorage({ localStorage: localStorage });

                s.detectStorageAsync('', function (error, loaded) {
                    return callback(error);
                });
            }
            LocalStorageStorageTests.detectStorageAsync_localStorageLengthGetItemSetItemRemoveItem_passesResult = detectStorageAsync_localStorageLengthGetItemSetItemRemoveItem_passesResult;

            LocalStorageStorageTests.browser;
            if (window.localStorage)
                LocalStorageStorageTests.browser = new tests.AttachedStorageTests(new teapo.storage.attached.localStorage.DetectStorage());
        })(tests.LocalStorageStorageTests || (tests.LocalStorageStorageTests = {}));
        var LocalStorageStorageTests = tests.LocalStorageStorageTests;
    })(teapo.tests || (teapo.tests = {}));
    var tests = teapo.tests;
})(teapo || (teapo = {}));
var teapo;
(function (teapo) {
    (function (tests) {
        (function (WebSQLStorageTests) {
            WebSQLStorageTests.browser;

            if (typeof openDatabase === 'function')
                WebSQLStorageTests.browser = new tests.AttachedStorageTests(new teapo.storage.attached.webSQL.DetectStorage());
        })(tests.WebSQLStorageTests || (tests.WebSQLStorageTests = {}));
        var WebSQLStorageTests = tests.WebSQLStorageTests;
    })(teapo.tests || (teapo.tests = {}));
    var tests = teapo.tests;
})(teapo || (teapo = {}));
