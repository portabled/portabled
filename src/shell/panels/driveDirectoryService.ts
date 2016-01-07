module shell.panels {

  export function driveDirectoryService(drive: persistence.Drive) {

    return path => {
      var pathPrefix = path === '/' ? path : path + '/';
      var result: Panel.DirectoryEntry[] = [];
      var resByName: { [name: string]: Panel.DirectoryEntry; } = {};
      var files = drive.files();
      for (var i = 0; i < files.length; i++) {
        var fi = files[i];
        if (fi.length < pathPrefix.length + 1) continue;

        if (fi.slice(0, pathPrefix.length) !== pathPrefix) continue;

        var name: string;
        var entryPath = fi;
        var isDirectory = false;
        var nextSlashPos = fi.indexOf('/', pathPrefix.length);
        if (nextSlashPos < 0) {
          name = fi.slice(pathPrefix.length);
        }
        else {
          name = fi.slice(pathPrefix.length, nextSlashPos);
          entryPath = fi.slice(0, nextSlashPos);
          isDirectory = true;
        }

        if (resByName.hasOwnProperty(name)) continue;
        var entry = { path: entryPath, name, flags: isDirectory ? Panel.EntryFlags.Directory : 0 };
        result.push(entry);
        resByName[name] = entry;
      }
      return result;
    };

  }

}