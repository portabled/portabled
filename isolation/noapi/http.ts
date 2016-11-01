declare var XDomainRequest;

var createXHR = (function() {

  if (typeof XDomainRequest!=='undefined') {
    var cachedXDomainRequest = XDomainRequest;
    return () => {
      var xdreq = new cachedXDomainRequest();
      return xdreq;
    };
  }
  else if (typeof ActiveXObject!=='undefined') {
    var cachedActiveXObject = ActiveXObject;
    return () => {
      var axreq = new cachedActiveXObject('Microsoft.XMLHTTP');
      return axreq;
    };
  }
  else if (typeof XMLHttpRequest!=='undefined') {
    var cachedXMLHttpRequest = XMLHttpRequest;
    return () => {
      var xhr = new cachedXMLHttpRequest();
      xhr.withCredentials = true; // is it right?
      return xhr;
  	};
  }

})();

function createHTTP(): any {


  class ClientRequest extends EventEmitter {

    private _options: any;
    private _url: string;
    private _method: string;
    private _callback: any;
    private _finished: boolean = false;

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
      var res:IncomingMessage;
      var req_callback = (error, status: number, chunk:any[], finish: boolean) => {

        if(!res) res = new IncomingMessage(this);
        res._handleStatus(error, status, chunk, finish);
      };

      xhr_request({
          url: this._url,
          method: this._method,
          statusChanged: req_callback,
          fallback: xhrError => {

            corsProxy_request({
              url: this._url,
              method: this._method,
              withCredentials: false,
              statusChanged: req_callback,
              fallback: corsError => {

                yqlProxy_request({
                  url: this._url,
                  method: this._method,
              		withCredentials: false,
                  statusChanged: req_callback,
                  fallback: corsError => {

                    req_callback(xhrError, null, null, true);

                  }
                });

            }
          });
        }
      });;

    }

  }

  class IncomingMessage extends EventEmitter {

    private _responseReported = false;
		private _offset = 0;

    statusCode = 0;
    headers: {};

    constructor(private _req: ClientRequest) {
      super();
    }

		_handleStatus(error, status: number, chunk:any[], finish: boolean) {

      this.statusCode = status;
      this._ensureReported();

      if (chunk)
      	this.emit('data', chunk);

      if (error) {
        this.emit('error', chunk);
      }

      if (finish) {
        if (!error)
        	this.emit('end');
        this.emit('close');
      }
    }

		private _ensureReported() {
      if (!this._responseReported) {
        this._responseReported = true;
        this._req.emit('response', this);
      }
    }

  }

  return {
    request: (options, callback) => new ClientRequest(options, callback),
    get: (options, callback) => {
      var req = new ClientRequest(options, callback);
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


declare namespace xhr_request {
  type Options = {
    method: string;
    url: string;
    headers?: any;
  	body?: string | any[];
    withCredentials?: boolean;
  	statusChanged(error, status: number, chunk:any[], finish: boolean);
    fallback(error);
  }

}

function xhr_request(options: xhr_request.Options) {

  var canFallback = true;
  try {
  	var xhr = createXHR();

    if ('withCredentials' in options &&'withCredentials' in xhr) {
      xhr.withCredentials = options.withCredentials;
    }

    if ('responseType' in xhr) {
      xhr.responseType = 'arraybuffer';
    }
  }
  catch (error) {
    reportStatusChanged(error, null, null, true);
    return;
  }

  /*
  try {
		if (skipCredentials && xhr.withCredentials) xhr.withCredentials = false;
  }
  catch (error) { }
  */

  var lastState = {
    status:0,
    readyState:-1,
    offset:-1,
    finished:false
  };

  try {
    xhr.onreadystatechange = xhr_onreadystatechange;
    xhr.onload = xhr_onload;
    xhr.onloadend = xhr_onload;
    xhr.onprogress = xhr_onprogress;
    xhr.onabort = xhr_onabort;
    xhr.onerror = xhr_onerror;
    xhr.open(options.method, options.url, true);

    if (options.headers) {
      for (var k in options.headers) if (options.headers.hasOwnProperty(k)) {
        xhr.setRequestHeader(k, options.headers[k]);
      }
    }

    var finished;
    var reportedReadyState;

    // TODO: set body
    xhr.send();
  }
  catch (error) {
    reportStatusChanged(error, null, null, true);
    return;
  }

  function reportStatusChanged(error, status: number, chunk:any[], finish: boolean) {
    if (error || finish) {
      if (error || !status){
        if (canFallback || options.fallback) {
    			canFallback = false;
          options.fallback(error);
          return;
        }
      }
    }

    canFallback = false;
    options.statusChanged(error, status, chunk, finish);
  }

  function update_callback(finish: boolean, error: Error) {
    if (lastState.finished) return;

    if (xhr.readyState===4)
      finish = true;

    if (error)
      finish = true;

    var chunk = getChunk();

    if ((xhr.readyState|0) !== lastState.readyState) {
      // TODO: any extra logic on readyState change??
    }

    if ((chunk && chunk.length)
        || (xhr.status|0) !== lastState.status
       	|| finish) {

      lastState.status = xhr.status|0;
      lastState.readyState = xhr.readyState|0;
      lastState.finished = finish;

      reportStatusChanged(error, lastState.status, chunk, finish);
    }

  }

  function getChunk() {
    var response = xhr.responseBlob || xhr.response || xhr.responseText;
    if (!response || response.length<=lastState.offset) return null;

    if (typeof response==='string') {
      var chunk = new Buffer(response.slice(lastState.offset), 'utf8');
    }
    else {
      var chunk: any = new Buffer(response, lastState.offset);
    }

    lastState.offset = response.length;

    return chunk;
  }

  function xhr_onreadystatechange() {
    update_callback(false,null);
  }

  function xhr_onload() {
    update_callback(true,null);
  }

  function xhr_onprogress() {
    update_callback(false,null);
  }

  function xhr_onabort() {
    update_callback(true,new Error('Request aborted.'));
  }

  function xhr_onerror(event) {
    if (!event) event = (window as any)['event'];

    var error = !event ? new Error('XHR error') :
    	event.error && 'message' in event.error ? event.error :
    	event;

    update_callback(true, error);
  }

}

function corsProxy_request(options: xhr_request.Options) {
  xhr_request({
    method: options.method,
    url: 'https://crossorigin.me/'+options.url,
    headers: options.headers,
  	body: options.body,
    withCredentials: options.withCredentials,
  	statusChanged: options.statusChanged,
    fallback: options.fallback
  });
}

function jsonpProxy_request(options: xhr_request.Options) {
  options.fallback(null);
}

function yqlProxy_request(options: xhr_request.Options) {
  options.fallback(null);
}
