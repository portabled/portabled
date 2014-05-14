module teapo.storage.attached.dom {

  export class DetectStorage implements teapo.storage.attached.DetectStorage {

    constructor(
      private _parent: HTMLElement,
      private _document: { createElement(tag: string): HTMLElement; } = document) { 
    }

    detectStorageAsync(uniqueKey: string, callback: (error: Error, load: LoadStorage) => void) {

      if (!this._parent) {
        callback(new Error('Parent DOM element is null.'), null);
        return;
      }

      if (!this._document) {
        callback(new Error('Expected non-null document argument.'), null);
        return;
      }

      var load = new LoadStorage(this._parent, this._document);
      callback(null, load);
    }

  }
}