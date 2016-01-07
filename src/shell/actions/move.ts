module shell.actions {

  export function move(drive: persistence.Drive, selectedPath: string, targetPanelPath: string) {
    return copyOrMove(true /*move*/, drive, selectedPath, targetPanelPath);
  }

}