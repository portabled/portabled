/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/codemirror.d.ts' />

/// <reference path='TypeScriptService.ts' />
/// <reference path='FileList.ts' />
/// <reference path='DocumentViewModel.ts' />

module teapo {

  export class ApplicationViewModel {
    private _documents: any = {};

    codemirror = ko.observable<CodeMirror.Editor>(null);
    activeFile = ko.observable<File>();

    private _typescript = new TypeScriptService();
    private _files = new Folder(null,null);

    constructor () {
      this._mockDoc('lib.d.ts', '');
      this._mockDoc('main.ts', '1+2');
      this._mockDoc('/import/codemirror.d.ts', ' // ok');
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
      this.codemirror().swapDoc(doc.doc);
    }

    private _mockDoc(fullPath: string, content: string) {
      var f = this._files.addFile(fullPath);
      fullPath = f.fullPath; // normalized

      var doc = new CodeMirror.Doc(content);
      var docVM = new DocumentViewModel(fullPath, doc);
      this._documents[fullPath] = docVM;
    }
  }

}