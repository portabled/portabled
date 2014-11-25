module teapo.docs.types.text.scss {

  export var expectsFile = /.*\.scss/g;
  export var acceptsFile = /.*\.scss/g;

  export function loadText(path: string, storage: DocState): CodeMirrorTextDoc {
    return new css.CssDocHandler();
  }

  export function createCodeMirrorDoc(text: string): CodeMirror.Doc {
    return new CodeMirror.Doc(text || '', 'text/x-scss');
  }

  
}