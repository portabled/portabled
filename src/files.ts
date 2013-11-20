/// <reference path='typings/knockout.d.ts' />
/// <reference path='persistence.ts' />

module teapo {

  /**
   * File list or tree ViewModel.
   */
  export class FileList {

    selectedFile = ko.observable<FileEntry>(null);

    constructor(private _storage: DocumentStorage) {
      var fileNames = this._storage.documentNames();
      for (var i = 0; i < fileNames.length; i++) {
        
      }
    }
  }

  /**
   * Folder entry in file list or tree.
   */
  export interface FolderEntry {

    fullName(): string;
    name(): string;

    folders: KnockoutObservable<FolderEntry>;
    files: KnockoutObservable<FileEntry>;

    handleClick(): void;
  }

  /**
   * File entry in file list or tree.
   */
  export interface FileEntry {

    fullName(): string;
    name(): string;

    isSelected: KnockoutObservable<boolean>;

    handleClick(): void;
  }
}