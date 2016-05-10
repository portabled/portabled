namespace types.text {

  export class TextAreaEditor {

    private _textarea: HTMLTextAreaElement;
    private _title: HTMLDivElement;

    constructor(private _file: string, private _host: HTMLElement, content: string, private _write: (content: string) => void) {

      this._textarea = <any>elem('textarea', {
        background: 'navy',
        color: 'silver',
        top: '0', left: '0',
        width: '100%', height: '100%', position: 'absolute',
        borderTop: 'solid 1em black',
        overflow: 'auto'
      }, this._host);

      this._title = <any>elem('div', {
        position: 'absolute',
        top: '0', left: '0',
        width: '100%', height: '1em',
        background: 'silver', color: 'navy',
        text: this._file
      }, this._host);

      if (typeof content === 'string')
        this._textarea.value = content;
      if (this._textarea.setSelectionRange) {
        this._textarea.setSelectionRange(0, 0);
      }
      else if ('selectionStart' in this._textarea && 'selectionEnd' in this._textarea) {
        this._textarea.selectionStart = 0;
        this._textarea.selectionEnd = 0;
      }
    }

    close() {
      this._write(this._textarea.value);
      this._host.removeChild(this._textarea);
      this._host.removeChild(this._title);
    }

  }

}