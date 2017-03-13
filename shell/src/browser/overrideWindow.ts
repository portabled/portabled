function overrideWindow(window: Window, drive: persistence.Drive, cachePath: string, localStorageCachePath: string) {

  function WindowOverride() {
  }

  function overrideProp(k: string) {
    try {
      var origFn = window[k];
      if (typeof origFn==='function') {
        win[k] = origFn.bind(window);
      }
    }
    catch (err) {
      win[k] = '';
    }
  }

  WindowOverride.prototype = window;

  var win = new WindowOverride();
  Object.defineProperty(win, 'window', { get: function() { return win; } });

  var doc = overrideDocument(window.document);
  Object.defineProperty(win, 'document', { get: function() { return doc; } });

  var xhr = overrideXHR(drive, cachePath);
  Object.defineProperty(win, 'XMLHttpRequest', { get: function() { return xhr; } });

  var ls = overrideLocalStorage(drive, localStorageCachePath);
  Object.defineProperty(win, 'localStorage', { get: function() { return ls; } });

  var evalFn = function(str) {
    return win.eval(str);
  };
  Object.defineProperty(win, 'eval', {
    get: function() { return evalFn; },
    set: function() {
      console.error('EVAL OVERRIDE?');
    }
  });

  for (var k in window) if (('window,document.XMLHttpRequest,localStorage').indexOf(k)<0) {
    overrideProp(k);
  }

  return win;


  function overrideDocument(document: Document) {

    function DocumentOverride() {
    }

    function proxyProperty(k: string) {
      try {
        var val = document[k];
        if (typeof val === 'function') {
          var fn = document[k].bind(document);
          protot[k] = fn;
        }
        else {
          Object.defineProperty(protot, k, {
            get: function() {
              try {
                return document[k];
              }
              catch (error) {
                return data[k];
              }
            },
            set: function(value) { try { return document[k] = data[k] = value; } catch (error) { return data[k] = value; } }
          });
        }
      }
      catch (error) {
        protot[k] = '';
      }
    }

    var protot = {};
    var data = {};

    for (var k in document) if (!(k in protot)) {
      proxyProperty(k);
    }

    DocumentOverride.prototype = protot;

    var doc = new DocumentOverride();
    return doc;

  }

  function overrideLocalStorage(drive: persistence.Drive, cachePath: string) {

    var keys: string[] = null;

    function updateKeys() {
      if (keys) return;
      keys = [];
      var files = drive.files();
      for (var i = 0; i < files.length; i++) {
        if (files[i].length > cachePath.length && files[i].slice(0, cachePath.length) === cachePath) {
          keys.push(files[i].slice(cachePath.length));
        }
      }
    }

    var localStorage =  {

      key: function(index: number): string {
        updateKeys();
        return keys[index];
      },

      getItem: function(key: string): string {
        return drive.read(cachePath + key);
      },

      setItem: function(key: string, value: string) {
        drive.write(cachePath + key, value || '');
        keys = null;
      },

      removeItem: function(key: string) {
        drive.write(cachePath + key, null);
        keys = null;
      }

    };

    Object.defineProperty(localStorage, 'length', {
      get: () => {
        updateKeys();
        return keys.length;
      }
    });

    return localStorage;

  }

  function overrideXHR(drive: persistence.Drive, cachePath: string) {

    function XMLHttpRequestOverride() {
      this.status = 0;
      this.readyState = 0;
      this.responseText = null;
      this.onreadystatechange = null;
    }

    XMLHttpRequestOverride.prototype = {

      open: function(verb: string, url: string) {
        this._url = url;
      },

      send: function() {
        var that = this;
        setTimeout(function() {
          var cleanUrl = that._url;
          var qpos = cleanUrl.indexOf('?');
          if (qpos>0) cleanUrl = cleanUrl.slice(0, qpos);

          var path = cachePath + cleanUrl;

          that.responseText = drive.read(path);
          if (/\.js$/.test(path) && this.responseText) this.responseText += '//'+'# '+'sourceURL='+cleanUrl;

          if (that.responseText===null) {
            that.status = 404;
            that.statusText = 'Not found '+path;
            that.readyState = 4;
            console.error(path+' not found (XHR)');
          }
          else {
            that.status = 200;
            that.statusText = 'OK'
            that.readyState = 4;
          }
          if (that.onreadystatechange) that.onreadystatechange();
        }, 1);
      },

      setRequestHeader: function() { },
      getAllResponseHeaders: function() { return []; }

    };

    return XMLHttpRequestOverride;

  }

}