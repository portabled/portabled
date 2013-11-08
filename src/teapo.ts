/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />

/// <reference path='ApplicationViewModel.ts' />
/// <reference path='KnockoutBindings.ts' />

window.onload = function() {
  teapo.registerKnockoutBindings(ko);

  var viewModel = new teapo.ApplicationViewModel();

  ko.renderTemplate('bodyTemplate', viewModel, null, document.body);
}
