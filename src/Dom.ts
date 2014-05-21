module teapo {

  export class Dom {

    constructor(public documenOverride = document) {
    }

    getElementById(id: string): HTMLElement {
      return this.documenOverride.getElementById(id);
    }

    createElement(tagName: string, style?: any, parent?: HTMLElement): HTMLElement {
      var elem = this.documenOverride.createElement(tagName);
      Dom.applyStyle(elem, style);
      if (parent)
        parent.appendChild(elem);
      return elem;
    }

    static applyStyle(elem: HTMLElement, style: any) {
      if (!style) return;
      for (var k in style) if (style.hasOwnProperty(k)) {
        if (k === 'text') {
          Dom.setText(elem, <any>style[k]);
        }
        else {
          try { elem.style[k] = style[k]; }
          catch (error) {  }
        }
      }
    }

    static setText(elem: HTMLElement, text: string) {
      if ('textContent' in elem)
        elem.textContent = text;
      else
        elem.innerText = text;
    }

    static addEventListener(element: any, type: string, listener: (event: Event) => void, useCapture?: boolean) {
      if (element.addEventListener) {
        if (typeof useCapture==='undefined')
          (<HTMLElement>element).addEventListener(type, listener);
        else
          (<HTMLElement>element).addEventListener(type, listener, useCapture);
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

    static addEventListenerWithDelay(element: any, type: string, listener: (event: Event) => void, useCapture?: boolean) {
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

}