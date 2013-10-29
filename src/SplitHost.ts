class SplitHost {
  static defaultOptions = {
      splitterLayoutSizePx: 2,
      splitterTouchPaddingPx: 6,
      panelClassName: 'teapoSplitHost-panel',
      splitterClassName: 'teapoSplitHost-splitter',
      vertical: false,
      log: null
  };
  
  private _childPanels: ChildPanel[] = [];
  private _splitters: Splitter[] = [];

  private _splitterUpdateQueued = false;
  private _cachedPercentPixelRatio: number = 0;
  private _cachedActualLength = 0;

  private _dragSplitterIndex = -1;
  private _dragBase = 0;
  private _dragOffset = 0;
  private _dragSplitterResizeQueued = false;

  private _windowMouseDownHandler = null;
  private _windowMouseMoveHandler = null;
  private _windowMouseUpHandler = null;
  private _windowTouchStartHandler = null;
  private _windowTouchMoveHandler = null;
  private _windowTouchEndHandler = null;

  private _options: {
      splitterLayoutSizePx?: number;
      splitterTouchPaddingPx?: number;
      panelClassName?: string;
      splitterClassName?: string;
      vertical?: boolean;
      log?: (text: string) => void;
  } = {};

  constructor(
      private _host: HTMLElement,
      options?: {
          splitterLayoutSizePx?: number;
          splitterTouchPaddingPx?: number;
          panelClassName?: string;
          splitterClassName?: string;
          vertical?: boolean;
          log?: (text: string) => void;
      }) {

      for (var k in SplitHost.defaultOptions) if (SplitHost.defaultOptions.hasOwnProperty(k)) {
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

      // splitter count is 1 less than panel count
      for (var i = 0; i < this._childPanels.length-1; i++) {
          var splitter = new Splitter();
          
          this._applySplitterStyle(splitter.paddingElement.style, splitter.lineElement.style);
          splitter.lineElement.className = this._options.splitterClassName;

          ((splitter, i) => {
              // closure to avoid variable reuse across cycle iterations

              this._addEventListener(
                  'mousedown',
                  splitter.paddingElement,
                  (e) => this._splitterMouseDown(splitter, i, e || window.event));

              this._addEventListener(
                  'mouseup',
                  splitter.paddingElement,
                  (e) => this._splitterMouseUp(splitter, i, e || window.event));

              this._addEventListener(
                  'mousemove',
                  splitter.paddingElement,
                  (e) => this._splitterMouseMove(splitter, i, e || window.event));

              this._addEventListener(
                  'mouseout',
                  splitter.paddingElement,
                  (e) => this._splitterMouseOut(splitter, i, e || window.event));

              this._addEventListener(
                  'mouseover',
                  splitter.paddingElement,
                  (e) => this._splitterMouseOver(splitter, i, e || window.event));

              this._addEventListener(
                  'touchstart',
                  splitter.paddingElement,
                  (e) => this._splitterTouchStart(splitter, i, e || window.event));

              this._addEventListener(
                  'touchmove',
                  splitter.paddingElement,
                  (e) => this._splitterTouchMove(splitter, i, e || window.event));

              this._addEventListener(
                  'touchend',
                  splitter.paddingElement,
                  (e) => this._splitterTouchEnd(splitter, i, e || window.event));
              })(splitter, i);

          this._splitters.push(splitter);
      }

      this._validateSplitterPositions();

      for (var i = 0; i < this._childPanels.length; i++){
          this._host.appendChild(this._childPanels[i].container);
      }
      
      // again, splitter count is 1 less than panel count
      for (var i = 0; i < this._childPanels.length-1; i++) {
          this._host.appendChild(this._splitters[i].paddingElement);
      }

      var resizeHost =
          'onresize' in this._host ? <any>this._host :
          'onresize' in window ? <any>window :
          null;
          
      if (resizeHost)
          this._addEventListener('resize', resizeHost, () => this._invalidateSplitterPositions());

      // doesn't always work without it
      setTimeout(() => {
        this._validateSplitterPositions();
      }, 1);
  }
  
  private _addEventListener(eventName: string, element: Element, fun) {
      if ('on'+eventName in element) {
          if (element.addEventListener) {
              element.addEventListener(eventName, fun, true);
          }
          else if ((<any>element).attachEvent) {
              (<any>element).attachEvent('on'+eventName, fun);
          }
          else {
              element['on'+eventName] = fun;
          }
      }
  }

  private _removeEventListener(eventName: string, element: Element, fun) {
      if ('on'+eventName in element) {
          if (element.removeEventListener) {
              element.removeEventListener(eventName, fun, true);
          }
          else if ((<any>element).detachEvent) {
              (<any>element).detachEvent('on'+eventName, fun);
          }
          else {
              element['on'+eventName] = null;
          }
      }
  }

  private _invalidateSplitterPositions() {
      if (this._splitterUpdateQueued)
          return;

      this._splitterUpdateQueued = true;

      this._queueImmediately(() => this._validateSplitterPositions());
  }

  private _queueImmediately(fun: () => void) {
      if (window.requestAnimationFrame) {
          window.requestAnimationFrame(fun);
      }
      else if ((<any>window).webkitRequestAnimationFrame) {
          (<any>window).webkitRequestAnimationFrame(fun);
      }
      else if ((<any>window).mozRequestAnimationFrame) {
          (<any>window).mozRequestAnimationFrame(fun);
      }
      else {
          setTimeout(fun, 0);
      }
  }

  private _validateSplitterPositions() {
      this._splitterUpdateQueued = false;

      var actualLength = this._options.vertical ?
          this._host.offsetHeight :
          this._host.offsetWidth;

      if (this._cachedActualLength===actualLength)
          return;

      this._cachedActualLength = actualLength;
          
      this._recalculateSplitterPositions();
  }

  private _recalculateSplitterPositions() {

      var totalAbsolute = 0;
      var totalPercents = 0;
      for (var i = 0; i < this._childPanels.length; i++) {
          var p = this._childPanels[i];
          if (p.lengthUnit==='%')
              totalPercents += p.length;
          else
              totalAbsolute += p.length;
      }

      var percentPixelRatio = (this._cachedActualLength - totalAbsolute)/totalPercents;
      var offset = 0;
      var offsetWithUnit = offset+'px';

      for (var i = 0; i < this._childPanels.length; i++) {
          var p = this._childPanels[i];
          var newLength = p.lengthUnit==='%' ? percentPixelRatio * p.length : p.length;
          var newLengthWithUnit = Math.floor(newLength)+'px';
          
          if (i>0) {
              var prevPS = this._childPanels[i-1].container.style;
              if (this._options.vertical) {
                  if (prevPS.height != newLengthWithUnit)
                      prevPS.height = newLengthWithUnit;
              }
              else {
                  if (prevPS.width != newLengthWithUnit)
                      prevPS.width != newLengthWithUnit;
              }
          }

          if (this._options.vertical) {
              if (p.container.style.top != offsetWithUnit)
                  p.container.style.top = offsetWithUnit;
              if (p.container.style.height != newLengthWithUnit)
                  p.container.style.height = newLengthWithUnit;
          }
          else {
              if (p.container.style.left != offsetWithUnit)
                  p.container.style.left = offsetWithUnit;
              if (p.container.style.width != newLengthWithUnit)
                  p.container.style.width = newLengthWithUnit;
          }

          if (i>0) {
              var spli = this._splitters[i-1];
              var spliOffset = offset-(this._options.splitterLayoutSizePx/2);
              if (spli.offset != spliOffset) {
                  spli.offset = spliOffset;

                  if (this._options.vertical)
                      spli.paddingElement.style.top = Math.floor(spli.offset)+'px';
                  else
                      spli.paddingElement.style.left = Math.floor(spli.offset)+'px';
              }
          }

          offset += newLength;
          offsetWithUnit = Math.floor(offset)+'px';
      }

      this._cachedPercentPixelRatio = percentPixelRatio;
  }

  private _applyPanelContainerStyle(s: MSStyleCSSProperties) {
      this._applyStretchStyle(s);
      s.overflow = 'auto';
  }

  private _applySplitterStyle(ps: MSStyleCSSProperties, ls: MSStyleCSSProperties) {
      this._applyStretchStyle(ps);
      this._applyStretchStyle(ls);

      if (this._options.vertical) {
          ls.height = this._options.splitterLayoutSizePx + 'px';
          ps.marginTop = ps.marginBottom =
              (-this._options.splitterTouchPaddingPx) + 'px';
          ps.paddingTop = ps.paddingBottom =
              this._options.splitterTouchPaddingPx + 'px';
      }
      else {
          ls.width = this._options.splitterLayoutSizePx + 'px';
          ps.marginLeft = ps.marginRight =
              (-this._options.splitterTouchPaddingPx) + 'px';
          ps.paddingLeft = ps.paddingRight =
              this._options.splitterTouchPaddingPx + 'px';
      }

      ps.background = 'transparent';
      ps.cursor = this._options.vertical ? 's-resize' : 'ew-resize';
  }

  private _applyStretchStyle(s: MSStyleCSSProperties) {
      s.position = 'absolute';
      if (this._options.vertical) {
          s.left = s.right = '0px';
      }
      else {
          s.top = s.bottom = '0px';
      }
  }

  private _stringify(e) {
      if (e===null) {
          return 'null';
      }
      else if (typeof e==='string') {
          return '"'+e+'"';
      }
      else if (typeof e==='object') {
          var result = '{';
          for (var k in e) if (e.hasOwnProperty(k)) {
              var v = e[k];
              if (typeof v!=='number')
                  continue;

              if (result.length>1)
                  result+=',';

              result += ' '+k+':'+v;
          }
          return result;
      }
      else {
          return ''+e;
      }
  }

  private _splitterMouseDown(splitter: Splitter, index: number, e) {
      if (this._options.log)
          this._options.log('_splitterMouseDown '+this._getPosition(e)+' '+this._stringify(e));

      if (this._dragSplitterIndex>=0) {
          // something has gone wrong, resetting
          this._splitterMouseUp(splitter, this._dragSplitterIndex, e);
          return;
      }

      this._dragSplitterIndex = index;
      this._dragBase = this._getPosition(e);

      this._highlightSplitter(splitter, true);

      if (splitter.paddingElement.setCapture) {
          splitter.paddingElement.setCapture(true);
      }
      else {
          this._attachWindowMouseEvents(splitter, index);
      }

      if (e.preventDefault)
          e.preventDefault();
  }

  private _getPosition(e) {
      return e.touches ?
          (this._options.vertical ? e.touches[0].pageY : e.touches[0].pageX) :
          (this._options.vertical ? e.clientY : e.clientX);
  }
  
  private _splitterTouchStart(splitter: Splitter, index: number, e) {
      if (this._options.log)
          this._options.log('_splitterTouchStart '+this._getPosition(e)+' '+this._stringify(e));

      this._splitterMouseDown(splitter, index, e);
  }

  private _highlightSplitter(splitter: Splitter, highlight: boolean) {
      if (highlight) {
          splitter.paddingElement.style.background = 'cornflowerblue';
          splitter.paddingElement.style.opacity = '0.5';
      }
      else {
          splitter.paddingElement.style.background = 'transparent';
          splitter.paddingElement.style.opacity = '1';
      }
  }
  
  private _attachWindowMouseEvents(splitter: Splitter, index: number) {
      this._windowMouseDownHandler = (e) => this._splitterMouseDown(splitter, index, e || window.event);
      this._windowMouseMoveHandler = (e) => this._splitterMouseMove(splitter, index, e || window.event);
      this._windowMouseUpHandler = (e) => this._splitterMouseUp(splitter, index, e || window.event);
      this._windowTouchStartHandler = (e) => this._splitterTouchStart(splitter, index, e || window.event);
      this._windowTouchMoveHandler = (e) => this._splitterTouchMove(splitter, index, e || window.event);
      this._windowTouchEndHandler = (e) => this._splitterTouchEnd(splitter, index, e || window.event);

      this._addEventListener('mousedown', <any>window, this._windowMouseDownHandler);
      this._addEventListener('mousemove', <any>window, this._windowMouseMoveHandler);
      this._addEventListener('mouseup', <any>window, this._windowMouseUpHandler);
      this._addEventListener('touchstart', <any>window, this._windowTouchStartHandler);
      this._addEventListener('touchmove', <any>window, this._windowTouchMoveHandler);
      this._addEventListener('touchend', <any>window, this._windowTouchEndHandler);
  }
  
  private _detachWindowMouseEvents() {
      if (this._windowMouseDownHandler)
          this._removeEventListener('mousedown', <any>window, this._windowMouseDownHandler);

      if (this._windowMouseMoveHandler)
          this._removeEventListener('mousemove', <any>window, this._windowMouseMoveHandler);

      if (this._windowMouseUpHandler)
          this._removeEventListener('mouseup', <any>window, this._windowMouseUpHandler);

      if (this._windowTouchStartHandler)
          this._removeEventListener('touchstart', <any>window, this._windowTouchStartHandler);

      if (this._windowTouchMoveHandler)
          this._removeEventListener('touchmove', <any>window, this._windowTouchMoveHandler);

      if (this._windowTouchEndHandler)
          this._removeEventListener('touchend', <any>window, this._windowTouchEndHandler);
  }

  private _splitterMouseUp(splitter: Splitter, index: number, e) {
      if (this._options.log)
          this._options.log('_splitterMouseUp '+this._getPosition(e)+' '+this._stringify(e));

      if (!splitter.paddingElement.setCapture)
          this._detachWindowMouseEvents();

      this._dragSplitterIndex = -1;
      if (Math.abs(this._dragOffset) >
          this._options.splitterLayoutSizePx/2+this._options.splitterTouchPaddingPx) {
          this._highlightSplitter(splitter, false);
      }
  }

  private _splitterTouchEnd(splitter: Splitter, index: number, e) {
      if (this._options.log)
          this._options.log('_splitterTouchEnd '+this._getPosition(e)+' '+this._stringify(e));

      this._splitterMouseUp(splitter, index, e);
  }

  private _splitterMouseMove(splitter: Splitter, index: number, e) {
      if (this._options.log)
          this._options.log('_splitterMouseMove '+this._getPosition(e)+' '+this._stringify(e));

      if (this._dragSplitterIndex < 0)
          return;

      if (e.preventDefault)
          e.preventDefault();

      this._queueDragSplitterResize(splitter, index, e);
  }

  private _splitterTouchMove(splitter: Splitter, index: number, e) {
      if (this._options.log)
          this._options.log('_splitterTouchMove '+this._getPosition(e)+' '+this._stringify(e));

      this._splitterMouseMove(splitter, index, e);
  }

  private _splitterMouseOver(splitter: Splitter, index: number, e) {
      if (this._dragSplitterIndex < 0)
          this._highlightSplitter(splitter, true);
  }

  private _splitterMouseOut(splitter: Splitter, index: number, e) {
      if (this._dragSplitterIndex < 0) // do not switch of during dragging
          this._highlightSplitter(splitter, false);
  }
  
  private _queueDragSplitterResize(splitter: Splitter, index: number, e) {
      this._dragOffset = this._getPosition(e) - this._dragBase;

      if (this._dragSplitterResizeQueued)
          return;

      this._dragSplitterResizeQueued = true;
      this._queueImmediately(() => this._resizeDraggedSplitter(splitter, index));
  }

  private _resizeDraggedSplitter(splitter: Splitter, index: number) {
      this._dragSplitterResizeQueued = false;
      var prevPanel = this._childPanels[index];
      var nextPanel = this._childPanels[index+1];

      if (!this._cachedPercentPixelRatio)
          return;

      var prevPanelLengthPx = prevPanel.lengthUnit==='%' ?
          prevPanel.length*this._cachedPercentPixelRatio :
          prevPanel.length;
      var newPrevPanelLengthPx = prevPanelLengthPx + this._dragOffset;
      var newPrevPanelLength = prevPanel.lengthUnit==='%' ?
          newPrevPanelLengthPx/this._cachedPercentPixelRatio :
          newPrevPanelLengthPx;
      newPrevPanelLengthPx = Math.floor(newPrevPanelLengthPx);
      
      var nextPanelLengthPx = nextPanel.lengthUnit==='%' ?
          nextPanel.length*this._cachedPercentPixelRatio :
          nextPanel.length;
      var newNextPanelLengthPx = nextPanelLengthPx - this._dragOffset;
      var newNextPanelLength = nextPanel.lengthUnit==='%' ?
          newNextPanelLengthPx/this._cachedPercentPixelRatio :
          newNextPanelLengthPx;
      newNextPanelLengthPx = Math.floor(newNextPanelLengthPx);

      if (this._options.log)
          this._options.log(this._dragOffset+': '+prevPanel.length+'->'+newPrevPanelLength+' '+nextPanel.length+'->'+newNextPanelLength);
      if (newPrevPanelLengthPx<=0 || newNextPanelLengthPx<=0)
          return;

      prevPanel.length = newPrevPanelLength;
      nextPanel.length = newNextPanelLength;
      
      this._dragBase += this._dragOffset;

      this._recalculateSplitterPositions();
  }
}

class ChildPanel {
  container = document.createElement('div');
  length: number;
  lengthUnit: string;

  constructor(public element: Element, vertical: boolean) {
      var s = (<HTMLElement>element).style;
      if (s) {
          var lengthString: string;
          if (vertical) {
              lengthString = s.height;
              s.height = null;
          }
          else {
              lengthString = s.width;
              s.width = null;
          }
          s.position = 'absolute';
          s.left = s.right = s.top = s.bottom = '0px';
          this._applyLengthString(lengthString);
      }

      this.container.appendChild(this.element);
  }
  
  private _applyLengthString(lengthString: string) {
      if (lengthString) {
          for (var i = 0; i < lengthString.length; i++) {
              var ch = lengthString.charCodeAt(i);
              if (ch<48 || ch >=58) {
                  this.length = i ? parseInt(lengthString.substring(0,i)) : 0;
                  this.lengthUnit = lengthString.substring(i);
                  return;
              }
          }
          this.length = 30;
          this.lengthUnit = lengthString;
      }

      this.length = 30;
      this.lengthUnit = "%";
  }
}

class Splitter {
  paddingElement = document.createElement('div');
  lineElement = document.createElement('div');
  offset: number = 0;

  constructor() {
      this.paddingElement.appendChild(this.lineElement);
  }
}