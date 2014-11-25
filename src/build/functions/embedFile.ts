module teapo.build.functions {

  export function embedFile(file: string) {
    var text = processTemplate.mainDrive.read(files.normalizePath(file));
    return text;
  }
  
}