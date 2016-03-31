declare var webkitRequestAnimationFrame;

module shell.panels {

  var panelClass = 'panels-panel-page';
  var approxColumnWidthEms = 17;
  var titleHeightEms = 1.2;
  var bottomHeightEms = 1.2;
  var bottomShadowEms = 0.4;
  var minTitleWidth = 40;

  export class Panel {

    private _cursorPath: string;
    private _cursorEntryIndex = -1;
    private _entries: Panel.PageEntry[] = null;
    private _redrawRequested = 0;

    private _metrics: Panel.Metrics = null;
  	private _availableHeight: number = 0;

  	private _panelBackground: HTMLDivElement;
  	private _panelBackgroundTop: HTMLDivElement;
  	private _panelBackgroundTopShadow: HTMLDivElement;
  	private _panelBackgroundTopLeft: HTMLSpanElement;
  	private _panelBackgroundTitleGap: HTMLSpanElement;
  	private _panelBackgroundTopRight: HTMLSpanElement;
  	private _panelBackgroundMain: HTMLDivElement;
  	private _panelBackgroundBottomShadow: HTMLDivElement;

  	private _scrollHost: HTMLDivElement;
    private _scrollContent: HTMLElementWithFlags;
  	private _titleHost: HTMLDivElement;
  	private _title: HTMLPreElement;
  	private _bottom: HTMLPreElement;

    private _pages: Panel.PageData[] = [];

    private _entriesInColumn = 0;
    private _pageHeight = 0;
    private _pageInterval = 0;
    private _columnsOnPage = 0;
    private _columnWidth = 0;
  	private _titleWidth = 0;

    private _scrollTop = 0;
    private _scrollTopHeight = 0;
    private _isActive = false;
    private _nextRedrawScrollToCurrent = false;
  	private _supportsInlineBlock: boolean = typeof ActiveXObject === 'undefined' ? true : null;
  	private _inlineBlockDetector: HTMLDivElement = null;

    ondoubleclick: () => boolean = null;

  	private _titleWidthCache: any = {};
  	private _titleWidthMeasurement: HTMLElement = null;
  	private _titleWidthMeasurementRequired = true;

  	private _highlightSelected: { [path: string]: boolean; } = null;

    constructor(
      private _host: HTMLElement,
      private _path: string,
      private _directoryService: (path: string) => Panel.DirectoryEntry[]) {

      this._titleWidthMeasurement = elem('pre', {
        className: 'panel-each-title-active',
        position: 'absolute',
        left: '-3000px',
        top: '-3000px',
        opacity: '0.0001'
      }, this._host);

      this._panelBackground = <HTMLDivElement>elem('div', { zoom: 1, position: 'relative', width: '100%' }, this._host);
      this._panelBackgroundTopShadow = <HTMLDivElement>elem('div', { className: 'panel-top-shadow', fontSize: '1px', innerHTML: '&nbsp;' }, this._panelBackground);
      this._panelBackgroundTop = <HTMLDivElement>elem('div', { fontSize: '1px', innerHTML: '&nbsp;' }, this._panelBackground);
      this._panelBackgroundTopLeft = <HTMLSpanElement>elem('span', { className: 'panel-each-background', display: 'inline-block' }, this._panelBackgroundTop);
      this._panelBackgroundTitleGap = <HTMLSpanElement>elem('span', { className: 'panel-top-shadow', display: 'inline-block' }, this._panelBackgroundTop);
      this._panelBackgroundTopRight = <HTMLSpanElement>elem('span', { className: 'panel-each-background', display: 'inline-block' }, this._panelBackgroundTop);
      this._panelBackgroundMain = <HTMLDivElement>elem('div', { fontSize: '1px', innerHTML: '&nbsp;', className: 'panel-each-background' }, this._panelBackground);
      this._panelBackgroundBottomShadow = <HTMLDivElement>elem('div', { className: 'panel-bottom-shadow', fontSize: '1px', innerHTML: '&nbsp;' }, this._panelBackground);

      this._scrollHost = <HTMLDivElement>elem('div', { className: 'panel-each-scrollhost', zoom: 1, position: 'relative', margin: '0px', padding: '0px', overflow: 'hidden', overflowY: 'auto' }, this._host);
      this._scrollContent = <HTMLElementWithFlags>elem('div', this._scrollHost);
      this._scrollContent.isScrollContent = true;

      this._bottom = <HTMLPreElement>elem('pre', { className: 'panel-each-bottom panel-each-bottom-inactive', zoom: 1, position: 'relative', margin: '0px', overflow: 'hidden' }, this._host);
      this._titleHost = <HTMLDivElement>elem('div', { zoom: 1, position: 'relative', margin: '0px' }, this._host);
      this._title = <HTMLPreElement>elem('pre', { className: 'panel-each-title panel-each-title-inactive', padding: '0px', margin: '0px' }, this._titleHost);

      on(this._scrollHost, 'scroll', () => this._onscroll());

      this._queueRedraw();
    }

