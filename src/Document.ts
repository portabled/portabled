/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/codemirror.d.ts' />

/// <reference path='Folder.ts' />
/// <reference path='modes.ts' />

module teapo {
  export class Document {

    fullPath: string;
    doc: CodeMirror.Doc;

    active = ko.observable(false);

    onselect: () => void = null;
    onunselect: () => void = null;

    constructor(
      public name: string, public parent: teapo.Folder) {
      
      this.fullPath = (parent ? parent.fullPath : '/') + name;
      this.doc = new CodeMirror.Doc('', detectDocumentMode(this.fullPath));
    }

    select() {
      this.active(true);
      if (this.parent) this._normalizeActiveDocumentMarks(this.parent, null, this);

      if (this.onselect)
        this.onselect();
    }

    unselect() {
      this.active(false);

      if (this.onunselect)
        this.onunselect();
    }

    private _normalizeActiveDocumentMarks(
      folder: teapo.Folder,
      activeSubfolder: teapo.Folder,
      activeDocument: teapo.Document) {

      var newMark = activeSubfolder || activeDocument ? true : false;
      var currentMark = folder.containsActiveDocument();

      if (!currentMark && !newMark)
        return; // silence makes no echo

      if (currentMark != newMark) {
        folder.containsActiveDocument(newMark);
        if (newMark && folder.onselect)
          folder.onselect(this);
        else if (!newMark && folder.onunselect)
          folder.onunselect();
      }

      var files = folder.files();
      for (var i = 0; i < files.length; i++) {
        if (files[i]!==activeDocument)
          files[i].unselect();
      }

      var folders = folder.folders();
      for (var i = 0; i < folders.length; i++) {
        var f = folders[i];
        if (f===activeSubfolder)
          continue;
        this._normalizeActiveDocumentMarks(folder, null, null);
      }

      if (folder.parent && newMark)
        this._normalizeActiveDocumentMarks(folder.parent, folder, null);
    }
  }
}