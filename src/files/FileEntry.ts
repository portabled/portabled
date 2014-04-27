module teapo.files {

  /**
   * Node in the project tree widget representing a file as a ViewModel for Knockout.js.
   */
  export class FileEntry {

    /** Full path to the file (see also name property for just name). Path is normalized before assigned. */
    path: string;

    /** Meant as read-only for KO bindings. Modified internally, when clicking handlers are processed.. */
    isSelected = ko.observable(false);

    /** Meant as read-only for KO bindings. Modified by DocumentHandler for this file. */
    iconClass = ko.observable('teapo-default-file-icon');

    constructor(
      /** May be null for a file in the root directory. */
      public parent: FolderEntry,
      /** Simple name (without path but with fot-extension if any). See also path for full path. */
      public name: string) {
      this.path = parent ? (parent.path + name) : ('/' + name);
    }

  }

}