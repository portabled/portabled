/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/codemirror.d.ts' />

/// <reference path='Folder.ts' />
/// <reference path='modes.ts' />

module teapo {
  export class Document {

    fullPath: string = null;
    doc: CodeMirror.Doc = null;
    mode: string = null;

    active = ko.observable(false);

    onselect: () => void = null;
    onunselect: () => void = null;

    private _persistElement: HTMLScriptElement = null;

    constructor(
      public name: string, public parent: teapo.Folder) {
      
      this.fullPath = (parent ? parent.fullPath : '/') + name;
      this.mode = detectDocumentMode(this.fullPath);
      this.doc = new CodeMirror.Doc('', this.mode);
    }

    select() {
      this.active(true);
      if (this.parent) this._setContainsActiveDocument(this.parent, null);

      if (this.onselect)
        this.onselect();
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