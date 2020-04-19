var monthsPrettyCase = ('Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec').split('|');
var monthsUpperCaseStr = monthsPrettyCase.join('').toUpperCase();

class DOMTotals {

  // cache after updating DOM, to avoid unneeded updates
  private _domTimestamp: number = -1;
  private _domTotalSize: number = -1;

  constructor(
    public timestamp: number,
    public totalSize: number,
    public node: Comment) {
  }

  static tryParse(
    cmheader: {
      header: string;
      contentOffset: number;
      contentLength: number;
      node: Comment;
    }): DOMTotals | null {

    // TODO: preserve unknowns when parsing

    var parts = cmheader.header.split(',');
    var anythingParsed = false;
    var totalSize = 0;
    var timestamp = 0;

    for (var i = 0; i < parts.length; i++) {

      // total 234Kb
      // total 23
      // total 6Mb

      var totalFmt = /^\s*total\s+(\d*)\s*([KkMm])?b?\s*$/;
      var totalMatch = totalFmt.exec(parts[i]);
      if (totalMatch) {
        try {
          var total = parseInt(totalMatch[1]);
          if ((totalMatch[2] + '').toUpperCase() === 'K')
            total *= 1024;
          else if ((totalMatch[2] + '').toUpperCase() === 'M')
            total *= 1024 * 1024;
          totalSize = total;
          anythingParsed = true;
        }
        catch (totalParseError) { }
        continue;
      }

      var savedFmt = /^\s*saved\s+(\d+)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)(\s+(\d+)\:(\d+)(\:(\d+(\.(\d+))?))\s*(GMT\s*[\-\+]?\d+\:?\d*)?)?\s*$/i;
      var savedMatch = savedFmt.exec(parts[i]);
      if (savedMatch) {
        // 25 Apr 2015 22:52:01.231
        try {
          var savedDay = parseInt(savedMatch[1]);

          // first find string index within JANFEBMAR...NOVDEC then divide by three
          // which happens to be (0...11)*3
          var savedMonth = monthsUpperCaseStr.indexOf(savedMatch[2].toUpperCase());
          if (savedMonth>=0 && savedMonth % 3 === 0)
            savedMonth = savedMonth/3;

          var savedYear = parseInt(savedMatch[3]);
          if (savedYear < 100)
            savedYear += 2000; // no 19xx notation anymore :-(
          var savedHour = parseInt(savedMatch[5]);
          var savedMinute = parseInt(savedMatch[6]);
          var savedSecond = savedMatch[8] ? parseFloat(savedMatch[8]) : 0;

          if (savedMatch[4]) {
            timestamp = new Date(savedYear, savedMonth, savedDay, savedHour, savedMinute, savedSecond | 0).valueOf();
            timestamp += (savedSecond - (savedSecond | 0))*1000; // milliseconds

            var savedGMTStr = savedMatch[11];
            if (savedGMTStr) {
              var gmtColonPos = savedGMTStr.indexOf(':');
              if (gmtColonPos>0) {
                var gmtH = parseInt(savedGMTStr.slice(0, gmtColonPos));
                timestamp += gmtH * 60 /*min*/ * 60 /*sec*/ * 1000 /*msec*/;
                var gmtM = parseInt(savedGMTStr.slice(gmtColonPos + 1));
                timestamp += gmtM * 60 /*sec*/ * 1000 /*msec*/;
              }
            }
          }
          else {
            timestamp = new Date(savedYear, savedMonth, savedDay).valueOf();
          }

          anythingParsed = true;
        }
        catch (savedParseError) { }
      }

    }

    if (anythingParsed)
      return new DOMTotals(timestamp, totalSize, cmheader.node);
    else
      return null;
  }

  updateNode() {

    if (this._domTimestamp===this.timestamp && this._domTotalSize===this.totalSize) return;

    // total 4Kb, saved 25 Apr 2015 22:52:01.231
    var newTotals =
        'total ' + DOMTotals.formatSize(this.totalSize) + ', ' +
        'saved ' + DOMTotals.formatDate(new Date(this.timestamp));

    if (!this.node) return newTotals;

    this.node.nodeValue = newTotals;
    this._domTimestamp = this.timestamp;
    this._domTotalSize = this.totalSize;
  }

  static formatSize(totalSize: number): string {
    return (
      totalSize < 1024 * 9 ? totalSize + '' :
      totalSize < 1024 * 1024 * 9 ? ((totalSize / 1024) | 0) + 'Kb' :
      ((totalSize / (1024 * 1024)) | 0) + 'Mb');
  }

  static formatDate(date: Date): string {

    var dateLocalStr = date.toString();
    var gmtMatch = (/(GMT\s*[\-\+]\d+(\:\d+)?)/i).exec(dateLocalStr);

    var d = date.getDate();
    var MMM = monthsPrettyCase[date.getMonth()];
    var yyyy = date.getFullYear();
    var h = date.getHours();
    var m = date.getMinutes();
    var s = date.getSeconds();
    var ticks = +date;

    var formatted =
        d +
        ' ' + MMM +
        ' ' + yyyy +
        (h>9 ? ' ' : ' 0') + h +
        (m>9 ? ':' : ':0') + m +
        (s>9? ':' : ':0') + s +
        '.' +(ticks).toString().slice(-3) +
        (gmtMatch && gmtMatch[1]!=='GMT+0000' ? ' ' + gmtMatch[1] : '');

    return formatted;
  }

}