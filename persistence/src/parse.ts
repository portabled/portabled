function parseTotalsInner(content: string): { timestamp: number; totalSize: number; } {

  var tot = DOMTotals.tryParse(<any>{ header: content });

  if (tot) return { timestamp: tot.timestamp, totalSize: tot.totalSize };

}

function parseFileInner(content: string): { path: string; read(): string; } {

  var cm = new CommentHeader(<any>{nodeValue: content});
  var fi = DOMFile.tryParse(cm);

  if (fi) return { path: fi.path, read: () => fi.read() };

}

function parseHTML(html: string): { files: { path: string; content: string; start: number; end: number; }[]; totals?: { size: number; timestamp: number; start: number; end: number; }; } {

  var files: { path: string; content: string; start: number; end: number; }[] = [];
  var totals: { timestamp: number; totalSize: number} = null;
  var totalsCommentStart: number;
  var totalsCommentEnd: number;

  var scriptOrCommentStart = /(\<script[\s\>])|(\<!\-\-)/gi;
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

    var commentStartOffset = next.index;
    var start = pos;

    commentEnd.lastIndex = pos;
    next = commentEnd.exec(html);
    if (!next) break; // no end of comment

    var end = next.index;
    var commentEndOffset = next.index+next[0].length;

    var inner = html.slice(start,end);

    pos = next.index + next[0].length;

    if (!totals) {
      totals = parseTotalsInner(inner);
      if (totals) {
        totalsCommentStart = commentStartOffset;
        totalsCommentEnd = commentEndOffset;
        continue;
      }
    }

    var fi = parseFileInner(inner);
    if (fi) files.push({path: fi.path, content: fi.read(), start: commentStartOffset, end: commentEndOffset});
  }

  if (totals) return { files, totals: { size:totals.totalSize, timestamp: totals.timestamp, start: totalsCommentStart, end: totalsCommentEnd } };
  else return { files };
}