module teapo {

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

  export function find<T, R>(array: T[], predicate: (x: T, index: number) => R): R {
    var result = null;
    for (var i = 0; i < array.length; i++) {
      var x = array[i];
      var p = predicate(x, i);
      if (p) return p;
    }
  }

}