  	getHighlightedSelection(): string[] {
      if (!this._highlightSelected) return [];
      if (Object.keys) return Object.keys(this._highlightSelected);
      var result: string[] = [];
      for (var k in this._highlightSelected) if (k && k.charCodeAt(0)===47 /* slash */ && this._highlightSelected.hasOwnProperty(k)) {
        result.push(k);
      }
      return result;
    }

  	highlightCurrent() {

      if (this._path===this._cursorPath) return; // do not highlight '..' entry

      if (!this._highlightSelected) this._highlightSelected = {};
      this._highlightSelected[this._cursorPath] = !this._highlightSelected[this._cursorPath];
      this.cursorGo(+1);

      this._queueRedraw();
    }

    set(paths: { currentPath?: string; cursorPath?: string }) {
      if (paths.currentPath)
        this._updatePath(paths.currentPath);

      if (paths.cursorPath) {
        this._cursorPath = paths.cursorPath;
        this._nextRedrawScrollToCurrent = true;
      }
      this._queueRedraw();
    }

  	trySelectFileInCurrentDir(file: string) {
      this._redrawNow();
      if (!this._pages) return false;
      for (var i = 0; i < this._pages.length; i++) {
        var p = this._pages[i];
        for (var j = 0; j <p.columns.length; j++) {
          var c = p.columns[j];
          for (var k = 0; k < c.entries.length; k++) {
            var e = c.entries[k];
            if (e.path===file) {
              this._cursorPath = file;
        			this._nextRedrawScrollToCurrent = true;
      				this._queueRedraw();
              return true;
            }
          }
        }
      }
    }

    handleClick(e: MouseEvent): boolean {
      if (!this._entries) return;

      var clickElem = <HTMLElementWithFlags>(e.srcElement || e.target || e.currentTarget);
      var entryDIV: HTMLElementWithFlags;
      var columnDIV: HTMLElementWithFlags;
      var pageDIV: HTMLElementWithFlags;
      var leadPaddingDIV: HTMLElementWithFlags;

      while (clickElem) {

        if (clickElem.isScrollContent) {
          if (clickElem !== this._scrollContent) return false;
          break;
        }

        if (clickElem.isPageDIV)
          pageDIV = clickElem;

        if (clickElem.isColumnDIV)
          columnDIV = clickElem;

        if (clickElem.isEntryDIV)
          entryDIV = clickElem;

        clickElem = <any>clickElem.parentElement;
      }

      if (entryDIV) {
        for (var i = 0; i < this._entries.length; i++) {
          if (this._entries[i].entryDIV === entryDIV) {
            if (this._cursorPath === this._entries[i].path) {
              if (this._entries[i].flags & Panel.EntryFlags.Directory) {
                this._cursorPath = this._path;
                this._updatePath(this._entries[i].path) // double click (or second click) opens directory
              }
              else {
                // double click (or second click) on  a file
                this._nextRedrawScrollToCurrent = true;
                this._queueRedraw();
                return this.ondoubleclick && this.ondoubleclick();
              }
            }
            else {
              this._cursorPath = this._entries[i].path;
            }
            this._nextRedrawScrollToCurrent = true;
            this._queueRedraw();
            break;
          }
        }
        this._queueRedraw();
      }

      return true;
    }

    currentPath() {
      return this._path;
    }

    cursorPath() {
      return this._cursorPath;
    }

  	measure(metrics: Panel.Metrics) {
      this._ensureTitleMeasured();
    }

    arrange(metrics: Panel.Metrics) {
      this._metrics = metrics;
      this._redrawNow();
    }

    isActive() {
      return this._isActive;
    }

    activate() {
      this._isActive = true;
      this._scrollContent.className = 'panels-panel-active';
      this._title.className = 'panel-each-title panel-each-title-active';
      this._bottom.className = 'panel-each-bottom panel-each-bottom-active';
    }

