module portabled.docs.types {
  
  export function load(path: string, storage: DocState): DocHandler {
   
    var submodules = listSubmodules<DocHandlerModule>(portabled.docs.types, 'load');
    for (var i = 0; i < submodules.length; i++) {

      var match = path.match(submodules[i].moduleObj.expectsFile);
      if (match && match.length && match[0] === path) {
        var docHandler = submodules[i].moduleObj.load(path, storage);
        if (docHandler)
          return docHandler;
      }

    }
    
    for (var i = 0; i < submodules.length; i++) {

      if (submodules[i].moduleObj.acceptsFile) { 
        var match = path.match(submodules[i].moduleObj.acceptsFile);
        if (!match || !match.length || match[0] !== path) continue;
      }

      var docHandler = submodules[i].moduleObj.load(path, storage);
      if (docHandler)
        return docHandler;
    }

    return null;
  }
  
}