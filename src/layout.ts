class Layout {
  private _fileListDiv = this._document.createElement('div');
  constructor(private _host: HTMLElement, private _document: HTMLDocument) {
    this._host.appendChild(this._fileListDiv);
  }
}