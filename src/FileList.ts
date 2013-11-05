/// <reference path='typings/knockout.d.ts' />

module teapo {

  export class File {
    fullPath: string;
    constructor(public parent: Folder, public name: string) {
      var lead = this.parent ? this.parent.fullPath : null;
      this.fullPath = (lead ? lead : '') +'/'+this.name;
    }
  }

  export class Folder extends teapo.File {
    folders = ko.observableArray<Folder>();
    files = ko.observableArray<File>();

    constructor(parent: Folder, name: string) {
      super(parent, name);
      if (!name)
        this.fullPath = null;
    }

    addFile(path: string) {
      if (!path) return;
      var norm = this._normalizePath(path);
      if (norm.subfolder) {
        var index = this._indexOfFile(this.folders(), norm.subfolder);
        var subfolder = this.folders()[index];
        if (!subfolder || subfolder.name!==norm.subfolder) {
          subfolder = new Folder(this, norm.subfolder);
          this.folders.splice(index, 0, subfolder);
        }
        return subfolder.addFile(norm.path);
      }
      else {
        var index = this._indexOfFile(this.files(), norm.path);
        var file = this.files()[index];
        if (!file || file.name!==norm.path) {
          file = new File(this, norm.path);
          this.files.splice(index, 0, file);
        }
        return file;
      }
    }

    removeFile(path: string) {
      if (!path) return;
      var norm = this._normalizePath(path);
      if (norm.subfolder) {
        var index = this._indexOfFile(this.folders(), norm.subfolder);
        var subfolder = this.folders()[index];
        if (!subfolder || subfolder.name!==norm.subfolder)
          return null;
        else
          return subfolder.removeFile(norm.path);
      }
      else {
        var index = this._indexOfFile(this.files(), norm.path);
        var file = this.files()[index];
        if (!file || file.name!==norm.path)
          return null;
        this.files.splice(index,1);
        return file;
      }
    }

    private _normalizePath(path: string): { subfolder: string; path: string; } {
      var result = this._normalizePathCore(path);
      console.log('normalizePath(',path,') = ',result);
      return result;
    }

    private _normalizePathCore(path: string): { subfolder: string; path: string; } {
      while (path[0]==='/')
        path = path.slice(1);
      while (path[path.length-1]==='/')
        path = path.slice(0,path.length-1);
      var slashPos = path.indexOf('/');
      if (slashPos<0)
        return {subfolder:null, path:path};
      else
        return {subfolder:path.slice(0,slashPos), path:path.slice(slashPos+1)};
    }

    private _indexOfFile(list: File[], name: string) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].name>=name)
          return i;
      }
      return list.length;
    }
  }
}