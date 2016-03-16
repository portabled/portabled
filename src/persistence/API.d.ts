declare namespace persistence {

  export interface Drive {

    timestamp: number;

    files(): string[];

    read(file: string): string;

    write(file: string, content: string);

    storedSize?(file: string): number;

  }

  export module Drive {

    export interface Shadow {

      timestamp: number;

      write(file: string, content: string): void;

      forget(file: string): void;

    }

    export interface Optional {

      name: string;

      detect(uniqueKey: string, callback: (error: string, detached: Detached) => void): void;

    }

    export interface Detached {

      timestamp: number;
      totalSize?: number;

      applyTo(mainDrive: Detached.DOMUpdater, callback: Detached.CallbackWithShadow): void;

      purge(callback: Detached.CallbackWithShadow): void;

    }

    export module Detached {
      export interface CallbackWithShadow {
        (loaded: Shadow): void;
        progress?: (current: number, total: number) => void;
      }

    export interface DOMUpdater {

      timestamp: number;

      write(file: string, content: string): void;

    }

    }

  }

  // export function trackChanges(drive: Drive): { drive: Drive; onchanges: (changedFiles: string[]) => void; };

}