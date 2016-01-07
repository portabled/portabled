module shell.actions {

  export function copy(drive: persistence.Drive, selectedPath: string, targetPanelPath: string) {
    return copyOrMove(false /*move*/, drive, selectedPath, targetPanelPath);
  }

}