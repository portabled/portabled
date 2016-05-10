namespace actions {

  export interface ActionContext {
    drive: persistence.Drive;
    fs: any;
    cursorPath: string;
    currentPanelPath: string;
    targetPanelPath: string;
    dialogHost: DialogHost;
    repl: isolation.HostedProcess;
    selectFile(file: string);
    files: FileList;
    selected: string[];
  }

}