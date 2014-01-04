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
   * Note that ApplicationShell serves as a top-level
   * ViewModel used in Knockout.js bindings.
   */
  export class ApplicationShell {

    saveDelay = 1500;
    fileList: FileList = null;

    toolbarExpanded = ko.observable(false);

    private _selectedDocState: DocumentState = null;
    private _editorElement: HTMLElement = null;
    private _editorHost: HTMLElement = null;
    private _saveTimeout = 0;
    private _saveSelectedFileClosure = () => this._invokeSaveSelectedFile();

    constructor(private _storage: DocumentStorage) {
      this.fileList = new FileList(this._storage);
  
      this.fileList.selectedFile.subscribe((fileEntry) => this._fileSelected(fileEntry));

      // loading editors for all the files
      var allFilenames = this._storage.documentNames();
      allFilenames.sort();
      for (var i = 0; i < allFilenames.length; i++) {
        var docState = this._storage.getDocument(allFilenames[i]);
        docState.editor();
      }
    }

    keyDown(self, e: KeyboardEvent) {
      switch (e.keyCode) {
        case 78:
          if ((<any>e).cmdKey || e.ctrlKey || e.altKey) {
            this.newFileClick();

            if (e.preventDefault)
              e.preventDefault();
            if ('cancelBubble' in e)
              e.cancelBubble = true;
            return false;
          }
          break;          
      }
      return true;
    }

    toggleToolbar() {
      this.toolbarExpanded(this.toolbarExpanded() ? false : true);
    }

    loadText() {
      this._load(
        (fileReader, file) => fileReader.readAsText(file),
        (data, docState) => docState.setProperty(null, data));
    }

    loadBase64() {
      this._load(
        (fileReader, file) => fileReader.readAsArrayBuffer(file),
        (data, docState) => {
          var binary: string[] = [];
          var bytes = new Uint8Array(data);
          var len = bytes.byteLength;
          for (var i = 0; i < len; i++) {
            binary.push(String.fromCharCode(bytes[i]));
          }
          var text = window.btoa(binary.join(''));
          
          docState.setProperty(null, text);
        });
    }

    private _load(requestLoad: (fileReader: FileReader, file: File) => void, applyData: (data, docState: DocumentState) => void) {

      this.toolbarExpanded(false);

      var input = document.createElement('input');
      input.type = 'file';

      input.onchange = () => {
        if (!input.files || !input.files.length) return;

        var fileReader = new FileReader();
        fileReader.onerror = (error) => {
          alert('read ' + error.message);
        };
        fileReader.onloadend = () => {
          if (fileReader.readyState !== 2) {
            alert('read ' + fileReader.readyState + fileReader.error);
            return;
          }

          try {

            var filename = prompt(
              'Suggested filename:',
              input.files[0].name);

            if (!filename)
              return;

            var fileEntry = this.fileList.createFileEntry(filename);
            var docStorage = this._storage.createDocument(fileEntry.fullPath());

            applyData(fileReader.result, docStorage);

          }
          catch (error) {
            alert('parsing ' + error.message + ' ' + error.stack);
          }
        };

        requestLoad(fileReader, input.files[0]);
      };
      
      input.click();

    }


    /**
     * Prompts user for a name, creates a new file and opens it in the editor.
     * Exposed as a button bound using Knockout.
     */
    newFileClick() {

      this.toolbarExpanded(false);

      var fileName = prompt('New file');
      if (!fileName)
        return;

      var fileEntry = this.fileList.createFileEntry(fileName);
      this._storage.createDocument(fileEntry.fullPath());

      // expand to newly created
      var folder = fileEntry.parent();
      while (folder) {
        folder.isExpanded(true);
        folder = folder.parent();
      }

      fileEntry.handleClick();
    }

    /**
     * Pops a confirmation dialog up, then deletes the currently selected file.
     * Exposed as a button bound using Knockout.
     */
    deleteSelectedFile() {

      this.toolbarExpanded(false);

      var selectedFileEntry = this.fileList.selectedFile();
      if (!selectedFileEntry) return;

      if (!confirm('Are you sure deleting '+selectedFileEntry.name()))
        return;

      this._storage.removeDocument(selectedFileEntry.fullPath());
      this.fileList.removeFileEntry(selectedFileEntry.fullPath());

      if (this._editorHost) {
        this._editorHost.innerHTML = '';
      }
    }

    /**
     * Suggested name for file save operation.
     */
    saveFileName() {
      var urlParts = window.location.pathname.split('/');
      var currentFileName = decodeURI(urlParts[urlParts.length-1]);
      var lastDot = currentFileName.indexOf('.');
      if (lastDot > 0) {
        currentFileName = currentFileName.slice(0, lastDot) + '.html';
      }
      else {
        currentFileName += '.html';
      }
      return currentFileName;
    }

    /**
     * Triggers a download of the whole current HTML, which contains the filesystem state and all the necessary code.
     * Relies on blob URLs, doesn't work in old browsers.
     * Exposed as a button bound using Knockout.
     */
    saveHtml() {

      this.toolbarExpanded(false);

      var filename = this.saveFileName();
      var blob = new Blob(['<!doctype html>\n', document.documentElement.outerHTML], {type: 'application/octet-stream'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', filename);
      try {
        // safer save method, supposed to work with FireFox
        var evt = document.createEvent("MouseEvents");
        (<any>evt).initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        a.dispatchEvent(evt);
      }
      catch (e) {
        a.click();
      }
    }

    /**
     * Packs the current filesystem content in a zip, then triggers a download.
      * Relies on blob URLs and Zip.js, doesn't work in old browsers.
     * Exposed as a button bound using Knockout.
     */
    saveZip() {

      this.toolbarExpanded(false);

      zip.useWebWorkers = false;
      var filename = this.saveFileName();
      if (filename.length>'.html'.length && filename.slice(filename.length-'.html'.length).toLowerCase()==='.html')
        filename = filename.slice(0,filename.length-'.html'.length);
      else if (filename.length>'.htm'.length && filename.slice(filename.length-'.htm'.length).toLowerCase()==='.htm')
        filename = filename.slice(0,filename.length-'.htm'.length);
      filename+='.zip';

      var blobWriter = new zip.BlobWriter();
      zip.createWriter(blobWriter, (zipWriter) => {

        var files = this._storage.documentNames();
        var completedCount = 0;

        var zipwritingCompleted = () => {
          zipWriter.close((blob) => {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.setAttribute('download', filename);
            a.click();
          });
        };

        var continueWriter = () => {
          if (completedCount===files.length) {
            zipwritingCompleted();
            return;
          }

          var docState = this._storage.getDocument(files[completedCount]);
          var content = docState.getProperty(null);

          var zipRelativePath = files[completedCount].slice(1);

          zipWriter.add(zipRelativePath, new zip.TextReader(content), () => {
            completedCount++;

            setTimeout(continueWriter, 1);
          });
        };

        continueWriter();
      });
    }

    /**
     * Invoked from the Knockout/view side to pass the editor host DIV
     * to ApplicationShell.
     */
    attachToHost(editorHost: HTMLElement) {
      this._editorHost = editorHost;
      if (this._editorElement) {
        this._editorHost.innerHTML = '';
        this._editorHost.appendChild(this._editorElement);
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

        if (oldEditorElement && this._editorHost) {
          this._editorHost.removeChild(oldEditorElement);
        }

        this._editorHost.innerHTML = ''; // removing the initial startup decoration

        if (newEditorElement && this._editorHost)
          this._editorHost.appendChild(newEditorElement);
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