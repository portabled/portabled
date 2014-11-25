module teapo.docs.types.text {

  export var expectsFile = /.*\.txt/g;
  export var acceptsFile = /.*/g;
  
  export var saveDelay = 700;

  export function load(path: string, storage: DocState): DocHandler {

    var submodules = listSubmodules<TextHandlerModule>(teapo.docs.types.text, 'loadText');
    for (var i = 0; i < submodules.length; i++) {

      var match = path.match(submodules[i].moduleObj.expectsFile);
      if (match && match.length && match[0] === path) {
        var textDoc = submodules[i].moduleObj.loadText(path, storage);
        if (textDoc)
          return new CodeMirrorDocHandler(path, storage, textDoc, submodules[i].moduleName, submodules[i].moduleObj);
      }

    }
    
    for (var i = 0; i < submodules.length; i++) {

      if (submodules[i].moduleObj.acceptsFile) { 
        var match = path.match(submodules[i].moduleObj.acceptsFile);
        if (!match || !match.length || match[0] !== path) continue;
      }

      var textDoc = submodules[i].moduleObj.loadText(path, storage);
      if (textDoc)
        return new CodeMirrorDocHandler(path, storage, textDoc, submodules[i].moduleName, submodules[i].moduleObj);
    }

    var textDoc = teapo.docs.types.text.loadText(path, storage);
    return new CodeMirrorDocHandler(
      path, storage, textDoc,
      null, null);
    
  }
  
  
  

  
}