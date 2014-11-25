module teapo.docs.types.text.sass {

  export var expectsFile = /.*\.sass/g;
  export var acceptsFile = /.*\.sass/g;

  export function loadText(path: string, storage: DocState): CodeMirrorTextDoc {
    return new css.CssDocHandler();
  }
  
  export function createCodeMirrorDoc(text: string): CodeMirror.Doc {
    return new CodeMirror.Doc(text || '', 'text/x-sass');
  }

  
}