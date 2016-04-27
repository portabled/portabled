module teapo.testApp {

  export function run() {

    //     try {


    var pageElement: HTMLElement = null;

    for (var i = 0; i < document.body.childNodes.length; i++) {
      var e = <HTMLElement>document.body.childNodes.item(i);
      if (e && e.tagName && e.tagName.toLowerCase()
        && e.className && e.className.indexOf('teapo-page') >= 0) {

        pageElement = e;
        break;

      }
    }


    addEventListener(window, 'keydown', e => {
      if ((<any>e).keyCode === 83 /* S */) {
        var blob: Blob = new (<any>Blob)(['<!doctype html>\n', document.documentElement.outerHTML], { type: 'application/octet-stream' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', 'teapo-tests.html');
        try {
          // safer save method, supposed to work with FireFox
          var evt = document.createEvent("MouseEvents");
          (<any>evt).initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
          a.dispatchEvent(evt);
        }
        catch (e) {
          a.click();
        }
      }
    });


    var testPage = new teapo.tests.TestPage();
    ko.renderTemplate('TestPage', testPage, null, pageElement);

    setTimeout(() => {
      testPage.start();
    }, 10);


    //     }
    //     catch (initError) {
    //       alert(initError.message + ' ' + (initError.stack ? initError.stack : initError));
    //     }
  }

}