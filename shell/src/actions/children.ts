namespace actions {

  export function children(elem: HTMLElement, ...tags: string[]);
  export function children(elem: HTMLElement) {
    var result: any = {};
    for (var iarg = 1; iarg<arguments.length; iarg++) {
      var list = elem.getElementsByTagName(arguments[iarg]);
      for (var i = 0; i < list.length; i++) {
        var el = list.item ? list.item(i) : list[i];
        if (el && el.id) result[el.id] = el;
      }
    }
    return result;
  }

}