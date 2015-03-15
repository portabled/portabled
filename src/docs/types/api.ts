/**
 * Add your generic document type handlers to nested modules
 * inside 'types' module.
 * Define load function in the same way load function is defined here below.
 */
module portabled.docs.types {

  /**
   * Document handlers modules are expected to export these members.
   */
  export interface DocHandlerModule {
    
    load(path: string, storage: DocState): DocHandler;
    
    expectsFile: RegExp;
    acceptsFile?: RegExp;

  }
  
  /**
   * Default type loading.
   * Other handlers should conform to the same signature, and be on the child modules, like so:
   * module portabled.docs.types.text { function load(...); }
   */
  declare function load(path: string, storage: DocState): DocHandler;

  export interface DocHandler {

    showEditor(regions: DocHostRegions): void;
    hideEditor(): void;

    // TODO: implement icons like this:
    //
    // load(context: { iconText(text: string): void; iconColor(color: string): void; }): void;

    remove();

  }

  export interface DocHostRegions {
    content: HTMLElement;
    scroller: HTMLElement;
    status: HTMLElement;
  }

  
  export interface DocState {
    read(): string;
    write(content: string);
    
    readState(): any;
    writeState(state: any);
  }


}