class MountedDrive implements persistence.Drive {

  updateTime = true;
  timestamp: number = 0;

  private _cachedFiles: string[] = null;

  constructor (private _dom: persistence.Drive.Detached.DOMDrive, private _shadow: persistence.Drive.Shadow) {
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

  storedSize(file: string): number {
    return this._dom.storedSize(file);
  }

  write(file: string, content: string) {
    if (this.updateTime)
      this.timestamp = +new Date();

    this._cachedFiles = null;

    this._dom.timestamp = this.timestamp;

    var encoded = bestEncode(content);

    this._dom.write(file, encoded.content, encoded.encoding);

    if (this._shadow) {
      this._shadow.timestamp = this.timestamp;
      this._shadow.write(file, encoded.content, encoded.encoding);
    }
  }
}
