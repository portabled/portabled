/// <reference path='typings/knockout.d.ts' />
/// <reference path='editor.ts' />
/// <reference path='files.ts' />
/// <reference path='persistence.ts' />

module teapo {
  export class ApplicationShell {

    fileList: FileList = null;

    private _storage: DocumentStorage = null;

    constructor() {
      this._storage = new DocumentStorage();
      this._storage.entryResolver = this.fileList;
  
      this.fileList = new FileList(this._storage);
  
      this.fileList.selectedFile.subscribe((fileEntry) => this._fileSelected(fileEntry));
    }

    private _fileSelected(fileEntry: FileEntry) {
      // 
    }
  }
}