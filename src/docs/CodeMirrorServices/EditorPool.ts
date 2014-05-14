module teapo.docs {

  export class EditorPool {

    private _instances: CodeMirror[] = [];

    constructor(
      public options: CodeMirror.Options,
      private _document=document) {
    }

    requestEditor(): CodeMirror {

      if (this._instances.length)
        return this._instances.pop();

      var host = this._document.createElement('div');
      return new CodeMirror(host, this.options);

    }

    releaseEditor(editor: CodeMirror): void {

      this._instances.push(editor);

    }

  }

}