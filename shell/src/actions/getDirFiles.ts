namespace actions {

  export function getDirFiles(drive: persistence.Drive, path: string): string[] {
    var fileResult: string[] = [];
    var allFiles = drive.files();
    if (path==='/') return allFiles;
    for (var i = 0; i < allFiles.length; i++) {
      var f = allFiles[i];
      if (f.slice(0, path.length) !== path) continue;
      if (f === path || f.slice(path.length, path.length + 1) === '/')
        fileResult.push(f);
    }
    return fileResult;
  }
}