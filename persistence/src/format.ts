function formatTotalsInner(timestamp: number, totalSize: number): string {

  var tot = new DOMTotals(timestamp, totalSize, /*node*/null);
  return tot.updateNode();

}

function formatFileInner(path: string, content: any): string {

  var fi = new DOMFile(/*node*/null, path, null, 0, 0);
  return <string>fi.write(content);

}