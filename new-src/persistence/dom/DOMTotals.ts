module persistence.dom {

  var monthsPrettyCase = ('Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec').split('|');
  var monthsUpperCase = ('Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec').toUpperCase().split('|');

  export class DOMTotals {

    constructor(
    	public timestamp: number,
    	public totalSize: number,
      private _node: Comment) {
    }

    static tryParse(cmheader: CommentHeader): DOMTotals {

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

        var savedFmt = /^\s*saved\s+(\d+)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)\s+(\d+)\:(\d+)(\:(\d+(\.(\d+))?))\s*(GMT\s*[\-\+]?\d+\:?\d*)?\s*$/i;
        var savedMatch = savedFmt.exec(parts[i]);
        if (savedMatch) {
          // 25 Apr 2015 22:52:01.231
          try {
            var savedDay = parseInt(savedMatch[1]);
            var savedMonth = monthsUpperCase.indexOf(savedMatch[2].toUpperCase());
            var savedYear = parseInt(savedMatch[3]);
            if (savedYear < 100)
              savedYear += 2000; // no 19xx notation anymore :-(
            var savedHour = parseInt(savedMatch[4]);
            var savedMinute = parseInt(savedMatch[5]);
            var savedSecond = savedMatch[7] ? parseFloat(savedMatch[7]) : 0;

            timestamp = new Date(savedYear, savedMonth, savedDay, savedHour, savedMinute, savedSecond | 0).valueOf();
            timestamp += (savedSecond - (savedSecond | 0))*1000; // milliseconds

            var savedGMTStr = savedMatch[10];
            if (savedGMTStr) {
              var gmtColonPos = savedGMTStr.indexOf(':');
              if (gmtColonPos>0) {
                var gmtH = parseInt(savedGMTStr.slice(0, gmtColonPos));
                timestamp += gmtH * 60 /*min*/ * 60 /*sec*/ * 1000 /*msec*/;
                var gmtM = parseInt(savedGMTStr.slice(gmtColonPos + 1));
                timestamp += gmtM * 60 /*sec*/ * 1000 /*msec*/;
              }
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
      // TODO: update the node content

      // total 4Kb, saved 25 Apr 2015 22:52:01.231
      var newTotals =
        'total ' + (
          this.totalSize < 1024 * 2 ? this.totalSize + '' :
            this.totalSize < 1024 * 1024 * 2 ? ((this.totalSize / 1024) | 0) + 'Kb' :
              ((this.totalSize / (1024 * 1024)) | 0) + 'Mb') + ', ' +
        'saved ';

      var saveDate = new Date(this.timestamp);
      newTotals +=
        saveDate.getDate() + ' ' +
        monthsPrettyCase[saveDate.getMonth()] + ' ' +
      	saveDate.getFullYear() + ' ' +
      	num2(saveDate.getHours()) + ':' +
        num2(saveDate.getMinutes()) + ':' +
        num2(saveDate.getSeconds()) + '.' +
        this.timestamp.toString().slice(-3);

      var saveDateLocalStr = saveDate.toString();
      var gmtMatch = (/(GMT\s*[\-\+]\d+(\:\d+)?)/i).exec(saveDateLocalStr);
      if (gmtMatch)
        newTotals += ' ' + gmtMatch[1];

      this._node.nodeValue = newTotals;

      function num2(n: number) {
        return n <= 9 ? '0' + n : '' + n;
      }

    }

  }


}