var fs = require('fs');
var win = require('nowindow');
var dialogHost = require('nodialog');

loadGithubApi(function(error, Github) {
  if (error)
    console.log(error);
  else
    runWithGithubApi(Github);
});

function runWithGithubApi(Github) {
  var pushDialog = win.document.createElement('div');
  pushDialog.style.cssText = 'position: absolute; top: 20%; left: 20%; width: 60%; height: 60%; border: solid 1px white; padding: 1em; background: firebrick;';

  pushDialog.innerHTML =
    '<h2 id=push_title style="margin: 0px; width: auto; padding-right: 1em; border-bottom: solid 1px white;">Commit/push to GitHub</h2>'+
    '<div>This will create a commit in GitHub this shell as a single file. Please provide credentials and the repo names below.</div>'+
    '<table>'+
    '<tr><td style="text-align: right;">owner</td><td> <input id=push_owner> </td></tr>'+
    '<tr><td style="text-align: right;">repo</td><td> <input id=push_repo> </td></tr>'+
    '<tr><td style="text-align: right;">branch</td><td> <input id=push_branch value=master> </td></tr>'+
    '<tr><td style="text-align: right;">file</td><td> <input id=push_file> </td></tr>'+
    '<tr><td style="text-align: right;">username</td><td> <input id=push_username> </td></tr>'+
    '<tr><td style="text-align: right;">password</td><td> <input type=password id=push_password> </td></tr>'+
    '<tr><td style="text-align: right;">full name</td><td> <input id=push_full_name> </td></tr>'+
    '<tr><td style="text-align: right;">email</td><td> <input id=push_email> </td></tr>'+
    '<tr><td style="text-align: right;">commit message</td><td> <textarea id=push_commit_message></textarea> </td></tr>'+
    '<tr><td colspan=2 style="text-align: right"> <button id=push_button> Connect </button> </td></tr>'+
    '</table>';

  setTimeout(function() {
    var inputs = pushDialog.getElementsByTagName('input');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].id) inputs[inputs[i].id] = inputs[i];
    }
    var push_button = pushDialog.getElementsByTagName('button')[0];
    var push_commit_message = pushDialog.getElementsByTagName('textarea')[0];

    try {
      if (win.localStorage) {
    		inputs.push_username.value = win.localStorage.getItem('push_username') || '';
    		inputs.push_password.value = win.localStorage.getItem('push_password') || '';
    		inputs.push_full_name.value = win.localStorage.getItem('push_full_name') || '';
    		inputs.push_email.value = win.localStorage.getItem('push_email') || '';
      }
    }
    catch (error) {
    }

    if (/\.github\.io$/i.test(win.location.hostname)) {
      inputs.push_owner.value = win.location.hostname.slice(0, win.location.hostname.length - '.github.io'.length);
      var pathname = win.location.pathname;
      if (pathname==='/') {
        inputs.push_repo.value = win.location.hostname;
        inputs.push_file.value = 'index.html';
      }
      else {
        inputs.push_repo.value = pathname.split('/')[0] || pathname.split('/')[1];
        inputs.push_file.value = pathname.slice(pathname.indexOf(inputs.push_repo.value)+inputs.push_repo.value.length+1) || 'index.html';
      }
      push_commit_message.focus();
    }
    else {
    	inputs.push_owner.focus();
    }

    push_button.onclick = function() {
      win.localStorage.setItem('push_username', inputs.push_username.value);
      win.localStorage.setItem('push_password', inputs.push_password.value);
      win.localStorage.setItem('push_full_name', inputs.push_full_name.value);
      win.localStorage.setItem('push_email', inputs.push_email.value);

      var github = Github({
        username: inputs.push_username.value,
        password: inputs.push_password.value,
        auth: "basic"
      });
      var repo = github.getRepo(inputs.push_owner.value, inputs.push_repo.value);
      var html = '<!'+'doctype html>'+
          win.parent.document.documentElement.outerHTML;
      console.log('html ',+html.length);
      var wr = repo.write(
        inputs.push_branch.value,
        inputs.push_file.value,
        html, push_commit_message.value,
        {
          author: { name: inputs.push_full_name.value, email: inputs.push_email.value },
          encode: true // Whether to base64 encode the file. (default: true)
        },
        function(err) {
     	   console.log('write ',err);
      });
      console.log(wr);
    };

  }, 100);


  var dlg = dialogHost.show(pushDialog);
  dlg.onclose = function() {
    console.log('Closed');
  };
  // TODO: detect or request target
  // TODO: request username/password (where is safe to save?)
  // TODO: request commit message
  // TODO: generate commit using Github API
}

function loadGithubApi(callback) {
  var scr = win.document.createElement('script');
  // old Github.js API at  bc6b263 2 Mar 2016 (ES3-compatible)
  scr.src = 'https://cdn.rawgit.com/michael/github/bc6b2635f1002e2c166a4b1933c492bb5da441e7/dist/github.bundle.min.js';
  scr.onload = function() { setTimeout(function() { callback(null, win.Github); }, 1); };
  scr.onerror = function(err) { callback(err); };
  win.document.body.appendChild(scr);
}