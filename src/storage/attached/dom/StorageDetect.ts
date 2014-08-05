module teapo.storage.attached.dom {

  export class StorageDetect {
    
    constructor(
      private _parent: HTMLElement,
      private _document: { createElement(tag: string): HTMLElement; } = document) {
    }

    detect(
      uniqueKey: string,
      callback: (
      error: Error,
      metadata: storage.attached.StorageDetect.BootState,
      access: StorageAccess) => void): void {

      var editedUTC: number = 0;

      var editedUTCValue = this._parent.getAttribute('data-edited-utc');
      if (editedUTCValue) {
        try { editedUTC = parseInt(editedUTCValue); }
        catch (parseEditedUTCError) { }
      }

      var dodgyElements: HTMLElement[] = [];
      var elementMap: { [fullPath: string]: HTMLElement; } = {};
      var files: string[] = [];
      for (var i = 0; i < this._parent.children.length; i++) {
        var element = <HTMLElement>this._parent.children.item(i);
        var fullPath = this._getFullPath(element);
        if (!fullPath || elementMap.hasOwnProperty(fullPath)) {
          dodgyElements.push(element);
        }
        else {
          elementMap[fullPath] = element;
          files.push(fullPath);
        }
      }

      for (var i = 0; i < dodgyElements.length; i++) {
        this._parent.removeChild(dodgyElements[i]);
      }

      var access = new StorageAccess(this._parent, elementMap, this._document);

      callback(null, {
        editedUTC: editedUTC,
        files: files
      }, access);
    }

    private _getFullPath(element: HTMLElement): string {

      if (!element.getAttribute) {
        return null;
      }

      var fullPath = element.getAttribute('data-teapo-path');
      return fullPath;
    }

  }
  
}