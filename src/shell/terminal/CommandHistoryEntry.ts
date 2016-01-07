module shell.terminal {

  export class CommandHistoryEntry {

    edit: string;
    text: string;
    start: number;
    end: number;

    constructor(takeContent?: HTMLInputElement | HTMLTextAreaElement) {
      if (takeContent) {
        this.storeEdit(takeContent);
        this.text = this.edit;
      }
      else {
        this.edit = this.text = '';
        this.start = this.end = 0;
      }
    }

    storeEdit(takeContent: HTMLInputElement | HTMLTextAreaElement) {
      this.edit = takeContent.value;
      if (!this.text) this.text = this.edit;

      if ('selectionStart' in takeContent) {
        this.start = takeContent.selectionStart;
        this.end = takeContent.selectionEnd;
      }
      else {
        this._tryStoreSelectionIE(takeContent);
      }
    }

    applyTo(takeContent: HTMLInputElement | HTMLTextAreaElement) {
      takeContent.value = this.edit;
      this._applySelection(takeContent);
      setTimeout(() => {
        if (takeContent.value === this.edit) this._applySelection(takeContent);
      }, 1);
    }

    restore() {
      this.edit = this.text;
    }

    private _applySelection(input: HTMLInputElement | HTMLTextAreaElement) {
      if ('selectionStart' in input) {
        input.selectionStart = this.start;
        input.selectionEnd = this.end;
      }
      else {
        this._tryApplySelectionIE(input);
      }
    }

    private _tryStoreSelectionIE(input: HTMLInputElement | HTMLTextAreaElement): boolean {
      var selection = (<any>document).selection;
      var range: TextRange = selection ? selection.createRange() : null;

      if (!range || range.parentElement() !== input) return false;

      var len = input.value.length;
      var normalizedValue = input.value.replace(/\r\n/g, "\n");

      // Create a working TextRange that lives only in the input
      var textInputRange = input.createTextRange();
      textInputRange.moveToBookmark(range.getBookmark());

      // Check if the start and end of the selection are at the very end
      // of the input, since moveStart/moveEnd doesn't return what we want
      // in those cases
      var endRange = input.createTextRange();
      endRange.collapse(false);

      if (textInputRange.compareEndPoints("StartToEnd", endRange) > -1) {
        this.start = this.end = len;
        return true;
      }

      this.start = -textInputRange.moveStart("character", -len);
      this.start += normalizedValue.slice(0, this.start).split("\n").length - 1;

      if (textInputRange.compareEndPoints("EndToEnd", endRange) > -1) {
        this.end = len;
      } else {
        this.end = -textInputRange.moveEnd("character", -len);
        this.end += normalizedValue.slice(0, this.end).split("\n").length - 1;
      }
      return true;
    }

    private _tryApplySelectionIE(input: HTMLInputElement | HTMLTextAreaElement): boolean {
      if (!input.createTextRange) return false;
      var range = input.createTextRange();
      range.collapse(true);
      range.moveStart('character', this.start);
      range.moveEnd('character', this.end);
      range.select();
    }
  }

}