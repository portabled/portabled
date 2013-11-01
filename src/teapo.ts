/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />

/// <reference path='ApplicationLayout.ts' />
/// <reference path='ApplicationState.ts' />

/// <reference path='ApplicationViewModel.ts' />
/// <reference path='KnockoutBindings.ts' />

//window.onload = function() {
//  var layout = new teapo.ApplicationLayout(document.body);
//  var state = new teapo.ApplicationState(layout);
//}

window.onload = function() {
  teapo.registerKnockoutBindings(ko);

  var viewModel = new teapo.ApplicationViewModel();

  ko.renderTemplate('bodyTemplate', viewModel, null, document.body);
}
