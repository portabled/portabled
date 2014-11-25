module teapo.docs.types.text.css {
  
  export var expectsFile = /.*\.css/g;
  export var acceptsFile = /.*\.css/g;

  export function loadText(path: string, storage: DocState): CodeMirrorTextDoc {
    return new CssDocHandler();
  }

  export class CssDocHandler extends base.SimpleCodeMirrorDocHandler {

    constructor() {
      super();
    }



    shouldTriggerCompletion(textBeforeCursor: string) {

      if (textBeforeCursor.slice(textBeforeCursor.length - 2) === ': ')
        return true;
      var lastChar = textBeforeCursor.charAt(textBeforeCursor.length - 1);
      if (lastChar === '-')
        return true;
      if (lastChar.toLowerCase() !== lastChar.toUpperCase())
        return true;
      
    }
    
    getCompletions() {
      return (<any>CodeMirror).hint.css(this.editor);
    }
    
  }

  export function createCodeMirrorDoc(text: string): CodeMirror.Doc {
    return new CodeMirror.Doc(text || '', 'css');
  }

  
}