module terminal {

  export class Terminal {

    private _history: HTMLDivElement;
    private _historyContent: HTMLDivElement;
    private _prompt: HTMLDivElement;
    private _input: HTMLTextAreaElement;

    private _promptWidth = 0;
    private _historyContentHeight = 0;
    private _hostMetrics: CommanderShell.Metrics = null;

    constructor(private _host: HTMLElement) {
      this._history = <any>elem('div', { className: 'terminal-history' }, this._host);
      this._historyContent = <any>elem('pre', {
        className: 'terminal-history-content',
        text: 'Hello world from mini-shell\n\nVersion 0.7m\nMay 2015\nOleg Mihailik\n\nPlease be careful.'
      }, this._history);

      this._prompt = <any>elem('div', { className: 'terminal-prompt', text: '>' }, this._host);

      this._input = <any>elem('textarea', { className: 'terminal-input', autofocus: true }, this._host);

      setTimeout(() => this._input.focus(), 1);

    }

    log(...args: any[]) {
      return this.logArray(args);
    }

    logArray(args: any[]) {
      var output = elem('div', this._historyContent);
      for (var i = 0; i < args.length; i++) {
        if (i > 0)
          elem('span', { text: ' ' }, output);
        if (args[i] === null) {
          elem('span', { text: 'null', color: 'green' }, output);
        }
        else {
          this._logAppendObj(args[i], <any>output, 0);
        }
      }

      if (this._hostMetrics) {
        this.measure();
        this.arrange(this._hostMetrics);
      }
    }

    hasInput() {
      return !!this._getInput();
    }

  	private _getInput() {
      return (this._input.value || '').replace(/[\r\n]/g, '');
    }

    private _logAppendObj(obj: any, output: HTMLDivElement, level: number) {
      switch (typeof obj) {
        case 'number':
        case 'boolean':
          elem('span', { text: obj, color: 'green' }, output);
          break;

        case 'undefined':
          elem('span', { text: 'undefined', color: 'green', opacity: 0.5 }, output);
          break;

        case 'function':
          var funContainer = elem('span', output);
          var funFunction = elem('span', { text: 'function ', color: 'silver', opacity: 0.5 }, funContainer);
          var funName = elem('span', { text: obj.name, color: 'cornflowerblue', fontWeight: 'bold' }, funContainer);
          funContainer.title = obj;
          break;

        case 'string':
          var strContainer = elem('span', output);
          elem('span', { text: '"', color: 'tomato' }, strContainer);
          elem('span', { text: obj, color: 'tomato', opacity: 0.5 }, strContainer);
          elem('span', { text: '"', color: 'tomato' }, strContainer);
          break;

        default:
          if (obj && obj.constructor && obj.construct && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
            elem('span', { text: obj.constructor.name, color: 'cornflowerblue' }, output);
            if (obj.constructor.prototype && obj.constructor.prototype.constructor
              && obj.constructor.prototype.constructor.name
              && obj.constructor.prototype.constructor.name !== 'Object' && obj.constructor.prototype.constructor.name !== 'Array')
              elem('span', { text: ':' + obj.contructor.prototype.constructor.name, color: 'cornflowerblue', opacity: 0.5 }, output);
            elem('span', output);
          }

          if (obj && typeof obj.length === 'number' && obj.length >= 0) {
            elem('span', { text: '[', color: 'white' }, output);
            if (level > 1) {
              elem('span', { text: '...', color: 'silver' }, output);
              // TODO: handle click
            }
            else {
              for (var i = 0; i < obj.length; i++) {
                if (i > 0) elem('span', { text: ', ', color: 'gray' }, output);
                if (typeof obj[i] !== 'undefined')
                  this._logAppendObj(obj[i], output, level + 1);
              }
            }
            elem('span', { text: ']', color: 'white' }, output);
          }
          else if (obj.createElement + '' === document.createElement + '' && obj.getElementById + '' === document.getElementById + '' && 'title' in obj) {
            elem('span', { text: '#document ' + obj.title, color: 'green' }, output);
          }
          else if (obj.setInterval + '' === window.setInterval + '' && obj.setTimeout + '' === window.setTimeout + '' && 'location' in obj) {
            elem('span', { text: '#window ' + obj.location, color: 'green' }, output);
          }
          else if (typeof obj.tagName === 'string' && obj.getElementsByTagName + '' === document.body.getElementsByTagName + '') {
            elem('span', { text: '<' + obj.tagName + '>', color: 'green' }, output);
          }
          else if (obj + '' !== '[Object]') {
            elem('span', { text: '{', color: 'cornflowerblue' }, output);
            if (level > 1) {
              elem('span', { text: '...', color: 'cornflowerblue', opacity: 0.5 }, output);
              // TODO: handle click
            }
            else {
              var first = true;
              for (var k in obj) {
                if (obj.hasOwnProperty && !obj.hasOwnProperty(k)) continue;
                if (first) {
                  first = false;
                }
                else {
                  elem('span', { text: ', ', color: 'cornflowerblue', opacity: 0.3 }, output);
                  first = false;
                }
                elem('span', { text: k, color: 'cornflowerblue', fontWeight: 'bold' }, output);
                elem('span', { text: ': ', color: 'cornflowerblue', opacity: 0.5 }, output);
                this._logAppendObj(obj[k], output, level + 1);
              }
            }
            elem('span', { text: '}', color: 'cornflowerblue' }, output);
          }
          else {
            elem('span', { text: obj, color: 'cornflowerblue' }, output);
          }
          break;
      }
    }

    focus() {
      this._input.focus();
    }

    measure() {
      this._promptWidth = this._prompt.offsetWidth;
      this._historyContentHeight = this._historyContent.offsetHeight;
    }

    arrange(metrics: CommanderShell.Metrics) {

      this._hostMetrics = metrics;

      this._history.style.width = metrics.hostWidth + 'px';

      this._history.style.bottom = metrics.emHeight + 'px';
      if (metrics.hostHeight - metrics.emHeight > this._historyContentHeight) {
        this._history.style.height = this._historyContentHeight + 'px';
      }
      else {
        this._history.style.height = (metrics.hostHeight - metrics.emHeight) + 'px';
        this._history.scrollTop = this._historyContentHeight - (metrics.hostHeight - metrics.emHeight);
      }
      this._input.style.left = this._promptWidth + 'px';
      this._input.style.width = (metrics.hostWidth - this._promptWidth) + 'px';
    }

  	clearInput() {
      setTimeout(() => {
        var cleanInput = this._getInput();
        if (this._input.value !== cleanInput) {
          this._input.value = cleanInput;
        }
      }, 10);
    }

    keydown(e: KeyboardEvent, cursorPath: string) {
      if (e.keyCode === 38) {
        // TODO history
      }
      else if (e.keyCode === 13) {
        var code = this._getInput();

        if (code) {
          if (code.slice(-2) === '\r\n')
            code = code.slice(0, code.length - 2);
          this._input.value = '';
          elem('div', {
            text: code,
            color: 'gray'
          }, this._historyContent);

          this._evalAndLogResults(code);
          return true;
        }
        else {
          return false;
        }
      }
    }

    private _evalAndLogResults(code: string) {
      var result;
      try {
        result = (0, eval)(code);
      }
      catch (error) {
        elem('div', {
          text: error && error.stack ? error.stack : error,
          color: 'red'
        }, this._historyContent);
        if (this._hostMetrics) {
          this.measure();
          this.arrange(this._hostMetrics);
        }
        return;
      }

      this.log(result);
    }


  }

}