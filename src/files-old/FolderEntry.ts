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

}