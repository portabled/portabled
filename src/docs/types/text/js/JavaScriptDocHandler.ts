module teapo.docs.types.text.js {
  
  export var expectsFile = /.*\.js/g;
  export var acceptsFile = /.*\.js/g;

  export function loadText(path: string, storage: DocState): CodeMirrorTextDoc {
    return new JavaScriptDocHandler();
  }

  export class JavaScriptDocHandler extends base.SimpleCodeMirrorDocHandler {

    constructor() {
      super();
    }

    load(text: string) {
      ternServer().server.addFile(this.path, text);
    }

    open() {
      ternServer().server.delFile(this.path);
      ternServer().addDoc(this.path, this.doc);

    }

    shouldTriggerCompletion(textBeforeCursor: string) {

      var lastChar = textBeforeCursor.charAt(textBeforeCursor.length - 1);
      if (lastChar === '.')
        return true;
      if (lastChar.toLowerCase() !== lastChar.toUpperCase())
        return true;
      
    }
    
    getCompletions(callback): any {

      if (_completionSuccess === false) {
        return (<any>CodeMirror).hint.javascript(this.editor);
      }

      try {
        ternServer().getHint(this.editor, callback);
        _completionSuccess = true;
      }
      finally {
        if (!_completionSuccess)
          _completionSuccess = false;
      }
      

    }
    
  }

  
  export function createCodeMirrorDoc(text: string): CodeMirror.Doc {
    return new CodeMirror.Doc(text || '', 'javascript');
  }

  var _completionSuccess;
  var _ternServer;
  function ternServer() {
    
    if (_ternServer) return _ternServer;
    
    if (!(<any>CodeMirror).TernServer) return null;
    _ternServer = new (<any>CodeMirror).TernServer();
    return _ternServer;
    
  }
}