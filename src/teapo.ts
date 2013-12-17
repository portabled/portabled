/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />

/// <reference path='ko.ts' />
/// <reference path='shell.ts' />

/// <reference path='editor-std.ts' />
/// <reference path='editor-x-ts.ts' />
/// <reference path='editor-x-html.ts' />
/// <reference path='editor-x-js.ts' />
/// <reference path='editor-x-css.ts' />

(function() {

  var loadingDiv = document.createElement('div');
  loadingDiv.className='teapo-boot';
  loadingDiv.textContent = loadingDiv.innerText = 'Loading...';

  var pageElement: HTMLElement = null;

  for (var i = 0; i < document.body.childNodes.length; i++) {
    var e = <HTMLElement>document.body.childNodes.item(i);
    if (e && e.tagName && e.tagName.toLowerCase()
      && e.className && e.className.indexOf('teapo-page')>=0) {

      pageElement = e;
      pageElement.appendChild(loadingDiv);
      break;

    }
  }
  

  function start() {

    loadingDiv.textContent = 'Loading storage...';

    var storage: teapo.DocumentStorage = null;
    var viewModel: teapo.ApplicationShell = null;

    pageElement.appendChild(loadingDiv);

    function storageLoaded() {

      loadingDiv.textContent += ' rendering...';

      setTimeout(() => {
        teapo.registerKnockoutBindings(ko);
        (<any>teapo.EditorType).Html.storageForBuild = storage;

        viewModel = new teapo.ApplicationShell(storage);

        ko.renderTemplate('page-template', viewModel, null, pageElement);
       }, 1);
    }

    var forceLoadFromDom = window.location.hash && window.location.hash.toLowerCase()==='#resettodom';

    teapo.openStorage(
      {
        documentStorageCreated: (error,s) => {
          storage = s;
          storageLoaded();
        },
        getType: (fullPath) => teapo.EditorType.getType(fullPath),
        getFileEntry: (fullPath) => viewModel.fileList.getFileEntry(fullPath),
        setStatus: (text) => loadingDiv.textContent = text
      },
      forceLoadFromDom);
  }

  if (window.addEventListener) {
    window.addEventListener('load', start, true);
  }
  else {
    window.onload = start;
  }

  
})();
