module teapo.layout {

  export class MainLayout {

    container: HTMLElement = null;

    leftContainer: HTMLElement = null;
    rightContainer: HTMLElement = null;

    private _splitter: HTMLElement = null;
    private _isSplitterDragging = false;
    private _splitterDragScreenX = 0;
    private _splitterDragScrollLeft = 0;

    constructor(private _dom: Dom) {

      this.container = this._dom.createElement('div', {
        position: 'fixed',
        left: '0px', top: '0px', right: '0px', bottom: '0px',
        background: 'white', color: 'black',
        overflowX: 'hidden',
        overflowY: 'none',
        boxSizing: 'border-box'
      });

      var horizontalTable = <HTMLTableElement>this._dom.createElement('table', {
        height: '100%',
        width: '130%',
        boxSizing: 'border-box',
        borderCollapse: 'collapse',
        borderSpacing: '0px'
      }, this.container);

      horizontalTable.cellSpacing = '0px';
      horizontalTable.cellPadding = '0px';

      var tbody = this._dom.createElement('tbody', {}, horizontalTable);

      var tr = this._dom.createElement('tr', {
        height: '100%',
        boxSizing: 'border-box'
      }, tbody);


      var leftTD = this._dom.createElement('td', {
        height: '100%',
        width: '70%',
        boxSizing: 'border-box'
      }, tr);

      this.leftContainer = this._dom.createElement('div', {
        position: 'fixed',
        left: '0px', top: '0px', bottom: '0px',
        width: '90%',
        boxSizing: 'border-box'
      }, leftTD);


      var midTD = this._dom.createElement('td', {
        height: '100%',
        width: '4px',
        boxSizing: 'border-box'
      }, tr);

      this._splitter = this._dom.createElement('div', {
        position: 'relative',
        width: '4px',
        height: '100%',
        zIndex: 1000,
        boxSizing: 'border-box',
        cursor: 'w-resize',
        background: '#F2F2F2'
      }, midTD);

      var dragTarget = this._splitter.setCapture ? this._splitter : this.container;

      Dom.addEventListener(
        this._splitter,
        'mousedown',
        (e) => this._splitterMouseDown(<any>e));

      Dom.addEventListener(
        dragTarget,
        'mouseup',
        (e) => this._splitterMouseUp(<any>e));

      Dom.addEventListener(
        dragTarget,
        'mousemove',
        (e) => this._splitterMouseMove(<any>e),
        true);


      var rightTD = this._dom.createElement('td', {
        height: '100%',
        width: '30%',
        boxSizing: 'border-box'
      }, tr);

      this.rightContainer = this._dom.createElement('div', {
        width: '100%',
        height: '100%',
        position: 'relative',
        zIndex: 1000,
        boxSizing: 'border-box'
      }, rightTD);

    }

    readjustSize() {
      this.leftContainer.style.bottom = this.container.offsetHeight - this.container.clientHeight + 'px';
      this._dom.documenOverride.documentElement.style.overflow = 'hidden';
      this._dom.documenOverride.body.style.overflow = 'hidden';
    }

    private _splitterMouseDown(e: MouseEvent) {
      if (this._splitter.setCapture)
        this._splitter.setCapture(true);
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if ('cancelBubble' in e) e.cancelBubble = true;
      this._isSplitterDragging = true;
      this._splitterDragScreenX = e.screenX;
      this._splitterDragScrollLeft = this.container.scrollLeft;
    }

    private _splitterMouseUp(e: MouseEvent) {
      this._isSplitterDragging = false;
    }

    private _splitterMouseMove(e: MouseEvent) {
      if (this._isSplitterDragging) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if ('cancelBubble' in e) e.cancelBubble = true;

        this.container.scrollLeft = this._splitterDragScrollLeft + this._splitterDragScreenX - e.screenX;
      }
    }

  }

}