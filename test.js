var http = require('http');

var req = http.get({host:'google.com', path: '/'});


req.on('response',function(res) {
  console.log('response: ', res.statusCode);

  res.on('data', function(dt) {
    console.log('>'+dt);
  });

  res.on('end', function() {
    console.log('END ', res.statusCode);
  });

  res.on('error', function(err) {
    console.log('ERROR ', err);
  });

}).on('error', function(err) {
    console.log('Error ', err);
});
