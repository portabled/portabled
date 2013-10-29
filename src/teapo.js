var SplitHost = (function () {
    function SplitHost(_host, options) {
        var _this = this;
        this._host = _host;
        this._childPanels = [];
        this._splitters = [];
        this._splitterUpdateQueued = false;
        this._cachedPercentPixelRatio = 0;
        this._cachedActualLength = 0;
        this._dragSplitterIndex = -1;
        this._dragBase = 0;
        this._dragOffset = 0;
        this._dragSplitterResizeQueued = false;
        this._windowMouseDownHandler = null;
        this._windowMouseMoveHandler = null;
        this._windowMouseUpHandler = null;
        this._windowTouchStartHandler = null;
        this._windowTouchMoveHandler = null;
        this._windowTouchEndHandler = null;
        this._options = {};
        for (var k in SplitHost.defaultOptions)
            if (SplitHost.defaultOptions.hasOwnProperty(k)) {
                this._options[k] = options && k in options ? options[k] : SplitHost.defaultOptions[k];
            }

        while (this._host.children.length) {
            // Processing child element separates it out, reducing their count.
            // So we use 'while' instead of 'for'.
            var childElement = this._host.children.item(0);
            var childPanel = new ChildPanel(childElement, this._options.vertical);
            this._childPanels.push(childPanel);

            this._applyPanelContainerStyle(childPanel.container.style);
            childPanel.container.className = this._options.panelClassName;
        }

        for (var i = 0; i < this._childPanels.length - 1; i++) {
            var splitter = new Splitter();

            this._applySplitterStyle(splitter.paddingElement.style, splitter.lineElement.style);
            splitter.lineElement.className = this._options.splitterClassName;

            (function (splitter, i) {
                // closure to avoid variable reuse across cycle iterations
                _this._addEventListener('mousedown', splitter.paddingElement, function (e) {
                    return _this._splitterMouseDown(splitter, i, e || window.event);
                });

                _this._addEventListener('mouseup', splitter.paddingElement, function (e) {
                    return _this._splitterMouseUp(splitter, i, e || window.event);
                });

                _this._addEventListener('mousemove', splitter.paddingElement, function (e) {
                    return _this._splitterMouseMove(splitter, i, e || window.event);
                });

                _this._addEventListener('mouseout', splitter.paddingElement, function (e) {
                    return _this._splitterMouseOut(splitter, i, e || window.event);
                });

                _this._addEventListener('mouseover', splitter.paddingElement, function (e) {
                    return _this._splitterMouseOver(splitter, i, e || window.event);
                });

                _this._addEventListener('touchstart', splitter.paddingElement, function (e) {
                    return _this._splitterTouchStart(splitter, i, e || window.event);
                });

                _this._addEventListener('touchmove', splitter.paddingElement, function (e) {
                    return _this._splitterTouchMove(splitter, i, e || window.event);
                });

                _this._addEventListener('touchend', splitter.paddingElement, function (e) {
                    return _this._splitterTouchEnd(splitter, i, e || window.event);
                });
            })(splitter, i);

            this._splitters.push(splitter);
        }

        this._validateSplitterPositions();

        for (var i = 0; i < this._childPanels.length; i++) {
            this._host.appendChild(this._childPanels[i].container);
        }

        for (var i = 0; i < this._childPanels.length - 1; i++) {
            this._host.appendChild(this._splitters[i].paddingElement);
        }

        var resizeHost = 'onresize' in this._host ? this._host : 'onresize' in window ? window : null;

        if (resizeHost)
            this._addEventListener('resize', resizeHost, function () {
                return _this._invalidateSplitterPositions();
            });

        // doesn't always work without it
        setTimeout(function () {
            _this._validateSplitterPositions();
        }, 1);
    }
    SplitHost.prototype._addEventListener = function (eventName, element, fun) {
        if ('on' + eventName in element) {
            if (element.addEventListener) {
                element.addEventListener(eventName, fun, true);
            } else if (element.attachEvent) {
                element.attachEvent('on' + eventName, fun);
            } else {
                element['on' + eventName] = fun;
            }
        }
    };

    SplitHost.prototype._removeEventListener = function (eventName, element, fun) {
        if ('on' + eventName in element) {
            if (element.removeEventListener) {
                element.removeEventListener(eventName, fun, true);
            } else if (element.detachEvent) {
                element.detachEvent('on' + eventName, fun);
            } else {
                element['on' + eventName] = null;
            }
        }
    };

    SplitHost.prototype._invalidateSplitterPositions = function () {
        var _this = this;
        if (this._splitterUpdateQueued)
            return;

        this._splitterUpdateQueued = true;

        this._queueImmediately(function () {
            return _this._validateSplitterPositions();
        });
    };

    SplitHost.prototype._queueImmediately = function (fun) {
        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(fun);
        } else if (window.webkitRequestAnimationFrame) {
            window.webkitRequestAnimationFrame(fun);
        } else if (window.mozRequestAnimationFrame) {
            window.mozRequestAnimationFrame(fun);
        } else {
            setTimeout(fun, 0);
        }
    };

    SplitHost.prototype._validateSplitterPositions = function () {
        this._splitterUpdateQueued = false;

        var actualLength = this._options.vertical ? this._host.offsetHeight : this._host.offsetWidth;

        if (this._cachedActualLength === actualLength)
            return;

        this._cachedActualLength = actualLength;

        this._recalculateSplitterPositions();
    };

    SplitHost.prototype._recalculateSplitterPositions = function () {
        var totalAbsolute = 0;
        var totalPercents = 0;
        for (var i = 0; i < this._childPanels.length; i++) {
            var p = this._childPanels[i];
            if (p.lengthUnit === '%')
                totalPercents += p.length;
            else
                totalAbsolute += p.length;
        }

        var percentPixelRatio = (this._cachedActualLength - totalAbsolute) / totalPercents;
        var offset = 0;
        var offsetWithUnit = offset + 'px';

        for (var i = 0; i < this._childPanels.length; i++) {
            var p = this._childPanels[i];
            var newLength = p.lengthUnit === '%' ? percentPixelRatio * p.length : p.length;
            var newLengthWithUnit = Math.floor(newLength) + 'px';

            if (i > 0) {
                var prevPS = this._childPanels[i - 1].container.style;
                if (this._options.vertical) {
                    if (prevPS.height != newLengthWithUnit)
                        prevPS.height = newLengthWithUnit;
                } else {
                    if (prevPS.width != newLengthWithUnit)
                        prevPS.width != newLengthWithUnit;
                }
            }

            if (this._options.vertical) {
                if (p.container.style.top != offsetWithUnit)
                    p.container.style.top = offsetWithUnit;
                if (p.container.style.height != newLengthWithUnit)
                    p.container.style.height = newLengthWithUnit;
            } else {
                if (p.container.style.left != offsetWithUnit)
                    p.container.style.left = offsetWithUnit;
                if (p.container.style.width != newLengthWithUnit)
                    p.container.style.width = newLengthWithUnit;
            }

            if (i > 0) {
                var spli = this._splitters[i - 1];
                var spliOffset = offset - (this._options.splitterLayoutSizePx / 2);
                if (spli.offset != spliOffset) {
                    spli.offset = spliOffset;

                    if (this._options.vertical)
                        spli.paddingElement.style.top = Math.floor(spli.offset) + 'px';
                    else
                        spli.paddingElement.style.left = Math.floor(spli.offset) + 'px';
                }
            }

            offset += newLength;
            offsetWithUnit = Math.floor(offset) + 'px';
        }

        this._cachedPercentPixelRatio = percentPixelRatio;
    };

    SplitHost.prototype._applyPanelContainerStyle = function (s) {
        this._applyStretchStyle(s);
        s.overflow = 'auto';
    };

    SplitHost.prototype._applySplitterStyle = function (ps, ls) {
        this._applyStretchStyle(ps);
        this._applyStretchStyle(ls);

        if (this._options.vertical) {
            ls.height = this._options.splitterLayoutSizePx + 'px';
            ps.marginTop = ps.marginBottom = (-this._options.splitterTouchPaddingPx) + 'px';
            ps.paddingTop = ps.paddingBottom = this._options.splitterTouchPaddingPx + 'px';
        } else {
            ls.width = this._options.splitterLayoutSizePx + 'px';
            ps.marginLeft = ps.marginRight = (-this._options.splitterTouchPaddingPx) + 'px';
            ps.paddingLeft = ps.paddingRight = this._options.splitterTouchPaddingPx + 'px';
        }

        ps.background = 'transparent';
        ps.cursor = this._options.vertical ? 's-resize' : 'ew-resize';
    };

    SplitHost.prototype._applyStretchStyle = function (s) {
        s.position = 'absolute';
        if (this._options.vertical) {
            s.left = s.right = '0px';
        } else {
            s.top = s.bottom = '0px';
        }
    };

    SplitHost.prototype._stringify = function (e) {
        if (e === null) {
            return 'null';
        } else if (typeof e === 'string') {
            return '"' + e + '"';
        } else if (typeof e === 'object') {
            var result = '{';
            for (var k in e)
                if (e.hasOwnProperty(k)) {
                    var v = e[k];
                    if (typeof v !== 'number')
                        continue;

                    if (result.length > 1)
                        result += ',';

                    result += ' ' + k + ':' + v;
                }
            return result;
        } else {
            return '' + e;
        }
    };

    SplitHost.prototype._splitterMouseDown = function (splitter, index, e) {
        if (this._options.log)
            this._options.log('_splitterMouseDown ' + this._getPosition(e) + ' ' + this._stringify(e));

        if (this._dragSplitterIndex >= 0) {
            // something has gone wrong, resetting
            this._splitterMouseUp(splitter, this._dragSplitterIndex, e);
            return;
        }

        this._dragSplitterIndex = index;
        this._dragBase = this._getPosition(e);

        this._highlightSplitter(splitter, true);

        if (splitter.paddingElement.setCapture) {
            splitter.paddingElement.setCapture(true);
        } else {
            this._attachWindowMouseEvents(splitter, index);
        }

        if (e.preventDefault)
            e.preventDefault();
    };

    SplitHost.prototype._getPosition = function (e) {
        return e.touches ? (this._options.vertical ? e.touches[0].pageY : e.touches[0].pageX) : (this._options.vertical ? e.clientY : e.clientX);
    };

    SplitHost.prototype._splitterTouchStart = function (splitter, index, e) {
        if (this._options.log)
            this._options.log('_splitterTouchStart ' + this._getPosition(e) + ' ' + this._stringify(e));

        this._splitterMouseDown(splitter, index, e);
    };

    SplitHost.prototype._highlightSplitter = function (splitter, highlight) {
        if (highlight) {
            splitter.paddingElement.style.background = 'cornflowerblue';
            splitter.paddingElement.style.opacity = '0.5';
        } else {
            splitter.paddingElement.style.background = 'transparent';
            splitter.paddingElement.style.opacity = '1';
        }
    };

    SplitHost.prototype._attachWindowMouseEvents = function (splitter, index) {
        var _this = this;
        this._windowMouseDownHandler = function (e) {
            return _this._splitterMouseDown(splitter, index, e || window.event);
        };
        this._windowMouseMoveHandler = function (e) {
            return _this._splitterMouseMove(splitter, index, e || window.event);
        };
        this._windowMouseUpHandler = function (e) {
            return _this._splitterMouseUp(splitter, index, e || window.event);
        };
        this._windowTouchStartHandler = function (e) {
            return _this._splitterTouchStart(splitter, index, e || window.event);
        };
        this._windowTouchMoveHandler = function (e) {
            return _this._splitterTouchMove(splitter, index, e || window.event);
        };
        this._windowTouchEndHandler = function (e) {
            return _this._splitterTouchEnd(splitter, index, e || window.event);
        };

        this._addEventListener('mousedown', window, this._windowMouseDownHandler);
        this._addEventListener('mousemove', window, this._windowMouseMoveHandler);
        this._addEventListener('mouseup', window, this._windowMouseUpHandler);
        this._addEventListener('touchstart', window, this._windowTouchStartHandler);
        this._addEventListener('touchmove', window, this._windowTouchMoveHandler);
        this._addEventListener('touchend', window, this._windowTouchEndHandler);
    };

    SplitHost.prototype._detachWindowMouseEvents = function () {
        if (this._windowMouseDownHandler)
            this._removeEventListener('mousedown', window, this._windowMouseDownHandler);

        if (this._windowMouseMoveHandler)
            this._removeEventListener('mousemove', window, this._windowMouseMoveHandler);

        if (this._windowMouseUpHandler)
            this._removeEventListener('mouseup', window, this._windowMouseUpHandler);

        if (this._windowTouchStartHandler)
            this._removeEventListener('touchstart', window, this._windowTouchStartHandler);

        if (this._windowTouchMoveHandler)
            this._removeEventListener('touchmove', window, this._windowTouchMoveHandler);

        if (this._windowTouchEndHandler)
            this._removeEventListener('touchend', window, this._windowTouchEndHandler);
    };

    SplitHost.prototype._splitterMouseUp = function (splitter, index, e) {
        if (this._options.log)
            this._options.log('_splitterMouseUp ' + this._getPosition(e) + ' ' + this._stringify(e));

        if (!splitter.paddingElement.setCapture)
            this._detachWindowMouseEvents();

        this._dragSplitterIndex = -1;
        if (Math.abs(this._dragOffset) > this._options.splitterLayoutSizePx / 2 + this._options.splitterTouchPaddingPx) {
            this._highlightSplitter(splitter, false);
        }
    };

    SplitHost.prototype._splitterTouchEnd = function (splitter, index, e) {
        if (this._options.log)
            this._options.log('_splitterTouchEnd ' + this._getPosition(e) + ' ' + this._stringify(e));

        this._splitterMouseUp(splitter, index, e);
    };

    SplitHost.prototype._splitterMouseMove = function (splitter, index, e) {
        if (this._options.log)
            this._options.log('_splitterMouseMove ' + this._getPosition(e) + ' ' + this._stringify(e));

        if (this._dragSplitterIndex < 0)
            return;

        if (e.preventDefault)
            e.preventDefault();

        this._queueDragSplitterResize(splitter, index, e);
    };

    SplitHost.prototype._splitterTouchMove = function (splitter, index, e) {
        if (this._options.log)
            this._options.log('_splitterTouchMove ' + this._getPosition(e) + ' ' + this._stringify(e));

        this._splitterMouseMove(splitter, index, e);
    };

    SplitHost.prototype._splitterMouseOver = function (splitter, index, e) {
        if (this._dragSplitterIndex < 0)
            this._highlightSplitter(splitter, true);
    };

    SplitHost.prototype._splitterMouseOut = function (splitter, index, e) {
        if (this._dragSplitterIndex < 0)
            this._highlightSplitter(splitter, false);
    };

    SplitHost.prototype._queueDragSplitterResize = function (splitter, index, e) {
        var _this = this;
        this._dragOffset = this._getPosition(e) - this._dragBase;

        if (this._dragSplitterResizeQueued)
            return;

        this._dragSplitterResizeQueued = true;
        this._queueImmediately(function () {
            return _this._resizeDraggedSplitter(splitter, index);
        });
    };

    SplitHost.prototype._resizeDraggedSplitter = function (splitter, index) {
        this._dragSplitterResizeQueued = false;
        var prevPanel = this._childPanels[index];
        var nextPanel = this._childPanels[index + 1];

        if (!this._cachedPercentPixelRatio)
            return;

        var prevPanelLengthPx = prevPanel.lengthUnit === '%' ? prevPanel.length * this._cachedPercentPixelRatio : prevPanel.length;
        var newPrevPanelLengthPx = prevPanelLengthPx + this._dragOffset;
        var newPrevPanelLength = prevPanel.lengthUnit === '%' ? newPrevPanelLengthPx / this._cachedPercentPixelRatio : newPrevPanelLengthPx;
        newPrevPanelLengthPx = Math.floor(newPrevPanelLengthPx);

        var nextPanelLengthPx = nextPanel.lengthUnit === '%' ? nextPanel.length * this._cachedPercentPixelRatio : nextPanel.length;
        var newNextPanelLengthPx = nextPanelLengthPx - this._dragOffset;
        var newNextPanelLength = nextPanel.lengthUnit === '%' ? newNextPanelLengthPx / this._cachedPercentPixelRatio : newNextPanelLengthPx;
        newNextPanelLengthPx = Math.floor(newNextPanelLengthPx);

        if (this._options.log)
            this._options.log(this._dragOffset + ': ' + prevPanel.length + '->' + newPrevPanelLength + ' ' + nextPanel.length + '->' + newNextPanelLength);
        if (newPrevPanelLengthPx <= 0 || newNextPanelLengthPx <= 0)
            return;

        prevPanel.length = newPrevPanelLength;
        nextPanel.length = newNextPanelLength;

        this._dragBase += this._dragOffset;

        this._recalculateSplitterPositions();
    };
    SplitHost.defaultOptions = {
        splitterLayoutSizePx: 2,
        splitterTouchPaddingPx: 6,
        panelClassName: 'teapoSplitHost-panel',
        splitterClassName: 'teapoSplitHost-splitter',
        vertical: false,
        log: null
    };
    return SplitHost;
})();

