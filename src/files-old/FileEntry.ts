module teapo {

  /**
   * File entry in file list or tree.
   */
  export interface FileEntry {

    fullPath(): string;
    name(): string;
    parent(): FolderEntry;

    nestLevel(): number;

    isSelected: ko.Observable<boolean>;

    handleClick(): void;
  }

}