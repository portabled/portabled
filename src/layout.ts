module teapo {

  export function cleanContent(element: HTMLElement) {
    if (element.tagName.toLowerCase()==='body') {
      cleanBodyContent(<HTMLBodyElement>element);
      return;
    }

    if ('innerHTML' in element)
        element.innerHTML = '';
    else if ('textContent' in element)
        element.textContent = '';
    else if ('innerText' in element)
        element.innerText = '';
  }

  function cleanBodyContent(body: HTMLBodyElement) {
    var children = [];
    for (var i = 0; i < document.body.children.length; i++) {
      children[i] = document.body.children[i];
    }
    for (var i = 0; i < children.length; i++) {
      if (children[i].tagName.toLowerCase()==='script')
        continue;
      document.body.removeChild(children[i]);
    }
  }
}