    deactivate() {
      this._isActive = false;
      this._scrollContent.className = 'panels-panel-inactive';
      this._title.className = 'panel-each-title panel-each-title-inactive';
      this._bottom.className = 'panel-each-bottom panel-each-bottom-inactive';
    }

    cursorGo(direction: number) {
      if (!this._entries || !this._entries.length) return;

      var moveStep = 0;

      switch (direction) {

        case -1: // up
          moveStep = -1;
          break;

        case +1: // down
          moveStep = +1;
          break;

        case -10: // left
          var entryIndex = this._calcEntryIndex(this._cursorEntryIndex);
          if (this._columnsOnPage === 1) {
            moveStep = -entryIndex || -1;
          }
          else {
            var columnIndex = this._calcColumnIndex(this._cursorEntryIndex);
            if (columnIndex > 0) {
              moveStep = -this._entriesInColumn;
            }
            else {
              moveStep = this._entriesInColumn * (this._columnsOnPage - 1) - 1;

              // overflow cases
              if (this._cursorEntryIndex === 0) {
                moveStep = this._entriesInColumn * (this._columnsOnPage - 1);
              }
              else if (this._cursorEntryIndex + moveStep >= this._entries.length) { // there is no rightmost column

                var endEntryIndex = this._calcEntryIndex(this._entries.length - 1);
                var endColumnIndex = this._calcColumnIndex(this._entries.length - 1);

                // if the last entry is higher vertically, stop at the previous column
                var targetColumnIndex = endEntryIndex >= entryIndex ? endColumnIndex : endColumnIndex - 1;

                if (targetColumnIndex <= columnIndex) {
                  moveStep = -entryIndex; // if nowhere to go right, go all the way up
                }
                else {
                  // there are columns on the right, so go there (and one up after)
                  moveStep = (targetColumnIndex - columnIndex) * this._entriesInColumn - 1;
                }
              }
            }
          }
          break;

        case +10: // right
          var columnIndex = this._calcColumnIndex(this._cursorEntryIndex);
          if (columnIndex < this._columnsOnPage - 1) {
            moveStep = +this._entriesInColumn;
          }
          else {
            moveStep = -this._entriesInColumn * 2 + 1;
          }
          break;

        case -100: // page up
          moveStep = -this._entriesInColumn * this._columnsOnPage;
          break;

        case +100: // page down
          moveStep = +this._entriesInColumn * this._columnsOnPage;
          break;

        case -1000000: // home
          moveStep = -1000000;
          break;

        case +1000000: // end
          moveStep = +1000000;
          break;
      }

      if (moveStep) {
        var newCursorEntryIndex =
            moveStep=== -1000000 ? 0 :
        		moveStep=== +1000000 ? this._entries.length - 1 :
            Math.max(0, Math.min(this._entries.length - 1, this._cursorEntryIndex + moveStep));
        var e = this._entries[newCursorEntryIndex];
        if (e) {
          this._cursorPath = this._entries[newCursorEntryIndex].path;
          this._nextRedrawScrollToCurrent = true;
          this._queueRedraw();
        }
      }
    }

    navigateCursor() {
      if (this._cursorEntryIndex >= 0) {
        var entry = this._entries[this._cursorEntryIndex];
        if (entry) {
          if (entry.flags & Panel.EntryFlags.Directory) {
            // drilling down into the directory
            this._cursorPath = this._path;
            this._nextRedrawScrollToCurrent = true;
            this._updatePath(entry.path);
            this._queueRedraw();
            return true;
          }
        }
      }
    }

  	private _ensureTitleMeasured() {
      if (!this._titleWidthMeasurementRequired) return;
      this._titleWidth = this._titleWidthMeasurement.offsetWidth;
      this._titleWidthCache[this._path] = this._titleWidth;
      this._titleWidthMeasurementRequired = false;
    }

  	private _updatePath(path: string) {
      if (path === this._path) return;

      this._highlightSelected = null;
      this._queueRedraw();

      this._path = path;

      if (this._titleWidthCache[path]) {
        this._titleWidth = this._titleWidthCache[path];
      	this._titleWidthMeasurementRequired = false;
        return;
      }
      else {
        setText(this._titleWidthMeasurement, path);
        this._titleWidthMeasurementRequired = true;
      }
    }

    private _redrawNowClosure = () => this._redrawNow();

