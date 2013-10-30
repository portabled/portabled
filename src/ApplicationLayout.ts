/// <reference path='Layout.ts' />
/// <reference path='SplitHost.ts' />
/// <reference path='TypeScriptService.ts' />

class ApplicationLayout {
  toolbar = document.createElement('div');
  statusBar = document.createElement('div');

  private _contentArea = document.createElement('div');

  leftPanel = document.createElement('div');
  mainContentPanel = document.createElement('div');
  rightPanel = document.createElement('div');

  private _splitter: SplitHost

  constructor(private _host: HTMLElement) {

    this._contentArea.appendChild(this.leftPanel);
    this._contentArea.appendChild(this.mainContentPanel);
    this._contentArea.appendChild(this.rightPanel);

    this._applyStyles(
        this.toolbar.style,
        this._contentArea.style,
        this.leftPanel.style,
        this.mainContentPanel.style,
        this.rightPanel.style,
        this.statusBar.style);

    this._splitter = new SplitHost(this._contentArea);

    Layout.cleanContent(this._host);

    this._host.appendChild(this.toolbar);
    this._host.appendChild(this._contentArea);
    this._host.appendChild(this.statusBar);
  }
  
  private _applyStyles(
      ts: MSStyleCSSProperties,
      cs: MSStyleCSSProperties,
      ls: MSStyleCSSProperties,
      ms: MSStyleCSSProperties,
      rs: MSStyleCSSProperties,
      sb: MSStyleCSSProperties) {

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

  }
}