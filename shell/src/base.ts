function getText(obj: Element | Function): string {

  if (typeof obj === 'function') {
    var result = /\/\*(\*(?!\/)|[^*])*\*\//m.exec(obj + '')[0];
    if (result) result = result.slice(2, result.length - 2);
    return result;
  }
  else if (/^SCRIPT$/i.test((<any>obj).tagName)) {
    if ('text' in obj)
      return (<any>obj).text;
    else
      return (<any>obj).innerHTML;
  }
  else if (/^STYLE$/i.test((<any>obj).tagName)) {
    if ('text' in obj)
      return (<any>obj).text;
    else if ((<any>obj).styleSheet)
      return (<any>obj).styleSheet.cssText;
    else
      return (<any>obj).innerHTML;
  }
  else if ('textContent' in obj) {
    return (<any>obj).textContent;
  }
  else if (/^INPUT$/i.test((<any>obj).tagName)) {
    return (<any>obj).value;
  }
  else {
    var result: string = (<any>obj).innerText;
    if (result) {
      // IE fixes
      result = result.replace(/\<BR\s*\>/gi, '\n').replace(/\r\n/g, '\n');
    }
    return result || '';
  }
}

function setText(obj: Element, text: string): void {

  if (/^SCRIPT$/i.test((<any>obj).tagName)) {
    if ('text' in obj)
      (<any>obj).text = text;
    else
      (<any>obj).innerHTML = text;
  }
  else if (/^STYLE$/i.test((<any>obj).tagName)) {
    if ('text' in obj) {
      (<any>obj).text = text;
    }
    else if ('styleSheet' in obj) {
      if (!(<any>obj).styleSheet && !(<any>obj).type) (<any>obj).type = 'text/css';
      (<any>obj).styleSheet.cssText = text;
    }
    else if ('textContent' in (<any>obj)) {
      (<any>obj).textContent = text;
    }
    else {
      (<any>obj).innerHTML = text;
    }
  }
  else if ('textContent' in obj) {
    if ('type' in obj && !(<any>obj).type) (<any>obj).type = 'text/css';
    (<any>obj).textContent = text;
  }
  else if (/^INPUT$/i.test((<any>obj).tagName)) {
    (<any>obj).value = text;
  }
  else {
    (<any>obj).innerText = text;
  }
}

function on(obj: Node | Window, eventName: string, handler: (evt: Event) => void): void {
  if ((<any>obj).addEventListener) {
    try {
      (<any>obj).addEventListener(eventName, handler, false);
      return;
    }
    catch (e) { }
  }
  else if ((<any>obj).attachEvent) {
    try {
      (<any>obj).attachEvent('on' + eventName, handler);
      return;
    }
    catch (e) { }
  }

  obj['on' + eventName] = function(e) { return handler(e || window.event); };
};

function off(obj, eventName, handler) {
  if (obj.removeEventListener) {
    obj.removeEventListener(eventName, handler, false);
  }
  else if (obj.detachEvent) {
    obj.detachEvent('on' + eventName, handler);
  }
  else {
    if (obj['on' + eventName])
      obj['on' + eventName] = null;
  }
};

function elem(tag: Element | string, style?: any, parent?: Element): HTMLElement {
  var e = (<any>tag).tagName ? <HTMLElement>tag : window.document.createElement(<string>tag);

  if (!parent && style && style.tagName) {
    parent = style;
    style = null;
  }

  if (style) {
    if (typeof style === 'string') {
      setText(e, style);
    }
    else {
      for (var k in style) if (style.hasOwnProperty(k)) {
        if (k === 'text') {
          setText(
            e, style[k]);
        }
        else if (k === 'className') {
          e.className = style[k];
        }
        else if (k === 'background' && e.style) {
          e.style.background = style[k];
        }
        else if (!(e.style && k in e.style) && k in e) {
          e[k] = style[k];
        }
        else {

          if (style[k] && typeof style[k] === 'object' && typeof style[k].length === 'number') {
            // array: iterate and apply values
            var applyValues = style[k];
            for (var i = 0; i < applyValues.length; i++) {
              try { e.style[k] = applyValues[i]; }
              catch (errApplyValues) { }
            }
          }
          else {
            // not array
            try {
              e.style[k] = style[k];
            }
            catch (err) {
              try {
                if (typeof console !== 'undefined' && typeof console.error === 'function')
                  console.error(e.tagName + '.style.' + k + '=' + style[k] + ': ' + err.message);
              }
              catch (whatevs) {
                alert(e.tagName + '.style.' + k + '=' + style[k] + ': ' + err.message);
              }
            }
          }
        }
      }
    }
  }

  if (parent) {
    try {
      parent.appendChild(e);
    }
    catch (error) {
      throw new Error(error.message + ' adding ' + e.tagName + ' to ' + parent.tagName);
    }
  }

  return e;
}