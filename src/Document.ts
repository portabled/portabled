/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/codemirror.d.ts' />

/// <reference path='Folder.ts' />
/// <reference path='modes.ts' />

module teapo {
  export class Document {

    fullPath: string = null;
    mode: string = null;

    active = ko.observable(false);

    onselect: () => void = null;
    onunselect: () => void = null;

    private _doc: CodeMirror.Doc = null;
    private _onchangeHandlers: Function[] = [];

    constructor(
      public name: string, public parent: teapo.Folder) {
      
      this.fullPath = (parent ? parent.fullPath : '/') + name;
      this.mode = detectDocumentMode(this.fullPath);
      this._doc = new CodeMirror.Doc('', this.mode);
    }

    populate(doc: DocumentStoreEntry) {
      this._doc.setValue(doc.content);
      if (doc.history) {
          try {
              var h = JSON.parse(doc.history);
              this._doc.setHistory(h);
          }
          catch (e) { }
      }
      if (doc.cursor) {
        try {
          var pos = this._doc.posFromIndex(doc.cursor);
          this._doc.setCursor(pos);
        }
        catch (e) { }
      }
    }

    getDoc(): CodeMirror.Doc {
      return this._doc;
    }

    onchange(f: Function) {
      this._onchangeHandlers.push(f);
    }

    select(self,e) {
      if (e) {
        e.handled = true;
        if (e.preventDefault)
          e.preventDefault();
      }

      this.active(true);
      if (this.parent) this._setContainsActiveDocument(this.parent, null);

      if (this.onselect)
        this.onselect();
    }

    delete() {
		  var p = this.parent;
			while (p) {
				if (p.ondeleteFile)
					p.ondeleteFile(this);
				p = p.parent;
			}
		}

    unselect() {
      this.active(false);

      if (this.onunselect)
        this.onunselect();
    }

    private _setContainsActiveDocument(
      folder: teapo.Folder,
      activeSubfolder: teapo.Folder)
    {
      var currentMark = folder.containsActiveDocument();
      folder.containsActiveDocument(true);
      if (folder.onselectFile)
        folder.onselectFile(this);

      var files = folder.files();
      for (var i = 0; i < files.length; i++) {
        if (files[i]!==this && files[i].active())
          files[i].unselect();
      }

      var folders = folder.folders();
      for (var i = 0; i < folders.length; i++) {
        if (folders[i]!==activeSubfolder && folders[i].containsActiveDocument()) {
          this._resetContainsActiveDocument(folders[i]);
        }
      }

      if (folder.parent)
        this._setContainsActiveDocument(folder.parent, folder);
    }

    private _resetContainsActiveDocument(
      folder: teapo.Folder) {
      folder.containsActiveDocument(false);
      if (folder.onunselectFile)
        folder.onunselectFile();

      var files = folder.files();
      for (var i = 0; i < files.length; i++) {
        if (files[i].active())
          files[i].unselect();
      }

      var folders = folder.folders();
      for (var i = 0; i < folders.length; i++) {
        if (folders[i].containsActiveDocument()) {
          this._resetContainsActiveDocument(folders[i]);
        }
      }
    }
  }
}