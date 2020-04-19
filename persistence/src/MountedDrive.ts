class MountedDrive implements persistence.Drive {

  updateTime = true;
  timestamp: number = 0;

  private _cachedFiles: string[] | null = null;

  constructor (private _dom: persistence.Drive.Detached.DOMDrive, private _shadow: persistence.Drive.Shadow | null) {
    this.timestamp = this._dom.timestamp;
  }

  files(): string[] {
    if (!this._cachedFiles)
      this._cachedFiles = this._dom.files();

    return this._cachedFiles.slice(0);
  }

  read(file: string): string | null {
    return this._dom.read(file);
  }

  storedSize(file: string): number | null {
    if (typeof this._dom.storedSize === 'function')
      return this._dom.storedSize(file);
    else
      return null;
  }

  write(file: string, content: string) {
    if (this.updateTime)
      this.timestamp = +new Date();

    this._cachedFiles = null;

    this._dom.timestamp = this.timestamp;

    const encoded = typeof content === 'undefined' || content === null ? null : bestEncode(content);

    if (encoded)
      this._dom.write(file, encoded.content, encoded.encoding);
    else
      this._dom.write(file, null);

    if (this._shadow) {
      this._shadow.timestamp = this.timestamp;
      if (encoded)
        this._shadow.write(file, encoded.content, encoded.encoding);
      else
        this._shadow.write(file, null);
    }
  }
}
