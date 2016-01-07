declare namespace shell.handlers {

  export interface Handler {
    preferredFiles?: RegExp;
    handlesFiles?: RegExp;

    entryClass?: string | ((path: string) => string);
    exec?(file: string, drive: persistence.Drive, callback: Function): boolean;
    edit?(file: string, drive: persistence.Drive, editorHost: HTMLElement): Handler.Editor;
  }

  export namespace Handler {

    export interface Editor {
      update?();
      measure?();
      arrange?(metrics: CommanderShell.Metrics);
      close?();
      handleKeydown?(e: KeyboardEvent): boolean;
      requestClose?: () => void;
      getPosition?(): any;
      setPosition(pos: any);
    }

  }

}