module portabled.app.moreDialog {
 
  export class ImportModel {

    asSingle = ko.observable<ImportAsSingleModel>(null);
  
    asMulti = ko.observable<ImportAsMultiModel>(null);
  
    private _defaultBaseDir: string;
    
    constructor(
      private _currentFile: string,
    	private _file: File,
      private _data: any,
      private _text: string,
      private _drive: persistence.Drive) {

      var normCurrentFile = files.normalizePath(this._currentFile || '/');
      var lastSlash = normCurrentFile.lastIndexOf('/');
      this._defaultBaseDir = normCurrentFile.slice(0, lastSlash);
      
      this._switchToSingleFile();
    }
    
    keydown(e: KeyboardEvent) {
      return true;
    }
  
    private _switchToSingleFile() {

      var singleModel = new ImportAsSingleModel(
        this._defaultBaseDir,
        this._file,
        this._data, this._text,
        this._drive);

      this.asMulti(null);
      this.asSingle(singleModel);

    }

  }
  
}