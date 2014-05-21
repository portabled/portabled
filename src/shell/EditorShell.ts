module teapo.shell {

  export class EditorShell {

    private _layout = new layout.MainLayout(this._dom);

    constructor(
      private _dom: Dom,
      private _bootLayoutContainer: HTMLElement,
      private _fileList: files.FileList,
      private _metadata: { [property: string]: string; },
      private _metadataUpdater: (property: string, value: string) => void) {
        
      
    }
    
  }
  
}