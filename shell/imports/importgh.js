var win = require('nowindow');
var fs = require('fs');

module.exports.loadFilesTo = function(owner, repo, files, targetFile, callback) {

  var load = function(callback) {

    var loadOne = function(i) {
      console.log(i+'. '+files[i]+'...');
      loadJSONP(
        //'https://en.wikipedia.org/w/api.php?action=parse&format=json&callback=',
        baseUrl.replace('{path}', files[i]),
        function(dt) {
          results[i] = dt;
          completed++;
          console.log(i+'. '+files[i]+' '+completed+' out of '+files.length);
          if (completed === files.length) {
            callback(results);
          }
        });
    }


    var baseUrl = 'https://api.github.com/repos/'+owner+'/'+repo+'/contents{path}?format=jsonp&callback={callback}';

    var results  = [];
    var completed = 0;
    for (var i = 0; i < files.length; i++) {
      loadOne(i);
    }

  };

  var loadJSONP = function(url, callback) {
    var scr = win.document.createElement('script');
    var rnd = 'a_rnd'+Math.random().toString().replace(/\./, '')+'_t'+(+new Date());
    var fullUrl = url.replace('{callback}', rnd);
    scr.src = fullUrl;
    win[rnd] = function(dt) {
      win.document.body.removeChild(scr);
      setTimeout(function() {
        try {
          callback(dt);
        }
        catch (error) {
          console.log(fullUrl, error);
        }
      }, 10);
    };
    win.document.body.appendChild(scr);
  };


  load(function(dts) {
    var totalTextLines = [];
    totalTextLines.push('/** imported '+dts.length+' from '+owner+'/'+repo+' at '+(new Date())+' **/');
    for (var i = 0; i < dts.length; i++) {
      var content = dts[i].data.content ||'';
      var decoded = win.atob(content);
      console.log(i+'. '+files[i]+' '+JSON.stringify(dts[i].meta));
      totalTextLines.push('/** imported '+owner+'/'+repo+files[i]+' **/\n' + decoded);
    }
    var totalText = totalTextLines.join('\n\n\n');

    console.log('write ', totalText.length);
    fs.writeFileSync(targetFile, totalText);

    if (callback) callback();
  });

};