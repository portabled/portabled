module teapo {

  /**
   * Folder entry in file list or tree.
   */
  export interface FolderEntry {

    fullPath(): string;
    name(): string;
    parent(): FolderEntry;

    nestLevel(): number;

    isExpanded: ko.Observable<boolean>;

    folders: ko.ObservableArray<FolderEntry>;
    files: ko.ObservableArray<FileEntry>;

    containsSelectedFile: ko.Observable<boolean>;

    handleClick(): void;
    toggleExpand(): void;
  }

}