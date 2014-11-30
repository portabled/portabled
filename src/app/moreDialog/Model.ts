module portabled.app.moreDialog {
  
  export class Model {

    text = ko.observable<string>(null);
    matchItems = ko.observableArray<Model.MatchItem>([]);
    textInput: HTMLInputElement = null;
  
    private _selectedItem = -1;
    private _allMatchItems: Model.MatchItem[] = [];

    constructor(
      currentFile: string,
      currentSelection: string,
      private _files: string[],
      private _completed: (selected: string) => void) {

      for (var i = 0; i < this._files.length; i++) {
        var m = new Model.MatchItem(
          this._files[i],
          'file',
          this._completed);
        this._allMatchItems.push(m);
      }

      this._allMatchItems.sort((m1, m2) => {
        if (m1.text > m2.text) return 1;
        else if (m1.text < m2.text) return -1;
        else return 0;
      })

      this.text(currentSelection || (currentFile ? currentFile.slice(1) : ''));
      
      this._updateList();
      
      var updateTimeout = 0;
      this.text.subscribe(() => {
        if (updateTimeout)
          clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => this._updateList(), 300);
      });
    }
  
    loadFromDOM() {
      if (this.textInput)
        this.textInput.select();
      else
        alert('textInput is not there!');
    }

    keydown(unused, e: KeyboardEvent) {
      if (e.keyCode === 13 || e.which === 13 || e.key === 'Enter') {
        this._keyEnter();
      }
      else if (e.keyCode === 27 || e.which === 27 || e.key === 'Escape') {
        this._keyEnter();
      }
      else if (e.keyCode === 38 || e.which === 38) {
        this._keyUp();
      }
      else if (e.keyCode === 40 || e.which === 40) {
        this._keyDown();
      }
      else {
        return true;
      }
    }

    acceptClick() {
      var sel = this._selectedItem >= 0 ? this.matchItems()[this._selectedItem] : null;
      if (sel)
        this._completed(sel.text);
      else
        this._completed(this.text());
    }

    dismiss() {
      this._completed(null);
    }
  
    private _keyEnter() {
      this.acceptClick();
    }
  
    private _keyUp() {
      this._moveSelection(-1);
    }

    private _keyDown() {
      this._moveSelection(+1);
    }
  
    private _moveSelection(delta: number) {
      if (this._selectedItem >= 0) {
        var old = this.matchItems()[this._selectedItem];
        if (old)
          old.selected(false);
      }

      var newSelection = this._selectedItem + delta;
      if (newSelection < 0)
        newSelection = this.matchItems().length-1;
      if (newSelection >= this.matchItems().length)
        newSelection = 0;

      this._selectedItem = newSelection;

      var sel = this.matchItems()[newSelection];
      if (sel)
        sel.selected(true);
    }
  
    private _updateList() {
      var list: Model.MatchItem[] = [];
      var fullMatch = -1;
      var text = this.text();
      var textLower = (text || '').toLowerCase();
      for (var i = 0; i < this._allMatchItems.length; i++) {
        var m = this._allMatchItems[i];
        if (text) { 
          if (m.text === text) {
            if (fullMatch === -1) {
              m.selected(true);
              fullMatch = i;
            }
            else {
              m.selected(false);
              list.push(m);
            }
          }
          else if (m.text.toLowerCase().indexOf(textLower) >= 0) {
            m.selected(false);
            list.push(m);
          }
          else {
            m.selected(false);
          }
        }
        else {
          m.selected(false);
          list.push(m);
        }
      }
      if (!list.length) {
        var m = new Model.MatchItem(text, 'create', this._completed);
        m.display = 'Create new file: ' + text;
        m.selected(true);
        fullMatch = 0;
        list.push(m);
      }
      this.matchItems(list);
      this._selectedItem = fullMatch;
    }
    
  }

  export module Model {
    
    export class MatchItem {
      
      selected = ko.observable(false);
      display: string;
      
      constructor(
        public text: string,
        public type: string,
        private _completed: (file: string) => void) {
        this.display = text;
      }

      clickSelect() {
        this._completed(this.text);
      }
      
    }
    
  }
  
}