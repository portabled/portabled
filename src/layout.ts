/// <reference path='styles.ts' />

class Layout {
  private _editorHost = this._document.createElement('div');
  private _fileListHost = this._document.createElement('div');
  constructor(private _host: HTMLElement, private _document: HTMLDocument = document) {

    this._fileListHost.textContent = 'OK';
    this._editorHost.textContent = ' [edit] ';

    Layout.clearContent(this._host);

    this._host.appendChild(this._fileListHost);
    this._host.appendChild(this._editorHost);
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
