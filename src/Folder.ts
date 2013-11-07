/// <reference path='typings/knockout.d.ts' />

/// <reference path='Document.ts' />

module teapo {
  export class Folder {
    fullPath: string;

    folders = ko.observableArray<teapo.Folder>();
    files = ko.observableArray<teapo.Document>();

    constructor(public name: string, public parent: teapo.Folder) {
    }

    getDocument(path: string): Document {
      return null;
    }

    getFolder(path: string): Folder {
      return null;
    }

    remove() {
    }
  }
}