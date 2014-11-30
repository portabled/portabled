module portabled.docs.types.text.json {
  
  export var expectsFile = /.*\.json/g;
  export var acceptsFile = /.*\.json/g;

  export function loadText(path: string, storage: DocState): CodeMirrorTextDoc {
    return new js.JavaScriptDocHandler();
  }
  
  export function createCodeMirrorDoc(text: string): CodeMirror.Doc {
    return new CodeMirror.Doc(text || '', 'json');
  }

  
}