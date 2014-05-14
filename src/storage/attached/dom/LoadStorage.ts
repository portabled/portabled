module teapo.storage.attached.dom {

  export class LoadStorage implements attached.LoadStorage {

    editedUTC: number;

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
          console.log('parsing editedUTC ' + parseEditedUTCError);
        }
      }
    }

    load(recipient: LoadStorageRecipient): void {
      var dbg = {};
      this._loadFromElement(this._parentElement, recipient, dbg);
      //console.log('load() editedUTC: ' + this.editedUTC, dbg, this._parentElement);
      var updater = new UpdateStorage(this._parentElement, this._byName, this._document);
      recipient.completed(updater);
    }

    migrate(
      editedUTC: number,
      filesByName: { [fullPath: string]: { [propertyName: string]: string; }; },
      callback: (error: Error, updater: attached.UpdateStorage) => void): void {

      this._wipeExistingElement();
      if (editedUTC)
        this._parentElement.setAttribute('data-edited-utc', editedUTC + '');
      this.editedUTC = editedUTC;
      //console.log('migrate(' + editedUTC + ', ' , filesByName, this._parentElement);


      if (filesByName) {
        for (var fullPath in filesByName) if (filesByName.hasOwnProperty(fullPath)) {
          var element = UpdateStorage.createElement(this._parentElement, fullPath, this._document);
          var pbag = filesByName[fullPath];
          for (var pname in pbag) if (pbag.hasOwnProperty(pname)) {
            UpdateStorage.updateProperty(element, pname, pbag[pname]);
          }
          this._byName[fullPath] = element;
        }
      }

      var updater = new UpdateStorage(this._parentElement, this._byName, this._document);

      callback(null, updater);
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
      // clear out the cache
      this._byName = {};
    }

  private _loadFromElement(element: Element, recipient: LoadStorageRecipient, dbg: any) {

      var fullPath = element.getAttribute('data-teapo-path');
      if (!fullPath) {
        for (var i = 0; i < element.childNodes.length; i++) {
          var child = <Element>element.childNodes.item(i);
          if (child.tagName)
            this._loadFromElement(child, recipient, dbg);
        }
        return;
      }

      var result: any = {};

      for (var i = 0; i < element.attributes.length; i++) {
        var a = element.attributes.item(i);

        var prefix = 'data-meta-';
        if (!startsWith(a.name, prefix))
          continue;

        var attrName = decodeFromAttributeName(a.name.slice(prefix.length));
        result[attrName] = a.value;
      }

      recipient.file(fullPath, result);
      dbg[fullPath] = result;
      this._byName[fullPath] = <any>element;
    }

  }

}