    private _queueRedraw() {
      if (this._redrawRequested) return;
      if (typeof requestAnimationFrame !=='undefined') {
        this._redrawRequested = requestAnimationFrame(this._redrawNowClosure);
      }
      else if (typeof webkitRequestAnimationFrame !=='undefined') {
        this._redrawRequested = webkitRequestAnimationFrame(this._redrawNowClosure);
      }
      else {
      	this._redrawRequested = setTimeout(this._redrawNowClosure, 1);
      }
    }

    private _redrawNow() {
      var startRedraw = Date.now ? Date.now() : +new Date();

      if (!this._metrics.windowMetrics.emHeight) {
        this._queueRedraw(); // no redraw for empty-sized element, wait
        return;
      }

      var prevOffset = this._calcEntryTopOffset(Math.max(0, this._cursorEntryIndex));

      try {
      	var entries = this._directoryService(this._path);
      }
      catch (error) {

        // the directory no longer exists, go up
        while (true) {
          if (!this._path || this._path==='/') {
            entries = [];
            break;
          }

          var tryPath = this._path.slice(0, this._path.lastIndexOf('/')) || '/';
          try {
      		  entries = this._directoryService(tryPath);
            this._updatePath(tryPath); // this will queue extra redraw
            break;
          }
          catch (error) { continue; }

        }
      }



      this._ensureTitleMeasured();

      var titleHeight = titleHeightEms*this._metrics.windowMetrics.emHeight;
      var bottomHeight = bottomHeightEms*this._metrics.windowMetrics.emHeight;
      var bottomShadowHeight = bottomShadowEms*this._metrics.windowMetrics.emHeight;
      this._availableHeight = this._metrics.hostHeight - titleHeight - bottomHeight - bottomShadowHeight;

      var adjTitleWidth = Math.min(this._metrics.hostWidth-this._metrics.windowMetrics.emWidth*4, this._titleWidth)|0;
      if (adjTitleWidth<minTitleWidth)
        adjTitleWidth = Math.min(minTitleWidth, this._metrics.hostWidth)|0;

      this._panelBackgroundTopShadow.style.height = ((titleHeight/2)|0)+'px';
      var topDecorHeightStr = (titleHeight - ((titleHeight/2)|0))+'px';
      this._panelBackgroundTop.style.height = topDecorHeightStr;
      this._panelBackgroundTop.style.width = (this._metrics.hostWidth+1)+'px';
      this._panelBackgroundTopLeft.style.width = (((this._metrics.hostWidth - adjTitleWidth)/2)|0)+'px';
      this._panelBackgroundTopLeft.style.height = topDecorHeightStr;
      this._panelBackgroundTitleGap.style.width = adjTitleWidth + 'px';
      this._panelBackgroundTitleGap.style.height = topDecorHeightStr;
      this._panelBackgroundTopRight.style.width = (this._metrics.hostWidth - adjTitleWidth - (((this._metrics.hostWidth - adjTitleWidth)/2)|0))+'px';
      this._panelBackgroundTopRight.style.height = topDecorHeightStr;
      this._panelBackgroundMain.style.height = (this._metrics.hostHeight-titleHeight-bottomShadowHeight)+'px';
			this._panelBackgroundBottomShadow.style.height = bottomShadowHeight+'px';


      this._scrollHost.style.width = this._metrics.hostWidth+'px';
      this._scrollHost.style.height = this._availableHeight+'px';
      this._scrollHost.style.marginTop = (-this._metrics.hostHeight+titleHeight)+'px';

      this._bottom.style.width = this._metrics.hostWidth+'px';
      this._bottom.style.height = bottomHeight+'px';
      var bottomVAdjust = (((bottomHeight-this._metrics.windowMetrics.emHeight)/2)/2)|0;
      this._bottom.style.paddingTop = bottomVAdjust+'px';
      this._bottom.style.paddingBottom = bottomVAdjust+'px';

      this._titleHost.style.width = this._metrics.hostWidth+'px';
      this._titleHost.style.height = titleHeight+'px';
      this._titleHost.style.marginTop = -(this._availableHeight+bottomHeight+titleHeight)+'px';
      this._titleHost.style.paddingTop = ((titleHeight-this._metrics.windowMetrics.emHeight)/2)+'px';

      this._title.style.marginLeft = (((this._metrics.hostWidth - adjTitleWidth)/2)|0)+'px';
      this._title.style.width = adjTitleWidth+'px';
      this._title.style.height = titleHeight+'px';

      this._entries = [];

      entries.sort((e1, e2) => {
        var flagCompare = (e1.flags & Panel.EntryFlags.Directory) ?
          ((e2.flags & Panel.EntryFlags.Directory) ? 0 : -1) :
          ((e2.flags & Panel.EntryFlags.Directory) ? +1 : 0);
        if (flagCompare) return flagCompare;

        var nameCompare = e1.name > e2.name ? 1 : e1.name < e2.name ? -1 : 0;
        return nameCompare;
      });

      if (this._path !== '/') {
        var parentPath = this._path.slice(0, this._path.lastIndexOf('/')) || '/';
        entries.unshift({
          name: '..',
          path: parentPath,
          flags: Panel.EntryFlags.Directory,
          size: 0
        });
      }

      if (!entries || !entries.length) {
        this._scrollContent.innerHTML = '';
        this._pages = [];
        return;
      }

      var lastCursorEntryIndex = this._cursorEntryIndex;
      this._cursorEntryIndex = -1;
      var seekApproxEntryIndex = true;
      var approxEntryIndex = -1;
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].path === this._cursorPath) {
          this._cursorEntryIndex = i;
          break;
        }

