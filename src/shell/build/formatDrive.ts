namespace shell.build.formatDrive {

  export function date(dt: Date|number) {
    return persistence.dom.DOMTotals.formatDate(typeof dt==='number' ? new Date(dt) : <Date>dt);
  }

  export function file(file: string, content: string) {
    var fi = new persistence.dom.DOMFile(/*node*/null, file, null, 0, 0);
    var html = wrapInComment(fi.write(content));
    return html;
  }

  export function totals(date: number | Date, totalSize: number) {
    var tots = new persistence.dom.DOMTotals(+date, totalSize, /*node*/null);
    var html = wrapInComment(tots.updateNode());
    return html;
  }

  function wrapInComment(text) {
    var html = '<'+ '!--' + text + '--'+'>';
    return html;
  }
}