module portabled {

  /** Stoppable timer with methods specifically targeting debouncing. */
  export class Timer {

    private _timeout = 0;
    private _maxTimeout = 0;
    private _tickClosure = () => this._tick();

    constructor() {
    }

    interval = 300;
    maxInterval = 1000;

    ontick: () => void = null;

    reset() {
      if (this._timeout)
        clearTimeout(this._timeout);

      if (!this._maxTimeout && this.maxInterval)
        this._maxTimeout = setTimeout(this._tickClosure, this.maxInterval);

      if (this.interval)
        this._timeout = setTimeout(this._tickClosure, this.interval);
    }

    stop() {
      if (this._timeout)
        clearTimeout(this._timeout);
      if (this._maxTimeout)
        clearTimeout(this._maxTimeout);
      this._timeout = 0;
      this._maxTimeout = 0;
    }

    endWaiting() {
      if (this.isWaiting())
        this._tick();
    }

    isWaiting() {
      return this._timeout || this._maxTimeout ? true : false;
    }

    private _tick() {
      this.stop();
      if (this.ontick) {
        var t = this.ontick;
        t();
      }
    }

  }

  export function asyncForEach<T, TResult>(
    array: T[],
    handleElement: (element: T, index: number, callback: (error: Error, res: TResult) => void) => void,
    callback: (error: Error, res: TResult[]) => void) {

    if (!array || !array.length) {
      callback(null, []);
      return;
    }

    var res: TResult[] = [];
    var stop = false;
    var completeCount = 0;
    forEach(array, (element, index) => {
      if (stop) return;
      handleElement(element[index], index, (error, resElement) => {
        if (stop) return;
        if (error) {
          stop = true;
          callback(error, null);
          return;
        }
        res[index] = resElement;
        completeCount++;
        if (completeCount === array.length) {
          stop = true;
          callback(null, res);
        }
      });
    });
  }

  export function forEach<T>(array: T[], callback: (x: T, index: number) => void) {
    if (array.forEach) {
      array.forEach(callback);
    }
    else {
      for (var i = 0; i < array.length; i++) {
        callback(array[i], i);
      }
    }
  }

  export function find<T, R>(array: T[], predicate: (x: T, index: number) => R): R {
    var result = null;
    for (var i = 0; i < array.length; i++) {
      var x = array[i];
      var p = predicate(x, i);
      if (p) return p;
    }
  }

  /**
 * Escape unsafe character sequences like a closing script tag.
 */
  export function encodeForInnerHTML(content: string): string {
    // matching script closing tag with *one* or more consequtive slashes
    return content.replace(/<\/+script/g, (match) => {
      return '</' + match.slice(1); // skip angle bracket, inject bracket and extra slash
    });
  }

  /**
   * Unescape character sequences wrapped with encodeForInnerHTML for safety.
   */
  export function decodeFromInnerHTML(innerHTML: string): string {
    // matching script closing tag with *t*wo or more consequtive slashes
    return innerHTML.replace(/<\/\/+script/g, (match) => {
      return '<' + match.slice(2); // skip angle bracket and one slash, inject bracket
    });
  }

  export function encodeForAttributeName(value: string): string {
    var codes: number[] = [];
    var passableOnly = true;

    for (var i = 0; i < value.length; i++) {
      var c = value.charAt(i);
      var cc = value.charCodeAt(i);
      codes.push(cc);
      if (passableOnly)
        passableOnly = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z' || c === '_' || c === '-');
    }

    if (passableOnly)
      return 's-' + value;
    else
      return 'n-' + codes.join('-');
  }

  export function decodeFromAttributeName(attributeNamePart: string): string {
    if (attributeNamePart.slice(0, 2) === 's-')
      return attributeNamePart.slice(2);

    var codes = attributeNamePart.slice(2).split('-');
    var result: string[] = [];
    for (var i = 0; i < codes.length; i++) {
      try {
        result[i] = String.fromCharCode(parseInt(codes[i]));
      }
      catch (error) {
        console.log('Parsing attribute name error: ' + attributeNamePart + ' has non-numeric chunk ' + i + ' (' + codes[i] + ').');
        return null;
      }
    }
    return result.join('');
  }

