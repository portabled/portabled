/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/codemirror.d.ts' />

/// <reference path='TypeScriptService.ts' />
/// <reference path='FileList.ts' />
/// <reference path='DocumentViewModel.ts' />

module teapo {

  export class ApplicationViewModel {
    private _documents: any = {};

    activeFile = ko.observable<File>();

    private _typescript: TypeScriptService = null;
    private _files = new Folder(null,null);
    private _editor: CodeMirror.Editor = null;
    private _textarea: HTMLTextAreaElement = null;

    constructor (private _document = document) {
      var staticScripts = {};
      for (var i = 0; i < document.scripts.length; i++) {
        var s = <any>document.scripts[i];
        if (s.id && s.id[0]==='/') {
          var f = this._files.addFile(s.id);
          var doc = new CodeMirror.Doc(s.innerHTML);
          var docVM = new DocumentViewModel(f.fullPath, doc);
          this._documents[f.fullPath] = docVM;
          this._typescript.addDocument(f.fullPath, doc);
        }
        else if (s.id && s.id[0]==='#') {
          staticScripts[s.id] = s.innerHTML;
        }
        this._typescript = new TypeScriptService(staticScripts);
      }

      this._files.clickFile = (f) => this.clickFile(f);
      this._files.clickFolder = (f) => alert('['+f.fullPath+']');
    }

    files() {
      return this._files;
    }

    clickFile(file: File) {
      var currentActiveFile = this.activeFile();
      if (currentActiveFile)
        currentActiveFile.active(false);
      this.activeFile(file);
      file.active(true);

      var doc = <DocumentViewModel>this._documents[file.fullPath];
      this._editor.swapDoc(doc.doc);
      this._editor.focus();
    }

    attachTextarea(textarea: HTMLTextAreaElement) {
      this._textarea = textarea;
      this._editor = CodeMirror.fromTextArea(textarea);
    }
  }

}