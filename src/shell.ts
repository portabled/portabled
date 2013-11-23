/// <reference path='typings/knockout.d.ts' />
/// <reference path='editor.ts' />
/// <reference path='files.ts' />
/// <reference path='persistence.ts' />

module teapo {
  export class ApplicationShell {

    fileList: FileList = null;

    private _storage: DocumentStorage = null;
    private _selectedDocState: DocumentState = null;
    private _editorElement: HTMLElement = null;
    private _host: HTMLElement = null;

    constructor() {
      this._storage = new DocumentStorage();
      this._storage.entryResolver = this.fileList;
  
      this.fileList = new FileList(this._storage);
  
      this.fileList.selectedFile.subscribe((fileEntry) => this._fileSelected(fileEntry));
    }

    private _fileSelected(fileEntry: FileEntry) {
      var newDocState: DocumentState = null;
      if (fileEntry)
        newDocState = this._storage.getDocument(fileEntry.fullPath());

      if (this._selectedDocState) {
        this._selectedDocState.editor().close();
      }

      var newEditorElement: HTMLElement = null;
      if (newDocState) {
        newEditorElement = newDocState.editor().open();
      }

      if (newEditorElement!==this._editorElement) {
        var oldEditorElement= this._editorElement;
        this._editorElement = newEditorElement;
        if (oldEditorElement)
          this._host.removeChild(oldEditorElement);
        if (newEditorElement)
          this._host.appendChild(newEditorElement);
      }
    }
  }
}