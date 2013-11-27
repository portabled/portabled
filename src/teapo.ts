/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />

/// <reference path='ko.ts' />
/// <reference path='shell.ts' />

/// <reference path='editor-std.ts' />
/// <reference path='editor-ts.ts' />

function start() {
  teapo.registerKnockoutBindings(ko);

  var viewModel = new teapo.ApplicationShell();

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
}

start();