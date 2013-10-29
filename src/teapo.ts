/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />

/// <reference path='layout.ts' />

class Application {
    private _toolbar = document.createElement('div');
    private _statusBar = document.createElement('div');

    private _contentArea = document.createElement('div');
    private _leftPanel = document.createElement('div');
    private _mainContentPanel = document.createElement('div');
    private _rightPanel = document.createElement('div');

    private _splitter: Split3

    constructor(private _host: HTMLElement) {
        this._cleanContent(this._host);
        
        this._contentArea.appendChild(this._leftPanel);
        this._contentArea.appendChild(this._mainContentPanel);
        this._contentArea.appendChild(this._rightPanel);

        this._splitter = new Split3(this._contentArea);

        this._applyStyles(
            this._toolbar.style,
            this._contentArea.style,
            this._leftPanel.style,
            this._mainContentPanel.style,
            this._rightPanel.style,
            this._statusBar.style);

        this._host.appendChild(this._toolbar);
        this._host.appendChild(this._contentArea);
        this._host.appendChild(this._statusBar);
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

        rs.border = 'solid 1px tomato';

        sb.position = 'fixed';
        sb.height = '16px';
        sb.bottom = '0px';
        sb.left = '0px';
        sb.right = '0px';
        sb.background = 'silver';
        sb.opacity = '0.5';

    }
    
    private _cleanContent(element: HTMLElement) {
        if ('innerHTML' in element)
            element.innerHTML = '';
        else if ('textContent' in element)
            element.textContent = '';
        else if ('innerText' in element)
            element.innerText = '';
    }
}

window.onload = function() {
  var layout = new Application(document.body);
}