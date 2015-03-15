module portabled.shell.panels {

  export class Panels {

    private _leftHost = element('div', {
      position: 'fixed',
      width: '49.9%',
      top: '0px', bottom: '3em',
      padding: '0.25em',
      background: 'cornflowerBlue',
      opacity: '0.5',
      zIndex: 100
    }, this._host);

    private _leftPanel = element('div', {
      width: '100%', height: '100%',
      border: 'solid 1px white',
      padding: '0.25em'
    }, this._leftHost);

    private _rightHost = element('div', {
      position: 'fixed',
      left: '50.2%',
      width: '49.9%',
      top: '0px', bottom: '3em',
      padding: '0.25em',
      background: 'cornflowerBlue',
      opacity: '0.5',
      zIndex: 100
    }, this._host);

    private _rightPanel = element('div', {
      width: '100%', height: '100%',
      border: 'solid 1px white',
      padding: '0.25em'
    }, this._rightHost);  
    
    constructor(private _host: HTMLElement) {
      setTextContent(this._rightPanel, 'one two');
    }

  }

}