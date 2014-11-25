module teapo.docs.types.text.base {

  export class SimpleCodeMirrorDocHandler implements CodeMirrorTextDoc {

    path = null;
    editor: CodeMirror = null;
    doc: CodeMirror.Doc = null;
    text: () => string = null;
    scroller: HTMLElement = null;
    status: HTMLElement = null;
    keyMap = {
      "Ctrl-Enter": () => this._triggerCompletion(true),
      "Alt-Enter": () => this._triggerCompletion(true),
      "Ctrl-J": () => this._triggerCompletion(true),
      "Alt-J": () => this._triggerCompletion(true)
    };
    removed = false;

    state: any = null;

    private _completionTimer: Timer = null;
    private _completionLastChangeText = null;
    private _isCompleting = false;

    constructor() {
    }

    open() {
    }

    close() {
      if (this._completionTimer)
	      this._completionTimer.stop();
    }

    remove() { 
    }


    asyncCompletion = false;
    
    shouldTriggerCompletion(textBeforeCursor: string): boolean {
      return false;
    }

    getCompletions(callback?: Function): any {
      return null;
    }

    onChanges(docChanges: CodeMirror.EditorChange[], summary: { lead: number; mid: number; trail: number; }) {

      if (this.getCompletions) {
        if (!this._isCompleting) {
          var cur = this.doc.getCursor();
          var line = this.doc.getLine(cur.line);
          this._completionLastChangeText = line.slice(0, cur.ch);

          if (!this._completionTimer)
            this._createCompletionTimer();
          this._completionTimer.reset();
        }
      }
    }

    private _createCompletionTimer() {
      this._completionTimer = new Timer();
      this._completionTimer.interval = 200;
      this._completionTimer.ontick = () => {
        if (this._isCompleting) return;
        if (!this.editor)
          return;

        if (!this.shouldTriggerCompletion || this.shouldTriggerCompletion(this._completionLastChangeText)) {
          this._triggerCompletion(/*implicitly*/ true);
        }
      };
    }

    onSave() {
      
    }

    private _triggerCompletion(implicitly: boolean) {

      this._completionTimer.stop();

      var lastResult;
      
      var close = () => {
        CodeMirror.off(lastResult, 'close', close);
        this._isCompleting = false;
      };
      
      var hintFn = (cm,callback,options) => {
        
        var processResults = (results: CodeMirror.showHint.CompletionResult) => { 
          if (result && result.list && implicitly) {
            var chunk = this.doc.getRange(result.from, result.to);
            for (var i = 0; i < result.list.length; i++) {
              if (result.list[i] == <any>chunk) {
                result = null;
                break;
              }
            }
          }

          if (result) { 
            this._isCompleting = true;

            lastResult = result;
            CodeMirror.on(lastResult, 'close', close);
          }
          else {
            this._isCompleting = false;
            if (lastResult)
              CodeMirror.off(lastResult, 'close', close);
          }

          return result;
        };
        
        if (this.asyncCompletion) {
          (<any>this.getCompletions)(result => {
            var res = processResults(result);
            callback(res);
          });
        }
        else {
        
          var result: CodeMirror.showHint.CompletionResult = this.getCompletions();
          
          var res = processResults(result);
          return res;
        }
      };
      
      if (this.asyncCompletion) {
        (<any>hintFn).async = true;
      }
      
      var hintData: CodeMirror.showHint.Options = {
        hint: hintFn,
        completeSingle: implicitly ? false : true
      };

      // console.log('hintData ', hintData);
      this.editor.showHint(hintData);

    }
    
    onCompletion(callback: (result: CodeMirror.showHint.CompletionResult) => void) {
      var completions = <CodeMirror.showHint.CompletionResult>(<any>CodeMirror).hint.css(this.editor);
      callback(completions);
    }
    
  }
  
}