module teapo {


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

  export function saveCurrentHtmlAsIs() {
    var blob: Blob = new (<any>Blob)(['<!doctype html>\n', document.documentElement.outerHTML], { type: 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', 'nteapo.html');
    try {
      // safer save method, supposed to work with FireFox
      var evt_ = document.createEvent("MouseEvents");
      (<any>evt_).initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
      a.dispatchEvent(evt_);
    }
    catch (e) {
      a.click();
    }
  }
    
    
    
  export function addEventListener(element: any, type: string, listener: (event: Event) => void) {
    if (element.addEventListener) {
      element.addEventListener(type, listener);
    }
    else {
      var ontype = 'on' + type;

      if (element.attachEvent) {
        element.attachEvent('on' + type, listener);
      }
      else if (element[ontype]) {
        element[ontype] = listener;
      }
    }
  }

  export function addEventListenerWithDelay(element: any, type: string, listener: (event: Event) => void) {
    var queued = false;
    var storedEvent: Event;

    var listenerClosure = () => {
      queued = false;
      listener(storedEvent);
      storedEvent = null;
    };

    addEventListener(element, type, event => {
      storedEvent = event;
      if (!queued) {
        queued = true;
        if (typeof requestAnimationFrame === 'function')
          requestAnimationFrame(listenerClosure);
        else
          setTimeout(listenerClosure, 1);
      }
    });
  }

}