  export function startsWith(str: string, prefix: string) {
    if (!str) return !prefix;
    if (!prefix) return false;
    if (str.length < prefix.length) return false;
    if (str.charCodeAt(0) !== prefix.charCodeAt(0)) return false;
    if (str.slice(0, prefix.length) !== prefix) return false;
    else return true;
  }

  export function dateNow(): number {
    if (Date.now)
      return Date.now();
    else
      return new Date().valueOf();
  }

  export var objectKeys = (obj: any): string[]=> {
    if (typeof Object.keys === 'function')
      objectKeys = Object.keys;
    else
      objectKeys = (obj: any): string[]=> {
        var result: string[] = [];
        for (var k in obj) if (obj.hasOwnProperty(k)) {
          result.push(k);
        }
        return result;
      };

    return objectKeys(obj);
  };

  export function addEventListener(element: any, type: string, listener: (event: Event) => void) {
    if (element.addEventListener) {
      element.addEventListener(type, listener, true);
    }
    else {
      var ontype = 'on' + type;

      if (element.attachEvent) {
        element.attachEvent('on' + type, listener);
      }
      else if (ontype in element) {
        element[ontype] = listener;
      }
    }
  }

  export function removeEventListener(element: any, type: string, listener: (event: Event) => void) {
    if (element.addEventListener) {
      element.removeEventListener(type, listener, true);
    }
    else {
      var ontype = 'on' + type;

      if (element.detachEvent) {
        element.detachEvent('on' + type, listener);
      }
      else if (ontype in element) {
        element[ontype] = null;
      }
    }
  }

  export function setTextContent(element: HTMLElement, textContent: string) {
    if (!_useTextContent)
      _useTextContent = detectTextContent(element);
    if (_useTextContent === 1)
      element.textContent = textContent;
    else
      element.innerText = textContent;
  }

  var _useTextContent = 0;
  function detectTextContent(element: HTMLElement) {
    if ('textContent' in element)
      return 1;
    else
      return 2;
  }

  export function element(tag: string, style?: any, parent?: HTMLElement): HTMLElement {
    var el = document.createElement(tag);
    if (style) {
      if (typeof style === 'string') {
        setTextContent(el, style);
      }
      else if (!parent && typeof style.scrollIntoView === 'function') {
        parent = style;
      }
      else {
        for (var k in style) if (style.hasOwnProperty(k)) {
          if (k === 'text')
            setTextContent(el, style.text);
          else
            el.style[k] = style[k];
        }
      }
    }

    if (parent)
      parent.appendChild(el);

    return el;
  }
  
  /**
   * JS Implementation of MurmurHash2
   * 
   * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
   * @see http://github.com/garycourt/murmurhash-js
   * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
   * @see http://sites.google.com/site/murmurhash/
   * 
   * @param {string} str ASCII only
   * @param {number} seed Positive integer only
   * @return {number} 32-bit positive integer hash
   */
  export function murmurhash2_32_gc(str, seed) {
    var
      l = str.length,
      h = seed ^ l,
      i = 0,
      k;

    while (l >= 4) {
      k =
      ((str.charCodeAt(i) & 0xff)) |
      ((str.charCodeAt(++i) & 0xff) << 8) |
      ((str.charCodeAt(++i) & 0xff) << 16) |
      ((str.charCodeAt(++i) & 0xff) << 24);

      k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));
      k ^= k >>> 24;
      k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));

      h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16)) ^ k;

      l -= 4;
      ++i;
    }

    switch (l) {
      case 3: h ^= (str.charCodeAt(i + 2) & 0xff) << 16;
      case 2: h ^= (str.charCodeAt(i + 1) & 0xff) << 8;
      case 1: h ^= (str.charCodeAt(i) & 0xff);
        h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
    }

    h ^= h >>> 13;
    h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
    h ^= h >>> 15;

    return h >>> 0;
  }
}