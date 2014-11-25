module teapo.docs {
  
  export class DocHost {

    private _docs: { [file: string]: docs.types.DocHandler; } = {};

    private _activeHandler: docs.types.DocHandler = null;

    constructor(
      private _regions: docs.types.DocHostRegions,
      private _drive: persistence.Drive) {

      var files = this._drive.files();
      for (var i = 0; i < files.length; i++) {
        this.add(files[i]);
      }

    }
  
    show(file: string) {

      var oldHandler = this._activeHandler;
      var oldElements: Element[] = [];

      if (this._regions.content) {
        for (var i = 0; i < this._regions.content.children.length; i++) {
          oldElements.push(this._regions.content.children[i]);
        }
      }

      if (this._regions.scroller) {
        for (var i = 0; i < this._regions.scroller.children.length; i++) {
          oldElements.push(this._regions.scroller.children[i]);
        }
      }

       if (this._regions.status) {
        for (var i = 0; i < this._regions.status.children.length; i++) {
          oldElements.push(this._regions.status.children[i]);
        }
      }

      try {
        this._activeHandler = this._docs[file];
        if (!this._activeHandler) {

          if (file === null)
            return; // one of expected values here

          // TODO: handle unopenable file
          return;
        }

        this._activeHandler.showEditor(this._regions);
      }
      finally {

        if (oldHandler && oldHandler.hideEditor) {
          oldHandler.hideEditor();
        }

        for (var i = 0; i < oldElements.length; i++) {
          oldElements[i].parentNode.removeChild(oldElements[i]);
        }

      }
    }

    add(file: string) {
      var docState = new DocState(file, this._drive);
      var docHandler = docs.types.load(file, docState);
      this._docs[file] = docHandler;
    }

    remove(file: string) {

      var openAnotherFile = false;
      
      var docHandler = this._docs[file];
      if (docHandler) {

        openAnotherFile = true;

        if (this._activeHandler === docHandler) {
          this.show(null);
        }

        docHandler.remove();

        delete this._docs[file];
      }
      
      if (openAnotherFile) {
        // TODO: show another file
      }
    }
    
  }

  class DocState implements docs.types.DocState {
    
    constructor(private _file: string, private _drive: persistence.Drive) {
    }

    read(): string {
      return this._drive.read(this._file);
    }

    write(content: string) {
      this._drive.timestamp = Date.now ? Date.now() : +new Date();
      this._drive.write(this._file, content);
    }
    
    readState(): any {
      // TODO...
    }

    writeState(state: any) {
      // TODO...
    }
    
  }
  
}