var ChildPanel = (function () {
    function ChildPanel(element, vertical) {
        this.element = element;
        this.container = document.createElement('div');
        var s = element.style;
        if (s) {
            var lengthString;
            if (vertical) {
                lengthString = s.height;
                s.height = null;
            } else {
                lengthString = s.width;
                s.width = null;
            }
            s.position = 'absolute';
            s.left = s.right = s.top = s.bottom = '0px';
            this._applyLengthString(lengthString);
        }

        this.container.appendChild(this.element);
    }
    ChildPanel.prototype._applyLengthString = function (lengthString) {
        if (lengthString) {
            for (var i = 0; i < lengthString.length; i++) {
                var ch = lengthString.charCodeAt(i);
                if (ch < 48 || ch >= 58) {
                    this.length = i ? parseInt(lengthString.substring(0, i)) : 0;
                    this.lengthUnit = lengthString.substring(i);
                    return;
                }
            }
            this.length = 30;
            this.lengthUnit = lengthString;
        }

        this.length = 30;
        this.lengthUnit = "%";
    };
    return ChildPanel;
})();

var Splitter = (function () {
    function Splitter() {
        this.paddingElement = document.createElement('div');
        this.lineElement = document.createElement('div');
        this.offset = 0;
        this.paddingElement.appendChild(this.lineElement);
    }
    return Splitter;
})();
/// <reference path='typings/typescriptServices.d.ts' />
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
/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='DocumentState.ts' />
var TypeScriptService = (function () {
    function TypeScriptService(staticScripts) {
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

        var factory = new Services.TypeScriptServicesFactory();
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
/// <reference path='SplitHost.ts' />
/// <reference path='TypeScriptService.ts' />
var ApplicationLayout = (function () {
    function ApplicationLayout(_host) {
        this._host = _host;
        this.toolbar = document.createElement('div');
        this.statusBar = document.createElement('div');
        this._contentArea = document.createElement('div');
        this.leftPanel = document.createElement('div');
        this.mainContentPanel = document.createElement('div');
        this.rightPanel = document.createElement('div');
        this._contentArea.appendChild(this.leftPanel);
        this._contentArea.appendChild(this.mainContentPanel);
        this._contentArea.appendChild(this.rightPanel);

        this._applyStyles(this.toolbar.style, this._contentArea.style, this.leftPanel.style, this.mainContentPanel.style, this.rightPanel.style, this.statusBar.style);

        this._splitter = new SplitHost(this._contentArea);

        this._cleanContent(this._host);

        this._host.appendChild(this.toolbar);
        this._host.appendChild(this._contentArea);
        this._host.appendChild(this.statusBar);
    }
    ApplicationLayout.prototype._applyStyles = function (ts, cs, ls, ms, rs, sb) {
        ts.position = 'fixed';
        ts.height = '20px';
        ts.left = '0px';
        ts.right = '0px';
        ts.background = 'silver';

        cs.position = 'fixed';
        cs.top = '20px';
        cs.bottom = '16px';
        cs.left = '0px';
        cs.right = '0px';

        ls.border = 'solid 1px gold';
        ls.width = '10%';

        rs.border = 'solid 1px tomato';
        rs.width = '15%';

        sb.position = 'fixed';
        sb.height = '16px';
        sb.bottom = '0px';
        sb.left = '0px';
        sb.right = '0px';
        sb.background = 'silver';
        sb.opacity = '0.5';
    };

    ApplicationLayout.prototype._cleanContent = function (element) {
        if ('innerHTML' in element)
            element.innerHTML = '';
        else if ('textContent' in element)
            element.textContent = '';
        else if ('innerText' in element)
            element.innerText = '';
    };
    return ApplicationLayout;
})();
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='TypeScriptService.ts' />
/// <reference path='DocumentState.ts' />
var ApplicationState = (function () {
    function ApplicationState(_layout, _window) {
        if (typeof _window === "undefined") { _window = window; }
        this._layout = _layout;
        this._window = _window;
        var lib = this._loadStaticContent('lib.d.ts');
        this._tsService = new TypeScriptService({
            '#lib.d.ts': lib
        });

        this._editor = CodeMirror(this._layout.mainContentPanel);
    }
    ApplicationState.prototype._loadStaticContent = function (id) {
        var div = this._window.document.getElementById(id);
        if (div === null)
            return null;
        else
            return div.innerHTML;
    };
    return ApplicationState;
})();
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='ApplicationLayout.ts' />
/// <reference path='ApplicationState.ts' />
window.onload = function () {
    var layout = new ApplicationLayout(document.body);
    var state = new ApplicationState(layout);
};
//# sourceMappingURL=teapo.js.map
