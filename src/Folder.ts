/// <reference path='typings/knockout.d.ts' />

/// <reference path='Document.ts' />

module teapo {
  export class Folder {
    fullPath: string; // never changes
    nestLevel: number; // never changes

    folders = ko.observableArray<teapo.Folder>();
    files = ko.observableArray<teapo.Document>();

    expanded = ko.observable(true);
    containsActiveDocument = ko.observable(false);

    onselectFile: (doc: teapo.Document) => void = null;
    onunselectFile: () => void = null;

    constructor(public name: string, public parent: teapo.Folder) {
      this.fullPath = (parent ? parent.fullPath : '/') + (name ? name+'/':'/');
      this.nestLevel = parent ? parent.nestLevel + 1 : 0;
    }

    getDocument(path: string): teapo.Document {
      if (!path) return null;

      var parts = this._normalizePath(path);
      if (parts.lead) {
        var index = this._indexOfEntry(this.folders(), parts.lead);
        var subfolder = this.folders()[index];
        if (!subfolder || subfolder.name!==parts.lead) {
          subfolder = new teapo.Folder(parts.lead, this);
          this.folders.splice(index, 0, subfolder);
        }
        return subfolder.getDocument(parts.tail);
      }
      else {
        var index = this._indexOfEntry(this.folders(), parts.tail);
        var folderInTheWay = this.folders()[index];
        if (folderInTheWay && folderInTheWay.name===parts.tail)
          throw new Error('Cannot retrieve file "'+path+'", "'+folderInTheWay.name+'" in the way.');
        
        var index = this._indexOfEntry(this.files(), parts.tail);
        var file = this.files()[index];
        if (!file || file.name!==parts.tail) {
          file = new teapo.Document(parts.tail, this);
          this.files.splice(index, 0, file);
        }
        return file;
      }
    }

    getFolder(path: string): teapo.Folder {
      if (!path) return null;

      var parts = this._normalizePath(path);

      var subfolderName = parts.lead || parts.tail;
      var index = this._indexOfEntry(this.folders(), subfolderName);
      var subfolder = this.folders()[index];
      if (!subfolder || subfolder.name!==subfolderName) {
        subfolder = new teapo.Folder(subfolderName, this);
        this.folders.splice(index, 0, subfolder);
      }

      if (parts.lead)
        return subfolder.getFolder(parts.tail);
      else
        return subfolder;
    }

    removeDocument(path: string): teapo.Document {
      if (!path) return null;

      var parts = this._normalizePath(path);
      if (parts.lead) {
        var index = this._indexOfEntry(this.folders(), parts.lead);
        var subfolder = this.folders()[index];
        if (!subfolder || subfolder.name!==parts.lead)
          return null; // parent folder up in the path does not exist
      }
      else {
        var index = this._indexOfEntry(this.files(), parts.tail);
        var file = this.files()[index];
        if (!file || file.name!==parts.tail)
          return null; // file with that name does not exist

        this.files.splice(index,1);
        file.parent = null;

        return file;
      }
    }

    removeFolder(path: string): teapo.Folder {
      if (!path) return null;

      var parts = this._normalizePath(path);

      var subfolderName = parts.lead || parts.tail;
      var index = this._indexOfEntry(this.folders(), subfolderName);
      var subfolder = this.folders()[index];
      if (!subfolder || subfolder.name!==subfolderName)
        return null; // folder with that name does not exist

      if (parts.lead)
        return subfolder.removeFolder(parts.tail);

      this.folders.splice(index,1);
      subfolder.parent = null;
      return subfolder;
    }

    private _normalizePath(path: string): { lead: string; tail: string; } {
      while (path[0]==='/')
        path = path.slice(1);
      while (path[path.length-1]==='/')
        path = path.slice(0,path.length-1);
      var slashPos = path.indexOf('/');
      if (slashPos<0)
        return {lead:null, tail:path};
      else
        return {lead:path.slice(0,slashPos), tail:path.slice(slashPos+1)};
    }

    private _indexOfEntry(list: {name:string;}[], name: string) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].name>=name)
          return i;
      }
      return list.length;
    }
  }
}