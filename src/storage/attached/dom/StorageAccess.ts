module teapo.storage.attached.dom {

  export class StorageAccess implements attached.StorageAccess {

    constructor(
      private _parentElement: HTMLElement,
      private _byName: { [fullPath: string]: HTMLElement; },
      private _document: { createElement(tag: string): HTMLElement; }) {
    }

    update(
      byFullPath: PropertiesByFullPath,
      timestamp: number,
      callback: (error: Error) => void): void {

      for (var fullPath in byFullPath) if (byFullPath.hasOwnProperty(fullPath)) {
        var updateProperties = byFullPath[fullPath];
        var element = this._getExistingElement(fullPath);

        if (updateProperties===null) {
          if (element) {
            this._parentElement.removeChild(element);
          }
        }
        else {
          if (!element) {
            element = StorageAccess.createElement(this._parentElement, fullPath, this._document);
            this._byName[fullPath] = element;
          }
          for (var p in updateProperties) if (updateProperties.hasOwnProperty(p)) {
            var v = updateProperties[p];
            var attrName = 'tp-' + encodeForAttributeName(p);
            if (v === null)
              element.removeAttribute(attrName);
            else
              element.setAttribute(attrName, v);
          }
        }
      }

      this._parentElement.setAttribute('data-teapo-file-count', <any>this._parentElement.children.length);
      this._parentElement.setAttribute('data-edited-utc', <any>timestamp);

      callback(null);
    }

    read(
      fullPaths: string[],
      callback: (error: Error, byFullPath: PropertiesByFullPath) => void): void {
      var byFullPath: PropertiesByFullPath = {};
      if (fullPaths === null || typeof fullPaths === 'undefined') {
        for (var fullPath in this._byName) if (this._byName.hasOwnProperty(fullPath)) {
          var element = this._getExistingElement(fullPaths[i]);
          var propBag = this._readFileProperties(element);
          byFullPath[fullPaths[i]] = propBag;
        }
      }
      else {
        for (var i = 0; i < fullPaths.length; i++) {
          var element = this._getExistingElement(fullPaths[i]);
          var propBag = element ? this._readFileProperties(element) : null;
          byFullPath[fullPaths[i]] = propBag;
        }
      }
      callback(null, byFullPath);
    }

    private _readFileProperties(element: HTMLElement) {      
      var properties: { [property: string]: string; } = {};
      for (var i = 0; i < element.attributes.length; i++) {
        var attr = element.attributes.item(i);
        if (!startsWith(attr.name.toLowerCase(), 'tp-')) continue;
        var propertyName = decodeFromAttributeName(attr.name.slice(3 /* 'tp-'.length */));
        properties[propertyName] = attr.value;
      }
      return properties;
    }

    private _getExistingElement(fullPath): HTMLElement {
      var element = this._byName.hasOwnProperty(fullPath) ? this._byName[fullPath] : null;
      return element;
    }

    static createElement(parentElement: HTMLElement, fullPath: string, _document: { createElement(tag: string): HTMLElement; }): HTMLElement {
      var element = _document.createElement('div');
      element.setAttribute('data-teapo-path', fullPath);
      parentElement.appendChild(element);
      return element;
    }


  }

}