module teapo {

  export class CompletionCodeMirrorEditor extends CodeMirrorEditor {

    static completionDelay = 400;

    private _completionTimeout = 0;
    private _completionClosure = () => this._performCompletion();
    private _forcedCompletion = false;
    private _acceptSingleCompletion = false;
    private static _noSingleAutoCompletion = { completeSingle: false };
    private _positionSaveTimeout = 0;
    private _positionSaveClosure = () => this._performPositionSave();
    private _triggerCompletionPos: CodeMirror.Pos = null;

    constructor(
      shared: CodeMirrorEditor.SharedState,
      docState: DocumentState) {
      super(CompletionCodeMirrorEditor.injectCompletionShortcuts(shared), docState);
    }

    /**
     * Subscribing to cursor activity.
     */
    handleLoad() {
      super.handleLoad(); // fetches the text from docState

      CodeMirror.on(
        this.doc(),
        'cursorActivity', (instance) => this._oncursorActivity());
    }

    handleClose() {

      // completion should be cancelled outright
      if (this._completionTimeout) {
        clearTimeout(this._completionTimeout);

        this._completionTimeout = 0;
      }
    }

    handleCursorActivity() {
    }

    handlePerformCompletion(forced: boolean, acceptSingle: boolean) {
    }

    handleChange(change: CodeMirror.EditorChange) {
      this.triggerCompletion(false);
    }

    triggerCompletion(forced: boolean, acceptSingle = false) {
      if (this._completionTimeout)
        clearTimeout(this._completionTimeout);

      if (forced)
        this._forcedCompletion = true;
      if (acceptSingle)
        this._acceptSingleCompletion = true;

      var delay = forced ? 1 : CompletionCodeMirrorEditor.completionDelay;

      this._completionTimeout = setTimeout(this._completionClosure, delay);
      this._triggerCompletionPos = this.doc().getCursor();
    }

    cancelCompletion() {
      // completion should be cancelled outright
      if (this._completionTimeout) {
        clearTimeout(this._completionTimeout);

        this._completionTimeout = 0;
      }

      this._forcedCompletion = false;
      this._acceptSingleCompletion = false;
    }

    private _performCompletion() {
      this._completionTimeout = 0;

      if (!this._forcedCompletion) {
        // if user didn't ask for completion, only do it within an identifier
        // or after dot
        var nh = this.getNeighborhood();
        if (nh.leadLength===0 && nh.prefixChar!=='.')
          return;
      }

      var forced = this._forcedCompletion;
      var acceptSingle = this._acceptSingleCompletion;
      this._forcedCompletion = false;
      this._acceptSingleCompletion = false;
      this.handlePerformCompletion(forced, acceptSingle);
    }

    private _oncursorActivity() {
      
      // cancel completion in case of cursor activity
      var pos = this.doc().getCursor();
      if (this._triggerCompletionPos &&
        (this._triggerCompletionPos.ch !== pos.ch || this._triggerCompletionPos.line !== pos.line)) {

        if (!this._forcedCompletion && this._completionTimeout) {
          clearTimeout(this._completionTimeout);
          this._completionTimeout = 0;
        }
      }

      this.handleCursorActivity();

      if (this._positionSaveTimeout)
        clearTimeout(this._positionSaveTimeout);
      this._positionSaveTimeout = setTimeout(this._positionSaveClosure, CodeMirrorEditor.positionSaveDelay);
    }

    private _performPositionSave() {
      if (this._positionSaveTimeout) {
        clearTimeout(this._positionSaveTimeout);
        this._positionSaveTimeout = 0;
      }

      // save current position
      var pos = this.editor().getDoc().getCursor();
      var posStr = JSON.stringify(pos);
      this.docState.setProperty('pos', posStr);
    }

    private static injectCompletionShortcuts(shared: CodeMirrorEditor.SharedState) {
      var triggerEditorCompletion = () => {
        var editor = <CompletionCodeMirrorEditor>shared.editor;
        if (!editor) return;
        editor.triggerCompletion(true, true);
      };

      var completionShortcuts = ['Ctrl-Space','Cmd-Space','Alt-Space','Ctrl-J','Alt-J','Cmd-J'];
      var extraKeys = shared.options.extraKeys;
      if (!extraKeys)
        extraKeys = shared.options.extraKeys = {};

      for (var i = 0; i < completionShortcuts.length; i++) {
        var key = completionShortcuts[i];
        if (key in extraKeys)
          continue;
        extraKeys[key] = triggerEditorCompletion;
      }

      return shared;
    }
  }

}