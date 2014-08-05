module teapo.storage.attached.dom {

  export class DetectStorage implements teapo.storage.attached.DetectStorage {

    constructor(
      private _parent: HTMLElement,
      private _document: { createElement(tag: string): HTMLElement; } = document) { 
    }

    detectStorageAsync(uniqueKey: string, callback: (error: Error, load: LoadStorage) => void) {

      try {
        var load = this.detectStorageSync();
        callback(null, load);
      }
      catch (error) {
        callback(error, null);
      }
    }
  
    detectStorageSync() {

      if (!this._parent)
        throw new Error('Parent DOM element is null.');

      if (!this._document)
        throw new Error('Expected non-null document argument.');

      var load = new LoadStorage(this._parent, this._document);
      return load;
    }

  }
}