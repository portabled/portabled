/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />

/// <reference path='ko.ts' />
/// <reference path='shell.ts' />

/// <reference path='editor-std.ts' />
/// <reference path='editor-ts.ts' />
/// <reference path='editor-html.ts' />
/// <reference path='editor-js.ts' />

function start() {

  var storage: teapo.DocumentStorage = null;
  var viewModel: teapo.ApplicationShell = null;

  var storageLoaded = () => {
    teapo.registerKnockoutBindings(ko);
  
    viewModel = new teapo.ApplicationShell(storage);
  
    var pageElement: HTMLElement = null;
  
    for (var i = 0; i < document.body.childNodes.length; i++) {
      var e = <HTMLElement>document.body.childNodes.item(i);
      if (e && e.tagName && e.tagName.toLowerCase()!=='script') {
        if (e.className && e.className.indexOf('teapo-page')>=0) {
          pageElement = e;
          continue;
        }
  
        document.body.removeChild(e);
        i--;
      }
    }
  
    ko.renderTemplate('page-template', viewModel, null, pageElement);
  };

  teapo.openStorage(
    {
      documentStorageCreated: (error,s) => {
        storage = s;
        storageLoaded();
      },
      getType: (fullPath) => teapo.EditorType.getType(fullPath),
      getFileEntry: (fullPath) => viewModel.fileList.getFileEntry(fullPath)
    });
}

// TODO: remove this ridiculous timeout (need to insert scripts above teapo.js)
setTimeout(start, 100);
