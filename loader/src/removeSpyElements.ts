function removeSpyElements() {

  removeElements('iframe');
  removeElements('style');
  removeElements('script');

  function removeElements(tagName: string) {
    var list = document.getElementsByTagName(tagName);
    for (var i = 0; i < list.length; i++) {
      var elem = <HTMLElement>(list[i] || list.item(i));

      if ((<any>elem).__knownFrame) continue;

      if (elem && elem.parentElement &&
          elem.getAttribute && elem.getAttribute('data-legit')!=='mi') {
        if ((shell && elem===shell) || (boot && elem===boot)) continue;
        try{ elem.parentElement.removeChild(elem); i--; } catch (error) { }
      }

    }
  }
}
