function formatTotalsInner(timestamp: number, totalSize: number): string {

  var tot = new DOMTotals(timestamp, totalSize, /*node*/null as any);
  return tot.updateNode() as string;

}

function formatFileInner(path: string, content: any): string {

  var fi = new DOMFile(/*node*/null as any, path, /* encoding */null as any, 0, 0);
  var entry = bestEncode(content);
  return fi.write(entry.content, entry.encoding) as string;

}