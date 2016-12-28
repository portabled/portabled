var http = require('http');
var keepAlive = setTimeout(function() { }, 1000*60*5);


console.log('get...');
var req = http.get({host:'google.com', path: '/'});


req.on('response',function(res) {
  console.log('response: ', res.statusCode);

  res.on('data', function(dt) {
    console.log('>'+dt);
  });

  res.on('end', function() {
    console.log('END ', res.statusCode);
    clearTimeout(keepAlive);
  });

  res.on('error', function(err) {
    console.log('ERROR ', err);
    clearTimeout(keepAlive);
  });

}).on('error', function(err) {
  console.log('Error ', err);
  clearTimeout(keepAlive);
});
