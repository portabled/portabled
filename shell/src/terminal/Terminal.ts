namespace terminal {

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

  	private _hidePrompt = false;

    onexecute: (code: string) => any = null;
  	onkeydown: (e: KeyboardEvent) => any = null;
  	onenterdetected: () => any = null;

    constructor(
      private _host: HTMLElement,
      private _checkInactive: () => boolean,
      version: string,
      getBootState: () => any) {
      this._history = <any>elem('div', { className: 'terminal-history' }, this._host);

      var nowTimeForBuildMessage = +new Date();

      var boot = (getBootState ? getBootState() : null) || {};

      var buildReports: { module: string; build: { timestamp: number; taken: number; platform: string; }; }[] = [{module: 'shell', build: build }];

      var samePlatform = buildReports[0].build.platform;
      for (var k in build) if (build.hasOwnProperty(k) && build[k] && build[k].timestamp && build[k].taken && build[k].platform) {
        buildReports.push({module: k, build: build[k]});
        if (buildReports[buildReports.length-1].build.platform!==samePlatform)
          samePlatform = null;
      }
      buildReports.sort(function(b1, b2) { return b1.build.timestamp>b2.build.timestamp ? +1 : b1.build.timestamp<b2.build.timestamp ? -1 : 0; });

      var buildMessage = 'Built'+(samePlatform?' on '+samePlatform+':':':');
      for (var i=0; i<buildReports.length; i++) {
        buildMessage+='\n  *'+buildReports[i].module+' '+persistence.formatDate(new Date(buildReports[i].build.timestamp))+' - '+Terminal.agoText(nowTimeForBuildMessage-buildReports[i].build.timestamp);
        buildMessage+=' (in '+((buildReports[i].build.taken/100)|0)/10+' s.)';
        if (!samePlatform) {
          buildMessage +='\n   on '+buildReports[i].build.platform.replace(/\) /g, ')\n      ');
        }
      }

      if (boot && boot.storageName) {
        buildMessage += '\n  Storing with '+boot.storageName+' cache'+
          (boot.domTotalSize||boot.domLoadedSize ? ' '+persistence.formatSize(boot.domTotalSize||boot.domLoadedSize) :'');
      }

      this._historyContent = <any>elem('pre', { className: 'terminal-history-content' }, this._history);
      elem('div', { text: 'Hello world from mini-shell\n\nVersion '+version }, this._historyContent);

      var refLine = elem('div', 'Uses ', this._historyContent);
      elem('a', { text: 'TypeScript', href: 'https://github.com/Microsoft/TypeScript/' }, refLine);
      elem('span', { text: ' from Microsoft and others (with ' }, refLine);
      elem('a', { text: 'Apache', href: 'https://github.com/Microsoft/TypeScript/blob/master/LICENSE.txt' }, refLine);
      elem('span', { text: ' license), ' }, refLine);

      elem('a', { text: 'CodeMirror', href: 'http://codemirror.net/' }, refLine);
      elem('span', { text: ' from Marijn Haverbeke and others (with ' }, refLine);
      elem('a', { text: 'MIT', href: 'http://codemirror.net/LICENSE' }, refLine);
      elem('span', { text: ' license).' }, refLine);


      var buildMe = elem('div', { text: buildMessage + '\n - by Oleg Mihailik\n\nPlease be careful.' }, this._historyContent);
      var storageFailureStr = [];
      for (var fa in boot.storageLoadFailures) if (boot.storageLoadFailures.hasOwnProperty(fa)) {
        storageFailureStr.push(fa+': '+boot.storageLoadFailures[fa]);
      }
      if (storageFailureStr) {
        buildMe.title = storageFailureStr.join('\n');
        buildMe.onclick = () => {
          this.writeDirect(
            storageFailureStr.length+' storage failures'+
            (boot.storageName ? ', succeeded with '+boot.storageName:'')+
            ':\n'+
            storageFailureStr.join('\n'));
        };
      }



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
        if (this._checkInactive()) {
          if (e.preventDefault)
            e.preventDefault();
          return false;
        }

        detectEnter();
        //if (this.onkeydown) return this.onkeydown(e);
      }));
      on(this._input, 'change', detectEnter);
      on(this._input, 'textinput', detectEnter);
      on(this._input, 'textInput', detectEnter);
      on(this._input, 'input', detectEnter);
      on(this._input, 'propertychange', detectEnter);

      setTimeout(() => {
      	var finishLoading = +new Date();
        if (typeof loader !== 'undefined' && loader.timings) {
          var total = finishLoading-loader.timings.start;
          var earlyDom = loader.timings.domStarted - loader.timings.start;
          var documentLoaded = loader.timings.documentLoaded - loader.timings.domStarted;
          var driveLoaded = loader.timings.driveLoaded - loader.timings.documentLoaded;
          var uiLoaded = finishLoading - loader.timings.driveLoaded;

          this.writeDirect(
            'Loaded in '+((total/100)|0)/10+'s:'+
            (earlyDom > 100 ? ' boot UI '+((earlyDom/100)|0)/10 + 's.':(documentLoaded+=earlyDom,'')) +
            (driveLoaded > 100 ? ' dom filesystem '+((documentLoaded/100)|0)/10 + 's. local modifications '+((driveLoaded/100)|0)/10+'s.':' dom drive '+(((documentLoaded+driveLoaded)/100)|0)/10+'s.') +
          	' shell UI '+((uiLoaded/100)|0)/10+'s.\n'+
            '  *edited at '+persistence.formatDate(new Date(loader.drive.timestamp))+' ('+Terminal.agoText(finishLoading-loader.drive.timestamp)+')'
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

  	hasAnyTextSelected() {
      return this._input.selectionEnd && (this._input.selectionEnd>this._input.selectionEnd || this._input.selectionEnd<this._input.selectionEnd);
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

      var kn = e.shellKeyNames[0];

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

  	writeAsCommand(command: string) {
      var line = elem('div', this._historyContent);
      elem('span', { className: 'terminal-prompt-lead', text: String.fromCharCode(26410) }, line);
      elem('span', { className: 'terminal-prompt-text', text: this._promptText.textContent || this._promptText.innerText }, line);
      elem('span', { className: 'terminal-prompt-delim', text: '>' }, line);
      elem('span', { className: 'terminal-echo-command', text: command }, line);
    }

  	writeSmall(text: string) {
      elem('div', { text, opacity: 0.4, fontSize: 0.8 }, this._historyContent);
      this._rearrangeNow();
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

    temporarilyHidePrompt(): () => void {
      this._hidePrompt = true;
      this.arrange(this._hostMetrics);
      this._queueRearrange();
      return () => {
        this._hidePrompt = false;
        this.arrange(this._hostMetrics);
        this._queueRearrange();
      };
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

      if (this._hidePrompt) {
        this._prompt.style.display = 'none';
        this._input.style.left = '0';
        this._input.style.width = metrics.hostWidth + 'px';
      }
      else {
        this._prompt.style.display = '';
        this._input.style.left = this._promptWidth + 'px';
        this._input.style.width = (metrics.hostWidth - this._promptWidth) + 'px';
      }
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
          this.writeAsCommand(code);
          this._queueRearrange();

          this.onexecute(code);
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

  }

}