module panels {

  var panelClass = 'panels-panel-page';

  export class Panel {

    private _cursorPath: string;
    private _cursorEntryIndex = -1;
    private _entries: Panel.PageEntry[] = null;
    private _redrawRequested = 0;

    private _metrics: Panel.Metrics = null;

    private _scrollContent: HTMLElementWithFlags;

    private _pages: Panel.PageData[] = [];

		private _entriesInColumn = 0;
    private _pageHeight = 0;
    private _pageInterval = 0;
    private _columnsOnPage = 0;
    private _columnWidth = 0;

    private _scrollTop = 0;
    private _scrollTopHeight = 0;
    private _isActive = false;
    private _nextRedrawScrollToCurrent = false;

    constructor(
      private _host: HTMLElement,
      private _path: string,
      private _directoryService: (path: string) => Panel.DirectoryEntry[]) {

      this._scrollContent = <HTMLElementWithFlags>elem('div', this._host);
      this._scrollContent.isScrollContent = true;

      elem.on(this._host, 'scroll', () => this._onscroll());

      this._queueRedraw();
    }

    set(paths: {currentPath?: string; cursorPath?: string}) {
      if (paths.currentPath)
        this._path = paths.currentPath;
      if (paths.cursorPath) {
        this._cursorPath = paths.cursorPath;
        this._nextRedrawScrollToCurrent = true;
      }
      this._queueRedraw();
    }

