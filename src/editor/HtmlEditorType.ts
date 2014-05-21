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
      options.gutters = ['teapo-errors'];

      var debugClosure = () => {
        var editor = <HtmlEditor>shared.editor;
        if (!editor) return;

        editor.assembleBuild();
      };

      var extraKeys = options.extraKeys || (options.extraKeys = {});
      var shortcuts = ['Ctrl-B', 'Alt-B', 'Cmd-B', 'Shift-Ctrl-B', 'Ctrl-Alt-B', 'Shift-Alt-B', 'Shift-Cmd-B', 'Cmd-Alt-B'];
      for (var i = 0; i < shortcuts.length; i++) {
        var k = shortcuts[i];
        if (k in extraKeys)
          continue;

        extraKeys[k] = debugClosure;
      }

      return shared;
    }

    canEdit(fullPath: string): boolean {
      var dotParts = fullPath.split('.');
      return dotParts.length > 1 &&
        (dotParts[dotParts.length - 1].toLowerCase() === 'html' || dotParts[dotParts.length - 1].toLowerCase() === 'htm');
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

      if (change.text.length === 1
        && (change.text[0] === '<' || change.text[0] === '/'))
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
        var directive = match[1];
        var inlineFullPath = directive;
        var verb: string = null;

        if (inlineFullPath.lastIndexOf(':') >= 0) {
          verb = inlineFullPath.slice(inlineFullPath.lastIndexOf(':') + 1);
          inlineFullPath = inlineFullPath.slice(0, inlineFullPath.length - verb.length - 1);
        }

        if (inlineFullPath.charAt(0) !== '/' && inlineFullPath.charAt(0) !== '#')
          inlineFullPath = '/' + inlineFullPath;

        var inlineDocState = this._storageForBuild.getDocument(inlineFullPath);

        var _embedAllDocs = () => {
          var docNames = this._storageForBuild.documentNames();
          var output: string[] = [];
          output.push('<!' + '-- data insertion --' + '>');
          output.push('<div id=data-teapo-' + 'storage style="display: none;" data-teapo-file-count="' + docNames.length + '">');
          for (var i = 0; i < docNames.length; i++) {
            var fullPath = docNames[i];
            var docState = this._storageForBuild.getDocument(fullPath);
            output.push('<' + 'script' + ' data-teapo-path="' + fullPath + '" type="text/html">');
            var content = docState.getProperty(null);
            output.push(encodeForInnerHTML(content));
            output.push('</' + 'script' + '>');
            output.push('\n');
          }
          output.push('</' + 'div' + '>');
          return output.join('');
        };

        function embedAllDocs() {
          return _embedAllDocs();
        };


        var embedContent: string;

        if (!inlineDocState) {
          if (startsWith(directive, '(js)')) {
            var js = directive.slice('(js)'.length);

            var storage = this._storageForBuild;
            var docState = this.docState;
            var fullPath = this.docState.fullPath();

            try {
              var _content = eval(js);
              if (typeof _content === 'string')
                embedContent = _content;
            }
            catch (evalError) {
              alert('(js) eval ' + evalError);
              continue;
            }

          }
          else {
            alert('Inlining ' + inlineFullPath + ' failed: cannot find.');
            continue;
          }
        }
        else {
          if (verb && verb in inlineDocState.editor()) {
            embedContent = (<any>inlineDocState.editor())[verb]();
          }
          else {
            embedContent = inlineDocState.getProperty(null);
          }

          embedContent = encodeForInnerHTML(embedContent);
        }

        convertedOutput.push(html.slice(offset, match.index));
        convertedOutput.push(embedContent);
        offset = match.index + match[0].length;

        var shortName = match[1];
        shortName = shortName.slice(shortName.lastIndexOf('/') + 1);
      }

      if (offset < html.length)
        convertedOutput.push(html.slice(offset));

      var filename = this.docState.fileEntry().name();
      var blob = new Blob(convertedOutput, { type: 'text/html' });
      var url = URL.createObjectURL(blob);
      window.open(url, '_blank' + Date.now());

    }
  }

  export module EditorType {

    /**
     * Registering HtmlEditorType.
     */
    export var Html: EditorType = new HtmlEditorType();
  }
}