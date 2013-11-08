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

    constructor(
      public name: string, public parent: teapo.Folder) {
      
      this.fullPath = (parent ? parent.fullPath : '/') + name;
      this.mode = detectDocumentMode(this.fullPath);
      this.doc = new CodeMirror.Doc('', this.mode);
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

      folder.containsActiveDocument(newMark);

      if (!currentMark && !newMark)
        return; // silence makes no echo

      var files = folder.files();
      for (var i = 0; i < files.length; i++) {
        if (files[i]!==activeDocument)
          files[i].unselect();
      }

      if (newMark) {
        if (folder.onselectFile)
          folder.onselectFile(this);
      }
      else {
        if (folder.onunselectFile)
          folder.onunselectFile();
      }

      var folders = folder.folders();
      for (var i = 0; i < folders.length; i++) {
        var f = folders[i];
        if (f===activeSubfolder)
          continue; // already been processed

        this._normalizeActiveDocumentMarks(folder, null, null);
      }

      if (folder.parent && newMark)
        this._normalizeActiveDocumentMarks(folder.parent, folder, null);
    }
  }
}