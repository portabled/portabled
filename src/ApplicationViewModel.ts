/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/codemirror.d.ts' />

/// <reference path='TypeScriptService.ts' />
/// <reference path='Document.ts' />
/// <reference path='Folder.ts' />
/// <reference path='DocumentPersistence.ts' />
/// <reference path='modes.ts' />

module teapo {

  export class ApplicationViewModel {

    activeDocument = ko.observable<Document>();
    root = new Folder(null,null);

    private _typescript: teapo.TypeScriptService = null;
    private _editor: CodeMirror.Editor = null;
    private _textarea: HTMLTextAreaElement = null;
    private _tsMode: teapo.TypeScriptDocumentMode = null;
    private _disposeMode: { dispose(): void; } = null;

    private _store: teapo.LocalStorageStore = null;
    private _changedFilesToSave: { [name: string]: teapo.Document; } = {};
    private _fileChangeTimeout: number = null;

    constructor (private _document = document) {
      var htmlStore = new teapo.ScriptElementStore();

      this._store = new teapo.LocalStorageStore(htmlStore);

      var staticScripts = {};
      var htmlStaticScriptNames = htmlStore.staticDocumentNames();
      for (var i = 0; i<htmlStaticScriptNames.length; i++) {
        staticScripts[htmlStaticScriptNames[i]] = htmlStore.readStaticDocument(htmlStaticScriptNames[i]);
      }

      this._typescript = new teapo.TypeScriptService(staticScripts);

      var fileList = this._store.documentNames();
      for (var i = 0; i < fileList.length; i++) {
          var doc = this._store.loadDocument(fileList[i]);
          this._addDocument(fileList[i], doc);
      }

      this.root.onselectFile = (f) => this._selectFile(f);
      this.root.ondeleteFile = (f) => this._deleteFile(f);

      this._tsMode = new teapo.TypeScriptDocumentMode(this._typescript.service);
      var activeFilePath = this._store.getActiveDocument();
      if (activeFilePath) {
        var activeDoc = this.root.getDocument(activeFilePath);
        this.activeDocument(activeDoc);
      }
    }

    newFile() {
      var newPath = prompt('Full path:');
      if (!newPath)
          return;
      var f = this.root.getDocument(newPath);
      this._fileChange(f);
      f.select(null,null);
    }

    deleteActiveFile() {
      var path = this.activeDocument().fullPath;
      if (!confirm('Are you sure to delete '+this.activeDocument().fullPath+' ?'))
        return;

      this.root.removeDocument(path);
      this._store.deleteDocument(path);
      this.activeDocument(null);
      this._typescript.removeDocument(path);
      // TODO: propagate no-active-document state to all the folders down
    }

    private _addDocument(file: string, doc: DocumentStoreEntry) {
      var f = this.root.getDocument(file);
      if (doc)
        f.populate(doc);

      this._typescript.addDocument(f);

      CodeMirror.on(f.getDoc(), 'change', (instance, change) => {
        this._fileChange(f);
      });
      CodeMirror.on(f.getDoc(), 'cursorActivity', (instance) => {
        this._cursorChange(f);
      });
    }

    private _fileChange(d: teapo.Document) {
        this._changedFilesToSave[d.fullPath] = d;
        if (this._fileChangeTimeout)
            clearTimeout(this._fileChangeTimeout);
        this._fileChangeTimeout = setTimeout(() => this._saveChangedFiles(), 600);
    }

    private _cursorChange(d: teapo.Document) {
      var doc = d.getDoc();
      var cursorPos = doc.getCursor();
      var cursorOffset = doc.indexFromPos(cursorPos);
      this._store.saveDocument(d.fullPath, { cursor: cursorOffset });
    }

    private _saveChangedFiles() {
        for (var f in this._changedFilesToSave) if (this._changedFilesToSave.hasOwnProperty(f)) {
            var d = this._changedFilesToSave[f];
            var doc = d.getDoc(); 
            var hi = doc.getHistory();
            var hiStr = JSON.stringify(hi);
            var contentStr = doc.getValue();
            this._store.saveDocument(f, { history: hiStr, content: contentStr });
        }
        this._changedFilesToSave = {};
    }

    private _selectFile(file: teapo.Document) {
      this.activeDocument(file);
      this._store.setActiveDocument(file.fullPath);
      this._selectFileCore(file);
    }

    private _selectFileCore(file: teapo.Document) {
      this._editor.setOption('readOnly', false);
      this._editor.swapDoc(file.getDoc());
      this._editor.focus();

      if (this._disposeMode) {
          this._disposeMode.dispose();
          this._disposeMode = null;
      }
      if (detectDocumentMode(file.fullPath)==='text/typescript') {
        this._disposeMode = this._tsMode.activateEditor(this._editor, file.fullPath);
      }
    }

    private _deleteFile(file: teapo.Document) {
    }

    attachTextarea(textarea: HTMLTextAreaElement) {
      this._textarea = textarea;
      this._editor = CodeMirror.fromTextArea(textarea, {
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        matchTags: true,
        showTrailingSpace: true,
        autoCloseTags: true,
        styleActiveLine: true,
        readOnly: 'nocursor'
      });
      var activeDoc = this.activeDocument();
      if (activeDoc) {
        activeDoc.select(null,null);
      }
    }
  }

}