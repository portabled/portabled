/// <reference path='typings/knockout.d.ts' />

/// <reference path='editor.ts' />
/// <reference path='files.ts' />
/// <reference path='persistence.ts' />

module teapo {
  export class ApplicationShell {

    saveDelay = 600;
    fileList: FileList = null;

    private _storage: DocumentStorage = null;
    private _selectedDocState: DocumentState = null;
    private _editorElement: HTMLElement = null;
    private _host: HTMLElement = null;
    private _saveTimeout = 0;
    private _saveSelectedFileClosure = () => this._invokeSaveSelectedFile();

    constructor() {
      this._storage = new DocumentStorage();
      this._storage.entryResolver = this.fileList;
      this._storage.typeResolver = EditorType;
  
      this.fileList = new FileList(this._storage);
  
      this.fileList.selectedFile.subscribe((fileEntry) => this._fileSelected(fileEntry));
    }

    newFileClick() {
      var fileName = prompt('New file');
      if (!fileName)
        return;

      var fileEntry = this.fileList.createFileEntry(fileName);
      this._storage.createDocument(fileName);
      fileEntry.handleClick();
    }

    deleteSelectedFile() {
      if (!this.fileList.selectedFile()) return;

      if (!confirm('Are you sure dleting '+this.fileList.selectedFile().name()))
        return;

      // TODO: delete the selected file, switch selection somewhere
    }

    saveFileName() {
      var urlParts = window.location.pathname.split('/');
      return decodeURI(urlParts[urlParts.length-1]);
    }

    saveZip() {
      
    }

    attachToHost(host: HTMLElement) {
      this._host = host;
      if (this._editorElement) {
        this._host.innerHTML = '';
        this._host.appendChild(this._editorElement);
      }
    }

    private _fileSelected(fileEntry: FileEntry) {
      var newDocState: DocumentState = null;
      if (fileEntry)
        newDocState = this._storage.getDocument(fileEntry.fullPath());

      if (this._selectedDocState) {
  
        // save file if needed before switching
        if (this._saveTimeout) {
          clearTimeout(this._saveTimeout);
          this._selectedDocState.editor().save();
        }
  
        // close file before switching
        this._selectedDocState.editor().close();
      }

      var newEditorElement: HTMLElement = null;
      if (newDocState) {
        var onchanged = () => this._selectedFileEditorChanged();
        newEditorElement = newDocState.editor().open(onchanged);
      }

      if (newEditorElement!==this._editorElement) {
        var oldEditorElement= this._editorElement;

        this._editorElement = newEditorElement;

        if (oldEditorElement && this._host) {
          this._host.removeChild(oldEditorElement);
        }

        this._host.innerHTML = ''; // removing the initial startup decoration

        if (newEditorElement && this._host)
          this._host.appendChild(newEditorElement);
      }
    }

    private _selectedFileEditorChanged() {
      if (this._saveTimeout)
        clearTimeout(this._saveTimeout);

      this._saveTimeout = setTimeout(
        this._saveSelectedFileClosure,
        this.saveDelay);
    }

    private _invokeSaveSelectedFile() {
      var selectedFileEntry = this.fileList.selectedFile();
      if (!selectedFileEntry) return;

      var docState = this._storage.getDocument(selectedFileEntry.fullPath());
      docState.editor().save();
    }
  }
}