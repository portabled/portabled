module teapo.docs.CodeMirrorServices {

  export class DocumentState {

    loadText: () => string;

    private _doc: CodeMirror.Doc = null;

    constructor() {
    }

    doc(): CodeMirror.Doc {

      if (!this._doc) {
        var text = this.loadText();
        this._doc = new CodeMirror.Doc(text);
      }

      return this._doc;
    }

    onImmediateCursorActivity: (pos: CodeMirror.Pos) => void = null;
    onAfterCursorActivity: (pos: CodeMirror.Pos) => void = null;

    private _initDoc(doc: CodeMirror.Doc) {
      CodeMirror.on(doc, 'change', (d, change) => this._onchange(change));
      CodeMirror.on(doc, 'cursorActivity', (d) => this._oncursorActivity());
    }

    private _onchange(change: CodeMirror.EditorChange) {
      
    }

    private _oncursorActivity() {
      
    }

  }

}