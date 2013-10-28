var Split3 = (function () {
    function Split3(_host, options) {
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
        for (var k in Split3.defaultOptions)
            if (Split3.defaultOptions.hasOwnProperty(k)) {
                this._options[k] = options && k in options ? options[k] : Split3.defaultOptions[k];
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
    }
    Split3.prototype._addEventListener = function (eventName, element, fun) {
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

    Split3.prototype._removeEventListener = function (eventName, element, fun) {
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

    Split3.prototype._invalidateSplitterPositions = function () {
        var _this = this;
        if (this._splitterUpdateQueued)
            return;

        this._splitterUpdateQueued = true;

        this._queueImmediately(function () {
            return _this._validateSplitterPositions();
        });
    };

    Split3.prototype._queueImmediately = function (fun) {
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

    Split3.prototype._validateSplitterPositions = function () {
        this._splitterUpdateQueued = false;

        var actualLength = this._options.vertical ? this._host.offsetHeight : this._host.offsetWidth;

        if (this._cachedActualLength === actualLength)
            return;

        this._cachedActualLength = actualLength;

        this._recalculateSplitterPositions();
    };

    Split3.prototype._recalculateSplitterPositions = function () {
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

    Split3.prototype._applyPanelContainerStyle = function (s) {
        this._applyStretchStyle(s);
        s.overflow = 'auto';
    };

    Split3.prototype._applySplitterStyle = function (ps, ls) {
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

    Split3.prototype._applyStretchStyle = function (s) {
        s.position = 'absolute';
        if (this._options.vertical) {
            s.left = s.right = '0px';
        } else {
            s.top = s.bottom = '0px';
        }
    };

    Split3.prototype._stringify = function (e) {
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

    Split3.prototype._splitterMouseDown = function (splitter, index, e) {
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

    Split3.prototype._getPosition = function (e) {
        return e.touches ? (this._options.vertical ? e.touches[0].pageY : e.touches[0].pageX) : (this._options.vertical ? e.clientY : e.clientX);
    };

    Split3.prototype._splitterTouchStart = function (splitter, index, e) {
        if (this._options.log)
            this._options.log('_splitterTouchStart ' + this._getPosition(e) + ' ' + this._stringify(e));

        this._splitterMouseDown(splitter, index, e);
    };

    Split3.prototype._highlightSplitter = function (splitter, highlight) {
        if (highlight) {
            splitter.paddingElement.style.background = 'cornflowerblue';
            splitter.paddingElement.style.opacity = '0.5';
        } else {
            splitter.paddingElement.style.background = 'transparent';
            splitter.paddingElement.style.opacity = '1';
        }
    };

    Split3.prototype._attachWindowMouseEvents = function (splitter, index) {
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

    Split3.prototype._detachWindowMouseEvents = function () {
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

    Split3.prototype._splitterMouseUp = function (splitter, index, e) {
        if (this._options.log)
            this._options.log('_splitterMouseUp ' + this._getPosition(e) + ' ' + this._stringify(e));

        if (!splitter.paddingElement.setCapture)
            this._detachWindowMouseEvents();

        this._dragSplitterIndex = -1;
        if (Math.abs(this._dragOffset) > this._options.splitterLayoutSizePx / 2 + this._options.splitterTouchPaddingPx) {
            this._highlightSplitter(splitter, false);
        }
    };

    Split3.prototype._splitterTouchEnd = function (splitter, index, e) {
        if (this._options.log)
            this._options.log('_splitterTouchEnd ' + this._getPosition(e) + ' ' + this._stringify(e));

        this._splitterMouseUp(splitter, index, e);
    };

    Split3.prototype._splitterMouseMove = function (splitter, index, e) {
        if (this._options.log)
            this._options.log('_splitterMouseMove ' + this._getPosition(e) + ' ' + this._stringify(e));

        if (this._dragSplitterIndex < 0)
            return;

        if (e.preventDefault)
            e.preventDefault();

        this._queueDragSplitterResize(splitter, index, e);
    };

    Split3.prototype._splitterTouchMove = function (splitter, index, e) {
        if (this._options.log)
            this._options.log('_splitterTouchMove ' + this._getPosition(e) + ' ' + this._stringify(e));

        this._splitterMouseMove(splitter, index, e);
    };

    Split3.prototype._splitterMouseOver = function (splitter, index, e) {
        if (this._dragSplitterIndex < 0)
            this._highlightSplitter(splitter, true);
    };

    Split3.prototype._splitterMouseOut = function (splitter, index, e) {
        if (this._dragSplitterIndex < 0)
            this._highlightSplitter(splitter, false);
    };

    Split3.prototype._queueDragSplitterResize = function (splitter, index, e) {
        var _this = this;
        this._dragOffset = this._getPosition(e) - this._dragBase;

        if (this._dragSplitterResizeQueued)
            return;

        this._dragSplitterResizeQueued = true;
        this._queueImmediately(function () {
            return _this._resizeDraggedSplitter(splitter, index);
        });
    };

    Split3.prototype._resizeDraggedSplitter = function (splitter, index) {
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
    Split3.defaultOptions = {
        splitterLayoutSizePx: 2,
        splitterTouchPaddingPx: 6,
        panelClassName: 'mieSplit3-panel',
        splitterClassName: 'mieSplit3-splitter',
        vertical: false,
        log: null
    };
    return Split3;
})();

var ChildPanel = (function () {
    function ChildPanel(element, vertical) {
        this.element = element;
        this.container = document.createElement('div');
        var s = element.style;
        if (s) {
            this._applyLengthString(vertical ? s.height : s.width);
            s.position = 'absolute';
            s.left = s.right = s.top = s.bottom = '0px';
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
/// <reference path='Split3.ts' />
var Layout = (function () {
    function Layout(_host, _document) {
        if (typeof _document === "undefined") { _document = document; }
        this._host = _host;
        this._document = _document;
        this._editorHost = this._document.createElement('div');
        this._fileListHost = this._document.createElement('div');
        this._fileListHost.textContent = 'OK';
        this._editorHost.textContent = ' [edit] ';
        var divHost = document.createElement('div');
        divHost.appendChild(this._fileListHost);
        divHost.appendChild(this._editorHost);
        this._split = new Split3(divHost);

        Layout.clearContent(this._host);

        this._host.appendChild(divHost);
    }
    Layout.clearContent = function (element) {
        if ('innerHTML' in element)
            element.innerHTML = '';
        else if ('textContent' in element)
            element.textContent = '';
        else {
            // TODO: think of something else...
        }
    };
    return Layout;
})();
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='layout.ts' />
window.onload = function () {
    var layout = new Layout(document.body);
};
//# sourceMappingURL=teapo.js.map
