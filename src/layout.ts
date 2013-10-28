/// <reference path='Split3.ts' />

class Layout {
  private _editorHost = this._document.createElement('div');
  private _fileListHost = this._document.createElement('div');

  private _split: Split3;

  constructor(private _host: HTMLElement, private _document: HTMLDocument = document) {

    this._fileListHost.textContent = 'OK';
    this._editorHost.textContent = ' [edit] ';
    var divHost = document.createElement('div');
    divHost.appendChild(this._fileListHost);
    divHost.appendChild(this._editorHost);
    this._split = new Split3(divHost);
    

    Layout.clearContent(this._host);

    this._host.appendChild(divHost);
  }

  static clearContent(element: HTMLElement) {
    if ('innerHTML' in element)
      element.innerHTML = '';
    else if ('textContent' in element)
      element.textContent = '';
    else {
      // TODO: think of something else...
    }
  }
}
