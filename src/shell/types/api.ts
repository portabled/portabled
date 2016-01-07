namespace shell.types {

  export interface FileTypeModule {

    intendedFiles?: string | RegExp;
    acceptedFiles?: string | RegExp;

    env?: FileTypeModuleEnvironment;

    init?(): void;

    load(file: string): FileEntryHandler;

  }

  export interface FileTypeModuleEnvironment {
    drive: persistence.Drive;
    onwrite?: (files: string[]) => void;
  }

  export interface FileEntryHandler {

    entryClassName?: string;
    edit?(host: HTMLElement): { close(): void; };

  }

}