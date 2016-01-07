module shell.actions {

  export function copyOrMove(move: boolean, drive: persistence.Drive, cursorPath: string, targetPanelPath: string) {
    if (!cursorPath || !targetPanelPath || cursorPath === '/') return false;

    var filesToCopy: string[] = getDirFiles(drive, cursorPath);

    // TODO: pop up a confirmation and pop up a progress dialog -- as DOM elements
    var targetDir = prompt(
      (move ? 'Move/rename ' : 'Copy ') +
      (filesToCopy.length === 1 ? '\n   "'+filesToCopy[0]+'"' : filesToCopy.length + ' files from\n   "' + cursorPath + '"') +
      '\n   to', targetPanelPath);
    if (!targetDir) return false;

    var normTargetDir = targetDir;
    if (normTargetDir.charAt(0) !== '/')
      normTargetDir = cursorPath.slice(0, cursorPath.lastIndexOf('/') + 1) + normTargetDir;

    var targetDirFiles = getDirFiles(drive, normTargetDir);

    if (filesToCopy.length === 1 && filesToCopy[0] === cursorPath
      && ((targetDirFiles.length ===1 && targetDirFiles[0] === normTargetDir)
          || (!targetDirFiles.length && targetDir.slice(-1) !== '/'))) {

      var content = drive.read(filesToCopy[0]);
      drive.write(normTargetDir, content);

      if (move)
        drive.write(filesToCopy[0], null);
    }
    else {
      if (normTargetDir.slice(-1) !== '/') normTargetDir += '/';
      var baseDir = cursorPath.slice(0, cursorPath.lastIndexOf('/') + 1);

      for (var i = 0; i < filesToCopy.length; i++) {
        var content = drive.read(filesToCopy[i]);
        var newPath =
          normTargetDir +
          filesToCopy[i].slice(baseDir.length);
        drive.write(newPath, content);
        if (move)
          drive.write(filesToCopy[i], null);
      }
    }

    return true;
  }

}