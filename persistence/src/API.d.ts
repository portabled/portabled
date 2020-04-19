declare function persistence(
	document: Document,
  uniqueKey: string,
  optionalDrives?: persistence.Drive.Optional[]): persistence.BootState;

declare namespace persistence {

  var build: {
    timestamp: number;
    taken: number;
    platform: string;
  };

  namespace encodings { }
  var bestEncode: (content: any, escapePath?: boolean) => { content: string; encoding: string; } ;

  interface BootState {

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
    continueLoading(): void;
    finishParsing(completion: (drive: Drive.Detached.DOMDrive) => void): void;
  }

  function formatTotalsInner(timestamp: number, totalSize: number): string;
  function formatFileInner(path: string, content: any): string;
  function formatSize(totalSize: number): string;
  function formatDate(date: Date): string;

	function parseTotalsInner(content: string): { timestamp: number; totalSize: number; };
	function parseFileInner(content: string): { path: string; read(): string; };
	function parseHTML(html: string): { files: { path: string; content: string; start: number; end: number; }[]; totals: {size?: number; timestamp?: number; start: number; end: number;}; };



  interface Drive {

    timestamp: number;

    files(): string[];

    read(file: string): string | null;

    write(file: string, content: string): void;

    storedSize?(file: string): number | null;

  }

  namespace Drive {

    interface Shadow {

      timestamp?: number;

      write(file: string, content: string | null, encoding?: string): void;

      forget(file: string): void;

    }

    interface Optional {

      name: string;

      detect(uniqueKey: string, callback: (error: string, detached: Detached) => void): void;

    }

    interface Detached {

      timestamp?: number;
      totalSize?: number;

      applyTo(mainDrive: Detached.DOMUpdater, callback: Detached.CallbackWithShadow): void;

      purge(callback: Detached.CallbackWithShadow): void;

    }

    namespace Detached {

      interface CallbackWithShadow {
        (loaded: Shadow): void;
        progress?: (current: number, total: number) => void;
      }

      interface DOMUpdater {

        timestamp?: number;

        write(file: string, content: string | null, encoding?: string): void;

      }

      interface DOMDrive extends Drive {
        write(file: string, content: string | null, encoding?: string): void;
      }

    }

  }

  // export function trackChanges(drive: Drive): { drive: Drive; onchanges: (changedFiles: string[]) => void; };

}