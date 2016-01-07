module noapi {

  export function createEventEmitter(): EventEmitter {

    var _listeners: { [eventKey: string]: Function[]; } = {};

    var result = {
      addListener, removeListener, removeAllListeners,
      on, once,
      setMaxListeners,
      listeners,
      emit
    };
    return result;

    function addListener(event: string, listener: Function): EventEmitter {
      var key = '*' + event;
      var list = _listeners[key] || (this._listeners[key] = []);
      list.push(listener);
      return result;
    }

    function removeListener(event: string, listener: Function): EventEmitter {
      var key = '*' + event;
      var list = _listeners[key];
      if (list) {
        for (var i = 0; i < list.length; i++) {
          if (list[i] === listener) {
            list.splice(i, 1);
            break;
          }
        }
      }
      return result;
    }

    function removeAllListeners(event?: string): EventEmitter {
      var key = '*' + event;
      delete _listeners[key];
      return result;
    }

    function setMaxListeners(n: number): void {
      // too complicated for now, ignore
    }

    function listeners(event: string): Function[] {
      var key = '*' + event;
      var list = _listeners[key];
      if (list)
        return list.slice(0);
      else
        return [];
    }

    function emit(event: string, ...args: any[]): boolean {
      var key = '*' + event;
      var list = _listeners[key];
      if (!list) return false;
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        f.apply(null, args);
      }
      return true;
    }

    function on(event: string, listener: Function): EventEmitter {
      return addListener(event, listener);
    }

    function once(event: string, listener: Function): EventEmitter {
      return on(event, listener);
    }

  }

}