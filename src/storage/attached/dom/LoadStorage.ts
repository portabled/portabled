module teapo.storage.attached.dom {

  export class LoadStorage implements attached.LoadStorage {

    editedUTC: number = 0;

    private _byName: { [fullPath: string]: HTMLElement; } = {};

    constructor(
      private _parentElement: HTMLElement,
      private _document: { createElement(tag: string): HTMLElement; }) {

      // populate editedUTC from corresponding attribute
      var editedUTCValue = this._parentElement.getAttribute('data-edited-utc');
      if (editedUTCValue) {
        try {
          this.editedUTC = parseInt(editedUTCValue);
        }
        catch (parseEditedUTCError) {
          // TODO: logging safely?
          //console.log('parsing editedUTC ' + parseEditedUTCError);
        }
      }
    }

    load(recipient: LoadStorageRecipient): void {

      this._ensureIdSet();

      var dodgyElements: HTMLElement[] = [];

      var fileCount: number = 0;
      try {
        var fileCountStr = this._parentElement.getAttribute('data-teapo-file-count');
        if (fileCountStr)
          fileCount = parseInt(fileCountStr);
      }
      catch (error) { }

      if (fileCountStr)
        recipient.files(fileCount);

      // reset the speculative count hint, we'll recalculate
      fileCount = 0;
      for (var i = 0; i < this._parentElement.children.length; i++) {
        var fileElement = this._parentElement.children[i];
        if (this._loadFromElement(fileElement, recipient))
          fileCount++;
        else
          dodgyElements.push(fileElement);
      }

      for (var i = 0; i < dodgyElements.length; i++) {
        this._parentElement.removeChild(dodgyElements[i]);
      }

      this._parentElement.setAttribute('data-teapo-file-count', <any>fileCount);

      var updater = this._createUpdater();
      recipient.completed(updater);
    }

    migrate(
      editedUTC: number,
      filesByName: { [fullPath: string]: { [propertyName: string]: string; }; },
      callback: (error: Error, updater: attached.UpdateStorage) => void): void {

      this._ensureIdSet();

      this._wipeExistingElement();
      if (editedUTC)
        this._parentElement.setAttribute('data-edited-utc', editedUTC + '');
      this.editedUTC = editedUTC;
      //console.log('migrate(' + editedUTC + ', ' , filesByName, this._parentElement);


      var fileCount = 0;
      if (filesByName) {
        for (var fullPath in filesByName) if (filesByName.hasOwnProperty(fullPath)) {
          fileCount++;
          var element = UpdateStorage.createElement(this._parentElement, fullPath, this._document);
          var pbag = filesByName[fullPath];
          var szByAttr: { [property: string]: number; } = {};
          for (var pname in pbag) if (pbag.hasOwnProperty(pname)) {
            var content = pbag[pname];
            UpdateStorage.updateProperty(element, pname, content);
          }
          this._byName[fullPath] = element;
        }
      }

      this._parentElement.setAttribute('data-teapo-file-count', <any>fileCount);
      var updater = this._createUpdater();

      callback(null, updater);
    }

    private _createUpdater() { 
      var updater = new UpdateStorage(
        this._parentElement,
        this._byName,
        this._document);
      return updater;
    }

    private _ensureIdSet() { 
      if (!this._parentElement.id)
        this._parentElement.id = 'teapo-data-storage';
    }

    private _wipeExistingElement() {

      // clear out the attributes
      var attrs = [];
      for (var i = 0; i < this._parentElement.attributes.length; i++) {
        attrs[i] = this._parentElement.attributes.item(i);
      }

      for (var i = 0; i < attrs.length; i++) {
        if (attrs[i].name && startsWith(attrs[i].name, 'data-meta-'))
          this._parentElement.removeAttribute(attrs[i].name);
      }

      // clear out the content
      this._parentElement.innerHTML = '';
      this._parentElement.setAttribute('data-teapo-file-count', '0');

      // clear out the cache
      this._byName = {};
    }

    private _loadFromElement(element: HTMLElement, recipient: LoadStorageRecipient): boolean {

      if (!element.getAttribute) {
        return false;
      }

      var fullPath = element.getAttribute('data-teapo-path');
      if (!fullPath) {
        return false;
      }

      if (this._byName.hasOwnProperty(fullPath)) {
        return false;
      }

      var result: any = {};
      var anyProperty = false;
      for (var i = 0; i < element.attributes.length; i++) {
        var a = element.attributes.item(i);

        var prefix = 'data-meta-';
        if (!startsWith(a.name, prefix))
          continue;

        var attrName = decodeFromAttributeName(a.name.slice(prefix.length));
        var content = a.value;
        result[attrName] = content;
        anyProperty = true;
      }

      if (!anyProperty) {
        // fallback for legacy support
        result[''] = decodeFromInnerHTML(element.innerHTML);
      }

      recipient.file(fullPath, result);
      this._byName[fullPath] = <any>element;

      return true;
    }

  }

}