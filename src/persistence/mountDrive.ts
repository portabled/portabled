module portabled.persistence {
  
  export function mountDrive(
    dom: Drive,
    uniqueKey: string,
    domTimestamp: number,
    optionalModules: { [moduleName: string]: Drive.Optional; },
    callback: mountDrive.Callback): void {

    var driveIndex = 0;

    var optional: Drive.Optional[] = [];
    if (optionalModules) {
      for (var moduleName in optionalModules) if (optionalModules.hasOwnProperty(moduleName)) {
        var moduleObj = optionalModules[moduleName];
        if (moduleObj && moduleObj.detect && typeof moduleObj.detect === 'function')
          optional.push(moduleObj);
      }
    }

    loadNextOptional();

    function loadNextOptional() {
      if (driveIndex >= optional.length) {
        callback(new MountedDrive(dom, null));
        return;
      }

      var op = optional[driveIndex];
      op.detect(
        uniqueKey,
        detached => {
          if (!detached) {
            driveIndex++;
            loadNextOptional();
            return;
          }

          if (detached.timestamp > domTimestamp) {
            var callbackWithShadow: Drive.Detached.CallbackWithShadow = loadedDrive => {
              dom.timestamp = detached.timestamp;
              callback(new MountedDrive(dom, loadedDrive));
            };
            if (callback.progress)
              callbackWithShadow.progress = callback.progress;
            detached.applyTo(dom, callbackWithShadow);
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
    }

  }
  
  export module mountDrive {
    
    export interface Callback {

      (drive: Drive): void;

      progress?: (current: number, total: number) => void;

    }
    
  }
  
  class MountedDrive implements Drive {

    timestamp: number = 0;

    constructor (private _dom: Drive, private _shadow: Drive.Shadow) {
      this.timestamp = this._dom.timestamp;
    }
    
    files(): string[] {
      return this._dom.files();
    }

    read(file: string): string {
      return this._dom.read(file);
    }

    write(file: string, content: string) {
      this._dom.timestamp = this.timestamp;
      this._dom.write(file, content);
      if (this._shadow) {
        this._shadow.timestamp = this.timestamp;
        this._shadow.write(file, content);
      }
    }
  }
  
}