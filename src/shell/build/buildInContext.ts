namespace shell.build {

  export function buildInContext(
    templateFile: string,
    drive: persistence.Drive,
    require: (moduleName: string) => any,
    eval: (code: string) => any,
    log: (...args: any[]) => void,
    callback: (error: Error, html: string) => void) {

    var currentBase = templateFile.slice(0, templateFile.lastIndexOf('/') + 1);
    var restrictedDrive = createRestrictedDrive(currentBase, drive);

    var buildScope = {
      drive: restrictedDrive, // TODO: stop relying on drive, use noapi
      formatDrive: formatDrive,
      typescriptBuild: (...files: string[]) => {
        var resolvedFiles: string[] = [];
        var pathModule = require('path');
        for (var i = 0; i < files.length; i++) {
          resolvedFiles.push(pathModule.resolve(files[i]));
        }
        return shell.build.typescriptBuild(resolvedFiles, currentBase, drive);
      }
    };

    var htmlTemplate = drive.read(templateFile);

    build.processTemplate(
      htmlTemplate,
      [buildScope],
      code => eval(code),
      txt => log(txt),
      (error, result) => {
        callback(error, result);
      },
    	continueAction => {
        setTimeout(() => {
          try {
          	continueAction();
          }
          catch (error) {
            log({error:error,toString: () => error.message, stack: error.stack});
            callback(error, null);
          }
        }, 2);
      });
  }

  export function createRestrictedDrive(currentBase: string, drive: persistence.Drive) {
    var restrictedDrive = drive;
    restrictedDrive = {
      timestamp: drive.timestamp,
      files: () => {
        var fi = drive.files();
        var result: string[] = [];
        for (var i = 0; i < fi.length; i++) {
          if (fi[i].length > currentBase.length && fi[i].slice(0, currentBase.length) === currentBase)
            result.push(fi[i].slice(currentBase.length-1));
        }
        return result;
      },
      read: file => {
        if (file.charAt(0) === '/') file = file.slice(1);
        return drive.read(currentBase + file);
      },
      write: (file, content) => {
        if (file.charAt(0) === '/') file = file.slice(1);
        drive.write(file, content);
      }
    };
    return restrictedDrive;
  }
}