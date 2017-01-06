declare var require, process;

declare namespace buildStats {

  interface Values {
    timestamp: number;
    taken: number;
    platform: string;
  }

}

function buildStats() {
  var buildStartTime = +new Date();

  return completeBuildStats;

  function completeBuildStats() {
    var platform;
    try { platform = require('nowindow').navigator.userAgent }
    catch (error) {
      if (process.versions.navigator)
        platform = process.versions.navigator;
      else
        platform = 'node '+process.version+' on '+process.platform+'/'+process.arch;
    }

    var buildFinishTime = new Date();

    return {
      timestamp: +buildFinishTime,
      taken: (+buildFinishTime)-buildStartTime,
      platform: platform,

      toString: function() {
        return (
          '{\n'+
          '    timestamp: '+(+buildFinishTime)+', // '+buildFinishTime+'\n'+
          '    taken: '+((+buildFinishTime)-buildStartTime)+',\n'+
          '    platform: '+jsString(platform)+'\n'+
          '}');
      }
    };

  }
}
