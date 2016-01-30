namespace noapi {

  export function createEvents() {
    return {
      EventEmitter
    };
  }

  export class EventEmitter {

    private _listeners: { [eventKey: string]: { callback: Function; once?: boolean; }[]; }  = {};

    addListener(event: string, listener: Function) {
      var key = '*' + event;
      var list = this._listeners[key] || (this._listeners[key] = []);
      list.push({ callback: listener });
      return this;
    }

    removeListener(event: string, listener: Function) {
      var key = '*' + event;
      var list = this._listeners[key];
      if (list) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].callback === listener) {
            list.splice(i, 1);
            break;
          }
        }
      }
      return this;
    }

    removeAllListeners(event?: string) {
      var key = '*' + event;
      delete this._listeners[key];
      return this;
    }

    setMaxListeners(n: number): void {
      // too complicated for now, ignore
    }

    listeners(event: string): Function[] {
      var key = '*' + event;
      var list = this._listeners[key];
      if (!list) return [];
      var result: Function[] = [];
      for (var i = 0; i < list.length; i++)
        result.push(list[i].callback);

      return result;
    }

    emit(event: string, ...args: any[]): boolean {
      var key = '*' + event;
      var list = this._listeners[key];
      if (!list) return false;
      for (var i = 0; i < list.length; i++) {
        var item = list[i];

        if (args.length) {
          item.callback.apply(null, args);
        }
        else {
          var cb = item.callback;
          cb(); // direct calling can be quicker
        }

        if (item.once) {
          list.splice(i, 1);
          i--;
        }
      }
      return true;
    }

    on(event: string, listener: Function) {
      return this.addListener(event, listener);
    }

    once(event: string, listener: Function) {
      var key = '*' + event;
      var list = this._listeners[key] || (this._listeners[key] = []);
      list.push({ callback: listener, once: true });
      return this;
  	}
  }


}