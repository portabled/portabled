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
        var req_callback = (status, headers, data) => {
          // TODO: report result
        };

        xhr_request( // normal XHR
          this._url, this._method,
          /*headers*/null, /*body*/null,
          req_callback,
        	() => { // public CORS proxy fallback
            corsProxy_request(
              this._url, this._method,
              /*headers*/null, /*body*/null,
              req_callback,
              () => { // public JSONP proxy fallback
                jsonpProxy_request(
                  this._url, this._method,
                  /*headers*/null, /*body*/null,
                  req_callback,
                  () => { // YQL fallback
                    yqlProxy_request(
                      this._url, this._method,
                      /*headers*/null, /*body*/null,
                      req_callback,
                    	/*fallback*/ null);
                  });
              });
          });
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

  function xhr_request(url: string, method: string, headers: any, body, callback: (status, headers, data) => void, fallback: () => void) {
    var xhr = createXHR();
    this._xhr.onreadystatechange = xhr_onreadystatechange;
    this._xhr.open(this._url, this._method, true);
    // TODO: set method, headers and body
    this._xhr.send();

    function xhr_onreadystatechange() {
      if (xhr.readyState!==4) return;
      if (!xhr.status) return fallback();

      if (xhr.status === 200) {
        callback(xhr.status, /*headers*/{}, xhr.response);
      }
    };
  }

	function corsProxy_request(url: string, method: string, headers: any, body, callback: (status, headers, data) => void, fallback: () => void) {
    // TODO: implement CORS proxy request
  }

	function jsonpProxy_request(url: string, method: string, headers: any, body, callback: (status, headers, data) => void, fallback: () => void) {
    // TODO: implement JSONP proxy request
  }

	function yqlProxy_request(url: string, method: string, headers: any, body, callback: (status, headers, data) => void, fallback: () => void) {
    // TODO: implement YQL proxy request
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