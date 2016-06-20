namespace actions {

  export interface ActionContext {
    drive: persistence.Drive;
    fs: FS;
    path: Path;
    cursorPath: string;
    currentPanelPath: string;
    targetPanelPath: string;
    dialogHost: DialogHost;
    selectFile(file: string);
    files: FileList;
    selected: string[];
  }

}