class CommanderShell {

  private _metricElem: HTMLDivElement;
  private _twoPanels: panels.TwoPanels;
  private _terminal: terminal.Terminal;

  private _metrics: CommanderShell.Metrics = {
    hostWidth: 0,
    hostHeight: 0,
    emWidth: 0,
    emHeight: 0
  };

  private _onsizechangedTimeout: number = 0;

  constructor(private _host: HTMLElement, private _drive: persistence.Drive) {

    elem(this._host, {
      background: 'black',
      color: 'silver'
    });

    this._metricElem = <any>elem('div', {
      position: 'absolute',
      opacity: 0,
      left: '-200px', top: '-200px',
      wdith: 'auto', height: 'auto',
      text: 'M'
    }, document.body);

    this._terminal = new terminal.Terminal(this._host);
    this._twoPanels = new panels.TwoPanels(this._host, '/', '/src', this._drive);

    var resizeMod = require('resize');
    resizeMod.on(winMetrics => {
      this._metrics.hostWidth = winMetrics.windowWidth;
      this._metrics.hostHeight = winMetrics.windowHeight;
      this.measure();
      this.arrange();
    });

    this._metrics.hostWidth = document.body.offsetWidth;
    this._metrics.hostHeight = document.body.offsetHeight;

    this.measure();
    this.arrange();

    elem.on(this._host, 'keydown', e => this._keydown(<any>e));

    var _glob = (function() { return this; })();
    var applyConsole = (glob) => {
      if (glob.console) {
        var _oldLog = glob.console.log;
        var term = this._terminal;
        console.log = function(...args: any[]) {
          _oldLog.apply(glob.console, args);
          term.logArray(args);
        };
      }
      else {
        var term = this._terminal;
        glob.console = {
          log: function(...args: any[]) {
            term.logArray(args);
          }
        };
      }
    };

    applyConsole(_glob);
    applyConsole(window);
  }

  measure() {
    this._metrics.emWidth = this._metricElem.offsetWidth;
    this._metrics.emHeight = this._metricElem.offsetHeight;
    this._twoPanels.measure();
    this._terminal.measure();
  }

	arrange() {
    this._host.style.width = this._metrics.hostWidth + 'px';
    this._host.style.height = this._metrics.hostHeight + 'px';
    this._twoPanels.arrange(this._metrics);
    this._terminal.arrange(this._metrics);
  }

  private _keydown(e: KeyboardEvent) {
    var res = this._keydownCore(e);
    if (res) {
      if (e.preventDefault)
        e.preventDefault();
    }
    return res;
  }

  private _keydownCore(e: KeyboardEvent) {
    if (e.keyCode === 27 && !e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      this._twoPanels.toggleVisibility();
      return true;
    }

    if (e.keyCode === 13)
      this._terminal.clearInput();

    if ((e.keyCode === 13 && this._twoPanels.isVisible() && !this._terminal.hasInput())
      || (e.keyCode !== 13)) {
      if (this._twoPanels.keydown(e)) return true;
    }

    var cursorPath = this._twoPanels.cursorPath();

    this._terminal.focus();
    if (this._terminal.keydown(e, cursorPath)) return true;

    if (e.keyCode === 13)
      return this._execute(cursorPath);

    //if (e.keyCode < 32 || e.keyCode > 126) {
    //	this._terminal.log('CommanderShell::keydown ' + e.yCode);
      //}
  }

	private _execute(cursorPath: string) {
    var text = this._drive.read(cursorPath);
    if (typeof text !== 'undefined' && text !== null) {
    	this._terminal.log(text);
      return true;
    }
  }

}

module CommanderShell {

  export interface Metrics {
    hostWidth: number;
    hostHeight: number;
    emWidth: number;
    emHeight: number;
  }

}