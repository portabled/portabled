module panels {

  var panelHMargin = 10;
  var panelVMargin = 5;

  export class TwoPanels {

    private _scrollHost: HTMLDivElement;
    private _scrollContent: HTMLDivElement;

    private _leftPanelHost: HTMLDivElement;
    private _rightPanelHost: HTMLDivElement;

    private _leftPanel: Panel;
    private _rightPanel: Panel;

    constructor(
      private _host: HTMLElement,
      leftPath: string,
      rightPath: string,
      private _drive: persistence.Drive) {

      this._scrollHost = <any>elem('div', { className: 'panels-scroll-host' }, this._host);
      this._scrollContent = <any>elem('div', { className: 'panels-scroll-content' }, this._scrollHost);

      this._leftPanelHost = <any>elem('div', { className: 'panels-panel panels-left-panel' }, this._scrollContent);
      this._rightPanelHost = <any>elem('div', { className: 'panels-panel panels-right-panel' }, this._scrollContent);

      var directoryService = driveDirectoryService(this._drive);

      this._leftPanel = new Panel(
        this._leftPanelHost,
        leftPath,
        directoryService);

      this._rightPanel = new Panel(
        this._rightPanelHost,
        rightPath,
        directoryService);

      this._leftPanel.activate();
      /*
      TODO: ensure focus stays with the text input at the bottom
      elem.on(this._leftPanel, 'mousedown', e=> {
        if (e.preventDefault)
          e.preventDefault();
        return false;
      }); */

      elem.on(this._leftPanelHost, 'click', (e: MouseEvent) => this._onclick(e));
      elem.on(this._rightPanelHost, 'click', (e: MouseEvent) => this._onclick(e));

    }

    measure() {
    }

    arrange(metrics: CommanderShell.Metrics) {

      var contentWidth = 0;

      if (metrics.hostWidth < metrics.emWidth * 80 && metrics.hostWidth < metrics.hostHeight * 1) { 
        // flippable layout
        contentWidth = Math.max(metrics.hostWidth / 2, metrics.hostWidth * 2 - metrics.emWidth * 3);
      }
      else {
        // full layout
        contentWidth = metrics.hostWidth;
      }

      var bottomGap = Math.min(metrics.hostHeight / 3, metrics.emHeight * 3);

      this._scrollHost.style.width = metrics.hostWidth + 'px';
      var panelsHeight = metrics.hostHeight - bottomGap;
      this._scrollHost.style.height = panelsHeight + 'px';

      this._scrollContent.style.width = contentWidth + 'px';
      this._scrollContent.style.height = panelsHeight + 'px';

      var panelWidth = (contentWidth / 2 - 0.5) | 0;

      this._leftPanelHost.style.height = panelsHeight + 'px';
      this._leftPanelHost.style.width = panelWidth + 'px';

      this._rightPanelHost.style.height = panelsHeight + 'px';
      this._rightPanelHost.style.width = panelWidth + 'px';

      if (this._leftPanelHost.style.display !== 'none') {
        this._leftPanel.arrange({
          windowMetrics: metrics,
          hostWidth: panelWidth - panelHMargin * 2,
          hostHeight: panelsHeight - panelVMargin * 2
        });
      }

      if (this._rightPanelHost.style.display !== 'none') {
        this._rightPanel.arrange({
          windowMetrics: metrics,
          hostWidth: panelWidth - panelHMargin * 2,
          hostHeight: panelsHeight - panelVMargin * 2
        });
      }
    }

    isVisible() {
      return this._scrollHost.style.display !== 'none';
    }

    toggleVisibility() {
      this._scrollHost.style.display = this.isVisible() ? 'none' : 'block';
    }

    isLeftActive() {
      return this._leftPanel.isActive();
    }

    toggleActivePanel() {
      if (!this.isVisible()) return;

      var isLeftActive = this._leftPanel.isActive();
      this._getPanel(isLeftActive).deactivate();
      this._getPanel(!isLeftActive).activate();
    }

    keydown(e: KeyboardEvent): boolean {
      switch (e.keyCode) {
        case 38:
          return this._selectionGo(-1);
        case 40:
          return this._selectionGo(+1);
        case 33:
          return this._selectionGo(-100);
        case 34:
          return this._selectionGo(+100);
        case 37:
          return this._selectionGo(-10);
        case 39:
          return this._selectionGo(+10);
        case 9:
          this.toggleActivePanel();
          return true;
        case 86: // U
          if (e.ctrlKey || e.metaKey)
            return this.togglePanelPaths();
          break;

        case 112: // F1
          if (e.ctrlKey || e.metaKey) {
            return this.togglePartHidden(true);
          }
          break;

        case 113: // F2
          if (e.ctrlKey || e.metaKey) {
            return this.togglePartHidden(false);
          }
          break;

        case 13: // Enter
          var activePa = this._getPanel(this.isLeftActive());
          return activePa.navigateCursor();

        default:
          if (e.ctrlKey) {
            //console.log('ctrl ' + e.keyCode);
          }
          break;
      }

      return false;
    }

    togglePartHidden(leftPanel: boolean) {
      var togglePanelHost = this._getPanelHost(leftPanel);
      var oppositePanelHost = this._getPanelHost(!leftPanel);

      if (!this.isVisible()) {
        togglePanelHost.style.display = 'block';
        oppositePanelHost.style.display = 'none';
        if (this.isLeftActive() !== leftPanel)
          this.toggleActivePanel();
        this.toggleVisibility();
      }
      else {
        if (togglePanelHost.style.display !== 'none') {
          if (oppositePanelHost.style.display === 'none') {
            togglePanelHost.style.display = 'block';
            this.toggleVisibility();
          }
          else {
          	togglePanelHost.style.display = 'none';
        		if (this.isLeftActive() === leftPanel)
              this.toggleActivePanel();
          }
        }
        else {
          togglePanelHost.style.display = 'block';
        }
      }
      return true;
    }

    togglePanelPaths() {
      console.log('Ctrl+U toggle is not implemented.');
      return false;
    }

  	cursorPath() {
      if (!this.isVisible()) return null;
      var pan = this._getPanel(this.isLeftActive());
      return pan.cursorPath();
    }

    private _selectionGo(direction: number) {
      var panel = this._getPanel(this.isLeftActive()).cursorGo(direction);
      return true;
    }

    private _getPanel(left: boolean) {
      return left ? this._leftPanel : this._rightPanel;
    }

    private _getPanelHost(left: boolean) {
      return left ? this._leftPanelHost : this._rightPanelHost;
    }

    private _onclick(e: MouseEvent) {
      var isLeft = this._leftPanel.onclick(e);
      if (!isLeft && !this._rightPanel.onclick(e))
        return;

      if (isLeft === this.isLeftActive()) return;

      this.toggleActivePanel();
    }

  }

}