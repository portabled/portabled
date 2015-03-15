module portabled.app.moreDialog {
  
  export class Model {

    moreModel = ko.observable<MoreModel>(null);
    importModel = ko.observable<ImportModel>(null);

    constructor(
    	private _currentFile: string,
      private _currentSelection: string,
      private _drive: persistence.Drive,
      private _completed: (selected: string) => void) {
      
      var filenames = this._drive.files();
      var moreModel = new MoreModel(this._currentFile, this._currentSelection, filenames, this._completed);
      this.moreModel(moreModel);
      
      moreModel.importLoaded = (file, data, text) => this._importLoaded(file, data, text);
    }

    
    dismiss() {
      this._completed(null);
    }

    keydown(e: KeyboardEvent) {
      var moreModel = this.moreModel();
      if (moreModel)
        return moreModel.keydown(e);
      
      var importModel = this.importModel();
      if (importModel)
        return importModel.keydown(e);
      
      return true;
    }
  
    connectToDOM() {
      var moreModel = this.moreModel();
      if (moreModel)
        moreModel.loadFromDOM();
    }
  
    private _importLoaded(file: File, data: any, text: string) {
      
      var importModel = new ImportModel(this._currentFile, file, data, text, this._drive);
      this.moreModel(null);
      this.importModel(importModel);
      
    }

    
  }
  
}