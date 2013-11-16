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

    private _htmlStore = new teapo.ScriptElementStore();
    private _lsStore: teapo.LocalStorageStore = null;
    private _changedFilesToSave: any = {};
    private _fileChangeTimeout: number = null;

    constructor (private _document = document) {
      this._lsStore = new teapo.LocalStorageStore(this._htmlStore);

      var staticScripts = {};
      var htmlStaticScriptNames = this._htmlStore.staticDocumentNames();
      for (var i = 0; i<htmlStaticScriptNames.length; i++) {
        staticScripts[htmlStaticScriptNames[i]] = this._htmlStore.readStaticDocument(htmlStaticScriptNames[i]);
      }

      this._typescript = new teapo.TypeScriptService(staticScripts);

      var fileList = this._lsStore.documentNames();
      for (var i = 0; i < fileList.length; i++) {
          var doc = this._lsStore.loadDocument(fileList[i]);
          if (!doc)
            doc = this._htmlStore.loadDocument(fileList[i]);
          this._addDocument(fileList[i], doc.history, doc.content);
      }

      this.root.onselectFile = (f) => this._selectFile(f);
			this.root.ondeleteFile = (f) => this._deleteFile(f);

      this._tsMode = new teapo.TypeScriptDocumentMode(this._typescript.service);
    }

		newFile() {
			var newPath = prompt('Full path:');
			if (!newPath)
				return;
			var f = this.root.getDocument(newPath);
			this._fileChange(f.fullPath, f.doc);
			this._selectFile(f);
		}

		deleteActiveFile() {
			if (!confirm('Are you sure to delete '+this.activeDocument().fullPath+' ?'))
				return;
			this.root.removeDocument(this.activeDocument().fullPath);
			this.activeDocument(null);
			// TODO: propagate no-active-document state to all the folders down
			// TODO: remove from TypeScript too
		}

		private _addDocument(file: string, history: string, content: string) {
			var f = this.root.getDocument(file);
			f.doc.setValue(content);
			if (history) {
				try {
					var h = JSON.parse(history);
					f.doc.setHistory(h);
				}
				catch (e) { }
			}
			this._typescript.addDocument(file, f.doc);

			CodeMirror.on(f.doc, 'change', (instance, change) => {
				this._fileChange(file, f.doc);
			});
		}

		private _fileChange(file: string, doc: CodeMirror.Doc) {
			this._changedFilesToSave[file] = doc;
			if (this._fileChangeTimeout)
				clearTimeout(this._fileChangeTimeout);
			this._fileChangeTimeout = setTimeout(() => this._saveChangedFiles(), 600);
		}

		private _saveChangedFiles() {
			for (var f in this._changedFilesToSave) if (this._changedFilesToSave.hasOwnProperty(f)) {
				var doc = <CodeMirror.Doc>this._changedFilesToSave[f];
				var hi = doc.getHistory();
				var hiStr = JSON.stringify(hi);
				var contentStr = doc.getValue();
				this._htmlStore.saveDocument(f, hiStr, contentStr);
				this._lsStore.saveDocument(f, hiStr, contentStr);
			}
			this._changedFilesToSave = {};
		}

    private _selectFile(file: teapo.Document) {
      this.activeDocument(file);

      this._editor.swapDoc(file.doc);
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
        styleActiveLine: true
      });
    }
  }

}