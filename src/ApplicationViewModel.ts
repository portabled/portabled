/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='FileList.ts' />

module teapo {

  export class ApplicationViewModel {

    codemirror: CodeMirror.Editor = null;

    private _typescript = new TypeScriptService();
    private _files = new Folder(null,null);

    constructor () {
      this._files.addFile('lib.d.ts');
      this._files.addFile('main.ts');
      this._files.addFile('/import/codemirror.d.ts');
      this._files.addFile('/import/more/codemirror.d.ts');
    }

    files() {
      return this._files;
    }
  }

}