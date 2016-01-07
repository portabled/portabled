namespace CodeMirror {
  export interface Doc {
    listSelections(): any[];
    setSelections(selections: any[]): void;
  }
}

module shell.editor {

  export class CMEditor {

    private _cmhost: HTMLDivElement;
    private _cm: CodeMirror;
    private _title: HTMLDivElement;
    private _keybar: keybar.Keybar;

    private _lastText: string;
    private _textchangetimeout: number = 0;
    private _textchangeclosure: any = null;

    requestClose: () => void;

    constructor(private _host: HTMLElement, private _file: string, text?: string) {
      this._cmhost = <any>elem('div', {
        background: 'navy',
        color: 'silver',
        top: '0', left: '0',
        width: '100%', height: '100%', position: 'absolute',
        borderTop: 'solid 1.2em black',
        borderBottom: 'solid 1.2em black',
        overflow: 'auto'
      });

      this._host.appendChild(this._cmhost);
      this._cm = createCodeMirrorEditor(this._cmhost);

      if (typeof text === 'string')
        this._cm.getDoc().setValue(text);
      this._lastText = this._cm.getDoc().getValue();

      this._title = <any>elem('div', {
        position: 'absolute',
        top: '0', left: '0',
        width: '100%', height: '1em',
        background: 'silver', color: 'navy',
        text: this._file
      }, this._host);

      this._keybar = new keybar.Keybar(this._host, [
        { text: 'Help' },
        { text: '<None>' },
        { text: '<None>' },
        { text: '<None>' },
        { text: '<None>' },
        { text: '<None>' },
        { text: '<None>' },
        { text: '<None>' },
        { text: '<None>' },
        { text: 'Exit', action: () => this._requestClose() }
      ]);

      this._cm.on('change', () => this._queueDetectChange());
    }

    getPosition() {
      var selections = this._cm.getDoc().listSelections();
      var scrollInfo = this._cm.getScrollInfo();
      return {
        selections,
        scrollInfo
      };
    }

    setPosition(pos) {
      this._cm.scrollTo(pos.scrollInfo.left, pos.scrollInfo.top);
      this._cm.getDoc().setSelections(pos.selections);
    }

    arrange(metrics: CommanderShell.Metrics) {
      this._keybar.arrange(metrics);
    }

    onchanged: () => void = null;

    focus() {
      this._cm.focus();
    }

    setText(text: string) {
      this._cm.getDoc().setValue(text || '');
      this._lastText = this._cm.getDoc().getValue();
    }

    getText(): string {
      return this._cm.getDoc().getValue();
    }

    close() {
      this._detectchangeNow();
      this._host.removeChild(this._cmhost);
      this._host.removeChild(this._title);
      this._keybar.remove();
    }

    private _requestClose() {
      this._detectchangeNow();
      if (this.requestClose) {
        this.requestClose();
        return true;
      }
    }

    private _queueDetectChange() {
      if (!this._textchangeclosure) this._textchangeclosure = () => this._detectchangeNow();

      if (this._textchangetimeout) clearTimeout(this._textchangetimeout);

      this._textchangetimeout = setTimeout(this._textchangeclosure, 700);
    }

    private _detectchangeNow() {
      if (this._textchangetimeout) {
        clearTimeout(this._textchangetimeout);
        this._textchangetimeout = 0;
      }

      var newText = this._cm.getDoc().getValue() || '';
      if (newText !== this._lastText) {
        this._lastText = newText;
        if (this.onchanged) this.onchanged();
      }
    }
  }

  function createCodeMirrorEditor(host: HTMLElement): CodeMirror {
    return new CodeMirror(host, <CodeMirror.Options>{
      lineNumbers: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      matchTags: true,
      showTrailingSpace: true,
      autoCloseTags: true,
      foldGutter: true,
    		gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
      //highlightSelectionMatches: {showToken: /\w/},
      styleActiveLine: true,
      tabSize: 2,
      theme: 'rubyblue'
    });
  }

}