        if (entries[i].path > this._cursorPath) {
          if (seekApproxEntryIndex
              && Math.abs(i-lastCursorEntryIndex) < Math.abs(approxEntryIndex-lastCursorEntryIndex))
            // look for paths right after removed,
            // and seek the closest to previously selected
          	approxEntryIndex = i;
          seekApproxEntryIndex = false;
        }
        else {
          seekApproxEntryIndex = true;
        }
      }

      if (this._cursorEntryIndex < 0) {
        this._cursorEntryIndex = Math.max(0, approxEntryIndex);
        this._cursorPath = entries.length > 0 ? entries[this._cursorEntryIndex].path : null;
      }

      this._entriesInColumn = Math.max(3, ((this._availableHeight / this._metrics.windowMetrics.emHeight) | 0) - 2);
      this._pageHeight = this._entriesInColumn * this._metrics.windowMetrics.emHeight;
      this._pageInterval = this._availableHeight - this._pageHeight - this._metrics.windowMetrics.emHeight;

      var desiredColumnWidth = approxColumnWidthEms * this._metrics.windowMetrics.emWidth;
      this._columnsOnPage = Math.max(1, Math.round(this._metrics.hostWidth / desiredColumnWidth) | 0);


      // if scrollbar will appear, decrease content width to avoid incorrect wrapping
      var expectPageCountApprox = entries.length / (this._entriesInColumn*this._columnsOnPage);
      if (expectPageCountApprox>(expectPageCountApprox|0)) {
        var expectPageCount = (expectPageCountApprox|0)+1;
      }
      else {
        var expectPageCount = expectPageCountApprox|0;
      }

      var contentWidth = this._metrics.hostWidth;
      if (expectPageCount>1)
        contentWidth -= this._metrics.windowMetrics.scrollbarWidth;

      this._columnWidth = ((contentWidth / this._columnsOnPage) | 0) - 1;

      if (!this._pages)
        this._pages = [];

      var handlerList: shell.handlers.Handler[] = [];
      for (var k in shell.handlers) if (shell.handlers.hasOwnProperty(k)) {
        var ha: shell.handlers.Handler = shell.handlers[k];
        if (typeof ha === 'object'
          && ((ha.preferredFiles && typeof ha.preferredFiles.test === 'function')
            || (ha.handlesFiles && typeof ha.handlesFiles.test === 'function'))) {
          handlerList.push(ha);
        }
      }

      for (var i = 0; i < entries.length; i++) {
        var pageIndex = this._calcPageIndex(i);
        var page = this._pages[pageIndex];

        if (page) {
          if (page.height !== this._pageHeight) {
            page.height = this._pageHeight;
            page.pageDIV.style.height = this._pageHeight + 'px';
          }
          if (page.leadInterval !== this._pageInterval) {
            page.leadInterval = this._pageInterval;
            if (page.leadPaddingDIV)
              page.leadPaddingDIV.style.height = this._pageInterval + 'px';
          }
        }
        else {
          if (pageIndex) {
            var leadPaddingDIV = <HTMLElementWithFlags>elem('div', {
              className: 'panels-page-separator',
              height: this._pageInterval + 'px'
            }, this._scrollContent);
            leadPaddingDIV.isLeadPaddingDIV = true;
          }

          page = {
            leadPaddingDIV,
            leadInterval: this._pageInterval,
            height: this._pageHeight,
            pageDIV: <HTMLElementWithFlags>elem('div', {
              className: panelClass,
              height: this._pageHeight + 'px'
            }, this._scrollContent),
            columns: []
          };

          page.pageDIV.isPageDIV = true;
          this._pages.push(page);
        }

        var columnIndex = this._calcColumnIndex(i);
        var column = page.columns[columnIndex];
        if (column) {
          if (columnIndex === this._columnsOnPage - 1 && page.columns.length > this._columnsOnPage) {
            this._removeExcessColumns(page, this._columnsOnPage);
          }
          if (column.height !== this._pageHeight) {
            column.height = this._pageHeight;
            column.columnDIV.style.height = this._pageHeight + 'px';
          }
          if (column.width !== this._columnWidth) {
            column.width = this._columnWidth;
            column.columnDIV.style.width = this._columnWidth + 'px';
          }
        }
        else {
          column = {
            height: this._pageHeight,
            width: this._columnWidth,
            columnDIV: <HTMLElementWithFlags>elem('div', {
              className: 'panels-panel-column',
              height: this._pageHeight + 'px',
              width: this._columnWidth + 'px'
            }, page.pageDIV),
            entries: []
          };
          column.columnDIV.isColumnDIV = true;
          page.columns.push(column);
        }

        var dentry = entries[i];

        var entryIndex = this._calcEntryIndex(i);
        var extraClassName = this._getExtraClass(dentry.path, handlerList);
        var entry = this._updateEntry(dentry, i, column, entryIndex, extraClassName);

        if (this._cursorEntryIndex === i) {
          var cursorEntry = entry;
        }

        this._entries.push(entry);

      }

      this._removeExcessPages(pageIndex + 1);

      var p = this._pages[pageIndex];
      this._removeExcessColumns(p, columnIndex + 1);

      var c = p.columns[columnIndex];
      this._removeExcessEntries(c, entryIndex + 1);



      var newOffset = this._calcEntryTopOffset(Math.max(0, this._cursorEntryIndex));
      if (this._nextRedrawScrollToCurrent) {
        this._nextRedrawScrollToCurrent = false;
        var maxScroll = newOffset - this._metrics.windowMetrics.emHeight * 2;
        var minScroll = newOffset - this._availableHeight + this._metrics.windowMetrics.emHeight * 3;

        var newScrollTop =
          this._scrollTop < minScroll ? minScroll :
            this._scrollTop > maxScroll ? maxScroll :
              -1;

        if (newScrollTop >= 0) {
          //console.log('redraw: scroll to current [' + newScrollTop + ']');
          this._scrollHost.scrollTop = newScrollTop
        }
      }
      else {
        var prevDistanceFromCenter = prevOffset - (this._scrollTop + this._scrollTopHeight / 2);

        var newScrollTop = newOffset - prevDistanceFromCenter - this._availableHeight / 2;
        //console.log({
        //  prevDistanceFromCenter, prevOffset, this_scrollTop: this._scrollTop, this_scrollTopHeight: this._scrollTopHeight,
        //  newOffset, this_metrics_hostHeight: this._metrics.hostHeight, newScrollTop
        //});
        //console.log('redraw: scroll to approximate prev. [' + newScrollTop + ']');
        this._scrollHost.scrollTop = newScrollTop;
      }

      setText(this._title, this._path);

      var bottomText = this._cursorPath;
      if (cursorEntry) {
        if (cursorEntry.flags&Panel.EntryFlags.Directory) {
          bottomText = '[ '+bottomText+' ]';
        }
        else {
          if (cursorEntry.size) {
            var str = cursorEntry.size+'';
            var fmtStr = '';
            for (var i = 0; i < str.length; i++) {
              var ch = str.charAt(str.length-i-1);
              if (i>0 && (i%3===0)) fmtStr = ch+','+fmtStr;
              else fmtStr = ch + fmtStr;
            }
          	bottomText = bottomText + ' ['+fmtStr+']';
          }
          else {
          	bottomText = bottomText + ' [empty]';
          }
        }
      }

      setText(this._bottom, bottomText);



      this._redrawRequested = 0;
      var endRedraw = Date.now ? Date.now() : + new Date();

      if (!(<any>window).__redraw) {
        (<any>window).__redraw = { averageHundreds: [], hcount: 1, htotal: endRedraw - startRedraw };
      }
      else if ((<any>window).__redraw.hcount === 100) {
        (<any>window).__redraw.averageHundreds.push((<any>window).__redraw.htotal/(<any>window).__redraw.hcount);
        (<any>window).__redraw.htotal = endRedraw - startRedraw;
        (<any>window).__redraw.hcount = 1;
      }
      else {
        (<any>window).__redraw.htotal += endRedraw - startRedraw;
        (<any>window).__redraw.hcount++;
      }



      // end of _redrawNow()
    }

    private _getExtraClass(path: string, handlerList: shell.handlers.Handler[]): string {
      for (var i = 0; i < handlerList.length; i++) {
        var ha = handlerList[i];
        if (ha.entryClass && ha.preferredFiles && ha.preferredFiles.test(path)) {
          if (typeof ha.entryClass === 'string') return <string>ha.entryClass;
          if (typeof ha.entryClass === 'function') {
            var className = (<any>ha.entryClass)(path);
            if (typeof className === 'string') return className;
          }
        }
      }

      for (var i = 0; i < handlerList.length; i++) {
        var ha = handlerList[i];
        if (ha.entryClass && ha.handlesFiles && ha.handlesFiles.test(path)) {
          if (typeof ha.entryClass === 'string') return <string>ha.entryClass;
          if (typeof ha.entryClass === 'function') {
            var className = (<any>ha.entryClass)(path);
            if (typeof className === 'string') return className;
          }
        }
      }

      return null;
    }

  	private _classConcatCache: any = {};

  	private _getEntryClass(dentry: Panel.DirectoryEntry, extraClass: string, indexInDirectory: number) {
      var isSelected = this._highlightSelected && this._highlightSelected[dentry.path];

      var index =
          (dentry.flags & Panel.EntryFlags.Directory ? 1 : 0)
      		| (this._cursorEntryIndex === indexInDirectory ? 2 : 0)
      		| (isSelected ? 4 : 0);
      var arr = this._classConcatCache[extraClass || '#'] || (this._classConcatCache[extraClass || '#'] = ['', '', '', '']);
      var entryClass = arr[index] || (arr[index] = this._generateEntryClassString(dentry, extraClass, indexInDirectory, isSelected));
      return entryClass;
    }

  	private _generateEntryClassString(dentry: Panel.DirectoryEntry, extraClass: string, indexInDirectory: number, isSelected: boolean) {

      var dirfileClassName = dentry.flags & Panel.EntryFlags.Directory ?
          (isSelected ? ' panels-entry-dir panels-entry-dir-selected panels-entry-selected' : ' panels-entry-dir') :
      		(isSelected ? ' panels-entry-file panels-entry-file-selected panels-entry-selected' : ' panels-entry-file');

      var entryClassName =
        'panels-entry' +
        dirfileClassName +
        (this._cursorEntryIndex === indexInDirectory ? ' panels-entry-current ' + dirfileClassName + '-current' : ' panels-entry-plain ' + dirfileClassName + '-plain');

      return entryClassName;
    }

  	private _heightCache: string = '0px';
 		private _heightCacheKey = 0;

    private _updateEntry(
      dentry: Panel.DirectoryEntry,
      indexInDirectory: number,
      column: Panel.ColumnData,
      indexInColumn: number,
      extraClass: string): Panel.PageEntry {

      var entry = column.entries[indexInColumn];

      var entryClassName = this._getEntryClass(dentry, extraClass, indexInDirectory);

      var adjHeight = this._metrics.windowMetrics.emHeight+1;

     	var heightStr = this._heightCacheKey == adjHeight ? this._heightCache :
      	(heightStr = this._heightCache = adjHeight + 'px');

      if (!entry) {

        var entryDIV = <HTMLElementWithFlags><HTMLElement>document.createElement('pre');
        if ('textContent' in entryDIV) entryDIV.textContent = dentry.name;
        else entryDIV.innerText = dentry.name;
        entryDIV.className = entryClassName;
        entryDIV.style.height = heightStr;
        entryDIV.style.marginBottom = '-1px';
        column.columnDIV.appendChild(entryDIV);

        entry = {
          name: dentry.name,
          path: dentry.path,
          flags: dentry.flags,
          selectionFlags: this._cursorEntryIndex === indexInDirectory ? Panel.SelectionFlags.Current : 0,
          entryDIV: entryDIV,
          size: dentry.size
        };

        entry.entryDIV.isEntryDIV = true;

        column.entries.push(entry);
      }
      else {
        // TODO: update highlight flags
        var expectedSelectionFlags = this._cursorEntryIndex === indexInDirectory ? Panel.SelectionFlags.Current : 0;

        if (entry.name !== dentry.name) {
          entry.name = dentry.name;
          setText(entry.entryDIV, dentry.name);
        }
        if (entry.path !== dentry.path) {
          entry.path = dentry.path;
        }

        entry.entryDIV.className = entryClassName;

        entry.flags = dentry.flags;
        entry.selectionFlags = expectedSelectionFlags;

        if (indexInColumn === this._entriesInColumn - 1 && column.entries.length > this._entriesInColumn) {
          this._removeExcessEntries(column, this._entriesInColumn);
        }

        entry.size = dentry.size;

      }
      return entry;
    }


    private _removeExcessPages(expectedCount: number) {
      for (var i = this._pages.length - 1; i >= expectedCount; i--) {
        var p = this._pages[i];
        p.pageDIV.parentElement.removeChild(p.pageDIV);
        if (p.leadPaddingDIV)
          p.leadPaddingDIV.parentElement.removeChild(p.leadPaddingDIV);
      }

      if (this._pages.length > expectedCount)
        this._pages = this._pages.slice(0, expectedCount);
    }


    private _removeExcessColumns(p: { columns: Panel.ColumnData[]; }, expectedCount: number) {
      for (var i = p.columns.length - 1; i >= expectedCount; i--) {
        var c = p.columns[i];
        c.columnDIV.parentElement.removeChild(c.columnDIV);
      }

      if (p.columns.length > expectedCount)
        p.columns = p.columns.slice(0, expectedCount);
    }


    private _removeExcessEntries(c: { entries: Panel.PageEntry[]; }, expectedCount: number) {
      for (var i = c.entries.length - 1; i >= expectedCount; i--) {
        var e = c.entries[i];
        e.entryDIV.parentElement.removeChild(e.entryDIV);
      }

      if (c.entries.length > expectedCount)
        c.entries = c.entries.slice(0, expectedCount);
    }


    private _onscroll() {
      if (this._redrawRequested) return;
      this._scrollTop = this._scrollHost.scrollTop;
      this._scrollTopHeight = this._metrics.hostHeight;
      //console.log('onscroll ' + this._scrollTop);
    }


    private _calcPageIndex(indexOfEntry: number): number {
      return (indexOfEntry / (this._columnsOnPage * this._entriesInColumn)) | 0;
    }

    private _calcColumnIndex(indexOfEntry: number) {
      return ((indexOfEntry / this._entriesInColumn) | 0) % this._columnsOnPage;
    }

    private _calcEntryIndex(indexOfEntry: number) {
      return indexOfEntry % this._entriesInColumn;
    }

    private _calcEntryTopOffset(indexOfEntry: number) {
      if (!this._metrics || !this._metrics.windowMetrics) return 0;

      var pageIndex = this._calcPageIndex(indexOfEntry);
      var entryIndex = this._calcEntryIndex(indexOfEntry);
      var offset =
        this._metrics.windowMetrics.emHeight * titleHeightEms+ // title
        pageIndex * this._entriesInColumn * this._metrics.windowMetrics.emHeight + // whole pages
        Math.max(0, pageIndex - 1) * this._pageInterval + // inter-page spaces
        entryIndex * this._metrics.windowMetrics.emHeight; // distance from the top of the page

      return offset;
    }
  }

  export interface HTMLElementWithFlags extends HTMLElement {
    isScrollContent: boolean;
    isLeadPaddingDIV?: boolean;
    isPageDIV: boolean;
    isColumnDIV: boolean;
    isEntryDIV: boolean;
  }

  export module Panel {

    export interface Metrics {
      windowMetrics: CommanderShell.Metrics;
      hostWidth: number;
      hostHeight: number;
    }

    export interface DirectoryEntry {
      name: string;
      path: string;
      flags: EntryFlags;
      size: number;
    }

    export enum EntryFlags {
      Directory = 1
    }

    export interface PageData {
      leadPaddingDIV: HTMLElementWithFlags;
      pageDIV: HTMLElementWithFlags;
      columns: ColumnData[];
      height: number;
      leadInterval: number;
    }

    export interface ColumnData {
      columnDIV: HTMLElementWithFlags;
      entries: PageEntry[];
      height: number;
      width: number;
    }

    export interface PageEntry extends DirectoryEntry {
      entryDIV: HTMLElementWithFlags;
      selectionFlags: SelectionFlags;
    }

    export enum SelectionFlags {
      None = 0,
      Current = 1,
      Selected = 2
    }

  }

}