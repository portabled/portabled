module shell.editor {

  export class Editor {

    private _textarea: HTMLTextAreaElement;
    private _title: HTMLDivElement;

    private _lastText: string;
    private _textchangetimeout: number = 0;
    private _textchangeclosure: any = null;

    constructor(private _host: HTMLElement, private _file: string, text?: string) {
      this._textarea = <any>elem('textarea', {
        background: 'navy',
        color: 'silver',
        top: '0', left: '0',
        width: '100%', height: '100%', position: 'absolute',
        borderTop: 'solid 1em black',
        overflow: 'auto'
      });

      if (typeof text === 'string')
        this._textarea.value = text;
      this._lastText = this._textarea.value;
      this._host.appendChild(this._textarea);

      this._title = <any>elem('div', {
        position: 'absolute',
        top: '0', left: '0',
        width: '100%', height: '1em',
        background: 'silver', color: 'navy',
        text: this._file
      }, this._host);

      var onchange = () => this._queueDetectChange();
      on(this._textarea, 'change', onchange);
      on(this._textarea, 'changed', onchange);
      on(this._textarea, 'textInput', onchange);
      on(this._textarea, 'textinput', onchange);
      on(this._textarea, 'keydown', onchange);
      on(this._textarea, 'keyup', onchange);
      on(this._textarea, 'paste', onchange);
    }

    onchanged: () => void = null;

    focus() {
      this._textarea.focus();
    }

    setText(text: string) {
      this._textarea.value = text || '';
      this._lastText = this._textarea.value;
    }

    getText(): string {
      return this._textarea.value || '';
    }

    close() {
      this._detectchangeNow();
      this._host.removeChild(this._textarea);
      this._host.removeChild(this._title);
    }

    getPosition() {
      return {
        selectionStart: this._textarea.selectionStart,
        selectionEnd: this._textarea.selectionEnd
      };
    }

    setPosition(pos) {
      if ('selectionStart' in this._textarea)
        this._textarea.selectionStart = pos.selectionStart;
      if ('selectionEnd' in this._textarea)
        this._textarea.selectionEnd = pos.selectionEnd;
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

      var newText = this._textarea.value || '';
      if (newText !== this._lastText) {
        this._lastText = newText;
        if (this.onchanged) this.onchanged();
      }
    }
  }

}