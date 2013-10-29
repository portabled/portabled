/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />

/// <reference path='ApplicationLayout.ts' />
/// <reference path='ApplicationState.ts' />

window.onload = function() {
  var layout = new ApplicationLayout(document.body);
  var state = new ApplicationState(layout);
}
