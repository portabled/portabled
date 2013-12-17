/// <reference path='typings/knockout.d.ts' />
/// <reference path='persistence.ts' />

module teapo {

  /**
   * Folder entry in file list or tree.
   */
  export interface FolderEntry {

    fullPath(): string;
    name(): string;
    parent(): FolderEntry;

    nestLevel(): number;

    isExpanded: KnockoutObservable<boolean>;

    folders: KnockoutObservableArray<FolderEntry>;
    files: KnockoutObservableArray<FileEntry>;

    containsSelectedFile: KnockoutObservable<boolean>;

    handleClick(): void;
    toggleExpand(): void;
  }

  /**
   * File entry in file list or tree.
   */
  export interface FileEntry {

    fullPath(): string;
    name(): string;
    parent(): FolderEntry;

    nestLevel(): number;

    isSelected: KnockoutObservable<boolean>;

    handleClick(): void;
  }

  /**
   * File list/tree ViewModel.
   */
  export class FileList {

    /**
     * Top level folders.
     */
    folders = ko.observableArray<FolderEntry>();

    /**
     * Files directly in the root folder.
     */
    files = ko.observableArray<FileEntry>();

    /**
     * Currently selected file. Should not be modified externally.
     */
    selectedFile = ko.observable<FileEntry>(null);

    private _filesByFullPath: { [fullPath: string]: FileEntry; } = {};

    constructor(private _storage: DocumentStorage) {
      var fileNames = this._storage.documentNames();
      for (var i = 0; i < fileNames.length; i++) {

        if (fileNames[i].charAt(0)!=='/')
          continue; // ignore hidden files

        this._addFileEntry(fileNames[i]);
      }
    }

    /**
     * Find a file from its path.
     */
    getFileEntry(fullPath: string): FileEntry {
      if (fullPath.charAt(0)!=='/')
        return null; // ignore hidden files

      return this._filesByFullPath[fullPath];
    }

    /**
     * Create a file entry (throwing an exception if one already exists).
     * Note that only the list/tree structures are created,
     * not touching editor nor persistence part of cocerns.
     */
    createFileEntry(fullPath: string): FileEntry {
      return this._addFileEntry(fullPath);
    }

    /**
     * Deletes a file entry (returning deleted entry or null if none exists).
     * Note that only the list/tree structures are deleted,
     * not touching editor nor persistence part of concerns.
     */
    removeFileEntry(fullPath: string): FileEntry {
      var fileEntry = this.getFileEntry(fullPath);
      if (!fileEntry) return null;

      if (fileEntry.parent()) {
        var wasSelected = fileEntry.isSelected();

        var fo = fileEntry.parent();
        fo.files.remove(fileEntry);

        while (fo.parent()) {
          var pa = fo.parent();
          fo.containsSelectedFile(false);
          fo = pa;
        }

        fo.containsSelectedFile(false);
      }
      else {
        this.files.remove(fileEntry);
      }

      this.selectedFile(null);
    }



    private _addFileEntry(fullPath: string) {
      var pathParts = normalizePath(fullPath);
      if (pathParts.length===0)
        return; // empty path - noop

      var parent: RuntimeFolderEntry = null;
      var folders = this.folders;
      var files = this.files;

      for (var i = 0; i < pathParts.length-1; i++) {
        var folder = this._insertOrLookupFolder(parent, folders, pathParts, i);

        folders = folder.folders;
        files = folder.files;
        parent = folder;
      }

      var fileName = pathParts[pathParts.length-1];

      var fileArray = files();
      var fileIndex = insertionIndexOfEntry(fileArray, fileName);
      var file = <RuntimeFileEntry>fileArray[fileIndex];

      if (file && file.name()===fileName)
        throw new Error('File already exists: '+file.fullPath()+'.');

      var fullPath = '/'+pathParts.join('/');
      file = new RuntimeFileEntry(
        fullPath,
        fileName,
        parent,
        this,
        () => this._handleFileClick(file));

      files.splice(fileIndex, 0, file);
      this._filesByFullPath[fullPath] = file;

      return file;
    }

