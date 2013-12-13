/// <reference path='typings/codemirror.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
// anchor-2
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
            //      if (this._completionTimeout) {
            //        clearTimeout(this._completionTimeout);
            //        this._completionTimeout = 0;
            //      }
            this.handleCursorActivity();
        };

        CompletionCodeMirrorEditor.injectCompletionShortcuts = function (shared) {
            var triggerEditorCompletion = function () {
                var editor = shared.editor;
                if (!editor)
                    return;
                editor.triggerCompletion(true, true);
            };

            var completionShortcuts = ['Ctrl-Space', 'Ctrl-J', 'Alt-J', 'Cmd-J'];
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
    })(CodeMirrorEditor);
    teapo.CompletionCodeMirrorEditor = CompletionCodeMirrorEditor;

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
/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
/// <reference path='editor-std.ts' />
var teapo;
(function (teapo) {
    /**
    * Handling detection of .js files.
    */
    var JavaScriptEditorType = (function () {
        function JavaScriptEditorType() {
            this._shared = {
                options: JavaScriptEditorType.editorConfiguration()
            };
        }
        JavaScriptEditorType.editorConfiguration = function () {
            var options = teapo.CodeMirrorEditor.standardEditorConfiguration();
            options.mode = "text/javascript";
            return options;
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
        }
        JavaScriptEditor.prototype.handlePerformCompletion = function () {
            CodeMirror.showHint(this.editor(), CodeMirror.hint.javascript);
        };
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
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
/// <reference path='editor-std.ts' />
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
            var blob = new Blob(convertedOutput, { type: 'application/octet-stream' });
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
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
/// <reference path='editor-std.ts' />
/// <reference path='TypeScriptService.ts'  />
// anchor-3
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
        }
        TypeScriptEditorType.createShared = function () {
            var options = teapo.CodeMirrorEditor.standardEditorConfiguration();
            var shared = { options: options };

            options.mode = "text/typescript";
            options.gutters = ['teapo-errors'];

            var debugClosure = function () {
                var editor = shared.editor;
                if (!editor)
                    return;

                editor.debug();
            };

            var extraKeys = options.extraKeys || (options.extraKeys = {});
            var shortcuts = ['Ctrl-K', 'Alt-K', 'Cmd-K', 'Shift-Ctrl-K', 'Ctrl-Alt-K', 'Shift-Alt-K', 'Shift-Cmd-K', 'Cmd-Alt-K'];
            for (var i = 0; i < shortcuts.length; i++) {
                var k = shortcuts[i];
                if (k in extraKeys)
                    continue;

                extraKeys[k] = debugClosure;
            }

            return shared;
        };

        TypeScriptEditorType.prototype.canEdit = function (fullPath) {
            return fullPath && fullPath.length > 3 && fullPath.slice(fullPath.length - 3).toLowerCase() === '.ts';
        };

        TypeScriptEditorType.prototype.editDocument = function (docState) {
            var _this = this;
            if (!this._typescript)
                this._initTypescript();

            var editor = new TypeScriptEditor(this._typescript, this._shared, docState);

            setTimeout(function () {
                _this._typescript.scripts[docState.fullPath()] = editor;
                _this._typescript.service.getSyntacticDiagnostics(docState.fullPath());
                setTimeout(function () {
                    _this._typescript.service.getSignatureAtPosition(docState.fullPath(), 0);
                }, 1);
            }, 1);

            return editor;
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
            /** Required as part of interface to TypeScriptService. */
            this.changes = [];
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
            this._completionActive = false;
        }
        /**
        * Overriding opening of the file, refreshing error marks.
        */
        TypeScriptEditor.prototype.handleOpen = function () {
            this._updateGutter();

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

            // store the change in an array
            this.changes.push(ch);

            if (change.text.length === 1 && change.text[0] === '.')
                this.triggerCompletion(true);

            // trigger error refresh and completion
            this._triggerDiagnosticsUpdate();
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

        TypeScriptEditor.prototype.debug = function () {
            var emits = this._typescript.service.getEmitOutput(this.docState.fullPath());
            for (var i = 0; i < emits.outputFiles.length; i++) {
                var e = emits.outputFiles[i];
                alert(e.name + '\n\n' + e.text);
            }
        };

        TypeScriptEditor.prototype.build = function () {
            var emits = this._typescript.service.getEmitOutput(this.docState.fullPath());

            var errors = [];
            for (var i = 0; i < emits.diagnostics.length; i++) {
                var e = emits.diagnostics[i];
                var info = e.info();
                if (info.category === 1 /* Error */) {
                    errors.push(e.fileName() + ' [' + e.line() + ':' + e.character + '] ' + info.message);
                }
            }

            if (errors.length)
                alert(errors.join('\n'));

            for (var i = 0; i < emits.outputFiles.length; i++) {
                var ou = emits.outputFiles[i];
                return ou.text;
            }
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
            this._updateDiagnosticsTimeout = 0;

            this._syntacticDiagnostics = this._typescript.service.getSyntacticDiagnostics(this.docState.fullPath());
            this._semanticDiagnostics = this._typescript.service.getSemanticDiagnostics(this.docState.fullPath());

            this._updateGutter();
            this._updateDocDiagnostics();
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

    (function (EditorType) {
        EditorType.TypeScript = new TypeScriptEditorType();
    })(teapo.EditorType || (teapo.EditorType = {}));
    var EditorType = teapo.EditorType;
})(teapo || (teapo = {}));
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
/// <reference path='editor-std.ts' />
var teapo;
(function (teapo) {
    /**
    * Handling detection of .js files.
    */
    var CSSEditorType = (function () {
        function CSSEditorType() {
            this._shared = {
                options: CSSEditorType.editorConfiguration()
            };
        }
        CSSEditorType.editorConfiguration = function () {
            var options = teapo.CodeMirrorEditor.standardEditorConfiguration();
            options.mode = "text/css";
            return options;
        };

        CSSEditorType.prototype.canEdit = function (fullPath) {
            var dotParts = fullPath.split('.');
            return dotParts.length > 1 && dotParts[dotParts.length - 1].toLowerCase() === 'css';
        };

        CSSEditorType.prototype.editDocument = function (docState) {
            return new teapo.CodeMirrorEditor(this._shared, docState);
        };
        return CSSEditorType;
    })();

    (function (EditorType) {
        /**
        * Registering HtmlEditorType.
        */
        EditorType.CodeMirror = new CSSEditorType();
    })(teapo.EditorType || (teapo.EditorType = {}));
    var EditorType = teapo.EditorType;
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
            var reverse = Object.keys(teapo.EditorType);
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
                    if (!metadataTableExists || forceLoadFromDom) {
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
                var fullPathList = Object.keys(pathElements);
                var addedFileCount = 0;

                var completedAdding = function () {
                    if (_this._executeSql) {
                        _this._executeSql('CREATE TABLE "*metadata" (name TEXT, value TEXT)', [], null, null);
                    }

                    _this.handler.documentStorageCreated(null, _this);
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

                    setTimeout(continueAdding, 1);
                };

                continueAdding();
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

                        if (completedFileCount === files.length) {
                            for (var k in pathElements)
                                if (pathElements.hasOwnProperty(k)) {
                                    var s = pathElements[k];
                                    s.parentElement.removeChild(s);
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
                if (path) {
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
                if (path) {
                    if (path.charAt(0) === '/' || path.charAt(0) === '#') {
                        pathElements[path] = sty;
                    }
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
        doc.body.insertBefore(s, doc.body.children[0]);
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

    /**
    * Unescape character sequences wrapped with encodeForInnerHTML for safety.
    */
    function decodeFromInnerHTML(innerHTML) {
        // matching script closing tag with *t*wo or more consequtive slashes
        return innerHTML.replace(/<\/\/+script/g, function (match) {
            return '<' + match.slice(2);
        });
    }
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
            var currentFileName = decodeURI(urlParts[urlParts.length - 1]);
            return currentFileName;
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
/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='ko.ts' />
/// <reference path='shell.ts' />
/// <reference path='editor-std.ts' />
/// <reference path='editor-x-ts.ts' />
/// <reference path='editor-x-html.ts' />
/// <reference path='editor-x-js.ts' />
/// <reference path='editor-x-css.ts' />
function start() {
    var storage = null;
    var viewModel = null;
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

    var loadingDiv = document.createElement('div');
    loadingDiv.className = 'teapo-boot';
    loadingDiv.textContent = loadingDiv.innerText = 'Loading...';
    pageElement.appendChild(loadingDiv);

    var storageLoaded = function () {
        teapo.registerKnockoutBindings(ko);
        teapo.EditorType.Html.storageForBuild = storage;

        viewModel = new teapo.ApplicationShell(storage);

        ko.renderTemplate('page-template', viewModel, null, pageElement);
    };

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
        }
    }, forceLoadFromDom);
}

// TODO: remove this ridiculous timeout (need to insert scripts above teapo.js)
setTimeout(start, 100);
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
                warning: false,
                error: true,
                fatal: true
            };
            /** TypeScript custom settings. */
            this.compilationSettings = new TypeScript.CompilationSettings();
            /** Files added to the compiler/parser scope, by full path. */
            this.scripts = {};
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
                    var result = Object.keys(_this.scripts);
                    result = result.sort();

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
                    var snapshot = script._cachedSnapshot;

                    // checking if snapshot is out of date
                    if (!snapshot || (script.changes && snapshot.version < script.changes.length)) {
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

    var TypeScriptDocumentSnapshot = (function () {
        function TypeScriptDocumentSnapshot(scriptData) {
            this.scriptData = scriptData;
            this.version = 0;
            this._text = null;
            if (this.scriptData.changes)
                this.version = this.scriptData.changes.length;
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
            var chunk = this.scriptData.changes.slice(scriptVersion);

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
