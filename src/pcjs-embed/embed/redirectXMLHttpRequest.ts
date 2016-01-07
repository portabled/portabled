module shell {

  export function redirectXMLHttpRequest(drive: persistence.Drive, cwd?: string) {

    class XMLHttpRequestOverride {

      private _url: string;

      status = 0;
      readyState = 0;
      responseText: string = null;
      onreadystatechange: () => void = null;

      open(method: string, url: string) { this._url = url; }

      send() {
        var path = (this._url.charAt(0) === '/' ? '' : cwd) + this._url;
        this.responseText = drive.read(path);
        if (this.responseText) {
          console.log('responding ' + path + ' [' + this.responseText.length + ']');
        }
        else {
          console.log('failed to load ' + path);
        }
        this.status = 200;
        this.readyState = 4;
        setTimeout(() => this.onreadystatechange());
      }
    }

    return XMLHttpRequestOverride;

  }
}