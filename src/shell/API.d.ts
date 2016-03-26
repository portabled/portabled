declare namespace shell {

  export interface ShellHost {

    document: Document;
    onresize?(metrics: { });
    setTitle(title: string);

    fs: ShellHost.FS;

  }

  export namespace ShellHost {

    export interface FS {
      readdir(path: string, callback: (error, files: string[]) => void);
    }

  }


}