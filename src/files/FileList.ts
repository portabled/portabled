module teapo.files {

  /**
   * Whole file tree ViewModel for Knockout.js.
   */
  export class FileList {

    /** Immediate children of the root folder. */
    folders = ko.observableArray<FolderEntry>([]);

    /** Files in the root folder. */
    files = ko.observableArray<FileEntry>([]);

    /** Selected FileEntry (null if nothing is selected). */
    selectedFile = ko.observable<FileEntry>(null);

    private _fileByPath: { [path: string]: FileEntry; } = {};

    constructor(
      files?: string[],
      private _attachFileEntry?: (fileEntry: FileEntry) => void,
      private _detachFileEntry?: (fileEntry: FileEntry) => void) {
      if (files) {
        for (var i = 0; i < files.length; i++) {
          this.file(files[i]);
        }
      }
    }

    /** Get or create file entry for a path. Creating FileEntry doesn't affect actual stored files, that is managed elsewhere. */
    file(path: string): FileEntry {

      var entry = this._fileByPath[path];
      if (entry) return entry;

      var pathParts: string[] = normalizePath(path);
      if (!pathParts.length) return null;

      var folder: FolderEntry;
      for (var i = 0; i < pathParts.length - 1; i++) {
        folder = this._addOrGetFolderEntry(pathParts[i], folder);
      }

      entry = this._addFileEntry(pathParts[pathParts.length - 1], folder);

      this._fileByPath[entry.path] = entry;

      return entry;
    }

    private _addOrGetFolderEntry(name: string, parent: FolderEntry) {
      var folders = parent ? parent.folders : this.folders;
      var result = find(
        folders(),
        (f, index) => {
          if (f.name < name) return;
          if (f.name === name) return f;
          var result = this._createFolderEntry(parent, name);
          folders.splice(index, 0, result);
          return result;
        });
      if (!result) {
        result = this._createFolderEntry(parent, name);
        folders.push(result);
      }
      return result;
    }

    private _addFileEntry(name: string, parent: FolderEntry) {
      var siblings = parent ? parent.files : this.files;

      var result = find(
        siblings(),
        (f, index) => {
          if (f.name < name) return;
          if (f.name === name) return f;
          var result = this._createChildFileEntry(parent, name);
          siblings.splice(index, 0, result);
          return result;
        });

      if (!result) {
        result = this._createChildFileEntry(parent, name);
        siblings.push(result);
      }

      return result;
    }

    private _createFolderEntry(parent: FolderEntry, name: string) {
      var f = new FolderEntry(parent, name);
      return f;
    }

    private _createChildFileEntry(parent: FolderEntry, name: string) {
      var f = new FileEntry(parent, name);
      if (this._attachFileEntry)
        this._attachFileEntry(f);
      return f;
    }

  }

}