  	onclick(e: MouseEvent) {
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
            if (this._cursorPath ===this._entries[i].path && (this._entries[i].flags & Panel.EntryFlags.Directory)) {
              this._cursorPath = this._path;
              this._path = this._entries[i].path; // double click (or second click) opens directory
            }
            else {
              this._cursorPath = this._entries[i].path;
            }
            this._nextRedrawScrollToCurrent = true;
            this._queueRedraw();
            break;
          }
        }
        this._redrawNow();
      }

      return true;
    }

    currentPath() {
      return this._path;
    }

    cursorPath() {
      return this._cursorPath;
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
    }

    deactivate() {
      this._isActive = false;
      this._scrollContent.className = 'panels-panel-inactive';
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
      }

      if (moveStep) {
        var newCursorEntryIndex = Math.max(0, Math.min(this._entries.length-1, this._cursorEntryIndex + moveStep));
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
            this._cursorPath = this._path;
            this._path = entry.path;
            this._nextRedrawScrollToCurrent = true;
            this._queueRedraw();
            return true;
          }
        }
      }
    }

    private _queueRedraw() {
      if (this._redrawRequested) return;
      this._redrawRequested = setTimeout(() => this._redrawNow(), 100);
    }

    private _redrawNow() {

      var prevOffset = this._calcEntryTopOffset(Math.max(0, this._cursorEntryIndex));

      var entries = this._directoryService(this._path);
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
          flags: Panel.EntryFlags.Directory
        });
      }

      if (!entries || !entries.length) {
        this._scrollContent.innerHTML = '';
        this._pages = [];
        return;
      }

      this._cursorEntryIndex = -1;
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].path === this._cursorPath) {
          this._cursorEntryIndex = i;
          break;
        }
      }

      if (this._cursorEntryIndex < 0) {
        this._cursorEntryIndex = 0;
        this._cursorPath = entries.length > 0 ? entries[0].path : null;
      }

      this._entriesInColumn = Math.max(3, ((this._metrics.hostHeight / this._metrics.windowMetrics.emHeight) | 0) - 2);
      this._pageHeight = this._entriesInColumn * this._metrics.windowMetrics.emHeight;
      this._pageInterval = this._metrics.hostHeight - this._pageHeight - this._metrics.windowMetrics.emHeight;

      var desiredColumnWidth = 17 * this._metrics.windowMetrics.emWidth;
      this._columnsOnPage = Math.max(1, Math.round(this._metrics.hostWidth / desiredColumnWidth) | 0);
      this._columnWidth = ((this._metrics.hostWidth / this._columnsOnPage) | 0) - 1;

      if (!this._pages)
        this._pages = [];

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
        var entry = column.entries[entryIndex];
        if (!entry) {

          var dirfileClassName = dentry.flags & Panel.EntryFlags.Directory ? ' panels-entry-dir' : ' panels-entry-file';

          var entryClassName =
            'panels-entry' +
            dirfileClassName +
            (this._cursorEntryIndex === i ? ' panels-entry-current' + dirfileClassName + '-current' : '');

          entry = {
            name: dentry.name,
            path: dentry.path,
            flags: dentry.flags,
            selectionFlags: this._cursorEntryIndex === i ? Panel.SelectionFlags.Current : 0,
            entryDIV: <HTMLElementWithFlags>elem('div', {
              className: entryClassName,
              text: dentry.name,
              height: this._metrics.windowMetrics.emHeight + 'px'
            }, column.columnDIV)
          };

          entry.entryDIV.isEntryDIV = true;

          column.entries.push(entry);
        }
        else {
          var expectedSelectionFlags = this._cursorEntryIndex === i ? Panel.SelectionFlags.Current : 0;

          if (entry.name !== dentry.name) {
            entry.name = dentry.name;
            setText(entry.entryDIV, dentry.name);
          }
          if (entry.path !== dentry.path) {
            entry.path = dentry.path;
          }
          if (entry.flags !== dentry.flags || entry.selectionFlags !== expectedSelectionFlags) {
            var dirfileClassName = dentry.flags & Panel.EntryFlags.Directory ? ' panels-entry-dir' : ' panels-entry-file';

            var entryClassName =
              'panels-entry' +
              dirfileClassName +
              (this._cursorEntryIndex === i ? ' panels-entry-current' + dirfileClassName + '-current' : '');

            entry.entryDIV.className = entryClassName;

            entry.flags = dentry.flags;
            entry.selectionFlags = expectedSelectionFlags;
          }


          if (entryIndex === this._entriesInColumn - 1 && column.entries.length > this._entriesInColumn) {
            this._removeExcessEntries(column, this._entriesInColumn);
          }

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
        var maxScroll = newOffset - this._metrics.windowMetrics.emHeight*2;
        var minScroll = newOffset - this._metrics.hostHeight + this._metrics.windowMetrics.emHeight*3;

        var newScrollTop =
            this._scrollTop < minScroll ? minScroll :
        		this._scrollTop > maxScroll ? maxScroll :
        		-1;

        if (newScrollTop >=0) {
          //console.log('redraw: scroll to current [' + newScrollTop + ']');
          this._host.scrollTop = newScrollTop
        }
      }
      else {
        var prevDistanceFromCenter = prevOffset - (this._scrollTop + this._scrollTopHeight / 2);

        var newScrollTop = newOffset - prevDistanceFromCenter - this._metrics.hostHeight / 2;
        //console.log({
        //  prevDistanceFromCenter, prevOffset, this_scrollTop: this._scrollTop, this_scrollTopHeight: this._scrollTopHeight,
        //  newOffset, this_metrics_hostHeight: this._metrics.hostHeight, newScrollTop
        //});
        //console.log('redraw: scroll to approximate prev. [' + newScrollTop + ']');
        this._host.scrollTop = newScrollTop;
      }


      this._redrawRequested = 0;

      // end of _redrawNow()
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
      this._scrollTop = this._host.scrollTop;
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
        pageIndex * this._entriesInColumn * this._metrics.windowMetrics.emHeight + // whole pages
        Math.max(0, pageIndex - 1) * this._pageInterval + // inter-page spaces
        entryIndex * this._metrics.windowMetrics.emHeight; // distance from the top of the page

      return offset;
    }
  }

	interface HTMLElementWithFlags extends HTMLElement {
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