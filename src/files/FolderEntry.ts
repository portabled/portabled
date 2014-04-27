module teapo.files {

  /**
   * Node in the project tree widget representing a folder as a ViewModel for Knockout.js.
   * Note that root folder is not represented a a folder.
   */
  export class FolderEntry {

    /** List of subfolders in this folder. */
    folders = ko.observableArray<FolderEntry>([]);
    
    /** List of files in this folder (not including files in subfolders). */
    files = ko.observableArray<FileEntry>([]);

    /** Expand state for tree node, preserved even if parent folder is being collapsed. */
    isExpanded = ko.observable(false);
    
    /** Whether selected file is in this folder. Meant to be read-only from KO. */
    containsSelection = ko.observable(false);

    /** Full path to the folder including both leading and trailing slash (see also name property for just name). Path is normalized before assigned. */
    path: string;

    /** Color is computed from the name hash. Meant to assign shades of color pseudo-randomly to improve visual navigation. */
    color = '';

    constructor(
      public parent: FolderEntry,
      public name) {
      this.path = parent ? (parent.path + name + '/') : ('/' + name + '/');
      this.color = FolderEntry.calculateColor(this.name);
    }

    /** Function used to calculate pseudo-random color. Exposed for easier testing. */
    static calculateColor(name: string) {
      var chan: number[] = [1, 1, 1];

      var dist = 29;
      if (name) {
        for (var i = 0; i < name.length; i++) {
          var ch = i % 3;
          var v = name.charCodeAt(i) % dist;
          var range = 1 / Math.floor(1 + i / 3);
          var chValue = v * range / dist;
          chan[i] -= chValue;
        }
      }


      var delta = 37;
      var r = chan[0], g = chan[1], b = chan[2];
      r = 255 - delta + delta * r;
      g = 255 - delta + delta * g;
      b = 255 - delta + delta * b;
      var color =
        (r << 16) +
        (g << 8) +
        b;
      color = color | 0x1000000;

      var colorText = '#' + color.toString(16).slice(1);
      return colorText;
    }

  }

}