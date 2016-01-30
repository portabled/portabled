module shell.panels {

  var panelHMargin = 10;
  var panelVMargin = 5;

  export class TwoPanels {

    private _scrollHost: HTMLDivElement;
    private _scrollContent: HTMLDivElement;

    private _leftPanelHost: HTMLDivElement;
    private _rightPanelHost: HTMLDivElement;

    private _leftPanel: Panel;
    private _rightPanel: Panel;

    ondoubleclick: () => boolean = null;

    constructor(
      private _host: HTMLElement,
      leftPath: string,
      rightPath: string,
      private _directoryService: (path: string) => Panel.DirectoryEntry[]) {

      this._scrollHost = <any>elem('div', { className: 'panels-scroll-host' }, this._host);
      this._scrollContent = <any>elem('div', { className: 'panels-scroll-content' }, this._scrollHost);

      this._leftPanelHost = <any>elem('div', { className: 'panels-panel panels-left-panel' }, this._scrollContent);
      this._rightPanelHost = <any>elem('div', { className: 'panels-panel panels-right-panel' }, this._scrollContent);

      this._leftPanel = new Panel(
        this._leftPanelHost,
        leftPath,
        this._directoryService);

      this._rightPanel = new Panel(
        this._rightPanelHost,
        rightPath,
        this._directoryService);

      this._leftPanel.activate();
      /*
      TODO: ensure focus stays with the text input at the bottom
      elem.on(this._leftPanel, 'mousedown', e=> {
        if (e.preventDefault)
          e.preventDefault();
        return false;
      }); */

      on(this._leftPanelHost, 'click', (e: MouseEvent) => this._onclick(e, true /*isLeft*/));
      on(this._rightPanelHost, 'click', (e: MouseEvent) => {
        var handled = this._onclick(e, false /*isLeft*/);
        if (handled) {
          if (e.preventDefault) e.preventDefault();
        }
      });

      this._leftPanel.ondoubleclick = () => this.ondoubleclick();
      this._rightPanel.ondoubleclick = () => this.ondoubleclick();

    }

    onpathchanged: () => void = null;

    setPath(path: string) {
      return this._notePathChange(() => this._setPathCore(path));
    }

    private _setPathCore(path: string) {
      var norm = normalizePath(path || '');
      if (norm !== '/' && norm.slice(-1) === '/')
        norm = norm.slice(0, norm.slice.length - 1);

      if (norm !== '/') {
        // check if valid path
        var parent = norm.slice(0, norm.lastIndexOf('/'));
        var siblings = this._directoryService(parent);
        var foundAndDir = false;
        for (var i = 0; i < siblings.length; i++) {
          if (siblings[i].path === norm && siblings[i].flags & Panel.EntryFlags.Directory) {
            foundAndDir = true;
            break;
          }
        }
        if (!foundAndDir) return false;
      }

      this._getPanel(this.isLeftActive()).set({ currentPath: norm });
      return true;

      function normalizePath(path: string): string {

        if (!path) return '/'; // empty paths converted to root

        if (path.charAt(0) !== '/') // ensuring leading slash
          path = '/' + path;

        path = path.replace(/\/\/*/g, '/'); // replacing duplicate slashes with single

        return path;
      }
    }

    measure() {
    }

    arrange(metrics: CommanderShell.Metrics) {

      var contentWidth = 0;

      if (metrics.hostWidth < metrics.emWidth * 80 && metrics.hostWidth < metrics.hostHeight * 1) {
        // flippable layout
        contentWidth = metrics.hostWidth * 1.6;
      }
      else {
        // full layout
        contentWidth = metrics.hostWidth;
      }

      var bottomGap = Math.min(metrics.hostHeight / 3, metrics.emHeight * 5.5);

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
      return this._notePathChange(() => this._toggleActivePanel());
    }

  	private _toggleActivePanel() {
      if (!this.isVisible()) return;

      var isLeftActive = this._leftPanel.isActive();
      this._getPanel(isLeftActive).deactivate();
      this._getPanel(!isLeftActive).activate();
    }

    temporarilyHidePanels(): () => void {

      var start = +new Date();
      var stayTime = 200;
      var fadeTime = 500;
      var opacity = 0.1;
      var applyOpacity = () => {
        this._scrollHost.style.opacity = <any>opacity;
        this._scrollHost.style.filter = 'alpha(opacity=' + (opacity * 100) + ')';
      };
      applyOpacity();

      var animateBack = () => {
        animateBack = () => { };

        var startFade = () => {
          var fadeStart = +new Date();
          var ani = setInterval(() => {
            var passed = (Date.now ? Date.now() : +new Date()) - fadeStart;
            if (passed > fadeTime) {
              clearInterval(ani);
              this._scrollHost.style.opacity = null;
              this._scrollHost.style.filter = null;
              return;
            }

            opacity = passed / fadeTime;
            applyOpacity();
          }, 1);
        };

        var sinceStart = +new Date() - start;
        if (sinceStart >= stayTime) {
          startFade();
        }
        else {
          setTimeout(startFade, fadeTime - sinceStart);
        }
      };

      return animateBack;
    }

  	Up() { return this._selectionGo(-1); }
  	Down() { return this._selectionGo(+1); }

  	PgUp() { return this._selectionGo(-100); }
  	PgDn() { return this._selectionGo(+100); }

  	Left() { return this._selectionGo(-10); }
		Right() { return this._selectionGo(+10); }

  	Home() { return this._selectionGo(-100000); }
  	End() { return this._selectionGo(+100000); }

  	Tab() {
      this.toggleActivePanel();
      return true;
    }

  	CtrlU() {
      return this.togglePanelPaths();
    }

  	MetaU() {
      return this.CtrlU();
    }

  	CtrlF1() { return this.togglePartHidden(true /* left */); }
  	CtrlF2() { return this.togglePartHidden(false /* left */); }

  	Enter() {
      return this._notePathChange(() => {
        var activePa = this._getPanel(this.isLeftActive());
        return activePa.navigateCursor();
      });
    }

    togglePartHidden(leftPanel: boolean) {
      return this._notePathChange(() => this._togglePartHiddenCore(leftPanel));
    }

    private _togglePartHiddenCore(leftPanel: boolean) {
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

    currentPath() {
      //if (!this.isVisible()) return null;
      var pan = this._getPanel(this.isLeftActive());
      return pan.currentPath();
    }

    cursorOppositePath() {
      if (!this.isVisible()) return null;
      var pan = this._getPanel(!this.isLeftActive());
      return pan.cursorPath();
    }

    currentOppositePath() {
      if (!this.isVisible()) return null;
      var pan = this._getPanel(!this.isLeftActive());
      return pan.currentPath();
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

    private _onclick(e: MouseEvent, isLeft: boolean) {
      if (isLeft !== this.isLeftActive()) this.toggleActivePanel();

      var panel = this._getPanel(isLeft);
      return this._notePathChange(() => panel.handleClick(e));
    }

  	private _notePathChange(fn) {
      var path = this.currentPath();
      var result = fn();
      var newPath = this.currentPath();
      if (newPath != path && this.onpathchanged) {
        this.onpathchanged();
      }
      return result;
  }

  }

}