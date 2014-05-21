module teapo.storage.attached.dom {

  export class UpdateStorage {

    constructor(
      private _parentElement: HTMLElement,
      private _byName: { [fullPath: string]: HTMLElement; },
      private _document: { createElement(tag: string): HTMLElement; }) {
    }

    update(file: string, property: string, value: string, callback?: (error: Error) => void): void {

      var element = this._getExistingElement(file);

      if (!element) {
        element = UpdateStorage.createElement(this._parentElement, file, this._document);
        this._parentElement.setAttribute('data-teapo-file-count', <any>this._parentElement.children.length);
        this._byName[file] = element;
      }

      UpdateStorage.updateProperty(element, property, value);

      this._parentElement.setAttribute('data-edited-utc', dateNow() + '');

      callback(null);
    }

    remove(file: string, callback?: (error: Error) => void): void {

      var element = this._getExistingElement(file);
      if (!element) {
        callback(new Error('file does not exist.'));
        return;
      }

      element.parentElement.removeChild(element);
      delete this._byName[file];

      this._parentElement.setAttribute('data-edited-utc', dateNow() + '');

      callback(null);
    }

    static createElement(parentElement: HTMLElement, fullPath: string, _document: { createElement(tag: string): HTMLElement; }): HTMLElement {
      var element = _document.createElement('div');
      element.setAttribute('data-teapo-path', fullPath);
      parentElement.appendChild(element);
      return element;
    }

    static updateProperty(element: HTMLElement, property: string, value: string): void {
      element.setAttribute('data-meta-' + encodeForAttributeName(property), value);
    }

    private _getExistingElement(fullPath): HTMLElement {
      var element = this._byName.hasOwnProperty(fullPath) ? this._byName[fullPath] : null;
      return element;
    }

  }

}