/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/codemirror.d.ts' />

module teapo {

  export class ApplicationViewModel {

    codemirror: CodeMirror.Editor = null;

    private _typescript = new TypeScriptService();
    private _files = new FileList();

    constructor () {
      this._files.addFile('lib.d.ts');
      this._files.addFile('main.ts');
    }

    files() {
      return this._files.items;
    }
  }

}