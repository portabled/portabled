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

    constructor (private _document = document) {

      var staticScripts = {};
      var htmlStaticScriptNames = this._htmlStore.staticDocumentNames();
      for (var i = 0; i<htmlStaticScriptNames.length; i++) {
        staticScripts[htmlStaticScriptNames[i]] = this._htmlStore.readStaticDocument(htmlStaticScriptNames[i]);
      }

      var htmlChangeDate = this._htmlStore.changeDate();
      

      for (var i = 0; i < document.scripts.length; i++) {
        var s = <any>document.scripts[i];
        var tsAdd: teapo.Document[] = [];
        if (s.id && s.id[0]==='/') {
          var f = this.root.getDocument(s.id);
          f.doc.setValue(s.innerHTML);
          if (s.title) {
            // TODO: restore history too
          }
          tsAdd.push(f);
        }
        else if (s.id && s.id[0]==='#') {
          staticScripts[s.id] = s.innerHTML;
        }
      }

      this.root.onselectFile = (f) => this.selectFile(f);
      this._typescript = new teapo.TypeScriptService(staticScripts);
      for (var i = 0; i < tsAdd.length; i++) {
        this._typescript.addDocument(tsAdd[i].fullPath, tsAdd[i].doc);
      }

      this._tsMode = new teapo.TypeScriptDocumentMode(this._typescript.service);
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