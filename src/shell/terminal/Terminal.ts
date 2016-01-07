declare var eq80: {
  drive: persistence.Drive;
  build: { timestamp: number; taken: number; platform: string; };
  ui: {
    contentWindow: {
  		build: { timestamp: number; taken: number; platform: string; };
    };
  };
  timings: {
    start: number;
    domStarted: number;
    documentLoaded: number;
    driveLoaded: number;
  };
};

module shell.terminal {

  export class Terminal {

    private _history: HTMLDivElement;
    private _historyContent: HTMLDivElement;
    private _prompt: HTMLDivElement;
    private _promptText: HTMLSpanElement;
    private _promptDelim: HTMLSpanElement;
  	private _keyCodeEcho: HTMLDivElement;
  	private _keyNameEcho: HTMLDivElement;
  	private _keyEcho: HTMLDivElement;
  	private _keyEchoTimeout: any = null;
  	private _keyEchoTimeoutClosure: any = null;
    private _input: HTMLTextAreaElement;

    private _promptWidth = 0;
    private _historyContentHeight = 0;
    private _hostMetrics: CommanderShell.Metrics = null;
    private _commandHistory = new CommandHistory();

    private _rearrangeDelay = 0;
    private _rearrangeClosure = null;

    onexecute: (code: string) => any = null;
  	onkeydown: (e: KeyboardEvent) => any = null;
  	onenterdetected: () => any = null;

    constructor(
      private _host: HTMLElement,
      private _repl: noapi.HostedProcess,
      version: string) {
      this._history = <any>elem('div', { className: 'terminal-history' }, this._host);

      var buildMessage = shell.buildMessage;
      if (!buildMessage && typeof eq80 !== 'undefined' && eq80.ui && eq80.ui.contentWindow.build) {
        buildMessage = 'Built on '+persistence.dom.DOMTotals.formatDate(new Date(eq80.ui.contentWindow.build.timestamp))+'\n'+
          (eq80.build ? '  (eq80 on '+persistence.dom.DOMTotals.formatDate(new Date(eq80.build.timestamp))+')\n' : '')+
					'  *using '+(eq80.ui.contentWindow.build.platform||'').replace(/\) /g,')\n   ')+'\n'+
          (eq80.build && eq80.build.platform !== eq80.ui.contentWindow.build.platform  ? '  (eq80 using '+(eq80.build.platform||'').replace(/\) /g,')\n   ')+')\n' : '')+
          '  *taken '+((eq80.ui.contentWindow.build.taken/100)|0)/10+' s.'+
          (eq80.build ? '\n  (eq80 '+((eq80.build.taken/100)|0)/10+' s.)' : '');
      }

      this._historyContent = <any>elem('pre', {
        className: 'terminal-history-content',
        text:
        	'Hello world from mini-shell\n\nVersion '+version+'\n' +
        	buildMessage + '\nOleg Mihailik\n\nPlease be careful.'
      }, this._history);

      this._prompt = <any>elem('div', { className: 'terminal-prompt' }, this._host);
      elem('span', { className: 'terminal-prompt-lead', text: String.fromCharCode(26410) }, this._prompt);
      this._promptText = <any>elem('span', { className: 'terminal-prompt-text' }, this._prompt);
      this._promptDelim = <any>elem('span', { className: 'terminal-prompt-delim', text: '>' }, this._prompt);

      this._input = <any>elem('textarea', { className: 'terminal-input', autofocus: true }, this._host);
      this._input.setAttribute('autocorrect', 'off');
      this._input.setAttribute('autocapitalize', 'off');

      this._keyEcho = <any>elem('div', { className: 'terminal-key-echo', text: '' }, this._host);
      this._keyCodeEcho = <any>elem('span', { className: 'terminal-key-code-echo', text: '' }, this._keyEcho);
      this._keyNameEcho = <any>elem('span', { className: 'terminal-key-name-echo', text: '' }, this._keyEcho);


