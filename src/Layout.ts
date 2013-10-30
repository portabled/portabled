module teapo {

  export function cleanContent(element: HTMLElement) {
      if ('innerHTML' in element)
          element.innerHTML = '';
      else if ('textContent' in element)
          element.textContent = '';
      else if ('innerText' in element)
          element.innerText = '';
  }
}