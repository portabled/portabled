/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />

/// <reference path='ko.ts' />
/// <reference path='shell.ts' />

window.onload = function() {
  teapo.registerKnockoutBindings(ko);

  var viewModel = new teapo.ApplicationShell();

  ko.renderTemplate('bodyTemplate', viewModel, null, document.body);
}
