declare function persistence(
	document: Document,
  uniqueKey: string,
  optionalDrives?: persistence.Drive.Optional[]): persistence.BootState;

declare namespace persistence {

  export var build: {
    timestamp: number;
    taken: number;
    platform: string;
  };

  export interface BootState {

    domTimestamp: number;
    domTotalSize: number;
    domLoadedSize: number;
    loadedFileCount: number;
    storageName: string;
    storageTimestamp: number;
    storageLoadFailures: { [storage: string]: string; };

    newDOMFiles: string[];
    newStorageFiles: string[];

		read(path: string): any;
    continueLoading();
    finishParsing(completion: (drive: persistence.Drive) => void);
  }

  export function formatTotalsInner(timestamp: number, totalSize: number): string;
  export function formatFileInner(path: string, content: any): string;
  export function formatSize(totalSize: number): string;
  export function formatDate(date: Date): string;

	export function parseTotalsInner(content: string): { timestamp: number; totalSize: number; };
	export function parseFileInner(content: string): { path: string; read(): string; };
	export function parseHTML(html: string): { files: { path: string; content: string; }[]; totalSize?: number; timestamp?: number; };



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