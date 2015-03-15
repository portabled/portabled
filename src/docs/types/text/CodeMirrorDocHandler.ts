module portabled.docs.types.text {

  export class CodeMirrorDocHandler implements DocHandler {

    static codeMirrorEditorPools: { [moduleName: string]: CodeMirror[]; } = {};

    private _closures = {
      cm_change: (cm, docChange) => this._docSingleChange(docChange),
      cm_changes: (cm, docChanges) => this._docChanges(docChanges),
      cm_cursorActivity: (cm) => this._cursorActivity(),
      cm_scroll: (cm) => this._scroll()
    };

    private _saveTimer = new Timer();

    private _appliedKeyMap = null;

    private _scrollerModel: scrollerView.ScrollerModel = null;

    private _retrievedText: string = null;
    private _validLead: number = -1;
    private _validTrail: number = 0;
    private _totalLength: number = 0;

    private _newValidLead: number = -1;
    private _newValidTrail: number = -1;

    constructor(
      public path: string,
      public storage: DocState,
      public textDoc: CodeMirrorTextDoc,
      public moduleName: string,
      public moduleObj: TextHandlerModule) {

      this._saveTimer.ontick = () => this._save();

      this.textDoc.path = path;

      this.textDoc.text = () => this.text();

      if (this.textDoc.load) {
        var text = this.storage.read();
        this.textDoc.load(text);
      }

    }

    showEditor(regions: DocHostRegions): void {

      if (!this.textDoc.doc) {
        if (!this._retrievedText && typeof this._retrievedText !== 'string') {
          this._retrievedText = this.storage.read();
          this._validLead = -1;
          this._validTrail = 0;
          this._totalLength = this._retrievedText.length;
        }

        this.textDoc.doc = (this.moduleObj && this.moduleObj.createCodeMirrorDoc) ?
          this.moduleObj.createCodeMirrorDoc(this.storage.read()) :
          createCodeMirrorDoc(this._retrievedText);
      }


      var cmPool =
        CodeMirrorDocHandler.codeMirrorEditorPools[this.moduleName || ''] ||
        (CodeMirrorDocHandler.codeMirrorEditorPools[this.moduleName || ''] = []);

      if (cmPool.length) {
        this.textDoc.editor = cmPool.pop();
        // avoid zoom on focus
        this.textDoc.editor.getInputField().style.fontSize = '16px';

        regions.content.appendChild(this.textDoc.editor.getWrapperElement());
      }
      else {
        this.textDoc.editor = (this.moduleObj && this.moduleObj.createCodeMirrorEditor) ?
          this.moduleObj.createCodeMirrorEditor(regions.content) :
          createCodeMirrorEditor(regions.content);

        this._appliedKeyMap = this.textDoc.keyMap;
        if (this._appliedKeyMap) {
          this._appliedKeyMap = CodeMirror.normalizeKeyMap(this._appliedKeyMap);
          this.textDoc.editor.addKeyMap(this._appliedKeyMap);
        }
      }

      if (this.textDoc.editor.getDoc() !== this.textDoc.doc)
        this.textDoc.editor.swapDoc(this.textDoc.doc);

      try {
        this.textDoc.editor.focus();
      }
      catch (e) { }

      setTimeout(() => {
        if (this.textDoc.editor && this.textDoc.editor.getDoc() === this.textDoc.doc) {
          this.textDoc.editor.refresh();
          this.textDoc.editor.focus();
          this._scroll();
        }
      }, 2);


      this.textDoc.editor.on('change', this._closures.cm_change);
      this.textDoc.editor.on('changes', this._closures.cm_changes);
      this.textDoc.editor.on('cursorActivity', this._closures.cm_cursorActivity);
      this.textDoc.editor.on('scroll', this._closures.cm_scroll);


      if (!this._scrollerModel) {
        this._scrollerModel = new scrollerView.ScrollerModel(this.textDoc.doc, 300);
      }

      if (!this.textDoc.scroller) {
        this.textDoc.scroller = document.createElement('div');
        this.textDoc.scroller.style.width = '100%';
        this.textDoc.scroller.style.height = '100%';
        ko.renderTemplate('ScrollerView', this._scrollerModel, null, this.textDoc.scroller);
      }

      regions.scroller.appendChild(this.textDoc.scroller);

      if (!this.textDoc.status) {
        this.textDoc.status = document.createElement('div');
        this.textDoc.status.style.width = '100%';
        this.textDoc.status.style.height = '100%';
        this.textDoc.status.textContent = this.path;
      }

      regions.status.appendChild(this.textDoc.status);

      if (this.textDoc.open)
        this.textDoc.open();


    }

    hideEditor(): void {

      this._saveTimer.endWaiting();

      if (!this.textDoc || !this.textDoc.doc)
        return;

      this.textDoc.editor.off('changes', this._closures.cm_changes);
      this.textDoc.editor.off('cursorActivity', this._closures.cm_cursorActivity);
      this.textDoc.editor.off('scroll', this._closures.cm_scroll);

      if (this._appliedKeyMap) {
        this.textDoc.editor.removeKeyMap(this._appliedKeyMap);
        this._appliedKeyMap = null;
      }

      if (this.textDoc.close)
        this.textDoc.close();

      var editor = this.textDoc.editor;
      this.textDoc.editor = null;

      editor.swapDoc(new CodeMirror.Doc(''));

      var cmPool =
        CodeMirrorDocHandler.codeMirrorEditorPools[this.moduleName || ''];

      cmPool.push(editor);
    }

    remove(): void {
      this._saveTimer.stop();

      if (!this.textDoc || !this.textDoc.doc)
        return;

      if (this.textDoc.remove)
        this.textDoc.remove();

      this.textDoc.doc = null;
    }

    text(): string {

      var doc = this.textDoc.doc;
      if (!this._retrievedText && typeof this._retrievedText !== 'string') {
        this._retrievedText = doc ? doc.getValue() : this.storage.read();
        this._totalLength = this._retrievedText ? this._retrievedText.length : 0;
        this._validLead = -1;
        return this._retrievedText;
      }

      if (this._validLead < 0)
        return this._retrievedText;

      var lineCount = doc.lineCount();
      var totalLength = doc.indexFromPos({
        line: lineCount - 1,
        ch: doc.getLine(lineCount - 1).length
      });

      if (this._validLead + this._validTrail === this._retrievedText.length
        && this._retrievedText.length === totalLength)
        return this._retrievedText;

      if (this._validLead + this._validTrail < totalLength / 4) { // if more than 0.75 of the document is modified
        this._retrievedText = doc.getValue();
        this._validLead = -1;
        return this._retrievedText;
      }

      var mid = doc.getRange(
        doc.posFromIndex(this._validLead),
        doc.posFromIndex(totalLength - this._validTrail));

      this._retrievedText =
      this._retrievedText.slice(0, this._validLead) +
      mid +
      this._retrievedText.slice(this._retrievedText.length - this._validTrail);
      this._validLead = -1;


      return this._retrievedText;
    }

    private _docSingleChange(docChange: CodeMirror.EditorChange) {
      var doc = this.textDoc.doc;

      var newValidLead = doc.indexFromPos(docChange.from);
      var newValidTrail = this._totalLength - newValidLead - totalLength(docChange.removed);

      if (this._newValidLead < 0 || this._newValidLead > newValidLead)
        this._newValidLead = newValidLead;
      if (this._newValidTrail < 0 || this._newValidTrail > newValidTrail)
        this._newValidTrail = newValidTrail;
    }

    private _docChanges(docChanges: CodeMirror.EditorChange[]) {

      var doc = this.textDoc.doc;

      var lineCount = doc.lineCount();
      var newTotalLength = doc.indexFromPos({
        line: lineCount - 1,
        ch: doc.getLine(lineCount - 1).length
      });

      var changeLead = this._newValidLead;
      var changeTrail = this._newValidTrail;

      this._newValidLead = -1;
      this._newValidTrail = -1;


      if (this._validLead < 0) {
        this._validLead = changeLead;
        this._validTrail = changeTrail;
      }
      else {
        this._validLead = Math.min(this._validLead, changeLead);
        this._validTrail = Math.min(this._validTrail, changeTrail);
      }

      var changeSummary = {
        lead: changeLead,
        mid: this._totalLength - changeLead - changeTrail,
        newmid: 0,
        trail: changeTrail
      };
      changeSummary.newmid = newTotalLength - changeLead - changeTrail;

      this._totalLength = newTotalLength;

      if (this.textDoc.onChanges) {
        this.textDoc.onChanges(docChanges, changeSummary);
      }

      if (this._scrollerModel)
        this._scrollerModel.docChanges(docChanges);

      this._saveTimer.interval = (this.moduleObj && this.moduleObj.saveDelay) || saveDelay;
      this._saveTimer.reset();

    }

    private _cursorActivity() {
      if (this.textDoc.onCursorMoved) {
        var cursorPos = this.textDoc.doc.getCursor();
        //this.textDoc.status.textContent = 'token '+this.textDoc.editor.getTokenAt(cursorPos).type;
        this.textDoc.onCursorMoved(cursorPos);
      }

      // TODO: scroller/thickBar cursor activity

    }

    private _scroll() {
      var scr = this.textDoc.editor.getScrollInfo();
      if (this.textDoc.onScroll)
        this.textDoc.onScroll(scr);

      if (this._scrollerModel)
        this._scrollerModel.scroll(scr);

    }

    private _save() {
      this.storage.write(this.text());
    }

  }

  function totalLength(lines: string[]): number {
    var length = 0;
    for (var i = 0; i < lines.length; i++) {
      length += lines[i].length;
    }
    if (lines.length > 1)
      length += lines.length - 1;
    return length;
  }
}