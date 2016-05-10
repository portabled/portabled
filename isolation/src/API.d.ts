declare namespace isolation {

	export class Context {
      constructor(window: Window);
      runWrapped(code: string, path: string, scope: any): any;
      runWith(code: string, path: string, scope: any): any;
      dispose(): void;
  }

  export type Process = any;
  export type Module = any;
  export type Global = any;

  export class HostedProcess {

    process: Process;
    mainModule: Module;
    global: Global;
    coreModules: { fs: any; path: any; os: any; events: any; http: any; child_process: any; };

    exitCode: number;
    finished: boolean;

    cwd: string;
    argv: string[];
    env: any;
    console: any;

    enhanceChildProcess: (proc: HostedProcess) => void;
    ondispose: () => void;

    constructor(
      scriptPath: string,
      drive: persistence.Drive,
      window: Window);

    eval(code: string, useWith?: boolean): any;

    resolve(id: string, modulePath: string): string;

    requireModule(moduleName: string, parentModulePath: string, parentModule: Module): any;

    filesChanged(files: string[]): void;

    dispose(): void;

    keepAlive(): () => void;

  }

}
