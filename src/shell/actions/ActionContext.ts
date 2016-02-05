namespace shell.actions {

  export interface ActionContext {
    drive: persistence.Drive;
    cursorPath: string;
    currentPanelPath: string;
    targetPanelPath: string;
    dialogHost: DialogHost;
    repl: noapi.HostedProcess;
    selectFile(file: string);
  }

}