declare namespace isolation {

  /**
   * Full of debug and rich integration features
   */
  interface IsolatedProcess {
    type: 'iframe'|'worker-sync'|'worker-async';
    remoteEval(fnScript: string, arg: any, path: string, callback: (error: Error, result) => any);
    pushMessage(msg: any);
    terminate();

    onerror: (error: Error) => void;
    onmessage: (msg: any, syncReply: boolean, callback: (error: Error, response?: any) => void) => void;
    onconsole: (level: string, args: any[]) => void;
  }

  interface LoadedApiProcess extends IsolatedProcess {
    runGlobal(script: string, path: string, callback: (error: Error, result: any) => void);
    keepAlive(): () => void;

    onchildprocess(opts: any, child_process: any, continueWithProcess: (error?: Error) => void): void;
    ondispose: () => void;
    exitCode: number;
  }

  function createIsolateHost(drive: persistence.Drive, callback: (hst: IsolatedProcess) => void): void;
  function createApiHost(drive: persistence.Drive, options: any, callback: (api?: LoadedApiProcess) => void);

  export namespace createIsolateHost {
    var iframe: typeof createIsolateHost;
    var worker: typeof createIsolateHost;
  }

  export namespace createApiHost {
    var iframe: typeof createApiHost;
    var worker: typeof createApiHost;
  }

  export var build: any;
}