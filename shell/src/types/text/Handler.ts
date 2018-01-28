namespace types.text {


  export var intendedFiles = '*.txt';
  // export var acceptedFiles = '*.*';

  export var env: FileTypeModuleEnvironment;

  export function load(file: string): FileEntryHandler {

    class TextFileHandler {

      constructor(private _file: string, private _drive: persistence.Drive) {
      }

      //entryClassName = '...';
      edit(host: HTMLElement) {
        //return new TextAreaEditor();
      }
    }


    return null;// new TextFileHandler(file, env.drive);
  }
}