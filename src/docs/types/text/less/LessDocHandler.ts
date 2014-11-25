module teapo.docs.types.text.less {
  
  export var expectsFile = /.*\.less/g;
  export var acceptsFile = /.*\.less/g;

  export function loadText(path: string, storage: DocState): CodeMirrorTextDoc {
    return new css.CssDocHandler();
  }
  
  export function createCodeMirrorDoc(text: string): CodeMirror.Doc {
    return new CodeMirror.Doc(text || '', 'text/x-less');
  }

  
}