//portabled.build.processTemplate.mainDrive
declare module portabled.build.processTemplate {
  export var mainDrive: persistence.Drive;
}

module portabled.build.functions {

  export function shellFile(file: string, persistFilename: string) {
    var drivePath = '/svge-embed/editor/' + file;
    var fileText = portabled.build.processTemplate.mainDrive.read(drivePath);
    if (!fileText) {
      console.error(drivePath + ' is not there');
      throw new Error('File is not found: ' + drivePath);
    }

    var decoratedContent = fileText.
      replace(/\-\-(\**)\>/g, '--*$1>').
      replace(/\<(\**)\!/g, '<*$1!');

    var wrapped = '<' + '!' + '-- ' + (persistFilename || '/shell/' + file) + '\n' + decoratedContent + '\n --' + '>';

    return wrapped;
  }

}