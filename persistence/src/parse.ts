function parseTotalsInner(content: string): { timestamp: number; totalSize: number; } {

  var tot = DOMTotals.tryParse(<any>{ header: content });

  if (tot) return { timestamp: tot.timestamp, totalSize: tot.totalSize };

}

function parseFileInner(content: string): { path: string; read(): string; } {

  var cm = new CommentHeader(<any>{nodeValue: content});
  var fi = DOMFile.tryParse(cm);

  if (fi) return { path: fi.path, read: () => fi.read() };

}

function parseHTML(html: string): { files: { path: string; content: string; }[]; totalSize?: number; timestamp?: number; } {

  var files: { path: string; content: string; }[] = [];
  var totals: { timestamp: number; totalSize: number} = null;

  var scriptOrCommentStart = /\<(script[\s\>])|(\-\-)/gi;
  var scriptEnd = /\<\/script\s*\>/gi;
  var commentEnd = /\-\-\>/g;

  var pos = 0;
  while (true) {
    scriptOrCommentStart.lastIndex = pos;
    var next = scriptOrCommentStart.exec(html);
    if (!next) break;
    pos = next.index + next[0].length;

    if (next[1]) { // script
      scriptEnd.lastIndex = pos;
      next = scriptEnd.exec(html);
      if (!next) break; // script tag never ends
      pos = next.index + next[0].length;
      continue; // skipped script
    }

    var start = pos;
    pos = next.index + next[0].length;

    commentEnd.lastIndex = pos;
    next = commentEnd.exec(html);
    if (!next) break; // no end of comment

    var end = next.index;
    var inner = html.slice(start,end);

    pos = next.index + next[0].length;

    if (!totals) {
      totals = parseTotalsInner(inner);
      if (totals) continue;
    }

    var fi = parseFileInner(inner);
    if (fi) files.push({path: fi.path, content: fi.read()});
  }

  if (totals) return { files, timestamp: totals.timestamp, totalSize: totals.totalSize };
  else return { files };
}