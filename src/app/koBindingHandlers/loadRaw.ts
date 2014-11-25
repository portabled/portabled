module teapo.app.koBindingHandlers.loadRaw {

  export function init(elem, valueAccessor, allBindings, viewModel, bindingContext) {
    valueAccessor();
    return { controlsDescendantBindings: true };
  }

}