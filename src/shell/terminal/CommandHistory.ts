module shell.terminal {

  export class CommandHistory {

    private _history = [new CommandHistoryEntry()];
    private _index = 0;

    constructor() {
    }

    persistAndStartNew(input: HTMLInputElement | HTMLTextAreaElement) {
      if (!(input.value || '').replace(/\s/g, '')) {
        if (this._index === this._history.length - 1) return; // it's already empty, and it's the last entry too

        this._history[this._index].restore();

        if (this._history[this._index].edit.replace(/\s/g, ''))
          this._history.push(new CommandHistoryEntry());
      }
      else {
        if (this._index === this._history.length - 1) {
          this._history[this._index].storeEdit(input);
          this._history.push(new CommandHistoryEntry());
        }
        else {
          this._history[this._index].restore();
          if (!this._history[this._history.length - 1].text) {
            if (this._history[this._history.length - 1].edit)
              this._history[this._history.length - 1].text = this._history[this._history.length - 1].edit;
            else
              this._history.pop();
          }
          else if (!this._history[this._history.length - 1].edit) {
            this._history[this._history.length - 1].edit = this._history[this._history.length - 1].text;
          }
          this._history.push(new CommandHistoryEntry(input));
          this._history.push(new CommandHistoryEntry());
        }
      }
      this._index = this._history.length - 1;
      input.value = '';
    }

    scrollUp(input: HTMLInputElement | HTMLTextAreaElement): boolean {
      return this._scroll(input, -1);
    }

    scrollDown(input: HTMLInputElement | HTMLTextAreaElement): boolean {
      return this._scroll(input, +1);
    }

     private _scroll(input: HTMLInputElement | HTMLTextAreaElement, step: number): boolean {
       var newIndex = this._index + step;
       if (newIndex < 0 || newIndex >= this._history.length) return false;
       this._history[this._index].storeEdit(input);
       this._index = newIndex;
       this._history[this._index].applyTo(input);
     }
  }
}