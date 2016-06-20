declare var XDomainRequest;

function createHTTP(): any {

  class ClientRequest extends EventEmitter {

    _options: any;
    _url: string;
    _method: string;
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
    }

    end() {
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

    _xhr: XMLHttpRequest;
    _req: ClientRequest;
    headers: {};

    constructor(xhr: XMLHttpRequest, req: ClientRequest) {
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
    request: (options, callback) => new ClientRequest(options, callback),
    get: (options, callback) => {
      var req = new ClientRequest(options, callback);
      req._method = 'GET';
      req.end();
      return req;
    },
    METHODS: [ 
      'ACL',
      'BIND',
      'CHECKOUT',
      'CONNECT',
      'COPY',
      'DELETE',
      'GET',
      'HEAD',
      'LINK',
      'LOCK',
      'M-SEARCH',
      'MERGE',
      'MKACTIVITY',
      'MKCALENDAR',
      'MKCOL',
      'MOVE',
      'NOTIFY',
      'OPTIONS',
      'PATCH',
      'POST',
      'PROPFIND',
      'PROPPATCH',
      'PURGE',
      'PUT',
      'REBIND',
      'REPORT',
      'SEARCH',
      'SUBSCRIBE',
      'TRACE',
      'UNBIND',
      'UNLINK',
      'UNLOCK',
      'UNSUBSCRIBE' ],
    STATUS_CODES: {
      '100': 'Continue',
      '101': 'Switching Protocols',
      '102': 'Processing',
      '200': 'OK',
      '201': 'Created',
      '202': 'Accepted',
      '203': 'Non-Authoritative Information',
      '204': 'No Content',
      '205': 'Reset Content',
      '206': 'Partial Content',
      '207': 'Multi-Status',
      '208': 'Already Reported',
      '226': 'IM Used',
      '300': 'Multiple Choices',
      '301': 'Moved Permanently',
      '302': 'Found',
      '303': 'See Other',
      '304': 'Not Modified',
      '305': 'Use Proxy',
      '307': 'Temporary Redirect',
      '308': 'Permanent Redirect',
      '400': 'Bad Request',
      '401': 'Unauthorized',
      '402': 'Payment Required',
      '403': 'Forbidden',
      '404': 'Not Found',
      '405': 'Method Not Allowed',
      '406': 'Not Acceptable',
      '407': 'Proxy Authentication Required',
      '408': 'Request Timeout',
      '409': 'Conflict',
      '410': 'Gone',
      '411': 'Length Required',
      '412': 'Precondition Failed',
      '413': 'Payload Too Large',
      '414': 'URI Too Long',
      '415': 'Unsupported Media Type',
      '416': 'Range Not Satisfiable',
      '417': 'Expectation Failed',
      '418': 'I\'m a teapot',
      '421': 'Misdirected Request',
      '422': 'Unprocessable Entity',
      '423': 'Locked',
      '424': 'Failed Dependency',
      '425': 'Unordered Collection',
      '426': 'Upgrade Required',
      '428': 'Precondition Required',
      '429': 'Too Many Requests',
      '431': 'Request Header Fields Too Large',
      '451': 'Unavailable For Legal Reasons',
      '500': 'Internal Server Error',
      '501': 'Not Implemented',
      '502': 'Bad Gateway',
      '503': 'Service Unavailable',
      '504': 'Gateway Timeout',
      '505': 'HTTP Version Not Supported',
      '506': 'Variant Also Negotiates',
      '507': 'Insufficient Storage',
      '508': 'Loop Detected',
      '509': 'Bandwidth Limit Exceeded',
      '510': 'Not Extended',
      '511': 'Network Authentication Required' },
    createClient: (port?, host?) => {
      var req = new ClientRequest({port: port, host: host}, null);
      return req;
    },
    createServer: () => {
      throw new Error('HTTP server is not emulated.');
    }
  };

}

function xhr_request(url: string, method: string, headers: any, body, callback: (status, headers, data) => void, fallback: () => void) {
  var xhr = createXHR();
  xhr.onreadystatechange = xhr_onreadystatechange;
  xhr.open(this._url, this._method, true);

  if (headers) {
    for (var k in headers) if (headers.hasOwnProperty(k)) {
      xhr.setRequestHeader(k, headers[k]);
    }
  }

  // TODO: set body
  xhr.send();

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

function createXHR(): XMLHttpRequest {
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
    return xhr;
  }
}
