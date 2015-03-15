module portabled.shell.consoleUI {

  export class ConsoleUI {

    cm: CodeMirror;
    doc: CodeMirror.Doc;

    constructor(private _host: HTMLElement) {

      this.cm = new CodeMirror(element => {
        element.style.position = 'absolute';
        element.style.height = '100%';
        element.style.width = '100%';
        this._host.appendChild(element);
      }, {
        lineNumbers: true,
        theme: '3024-night'
      });
      this.doc = this.cm.getDoc();
      
      setTimeout(() => this.cm.focus(), 100);

    }

    log(message: any, ...optionalParameters: any[]) {
      this.doc.replaceSelection(message);
    }

  }
}