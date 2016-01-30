declare var XDomainRequest;
namespace noapi {

  export function createHTTP(): any {

    class ClientRequest extends EventEmitter {

      _options: any;
      _url: string;
    	_method: string;
      _xhr = createXHR();
    	_callback: any;
      _finished: boolean = false;

    	headers: {};

      constructor(options, callback) {
        super();

        if (typeof options==='string') {
          this._url = options;
          this._options = {};
        }
        else {
          this._url =
            (options.protocol || 'http')+'://'+
            (options.host || options.hostname || 'localhost') +
            (options.port ? ':'+options.port : '')+
            (options.path || '/');
          this._options = options;
        }
        this._method = options.method || 'GET';
        this._callback = callback || options.callback;

        this._xhr.onreadystatechange = () => this._xhr_onreadystatechange();
        this._xhr.open(this._url, this._method, true);
        this._xhr.send();
        // TODO: fallback to a public CORS proxy
        // TODO: fallback to YQL
        // TODO: fallback to a public JSONP proxy

      }

      _xhr_onreadystatechange() {
        if (this._finished) return;
        if (this._xhr.readyState!==4) return;
        var response = new IncomingMessage(this._xhr, this);
        this.emit('response', response);
        setTimeout(() => {
          response.emit('ready');
          setTimeout(() => {
            this.emit('close');
            response.emit('close');
          }, 1);
        }, 1);
      }

    }

  	class IncomingMessage extends EventEmitter {

      _xhr: any;
  		_req: ClientRequest;
  		headers: {};

      constructor(xhr: any, req: ClientRequest) {
        super();
        this._xhr = xhr;

        if (this._xhr.status==200) {
          // TODO: fetch the result
        }
        else {
          // TODO: fire error here?
        }
      }

    }

    return {
      request: (options, callback) => new ClientRequest(options, callback)
    };

  }

  function createXHR(): any {
    if (typeof XDomainRequest!=='undefined') {
      var xdreq = new XDomainRequest();
      return xdreq;
    }
    else if (typeof ActiveXObject!=='undefined') {
      var axreq = new ActiveXObject('Microsoft.XMLHTTP');
      return axreq;
    }
    else if (typeof XMLHttpRequest!=='undefined') {
      var xhr = new XMLHttpRequest();
      xhr.withCredentials = true; // is it right?
      return true;
    }
  }
}