      var recheckAfterKeydown = null;
      var recheckAfterKeydownClosure = () => {
        var cutNewline = this._input.value;
        if (cutNewline
            && (/[\r\n]$/.test(cutNewline) || /^[\r\n]/.test(cutNewline))) {
          cutNewline = cutNewline.replace(/[\r\n]*$/, '');
          cutNewline = cutNewline.replace(/^[\r\n]*/, '');
          this._input.value = cutNewline;
          if (this.onenterdetected) this.onenterdetected();
        }
      };

      var detectEnter = () => {
        if (recheckAfterKeydown) clearTimeout(recheckAfterKeydown);
          recheckAfterKeydown = setTimeout(recheckAfterKeydownClosure, 5);
      };

      on(this._input, 'keydown', <any>((e: KeyboardEvent) => {
        detectEnter();
        //if (this.onkeydown) return this.onkeydown(e);
      }));
      on(this._input, 'change', detectEnter);
      on(this._input, 'textinput', detectEnter);
      on(this._input, 'textInput', detectEnter);
      on(this._input, 'input', detectEnter);
      on(this._input, 'propertychange', detectEnter);

      setTimeout(() => {
        this._input.focus();

      	var finishLoading = +new Date();
        if (typeof eq80 !== 'undefined' && eq80.timings) {
          var total = finishLoading-eq80.timings.start;
          var earlyDom = eq80.timings.domStarted - eq80.timings.start;
          var documentLoaded = eq80.timings.documentLoaded - eq80.timings.domStarted;
          var driveLoaded = eq80.timings.driveLoaded - eq80.timings.documentLoaded;
          var uiLoaded = finishLoading - eq80.timings.driveLoaded;

          this.writeDirect(
            'Loaded in '+((total/100)|0)/10+'s:'+
            (earlyDom > 100 ? ' boot UI '+((earlyDom/100)|0)/10 + 's.':(documentLoaded+=earlyDom,'')) +
            (driveLoaded > 100 ? ' dom filesystem '+((documentLoaded/100)|0)/10 + 's. local modifications '+((driveLoaded/100)|0)/10+'s.':' dom drive '+(((documentLoaded+driveLoaded)/100)|0)/10+'s.') +
          	' shell UI '+((uiLoaded/100)|0)/10+'s.\n'+
            '  *edited at '+persistence.dom.DOMTotals.formatDate(new Date(eq80.drive.timestamp))+' ('+Terminal.agoText(eq80.drive.timestamp - finishLoading)+')'
          	);
        }
      }, 1);
    }

  	static agoText(ago: number) {
      if (ago <=5000)
        return 'just now';
      else if (ago <=2*60*1000)
        return Math.round(ago/1000)+' seconds ago';
      else if (ago < 2*60*60*1000)
        return Math.round(ago/60/1000)+' minutes ago';
      else if (ago < 48*60*60*1000)
        return Math.round(ago/60/60/1000)+' hours ago';
      else if (ago < 356*24*60*60*1000)
        return Math.round(ago/24/60/60/1000)+' days ago';
      else
        return Math.round(ago/365.2/24/60/60/1000)+' years ago';
    }

  	echoKey(e: KeyboardEvent) {
      if (this._keyEchoTimeout) {
        clearTimeout(this._keyEchoTimeout);
      }
      if (!this._keyEchoTimeoutClosure) {
        this._keyEchoTimeoutClosure = () => {
          setText(this._keyCodeEcho, '');
          setText(this._keyNameEcho, '');
        };
      }
      this._keyEchoTimeout = setTimeout(this._keyEchoTimeoutClosure, 600);

      var kn = keyName(e);

      setText(this._keyCodeEcho, e.keyCode+'# ');
      setText(this._keyNameEcho, kn);
    }

    setPath(path: string) {
      if (path === '/')
        setText(this._promptText, '');
      else
      	setText(this._promptText, path);
      this._queueRearrange();
    }

    writeDirect(text: string) {
      elem('div', { text, opacity: 0.4 }, this._historyContent);
      this._rearrangeNow();
    }

    log(args: any[]) {
      log(args, this._historyContent);
      this._rearrangeNow();
    }

    private _rearrangeNow() {
      if (this._hostMetrics) {
        this.measure();
        this.arrange(this._hostMetrics);
      }
    }

    isInputEmpty() {
      return !this._input.value;
    }

    getInput() {
      return (this._input.value || '').replace(/[\r\n]/g, '');
    }


    focus() {
      this._input.focus();
    }

    temporarilyHidePrompt(replacementText: string): () => void {
      // TODO: hide prompt, display replacement text instead
      return () => { };
    }

    measure() {
      this._promptWidth = this._prompt.offsetWidth;
      this._historyContentHeight = this._historyContent.offsetHeight;
    }

    arrange(metrics: CommanderShell.Metrics) {

      this._hostMetrics = metrics;

      this._history.style.width = metrics.hostWidth + 'px';

      this._history.style.bottom = (metrics.emHeight * 2.4) + 'px';
      if (metrics.hostHeight - metrics.emHeight * 2.4 > this._historyContentHeight) {
        this._history.style.height = this._historyContentHeight + 'px';
      }
      else {
        this._history.style.height = (metrics.hostHeight - metrics.emHeight * 2.4) + 'px';
        this._history.scrollTop = this._historyContentHeight - (metrics.hostHeight - metrics.emHeight * 2.4);
      }
      this._input.style.left = this._promptWidth + 'px';
      this._input.style.width = (metrics.hostWidth - this._promptWidth) + 'px';
    }

    storeAsHistory(command: string) {
      this._commandHistory.persistAndStartNew(this._input);
      this._input.value = command;
      this._commandHistory.persistAndStartNew(this._input);
    }

    keydown(e: KeyboardEvent, cursorPath: string) {
      if (e.keyCode === 27) {
        this._input.value = '';
        return true;
      }
      else if (e.keyCode === 38) {
        return this._commandHistory.scrollUp(this._input);
      }
      else if (e.keyCode === 40) {
        return this._commandHistory.scrollDown(this._input);
      }
      else if (e.keyCode === 13) {

        if (e.ctrlKey || e.metaKey) {
          if ('selectionStart' in this._input) {
            var lead = (this._input.value||'').slice(0, this._input.selectionStart);
            var trail = (this._input.value||'').slice(this._input.selectionEnd);
            var insert = (/\s$/.test(lead) ? '' : ' ') + cursorPath;
            this._input.value =  lead + insert + trail;
            this._input.selectionStart = lead.length + insert.length;
            this._input.selectionEnd = lead.length + insert.length;
            setTimeout(() => {
              if (this._input.value === lead + insert + trail
                  && this._input.selectionStart != lead.length + insert.length)
                this._input.selectionStart = lead.length + insert.length;
              if (this._input.value === lead + insert + trail
                  && this._input.selectionEnd != lead.length + insert.length)
                this._input.selectionEnd = lead.length + insert.length;
            }, 10);
          }
          else {
            this._input.value += (/\s$/.test(this._input.value) ? '' : ' ') + cursorPath;
          }
          return true;
        }

        var code = this.getInput();
        this._commandHistory.persistAndStartNew(this._input);

        if (code) {
          if (code.slice(-2) === '\r\n')
            code = code.slice(0, code.length - 2);
          this._input.value = '';
          elem('div', {
            text: code,
            color: 'gray'
          }, this._historyContent);
          this._queueRearrange();

          setTimeout(() => this._evalAndLogResults(code), 20);
          return true;
        }
        else {
          return false;
        }
      }
    }

  	clearInput() {
      this._input.value = '';
    }

  	private _queueRearrange() {
      if (this._rearrangeDelay) {
        clearTimeout(this._rearrangeDelay);
        this._rearrangeDelay = 0;
      }

      if (!this._rearrangeClosure)
        this._rearrangeClosure = () => this._rearrangeNow();

      this._rearrangeDelay = setTimeout(this._rearrangeClosure, 10);
    }


    private _evalAndLogResults(code: string) {

      var result;
      try {
        if (this.onexecute) {
          this.onexecute(code);
        }
        else {
          result = this._repl.eval(code, true /* use 'with' statement */);
        }
      }
      catch (error) {
        elem('div', {
          text: error && error.stack ? error.stack : error,
          color: 'red'
        }, this._historyContent);

        this._queueRearrange();
        return;
      }

      if (typeof result !== 'undefined')
      	this.log([result]);
    }


  }

}