module shell.keybar {

  export class Keybar {

    private _fnKeys: { element: HTMLElement; text: string; action: Function; }[] = [];

    constructor(private _host: HTMLElement, keys: { text: string; action?: (e: KeyboardEvent) => boolean; }[]) {
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var keyElem = elem('div', {
          position: 'absolute', bottom: '0',
          whiteSpace: 'nowrap',
          cursor: 'pointer'
        }, this._host);
        var keyName = (i === 0 ? 'F1' : '' + (i + 1));
        elem('span', { background: 'black', color: 'gray', text: keyName + ' ' }, keyElem);
        elem('span', { background: 'gray', color: 'black', text: k.text }, keyElem);
        this._fnKeys.push({
          element: keyElem,
          text: k.text,
          action: k.action
        });
        if (k.action)
        	on(keyElem, 'click', <any>k.action);
      }
    }

    arrange(metrics: { hostWidth; }) {
      var keySize = ((metrics.hostWidth / this._fnKeys.length) | 0);
      for (var i = 0; i < this._fnKeys.length; i++) {
        this._fnKeys[i].element.style.left = (i * keySize) + 'px';
        this._fnKeys[i].element.style.width = keySize + 'px';
      }
    }

    handleKeydown(e: KeyboardEvent): boolean {
      var fnKeyIndex = e.keyCode - 112;
      if (fnKeyIndex < 0 || fnKeyIndex >= this._fnKeys.length) return false;
      var k = this._fnKeys[fnKeyIndex];
      if (!k.action) return false;
      k.action();
      return true;
    }

  	remove() {
      for (var i = 0; i < this._fnKeys.length; i++) {
        var k = this._fnKeys[i];
        if (k.element.parentElement) {
          k.element.parentElement.removeChild(k.element);
        }
      }
      this._fnKeys = [];
    }
  }

}