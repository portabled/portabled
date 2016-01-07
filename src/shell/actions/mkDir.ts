module shell.actions {

  export function mkDir(drive: persistence.Drive, selectedPath: string, targetPanelPath: string) {
    var dir = prompt('Make directory: ');
    if (!dir || dir === '/') return false;

    var dirPath = dir;
    if (dir.slice(0, 1) !== '/') {
      dirPath = selectedPath + '/' + dirPath;
      if (dirPath.slice(0, 2) === '//') dirPath = dirPath.slice(1);
    }

    if (dirPath.slice(-1) === '/')
      dirPath = dirPath.slice(0, dirPath.length - 1);

    var matchFiles = getDirFiles(drive, dirPath);
    if (matchFiles.length) return;

    drive.write(dirPath + '/', '');
    return true;
  }

}