module persistence {

  export function mountDrive(
    loadDOMDrive: (callback: (dom: Drive) => void)=> void,
    uniqueKey: string,
    optionalModules: Drive.Optional[],
    callback: mountDrive.Callback): void {

    var driveIndex = 0;

    loadNextOptional();

    function loadNextOptional() {

      while (driveIndex < optionalModules.length &&
        (!optionalModules[driveIndex] || typeof optionalModules[driveIndex].detect !== 'function')) {
        driveIndex++;
      }

      if (driveIndex >= optionalModules.length) {
        loadDOMDrive(dom => callback(new MountedDrive(dom, null)));
        return;
      }

      var op = optionalModules[driveIndex];
      op.detect(
        uniqueKey,
        detached => {
          if (!detached) {
            driveIndex++;
            loadNextOptional();
            return;
          }

          loadDOMDrive(dom => {
            if (detached.timestamp > dom.timestamp) {
              var callbackWithShadow: Drive.Detached.CallbackWithShadow = loadedDrive => {
                dom.timestamp = detached.timestamp;
                callback(new MountedDrive(dom, loadedDrive));
              };
              if (callback.progress)
                callbackWithShadow.progress = callback.progress;
              loadDOMDrive(dom => detached.applyTo(dom, callbackWithShadow));
            }
            else {
              var callbackWithShadow: Drive.Detached.CallbackWithShadow = loadedDrive => {
                callback(new MountedDrive(dom, loadedDrive));
              };
              if (callback.progress)
                callbackWithShadow.progress = callback.progress;
              detached.purge(callbackWithShadow);
            }
          });

        });
    }

  }

  export module mountDrive {

    export interface Callback {

      (drive: Drive): void;

      progress?: (current: number, total: number) => void;

    }

  }

  class MountedDrive implements Drive {

    updateTime = true;
    timestamp: number = 0;

    private _cachedFiles: string[] = null;

    constructor (private _dom: Drive, private _shadow: Drive.Shadow) {
      this.timestamp = this._dom.timestamp;
    }

    files(): string[] {
      if (!this._cachedFiles)
        this._cachedFiles = this._dom.files();

      return this._cachedFiles.slice(0);
    }

    read(file: string): string {
      return this._dom.read(file);
    }

    write(file: string, content: string) {
      if (this.updateTime)
        this.timestamp = +new Date();

      this._cachedFiles = null;

      this._dom.timestamp = this.timestamp;
      this._dom.write(file, content);
      if (this._shadow) {
        this._shadow.timestamp = this.timestamp;
        this._shadow.write(file, content);
      }
    }
  }

}