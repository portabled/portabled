namespace shell.actions {

  export interface ActionContext {
    drive: persistence.Drive;
    fs: noapi.FS;
    cursorPath: string;
    currentPanelPath: string;
    targetPanelPath: string;
    dialogHost: DialogHost;
    repl: noapi.HostedProcess;
    selectFile(file: string);
    files: FileList;
    selected: string[];
  }

}