module teapo.docs.types.text.html {

  export var expectsFile = /.*\.(html|htm)/g;
  export var acceptsFile = /.*\.(html|htm)/g;

  export function loadText(path: string, storage: DocState): CodeMirrorTextDoc {
    return new HtmlDocHandler();
  }

  export class HtmlDocHandler extends base.SimpleCodeMirrorDocHandler {

    constructor() {
      super();
    }



    shouldTriggerCompletion(textBeforeCursor: string) {

      var cursorPos = this.doc.getCursor();
      var token = this.editor.getTokenAt(cursorPos);
      var lastChar = textBeforeCursor.charAt(textBeforeCursor.length - 1);
      if (lastChar === '<')
        return true;

      if (lastChar === '=' && token.type) // ignore equals sign not inside element tag
        return true;

      if (lastChar.toLowerCase() !== lastChar.toUpperCase()) {

        if (token.type) // token.type == null -> means simple text, don't complete
          return true;
      }
      
    }
    
    getCompletions() {
      return (<any>CodeMirror).hint.html(this.editor);
    }
    
  }
  
  export function createCodeMirrorDoc(text: string): CodeMirror.Doc {
    return new CodeMirror.Doc(text || '', 'text/html');
  }

  
}