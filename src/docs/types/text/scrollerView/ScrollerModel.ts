module portabled.docs.types.text.scrollerView {
  
  export class ScrollerModel {

    lines = ko.observableArray<ScrollerModel.LineModel>([]);
    lineHeight: string;
    private _lineHeightNum: number;

    viewportFrom = ko.observable('0');
    viewportHeight = ko.observable('0');
    _debug = null;

    private _recreateTimeout = 0;
  
    constructor(
      private _doc: CodeMirror.Doc,
      private _viewLineNumber: number) {

      this._lineHeightNum = ((10000 / this._viewLineNumber) | 0) / 100; // exact number of percents
      this.lineHeight = this._lineHeightNum + '%';

      this._recreateLines();
    }

    docChanges(docChanges: CodeMirror.EditorChange[]) {
      
      if (this._recreateTimeout)
        clearTimeout(this._recreateTimeout);
      this._recreateTimeout = setTimeout(() => this._recreateLines(), 200);
      
    }

    scroll(scrollInfo: CodeMirror.ScrollInfo) {
      var height = scrollInfo.height;
      var lineCount = this._doc.lineCount();
      if (lineCount < this._viewLineNumber)
        height = Math.max(height, this._doc.getEditor().defaultTextHeight() * this._viewLineNumber);
      
      this.viewportFrom((scrollInfo.top * 100 / height) + '%');
      this.viewportHeight((scrollInfo.clientHeight * 100 / height) + '%');
      (<any>scrollInfo).maxHeight = height;
      this._debug = {
        lineCount: lineCount,
        heightAtLine: this._doc.getEditor().heightAtLine(lineCount - 2),
        defaultLineHeight: this._doc.getEditor().defaultTextHeight(),
        height: height,
        scrollInfo: scrollInfo
      };
    }

    bindHandlers(dragElement: HTMLElement) {
      addEventListener(dragElement, 'touchstart', (e: any) => { 
        if (!e.touches || !e.touches.length) return;
        var editor = this._doc.getEditor();
        if (!editor) return;

        var dbg = null;

        var scrollInfo = editor.getScrollInfo();
        if (scrollInfo.clientHeight === scrollInfo.height) return;
        var startTop = scrollInfo.top;
        var startCoord = e.touches[0].clientY;
        var factor = scrollInfo.clientHeight / scrollInfo.height;
        var move = e => {
          if (!e.touches || !e.touches.length) return;
          var editor = this._doc.getEditor();
          if (!editor) return;

          var scrollInfo = editor.getScrollInfo();

          var deltaY = e.touches[0].clientY - startCoord;
          var offset = deltaY * factor;
          editor.scrollTo(null, scrollInfo.top + deltaY);
          dbg = 'scrollY->'+ (scrollInfo.top + deltaY)+' factor:'+factor+' deltaY:'+deltaY;
        };

        var close = e => {
          alert(dbg);
          removeEventListener(window, 'touchend', close);
          removeEventListener(window, 'touchmove', move);
        };

        addEventListener(window, 'touchmove', move);
        addEventListener(window, 'touchend', close);
      });

      addEventListener(dragElement, 'mousedown', (e: MouseEvent) => {
        var editor = this._doc.getEditor();
        if (!editor) return;

        var dbg = null;

        var scrollInfo = editor.getScrollInfo();
        if (scrollInfo.clientHeight === scrollInfo.height) return;
        var startTop = scrollInfo.top;
        var startCoord = e.clientY;
        var factor = scrollInfo.clientHeight / scrollInfo.height;
        var move = (e: MouseEvent) => {
          var editor = this._doc.getEditor();
          if (!editor) return;

          var scrollInfo = editor.getScrollInfo();

          var deltaY = e.clientY - startCoord;
          var offset = deltaY * factor;
          editor.scrollTo(null, scrollInfo.top + deltaY);
        };

        var close = e => {
          removeEventListener(window, 'mouseup', close);
          removeEventListener(window, 'mousemove', move);
        };

        addEventListener(window, 'mousemove', move);
        addEventListener(window, 'mouseup', close);
      });
    }

    private _recreateLines() {
      var newLines: ScrollerModel.LineModel[] = [];
      
      var docLineCount = this._doc.lineCount();
      
      var run: string[] = [];
      
      var maxLength = 50;
      
      for (var i = 0; i < docLineCount; i++) {
        run.push(this._doc.getLine(i));
        if (i > docLineCount * (this._lineHeightNum/100) * (newLines.length+1) 
            || i === docLineCount - 1) { 
          var newLine = this._createLine(run);
          maxLength = Math.max(maxLength, newLine.leadLength + newLine.textLength);
          newLines.push(newLine);
          run = [];
        }
      }

      for (var i = 0; i < newLines.length; i++) {
        newLines[i].lineWidth = ((100 * newLines[i].textLength / maxLength) | 0) + '%';
        newLines[i].lineLead = ((100 * newLines[i].leadLength / maxLength) | 0) + '%';
      }

      this.lines(newLines);
      
      var editor = this._doc.getEditor();
      if (editor)
        this.scroll(editor.getScrollInfo());
    }
  
    private _createLine(run: string[]): ScrollerModel.LineModel {
      return new ScrollerModel.LineModel(run);
    }

  }

  export module ScrollerModel {
    
    export class LineModel {

      leadLength = 0;
      textLength = 0;
      lineWidth: string = null;
   		lineLead: string = null;

      constructor(run: string[]) {
        this.textLength = 0;
        for (var i = 0; i < run.length; i++) {
          var ln = run[i];

          var lead = 0;
          for (var j = 0; j < ln.length; j++) {
            if (ln.charAt(j)===' ')
              lead++;
            else if (ln.charAt(j)==='\t')
              lead+=2;
            else
              break;
          }

          this.leadLength += lead;
          this.textLength += ln.length - j;
        }
        this.textLength = (this.textLength / i) | 0;
      }
    }
    
  }
}