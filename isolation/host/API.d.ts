declare namespace isolation {

  /**
   * Full of debug and rich integration features
   */
  export interface IsolatedProcess {
    type: 'iframe'|'worker-sync'|'worker-async';
    remoteEval(fnScript: string, arg: any, path: string, callback: (error: Error, result) => any);
    pushMessage(msg: any);
    terminate();
    onerror: (error: Error) => void;
    onmessage: (msg: any, syncReply: boolean, callback: (error: Error, response?: any) => void) => void;
    onconsole: (level: string, args: any[]) => void;
    serializeError(err: Error): any;
  }

  export interface LoadedApiProcess extends IsolatedProcess {
    runGlobal(script: string, path: string, callback: (error: Error, result: any) => void);
    keepAlive(): () => void;
    ondispose: () => void;
    exitCode: number;
  }

  export function createIsolateHost(drive: persistence.Drive, callback: (hst: IsolatedProcess) => void): void;
  export function createApiHost(drive: persistence.Drive, options: any, callback: (api?: LoadedApiProcess) => void);

  export namespace createIsolateHost {
    export var iframe: typeof createIsolateHost;
    export var worker: typeof createIsolateHost;
  }

  export namespace createApiHost {
    export var iframe: typeof createApiHost;
    export var worker: typeof createApiHost;
  }

  export var build: any;
}