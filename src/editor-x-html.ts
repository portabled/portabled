/// <reference path='typings/codemirror.d.ts' />

/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
/// <reference path='editor-std.ts' />

module teapo {

  /**
   * Handling detection of .html and .htm files.
   */
  class HtmlEditorType implements EditorType {
    private _shared: CodeMirrorEditor.SharedState = HtmlEditorType.createShared();

    storageForBuild: DocumentStorage = null;

    /** Optional argument can be used to mock TypeScriptService in testing scenarios. */
    constructor() {
    }

    static createShared() {
      var options = CodeMirrorEditor.standardEditorConfiguration();
      var shared: CodeMirrorEditor.SharedState = { options: options };

      options.mode = "text/html";
      options.gutters = [ 'teapo-errors' ];

      var debugClosure = () => {
        var editor = <HtmlEditor>shared.editor;
        if (!editor) return;

        editor.assembleBuild();
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
        (dotParts[dotParts.length-1].toLowerCase()==='html' || dotParts[dotParts.length-1].toLowerCase()==='htm');
    }

    editDocument(docState: DocumentState): Editor {
      return new HtmlEditor(this._shared, docState, this.storageForBuild);
    }
  }

  class HtmlEditor extends CompletionCodeMirrorEditor {
    constructor(
      shared: CodeMirrorEditor.SharedState,
      docState: DocumentState,
      private _storageForBuild: DocumentStorage) {
      super(shared, docState);
    }

    handleChange(change: CodeMirror.EditorChange) {
      super.handleChange(change);

      if (change.text.length===1
          && (change.text[0]==='<' || change.text[0]==='/'))
        this.triggerCompletion(true);
    }

    handlePerformCompletion(force: boolean, acceptSingle: boolean) {
      (<any>CodeMirror).showHint(this.editor(), (<any>CodeMirror).hint.html);
    }

    assembleBuild() {
      if (!this._storageForBuild)
        return;

      var html = this.text();
      var convertedOutput = [];
      var offset = 0;
      var srcRegex = /###(.*)###/g;
      var match;

      while (match = srcRegex.exec(html)) {
        var inlineFullPath = match[1];
        var verb: string = null;

        if (inlineFullPath.lastIndexOf(':')>=0) {
          verb = inlineFullPath.slice(inlineFullPath.lastIndexOf(':')+1);
          inlineFullPath = inlineFullPath.slice(0,inlineFullPath.length-verb.length-1);
        }

        if (inlineFullPath.charAt(0)!=='/' && inlineFullPath.charAt(0)!=='#')
          inlineFullPath = '/'+inlineFullPath;

        var inlineDocState = this._storageForBuild.getDocument(inlineFullPath);
        if (!inlineDocState) {
          continue;
        }
  
        convertedOutput.push(html.slice(offset, match.index));
  
        var embedContent: string;
        if (verb && verb in inlineDocState.editor()) {
          embedContent = (<any>inlineDocState.editor())[verb]();
        }
        else {
          embedContent = inlineDocState.getProperty(null);
        }
  
        embedContent = embedContent.replace(/<\/script/g, '</script');
        convertedOutput.push(embedContent);
        offset = match.index+match[0].length;
  
        var shortName = match[1];
        shortName = shortName.slice(shortName.lastIndexOf('/')+1);
      }
  
      if (offset<html.length)
        convertedOutput.push(html.slice(offset));
  
      var filename = this.docState.fileEntry().name();
      var blob = new Blob(convertedOutput, {type: 'application/octet-stream'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', filename);
      try {
        // safer save method, supposed to work with FireFox
        var evt = document.createEvent("MouseEvents");
        (<any>evt).initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        a.dispatchEvent(evt);
      }
      catch (e) {
        a.click();
      }

    }
  }

  export module EditorType {

    /**
     * Registering HtmlEditorType.
     */
    export var Html: EditorType = new HtmlEditorType();
  }
}