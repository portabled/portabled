declare var tests;

function wrapScript(replacements: substitute.Replacements) {
  var result = functionBody(
    (template_content+'').replace(/\<\/\[script/g, '</'+'script').replace(
      /\"\#build_functions\#\"/,
      functionBody+'\n'+
      functionArgs+'\n'+
      jsString+'\n'+
      jsStringLong+'\n'),
    replacements as any);

  result = result.replace(/^\s+/, '').replace(/\s+$/, '')+'\n';
  return result;
}

function template_content() {

  // <script>document.body.innerHTML = '' </[script> <script id=submodule_script>

  "#lib#"

  if (typeof module!=='undefined' && module && module.exports) {

    "#lib_exports#"

  }
  else {
    document.body.style.color = 'white';

    "#lib_tests#"

    // running tests from HTML page
    var ui = document.createElement('div');
    ui.style.color = 'black';
    ui.innerHTML = '<h2> Tests for submodule... </h2>';
    window.onload = function() {
      runTests(generateTests());
    };

  }

  // # sourceURL=/submodule_script.js </[script>
  /* <style>
  .prepared {
    opacity: 0.5;
  }
  .running {
    opacity: 1;
    color: cornflowerblue;
    font-weight: bold;
  }
  .success {
   opacity: 1;
  }
  .fail {
    opacity: 1;
    color: tomato;
  }
  .fail pre {
    font-size: 70%;
    margin: 0px; margin-left: 1em;
    padding: 0px;
  }
  </style><script id=tests_scripts> /* */

  "#tests#"

  function runTests(tests) {

    var testFilter = location.hash;
    if (testFilter && testFilter.charAt(0)==='#') testFilter = testFilter.slice(1);

    var summary = document.createElement('h2');
    summary.style.color = 'black';

    if ('textContent' in summary) summary.textContent = 'Tests (total '+tests.length+'):';
    else (summary as HTMLElement).innerText = tests.length+'Tests (total '+tests.length+'):';
    var successCount = 0;
    var failCount = 0;
    document.body.appendChild(summary);

    var testList = document.createElement('div');
    testList.style.color = 'black';

    var disabledTestList = document.createElement('div');
    disabledTestList.style.color = 'gold';

    var runIndex = 0;
    var testsToRun = [];
    for (var i = 0; i < tests.length; i++) {
      addTestRow(i);
    }

    document.body.appendChild(testList);
    document.body.appendChild(disabledTestList);

    setTimeout(function() {
      continueRunTests();
    }, 10);

    function continueRunTests() {

      var endTimeSlice = (Date.now ? Date.now() : +new Date()) + 300;

      // keep running if possible
      while (true){

        var stillWithinCycle = true;
        var completedSynchronously = false;

        // skip the disabled
        while (true) {
          if (runIndex === testsToRun.length) return;
          var t = testsToRun[runIndex];
          runIndex++;
          if (!t.disabled) break;
        }

        if (typeof console!=='undefined' && console && console.log) {
          console.log(t.testEntry.textContent || t.testEntry.innerText+'...');
        }

        var start = +new Date();
        t.testEntry.className = 'running';
        t.run(function(error) {
          var finish = +new Date();

          var failed = error || (error !== null && typeof error !== 'undefined');

          if (failed) {
            if (typeof console!=='undefined' && console && console.error) {
              console.error('  ', error, (finish-start)/1000+'s.'+(' '+error.stack?error.stack:''));
            }
          }
          else {
            if (typeof console!=='undefined' && console && console.log) {
              console.log('  OK'+(finish-start)/1000+'s.');
            }
          }

          var tm = document.createElement('span');
          if ('textContent' in tm) tm.textContent = ' '+(finish-start)+'ms';
          else (tm as HTMLElement).innerText = ' '+(finish-start)+'ms';
          tm.style.fontSize = '80%';
          t.testEntry.appendChild(tm);

          if (!failed) {
            t.testEntry.className = 'success';
            successCount++;
          }
          else {
            t.testEntry.className = 'fail';
            var errorOutput = document.createElement('pre');
            if ('textContent' in errorOutput) errorOutput.textContent = error;
            else (errorOutput as HTMLElement).innerText = error;
            t.testEntry.appendChild(errorOutput);
            failCount++;
          }

          var summaryText =
              'Tests ('+
              (failCount?'failed '+failCount:'no fails')+
              ', succeeded '+successCount+
              (testsToRun.length>failCount+successCount?', '+(testsToRun.length-failCount-successCount)+' to finish':'')+'):';

          if ('textContent' in summary) summary.textContent = summaryText;
          else (summary as HTMLElement).innerText = summaryText;

          if (stillWithinCycle) {
            completedSynchronously = true;
          }
          else {
            // async anyway, continue inline
          	continueRunTests();
          }
        });

        stillWithinCycle = false;
        if (completedSynchronously) {
          var now = Date.now ? Date.now() : +new Date();
          if (now>endTimeSlice) {
            setTimeout(continueRunTests, 1);
            return;
          }
        }
        else {
          return;
        }
      }
    }

    function addTestRow(i) {
      var t = tests[i];
      var testEntry = document.createElement('div');
      if (testFilter && t.name.toLowerCase().indexOf(testFilter.toLowerCase())<0) {
      	testEntry.className = 'disabled';
        t.disabled = true;
        disabledTestList.appendChild(testEntry);
      }
      else{
      	testEntry.className = 'prepared';
        testsToRun.push(t);
      	testList.appendChild(testEntry);
      }

      if ('textContent' in testEntry) testEntry.textContent = t.name;
      else (testEntry as HTMLElement).innerText = t.name;
      t.testEntry = testEntry;
    }
  }


  function assert(condition, message) {
    if (!condition) throw new Error(message||'Failure '+condition);
  }

  (assert as any).equal = (function(){
    function equal(expected, actual, message) {
      if (expected!=actual) throw new Error(message||'Unmatch: '+expected+' != '+actual);
    }
    return equal;
  })();

  function generateTests() {

    var allTests = [];
    var _dummy = {};

    for (var k in tests) if (!(k in _dummy) && tests[k] && /^[a-z\_]/.test(k)) {
      collectTests(k, tests[k]);
    }

    return allTests;


    function collectTests(prefix, obj) {
      if (!obj) return;
      for (var k in obj) if (!(k in _dummy) && obj[k]) {
        if (/^[A-Z]/.test(k) && typeof obj[k] === 'function') {
          // TODO: should we construct here?
        }
        else if (/^[a-z]/.test(k)) {
          if (typeof obj[k]==='function') {
            if (k==='generateTests') {
              var moreTests = obj.generateTests();
              collectTests(prefix, moreTests);
            }
            else {
              addTest(prefix+'.'+k, obj, k);
            }
          }
          else if (typeof obj[k]==='object' && /^[a-z]/.test(k)) {
            collectTests(prefix+'.'+k, obj[k]);
          }
        }
      }
    }

    function addTest(fullname, thisObj, key) {
      var args = functionArgs(thisObj[key]);
      if (args && /callback/.test(args)) {
        allTests.push({
          name: fullname,
          run: function(callback) {
            try {
              thisObj[key](callback);
            }
            catch (error) {
              callback(error);
            }
          }
        });
      }
      else {
        allTests.push({
          name: fullname,
          run: function(callback) {
            try {
              thisObj[key]();
            }
            catch (error) {
              callback(error);
              return;
            }

            callback(null);
          }
        });
      }
    }

  }

  "#build_functions#"

  // # sourceURL=/tests_scripts.js </[script>
}