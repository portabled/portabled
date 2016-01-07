module shell.actions {

  export function remove(drive: persistence.Drive, selectedPath: string, targetPanelPath: string) {
    var filesToRemove: string[] = getDirFiles(drive, selectedPath);

    if (!confirm('Remove ' + filesToRemove.length + ' files from\n   "' + selectedPath + '"?')) return false;

    for (var i = 0; i < filesToRemove.length; i++) {
      drive.write(filesToRemove[i], null);
    }

    return true;
  }

}