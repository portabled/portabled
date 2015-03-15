module portabled.nodeAPI.modules.fs {

  export class fsModule {

    constructor(private _drive: persistence.Drive) {
    }

    rename: (oldPath: string, newPath: string, callback: (error: Error) => void) => void;
    renameSync(oldPath: string, newPath: string) {
      var content = this._drive.read(oldPath);
      if (content === null) throw new Error('File cannot be found.');

      this._drive.timestamp = dateNow();
      this._drive.write(newPath, content);
      this._drive.write(oldPath, null);
    }

  	ftruncate: (fd: any, len: number, callback: (error: Error) => void) => void;
  	ftruncateSync(fd: any, len: number) {
      var content = this._drive.read(fd);
      if (content === null) throw new Error('File cannot be found.');

      this._drive.timestamp = dateNow();
      this._drive.write(fd, content.slice(0, len));
    }
  }

}