    private _insertOrLookupFolder(
      parent: RuntimeFolderEntry,
      folders: KnockoutObservableArray<FolderEntry>,
      pathParts: string[],
      i: number): RuntimeFolderEntry {
      var folderName = pathParts[i];

      var folderArray = folders();
      var folderIndex = insertionIndexOfEntry(folderArray, folderName);
      var folder = <RuntimeFolderEntry>folderArray[folderIndex];

      if (!folder || folder.name()!==folderName) {
        var folderPath = '/'+pathParts.slice(0,i+1).join('/');
        folder = new RuntimeFolderEntry(
          folderPath,
          folderName,
          parent,
          this,
          () => this._handleFolderClick(folder));
        folders.splice(folderIndex, 0, folder);
      }

      return folder;
    }

    private _handleFolderClick(folder: RuntimeFolderEntry) {
    }

    private _handleFileClick(file: RuntimeFileEntry) {
      if (this.selectedFile()===file)
        return;

      this._updateSelectionProperties(file);
    }

    private _updateSelectionProperties(newSelectedFile: RuntimeFileEntry) {

      var selectFolders: { [fullPath: string]: FolderEntry; } = {};
      if (newSelectedFile) {
        var f = newSelectedFile.parent();
        while (f) {
          selectFolders[f.fullPath()] = f;
          if (!f.containsSelectedFile())
            f.containsSelectedFile(true);
          f = f.parent();
        }
        newSelectedFile.isSelected(true);
      }

      if (this.selectedFile()) {
        var f = this.selectedFile().parent();
        while (f) {
          if (!selectFolders[f.fullPath()] && f.containsSelectedFile())
            f.containsSelectedFile(false);
          f = f.parent();
        }
        this.selectedFile().isSelected(false);
      }

      this.selectedFile(newSelectedFile);
    }
  }



  class RuntimeFolderEntry implements teapo.FolderEntry {

    isExpanded = ko.observable(false);
    folders = ko.observableArray<teapo.FolderEntry>();
    files = ko.observableArray<teapo.FileEntry>();
    containsSelectedFile = ko.observable<boolean>(false);

    constructor(
      private _fullPath: string,
      private _name: string,
      private _parent: FolderEntry,
      private _owner: FileList,
      private _handleClick: () => void) {
      //
    }

    fullPath(): string { return this._fullPath; }
    name(): string { return this._name; }
    parent(): FolderEntry { return this._parent; }

    nestLevel(): number {
      return this._parent ? this._parent.nestLevel()+1 : 0;
    }

    handleClick(): void {
      this._handleClick();
    }

    toggleExpand() {
      this.isExpanded(this.isExpanded() ? false : true);
    }
 }

  class RuntimeFileEntry implements teapo.FileEntry {

    isSelected = ko.observable<boolean>(false);

    constructor(
      private _fullPath: string,
      private _name: string,
      private _parent: FolderEntry,
      private _owner: FileList,
      private _handleClick: () => void) {
      //
    }

    fullPath(): string { return this._fullPath; }
    name(): string { return this._name; }
    parent(): FolderEntry { return this._parent; }

    nestLevel(): number {
      return this._parent ? this._parent.nestLevel()+1 : 0;
    }

    handleClick(): void {
      this._handleClick();
    }
  }

  function insertionIndexOfEntry(entries: { name(): string; }[], name: string): number {
    for (var i = 0; i < entries.length; i++) {
      var entryName = entries[i].name();
      if (entryName >= name)
        return i;
    }
    return entries.length;
  }

  /**
   * Convert string path into an array of path parts,
   * processing '..' as necessary.
   */
  function normalizePath(path: string): string[] {
    if (!path) return [];

    var pathMid = stripOuterSlashes(path);
    var split = pathMid.split('/');

    var result: string[] = [];
    for (var i = 0; i < split.length; i++) {
      if (split[i]==='..') {
        if (result.length)
          result.length--;
        continue;
      }
      else if (split[i]==='.' || split[i]==='') {
        continue;
      }
      else {
        result.push(split[i]);
      }
    }
    return result;
  }

  function stripOuterSlashes(path: string) {
    var start = 0;
    while (path.charAt(start)==='/')
      start ++;

    var end = Math.max(start, path.length-1);
    while (end>start && path.charAt(end)==='/')
      end--;

    var pathMid = start===0 && end===path.length-1 ? path : path.slice(start,end+1);
    return pathMid;
  }
}
