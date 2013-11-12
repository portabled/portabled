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

    private _htmlStore = new teapo.ScriptElementStore();
    private _lsStore = new teapo.LocalStorageStore();
		private _changedFilesToSave: any = {};
		private _fileChangeTimeout: number = null;

    constructor (private _document = document) {

      var staticScripts = {};
      var htmlStaticScriptNames = this._htmlStore.staticDocumentNames();
      for (var i = 0; i<htmlStaticScriptNames.length; i++) {
        staticScripts[htmlStaticScriptNames[i]] = this._htmlStore.readStaticDocument(htmlStaticScriptNames[i]);
      }

      this._typescript = new teapo.TypeScriptService(staticScripts);

			var htmlChangeDate = this._htmlStore.changeDate();
      var lsChangeDate = this._lsStore.changeDate();
      if (lsChangeDate
        && (!htmlChangeDate || (htmlChangeDate.getTime()<=lsChangeDate.getTime()))) {
        // use localStorage for the list of files,
        // and revert to htmlStorage in case lsStore fails to retrive the document
        // (we only stick stuff into lsStore when it's modified)
        var fileList = this._lsStore.documentNames();
        for (var i = 0; i < fileList.length; i++) {
        	var doc = this._lsStore.loadDocument(fileList[i]);
					if (!doc)
						doc = this._htmlStore.loadDocument(fileList[i]);
					this._addDocument(fileList[i], doc.history, doc.content);
        }
      }
			else {
				var fileList = this._htmlStore.documentNames();
				for (var i = 0; i < fileList.length; i++) {
        	var doc = this._htmlStore.loadDocument(fileList[i]);
					this._addDocument(fileList[i], doc.history, doc.content);
        }
			}

      this.root.onselectFile = (f) => this.selectFile(f);

      this._tsMode = new teapo.TypeScriptDocumentMode(this._typescript.service);
    }

		private _addDocument(file: string, history: string, content: string) {
			var f = this.root.getDocument(file);
			f.doc.setValue(content);
			if (history) {
				try {
					var h = JSON.parse(content);
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
		}

    selectFile(file: teapo.Document) {
      this.activeDocument(file);

      this._editor.swapDoc(file.doc);
      this._editor.focus();

      this._tsMode.activateEditor(this._editor, file.fullPath);
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