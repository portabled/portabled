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
                    console.log('...getScriptFileNames():', result);
                    return result;
                },
                getScriptVersion: function (fileName) {
                    var script = _this._scriptCache[fileName];
                    if (script && script.version)
                        return script.version;
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
                    console.log('...resolveRelativePath(' + path + '):', result);
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
            console.log(text);
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
            CodeMirror.on(this._doc, 'change', function (e, doc, change) {
                return _this._onChange(change);
            });
        }
        /**
        * Not a part of IScriptSnapshot, unlike other public methods here.
        * Need to find out who's calling into this (and kill them, naturally).
        */
        DocumentState.prototype.getVersion = function () {
            return this._version;
        };

        DocumentState.prototype.getText = function (start, end) {
            var startPos = this._doc.posFromIndex(start);
            var endPos = this._doc.posFromIndex(end);
            var text = this._doc.getRange(startPos, endPos);
            return text;
        };

        DocumentState.prototype.getLength = function () {
            var lineCount = this._doc.lineCount();
            if (lineCount === 0)
                return 0;

            var lastLineStart = this._doc.indexFromPos({ line: lineCount - 1, ch: 0 });
            var lastLine = this._doc.getLine(lineCount - 1);
            return lastLineStart + lastLine.length;
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
            this._changes.length = 0;
            return TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(this._changes);
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
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var teapo;
(function (teapo) {
    var File = (function () {
        function File(parent, name) {
            this.parent = parent;
            this.name = name;
            this.active = ko.observable(false);
            var lead = this.parent ? this.parent.fullPath : null;
            this.fullPath = (lead ? lead : '') + '/' + this.name;
        }
        File.prototype.click = function () {
            if (this.parent)
                this.parent.clickFile(this);
        };
        return File;
    })();
    teapo.File = File;

    var Folder = (function (_super) {
        __extends(Folder, _super);
        function Folder(parent, name) {
            _super.call(this, parent, name);
            this.folders = ko.observableArray();
            this.files = ko.observableArray();
            if (!name)
                this.fullPath = null;
        }
        Folder.prototype.addFile = function (path) {
            if (!path)
                return;
            var norm = this._normalizePath(path);
            if (norm.subfolder) {
                var index = this._indexOfFile(this.folders(), norm.subfolder);
                var subfolder = this.folders()[index];
                if (!subfolder || subfolder.name !== norm.subfolder) {
                    subfolder = new Folder(this, norm.subfolder);
                    this.folders.splice(index, 0, subfolder);
                }
                return subfolder.addFile(norm.path);
            } else {
                var index = this._indexOfFile(this.files(), norm.path);
                var file = this.files()[index];
                if (!file || file.name !== norm.path) {
                    file = new File(this, norm.path);
                    this.files.splice(index, 0, file);
                }
                return file;
            }
        };

        Folder.prototype.removeFile = function (path) {
            if (!path)
                return;
            var norm = this._normalizePath(path);
            if (norm.subfolder) {
                var index = this._indexOfFile(this.folders(), norm.subfolder);
                var subfolder = this.folders()[index];
                if (!subfolder || subfolder.name !== norm.subfolder)
                    return null;
                else
                    return subfolder.removeFile(norm.path);
            } else {
                var index = this._indexOfFile(this.files(), norm.path);
                var file = this.files()[index];
                if (!file || file.name !== norm.path)
                    return null;
                this.files.splice(index, 1);
                return file;
            }
        };

        Folder.prototype.clickFile = function (file) {
            if (this.parent)
                this.parent.clickFile(file);
        };

        Folder.prototype.clickFolder = function (folder) {
            if (this.parent)
                this.parent.clickFolder(folder);
        };

        Folder.prototype.click = function () {
            this.clickFolder(this);
        };

        Folder.prototype._normalizePath = function (path) {
            var result = this._normalizePathCore(path);
            console.log('normalizePath(', path, ') = ', result);
            return result;
        };

        Folder.prototype._normalizePathCore = function (path) {
            while (path[0] === '/')
                path = path.slice(1);
            while (path[path.length - 1] === '/')
                path = path.slice(0, path.length - 1);
            var slashPos = path.indexOf('/');
            if (slashPos < 0)
                return { subfolder: null, path: path };
            else
                return { subfolder: path.slice(0, slashPos), path: path.slice(slashPos + 1) };
        };

        Folder.prototype._indexOfFile = function (list, name) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].name >= name)
                    return i;
            }
            return list.length;
        };
        return Folder;
    })(teapo.File);
    teapo.Folder = Folder;
})(teapo || (teapo = {}));
/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/codemirror.d.ts' />
var teapo;
(function (teapo) {
    var DocumentViewModel = (function () {
        function DocumentViewModel(fullPath, doc) {
            this.fullPath = fullPath;
            this.doc = doc;
        }
        return DocumentViewModel;
    })();
    teapo.DocumentViewModel = DocumentViewModel;
})(teapo || (teapo = {}));
/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='TypeScriptService.ts' />
/// <reference path='FileList.ts' />
/// <reference path='DocumentViewModel.ts' />
var teapo;
(function (teapo) {
    var ApplicationViewModel = (function () {
        function ApplicationViewModel() {
            var _this = this;
            this._documents = {};
            this.codemirror = ko.observable("ok");
            this.activeFile = ko.observable();
            this._typescript = new teapo.TypeScriptService();
            this._files = new teapo.Folder(null, null);
            this._mockDoc('lib.d.ts', '');
            this._mockDoc('main.ts', '1+2');
            this._mockDoc('/import/codemirror.d.ts', ' // ok');
            this._files.clickFile = function (f) {
                return _this.clickFile(f);
            };
            this._files.clickFolder = function (f) {
                return alert('[' + f.fullPath + ']');
            };
        }
        ApplicationViewModel.prototype.files = function () {
            return this._files;
        };

        ApplicationViewModel.prototype.clickFile = function (file) {
            var currentActiveFile = this.activeFile();
            if (currentActiveFile)
                currentActiveFile.active(false);
            this.activeFile(file);
            file.active(true);

            var doc = this._documents[file.fullPath];
            this.codemirror().swapDoc(doc.doc);
        };

        ApplicationViewModel.prototype._mockDoc = function (fullPath, content) {
            var f = this._files.addFile(fullPath);
            fullPath = f.fullPath; // normalized

            var doc = new CodeMirror.Doc(content);
            var docVM = new teapo.DocumentViewModel(fullPath, doc);
            this._documents[fullPath] = docVM;
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
    }
    teapo.registerKnockoutBindings = registerKnockoutBindings;
})(teapo || (teapo = {}));
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='ApplicationViewModel.ts' />
/// <reference path='KnockoutBindings.ts' />
//window.onload = function() {
//  var layout = new teapo.ApplicationLayout(document.body);
//  var state = new teapo.ApplicationState(layout);
//}
window.onload = function () {
    teapo.registerKnockoutBindings(ko);

    var viewModel = new teapo.ApplicationViewModel();

    ko.renderTemplate('bodyTemplate', viewModel, null, document.body);
};
//# sourceMappingURL=teapo.js.map
