module nobrowser {

  export function overrideXMLHttpRequest(readCache: (url: string, callback: (content: string) => void) => void) {

    return XMLHttpRequestOverride;

    // urlBase - 'https://rawgit.com/jeffpar/pcjs/master'


    class XMLHttpRequestOverride {

      private _url: string = null;

      status = 0;
      readyState = 0;
      responseText = null;
      onreadystatechange: () => void = null;

      open(method: string, url: string) {
        this._url = url;
      }

      send() {
        var completed = false;
        this.readyState = 0;
        readCache(this._url, content => {
          this.status = 200;
          this.readyState = 4;
          this.responseText = content;
          if (completed)
            this.onreadystatechange();
          return;
        });

        if (this.readyState === 4) {
          setTimeout(() => this.onreadystatechange(), 1);
        }


      }

      setRequestHeader() {
      }

    }
  }

	export module overrideXMLHttpRequest {

    export function withDrive(drive: persistence.Drive, cachePath: string, realXMLHttpRequest: typeof XMLHttpRequest) {
      return overrideXMLHttpRequest(
        (url, callback) => {
          var existing = cachePath + (cachePath.slice(-1) === '/' ? '' : '/') + (url.charAt(0) === '/' ? url.slice(1) : url);

          var existingContent = drive.read(existing);
          if (existingContent) {
            callback(existingContent);
            return;
          }

          var xhr = new realXMLHttpRequest();
          xhr.open('GET', url);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              var response = xhr.responseText || xhr.response;
              drive.write(existing, response);
              callback(response);
            }
          };
          xhr.send();
        });
    }

  }

}