module teapo {

  function createTernServer() {
    var ts = (<any>CodeMirror).TernServer;
    if (!ts) return null;
    return new (<any>CodeMirror).TernServer()
  }
  
  /**
   * Handling detection of .js files.
   */
  class JavaScriptEditorType implements EditorType {
    private _shared: JavaScriptEditor.SharedState = JavaScriptEditorType.createShared();

    constructor(tern?) {
      this._shared.tern = tern;
    }

    static createShared() {
      var options = CodeMirrorEditor.standardEditorConfiguration();
      var shared: JavaScriptEditor.SharedState = { options: options, tern: null };

      options.mode = "text/javascript";
      options.gutters = [ 'teapo-errors' ];

      var debugClosure = () => {
        var editor = <JavaScriptEditor>shared.editor;
        if (!editor) return;

        editor.run();
      };

      var extraKeys = options.extraKeys || (options.extraKeys = {});
      var shortcuts = ['Ctrl-B','Alt-B','Cmd-B','Shift-Ctrl-B','Ctrl-Alt-B','Shift-Alt-B','Shift-Cmd-B','Cmd-Alt-B'];
      for (var i = 0; i<shortcuts.length; i++) {
        var k = shortcuts[i];
        if (k in extraKeys)
          continue;

        extraKeys[k] = debugClosure;
      }

      return shared;
    }

    canEdit(fullPath: string): boolean {
      var dotParts = fullPath.split('.');
      return dotParts.length>1 &&
        dotParts[dotParts.length-1].toLowerCase()==='js';
    }

    editDocument(docState: DocumentState): Editor {
      return new JavaScriptEditor(this._shared, docState);
    }
  }

  class JavaScriptEditor extends CompletionCodeMirrorEditor {

    private _tern = null;
    private static _ternInitFailure = false;

    constructor(
      shared: JavaScriptEditor.SharedState,
      docState: DocumentState) {
      super(shared, docState);
      this._tern = shared.tern || createTernServer();

      this._tern.server.addFile(this.docState.fullPath(), this.text());
    }

    run() {
      var editor = this;
      eval(this.text());
      
    }

    handleLoad() {
      super.handleLoad();

      this._tern.delDoc(this.docState.fullPath());
      this._tern.addDoc(this.docState.fullPath(), this.doc());
    }

    handlePerformCompletion(forced: boolean, acceptSingle: boolean) {
      (<any>CodeMirror).showHint(
        this.editor(),
        (cm,c) => {
          try {
            return this._tern.getHint(cm, c);
          }
          catch (error) {
            alert('getHint '+error+'\n'+error.stack);
          }
        },
        {
          async: true,
          completeSingle: acceptSingle
        });
    }
  }

  module JavaScriptEditor {
    export interface SharedState extends CodeMirrorEditor.SharedState {
      tern: any;
    }
  }

  export module EditorType {

    /**
     * Registering HtmlEditorType.
     */
    export var JavaScript: EditorType = new JavaScriptEditorType();
  }
}