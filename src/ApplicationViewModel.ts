/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/codemirror.d.ts' />

/// <reference path='TypeScriptService.ts' />
/// <reference path='Document.ts' />
/// <reference path='Folder.ts' />

module teapo {

  export class ApplicationViewModel {

    activeDocument = ko.observable<Document>();
    root = new Folder(null,null);

    private _typescript: TypeScriptService = null;
    private _editor: CodeMirror.Editor = null;
    private _textarea: HTMLTextAreaElement = null;

    constructor (private _document = document) {
      var staticScripts = {};
      for (var i = 0; i < document.scripts.length; i++) {
        var s = <any>document.scripts[i];
        if (s.id && s.id[0]==='/') {
          var f = this.root.getDocument(s.id);
          f.doc.setValue(s.innerHTML);
          if (s.title) {
            // TODO: restore history too
          }
          this._typescript.addDocument(f.fullPath, f.doc);
        }
        else if (s.id && s.id[0]==='#') {
          staticScripts[s.id] = s.innerHTML;
        }
        this._typescript = new TypeScriptService(staticScripts);
      }

      this.root.onselectFile = (f) => this.selectFile(f);
    }

    selectFile(file: teapo.Document) {
      this.activeDocument(file);

      this._editor.swapDoc(file.doc);
      this._editor.focus();
    }

    attachTextarea(textarea: HTMLTextAreaElement) {
      this._textarea = textarea;
      this._editor = CodeMirror.fromTextArea(textarea);
    }
  }

}