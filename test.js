var window = require('nowindow');

var Worker = window.Worker;
console.log(Worker);
var worker = new Worker('data:application/javascript,'+window.encodeURIComponent(worker_body)+'; worker_body()');

var waiton = setInterval(function() { console.log('  waiton...'); }, 1000);

setTimeout(function() {
  clearInterval(waiton);
  worker.terminate();
}, 10000);

worker.onmessage = function (e) {
  console.log(e.data);
  clearInterval(waiton);
  worker.terminate();
};

worker.postMessage({
  script: '(function() { throw new Error("OK"); })() //#sourceURL=/workr-test.js'
});


worker.postMessage({
  script: '1+1 // #sourceURL=/workr-test.js'
});

function worker_body() {
  self.onmessage = function(e) {
    var data = e.data;
    try {
      var result = eval(data.script);
      postMessage({result:result});
    }
    catch (error) {
      try {
        postMessage({error:error}, [error]);
      }
      catch (ex) {
        var errorCopy = {message: error.message, stack: error.stack};
        for (var k in error) if (!(k in errorCopy)) {
          if (typeof error[k]==='number' || typeof error[k]==='string')
            errorCopy[k] = error[k];
        }

        postMessage({error:errorCopy});
      }
    }
  };

}