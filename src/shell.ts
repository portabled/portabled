/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/zip.js.d.ts' />

/// <reference path='editor.ts' />
/// <reference path='files.ts' />
/// <reference path='persistence.ts' />

module teapo {

  /**
   * Hadles high-level application behavior,
   * creates and holds DocumentStorage and FileList,
   * that in turn manage persistence and file list/tree.
   *
   * Note that ApplicationShell serves as the top-level
   * ViewModel used in Knockout.js bindings.
   */
  export class ApplicationShell {

    saveDelay = 600;
    fileList: FileList = null;

    private _selectedDocState: DocumentState = null;
    private _editorElement: HTMLElement = null;
    private _host: HTMLElement = null;
    private _saveTimeout = 0;
    private _saveSelectedFileClosure = () => this._invokeSaveSelectedFile();

    constructor(private _storage: DocumentStorage) {
//      this._storage.entryResolver = this.fileList;
//      this._storage.typeResolver = EditorType;
      this.fileList = new FileList(this._storage);
  
      this.fileList.selectedFile.subscribe((fileEntry) => this._fileSelected(fileEntry));

      // loading editors for all the files
      var allFiles = this._storage.documentNames();
      for (var i = 0; i < allFiles.length; i++) {
        var docState = this._storage.getDocument(allFiles[i]);
        docState.editor();
      }
    }

    newFileClick() {
      var fileName = prompt('New file');
      if (!fileName)
        return;

      var fileEntry = this.fileList.createFileEntry(fileName);
      this._storage.createDocument(fileEntry.fullPath());

      fileEntry.handleClick();
    }

    deleteSelectedFile() {
      var selectedFileEntry = this.fileList.selectedFile();
      if (!selectedFileEntry) return;

      if (!confirm('Are you sure dleting '+selectedFileEntry.name()))
        return;

      this._storage.removeDocument(selectedFileEntry.fullPath());
      this.fileList.removeFileEntry(selectedFileEntry.fullPath());

      if (this._host) {
        this._host.innerHTML = '';
      }
    }

    saveFileName() {
      var urlParts = window.location.pathname.split('/');
      return decodeURI(urlParts[urlParts.length-1]);
    }

    saveHtml() {
      var filename = this.saveFileName();
      var blob = new Blob([document.documentElement.outerHTML], {type: 'application/octet-stream'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', filename);
      a.click();
    }

    saveZip() {
      zip.useWebWorkers = false;
      var filename = this.saveFileName();
      if (filename.length>'.html'.length && filename.slice(filename.length-'.html'.length).toLowerCase()==='.html')
        filename = filename.slice(0,filename.length-'.html'.length);
      else if (filename.length>'.htm'.length && filename.slice(filename.length-'.htm'.length).toLowerCase()==='.htm')
        filename = filename.slice(0,filename.length-'.htm'.length);
      filename+='.zip';

      zip.createWriter(new zip.BlobWriter(), (zipWriter) => {
        var files = this._storage.documentNames();
        var completedCount = 0;

        for (var i=0; i<files.length; i++) {
          var docState = this._storage.getDocument(files[i]);
          var content = docState.getProperty(null);

          zipWriter.add(files[i], new zip.TextReader(content), () => {
            completedCount++;
            if (completedCount===files.length) {
              zipWriter.close((blob) => {
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.setAttribute('download', filename);
                a.click();
              });
            }
          });
        }
      });
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