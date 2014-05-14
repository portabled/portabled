module teapo.docs {

  export class Drive {

    private _docByPath: { [fullPath: string]: Document; } = {};

    constructor(private _docStates: { [fullPath: string]: { [name: string]: string; }; }) {
    }

    root(): Folder {
      throw new Error('Not implemented.');
    }

    getFolder(fullPath: string): Folder {
      throw new Error('Not implemented.');
    }

    getDocument(fullPath: string): Document {
      throw new Error('Not implemented.');
    }

    addDocument(fullPath: string): Document {
      throw new Error('Not implemented.');
    }

  }

}