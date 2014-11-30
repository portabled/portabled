module portabled.docs.types.text.md {
  
  export var expectsFile = /.*\.md/g;
  export var acceptsFile = /.*\.md/g;

  export function loadText(path: string, storage: DocState): CodeMirrorTextDoc {
    return new MarkdownDocHandler();
  }

  export class MarkdownDocHandler extends base.SimpleCodeMirrorDocHandler {

    constructor() {
      super();
    }
    
  }

  export function createCodeMirrorDoc(text: string): CodeMirror.Doc {
    return new CodeMirror.Doc(text || '', 'text/x-markdown');
  }

  
}