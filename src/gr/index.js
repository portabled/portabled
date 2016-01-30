/******** JavaScript starts <style>

body>* {
 font-size: 0.1px;
 opacity: 0;
 color: transparent;
}

</style>
<script> /***** script starts here *****/
var fs = require('fs');
var commits = JSON.parse(fs.readFileSync('commits.json'));
var branches = JSON.parse(fs.readFileSync('branches.json'));
var tree = processTree(commits, branches);
dumpTree(tree);

function savePullRequest(owner, repo) {
  var repoUrl = 'https://api.github.com/repos/'+owner+'/'+repo + '/';

  loadPages(jsonpFetchJson, repoUrl+'pulls?state=all&sort=updated&per_page=100', 10, function(pulls) {
    console.log('pull requests: '+pulls.data.length);
    fs.writeFileSync('pulls.json', JSON.stringify(pulls, null, 2));
  });

}

function dumpTree(tree) {
  //console.log(tree);
  if (typeof window!=='undefined' && window)
  	window.tree = tree;

  var minRunLength = 0;
  var maxRunLength = 0;
  var totalRunLength = 0;
  var totalCommentCount = 0;
  var maxCommentCount = 0;
  for (var i = 0; i < tree.runs.length; i++) {
    var r = tree.runs[i];
    totalRunLength += r.commits.length;
    if (i===0 || minRunLength < r.commits.length)
      minRunLength = r.commits.length;
    if (i===0 || maxRunLength > r.commits.length)
      maxRunLength = r.commits.length;
    totalCommentCount += r.commentCount;
    maxCommentCount = Math.max(maxCommentCount, r.commentCount);
  }

  var totalBranchLength = 0;
  var maxBranch = null;
  var nonemptyBranchCount = 0;
  for (var i = 0; i < tree.branches.length; i++) {
    if (!tree.branches[i].commits) continue;
    nonemptyBranchCount++;
    totalBranchLength += tree.branches[i].commits.length;
    if (!maxBranch || tree.branches[i].commits.length > maxBranch.commits.length) {
      maxBranch = tree.branches[i];
    }
  }

  var totalImpliedBranchLength = 0;
  var maxImpliedBranch = null;
  var nonemptyImpliedBranchCount = 0;
  for (var i = 0; i < tree.impliedBranches.length; i++) {
    if (!tree.impliedBranches[i].commits) continue;
    nonemptyImpliedBranchCount++;
    totalImpliedBranchLength += tree.impliedBranches[i].commits.length;
    if (!maxImpliedBranch || tree.impliedBranches[i].commits.length > maxImpliedBranch.commits.length) {
    	maxImpliedBranch = tree.impliedBranches[i];
    }
  }

  var multiBranchNodes = [];
  var noBranchNodes = [];
  for (var sha in tree.commits) {
    var node = tree.commits[sha];
    if (!node.sha) continue;
    if (node.branches && node.branches.length>1)
      multiBranchNodes.push(node);
    if (!node.branches)
      noBranchNodes.push(node);
  }

  var txt =
      'commits['+Object.keys(tree.commits).length+']\n'+
      'runs['+tree.runs.length+']'+
      ' average: '+(((1000*totalRunLength/tree.runs.length)|0)/1000)+
      ' min/max: '+minRunLength+'/'+maxRunLength+
      ' comments: '+totalCommentCount+
      ' max: '+maxCommentCount+'\n'+
      'branches['+nonemptyBranchCount+(tree.branches.length===nonemptyBranchCount ? '' : ' excluding '+(tree.branches.length-nonemptyBranchCount)+' external') +'],'+
      ' commits: '+(((10*totalBranchLength/nonemptyBranchCount)|0)/10)+' average, '+maxBranch.commits.length+' max '+maxBranch.name+'\n'+
      'implied branches['+nonemptyImpliedBranchCount+(tree.impliedBranches.length===nonemptyImpliedBranchCount ? '' : ' excluding '+(tree.impliedBranches.length-nonemptyImpliedBranchCount)+' external') +'],'+
      ' commits: '+(((10*totalImpliedBranchLength/nonemptyImpliedBranchCount)|0)/10)+' average, '+maxImpliedBranch.commits.length+' max '+maxImpliedBranch.name+'\n'+
      'multibranch commits: '+multiBranchNodes.length+', no branch: '+noBranchNodes.length;

  console.log(txt);
  // var pre = document.createElement('pre');
}

function showGraph(owner, repo) {
  loadGraph(owner, repo, localFetchJson, function(tree) {
    dumpTree(tree);
    // pre.textContent = txt;
    // document.body.appendChild(pre);

  });
}

function loadGraph(owner, repo, fetchJson, callback) {

  var repoUrl = 'https://api.github.com/repos/'+owner+'/'+repo + '/';
  var gotCommits, gotBranches;

  loadPages(fetchJson, repoUrl+'commits?per_page=100', 10, function(commits) {
    //require('fs').writeFileSync('commits.json', JSON.stringify(commits, null, 2));
    gotCommits = commits || JSON.parse(require('fs').readFileSync('commits.json'));
    if (gotBranches) callback(processTree(gotCommits, gotBranches));
  });

  loadPages(fetchJson, repoUrl+'branches?per_page=100', 1000, function(branches) {
    //require('fs').writeFileSync('branches.json', JSON.stringify(branches, null, 2));
    gotBranches = branches || JSON.parse(require('fs').readFileSync('commits.json'));
    if (gotCommits) callback(processTree(gotCommits, gotBranches));
  });
}

function loadPages(fetchJson, url, maxPage, callback) {

  var collectData;
  continueFetch(1);

  function continueFetch(nextPage) {
    var fetchUrl = url;
    if (nextPage>1) {
      fetchUrl = fetchUrl.replace(
        /[\?\&]page\=\d+/,
        'page='+nextPage);
      if (fetchUrl===url)
        fetchUrl +=
          (fetchUrl.indexOf('?')>=0?'&':'?')+
          'page='+nextPage;
    }

    fetchJson(fetchUrl, function(json) {
      console.log('fetchJson(',fetchUrl,') = ', json);
      if (json.data)
        collectData = collectData ?
          collectData.concat(json.data) :
        json.data;

      var nextPageFromResponse;
      if (json.meta.Link) {
        for (var i = 0; i < json.meta.Link.length; i++) {
          var lnkArr = json.meta.Link[i];
          if (lnkArr.length>1 && lnkArr[1].rel==='next') {
            var pageMatch = /[\&\?]page\=(\d+)/.exec(lnkArr[0]);
            if (pageMatch) { 
              nextPageFromResponse = parseInt(pageMatch[1]);
              break;
            }
          }
        }
      }

      if (nextPageFromResponse===nextPage+1
          && !(nextPageFromResponse>maxPage)) {
        continueFetch(nextPage+1);
        return;
      }

      callback(collectData);
    });
  }
}

function jsonpFetchJson(url, callback) {
  var window = require('nowindow');
  var document = {
    createElement: function(tag) { return window.document.createElement(tag); },
    body: {
      appendChild: function(child) { console.log(child); }
    }
  };

  var iframeWin = jsonpFetchJson.iframeWin;
  if (!iframeWin) {
    var ifr = document.createElement('iframe');
    ifr.style.cssText = 'width: 0; height: 0;';
    ifr.src = 'about:blank';
    document.body.appendChild(ifr);
    iframeWin = jsonpFetchJson.iframeWin = ifr.contentWindow || ifr.window;
  }

  var id = 'url_'+url.replace(/[^a-zA-Z0-9_$]/g, '');
  var callbackUrl =
      url +
      (url.indexOf('?')>=0?'&callback=':'?callback=')+id;

  iframeWin[id] = handleJsonp;

  var scr = iframeWin.document.createElement('script');
  scr.src = callbackUrl;
  iframeWin.document.body.appendChild(scr);

  function handleJsonp(json) {

    setTimeout(function() {
      iframeWin.document.body.removeChild(scr);
    }, 1); 

    var logMsg =
        (json.data && json.data.length ?
         json.data.length + ' entries':
         '') +
        (json.meta ?
         ' (req#'+(json.meta['X-RateLimit-Limit']-
                   json.meta['X-RateLimit-Remaining'])+
         ', remains '+json.meta['X-RateLimit-Remaining']+
         ' for the next '+formatRemaining(
          (json.meta['X-RateLimit-Reset']*1000)-new Date())+
         ')':
         '');

    console.log(logMsg);
    if (json.data.documentation_url===
        'https://developer.github.com/v3/#rate-limiting') {
      console.log(callbackUrl+' ', json.data.message);
      json.data = null;
    }

    callback(json);
  }
}

function formatRemaining(tm) {
  if (typeof tm!=='number') tm = +tm;
  var min = Math.round(tm/1000/60);
  if (min<50) return min+'min';
  var hr = Math.round(tm/1000/60/60);
  if (hr < 48) return hr+'h';
  var dy = Math.round(tm/1000/60/60/24);
  return dy+'d';
}

function localFetchJson(url, callback) {
  var file = url.indexOf('commits')>=0 ? 'commits.json' : 'branches.json';
  var data = localFetchJson[file];
  if (!data) {
	  var dataText = require('fs').readFileSync(file);
    console.log('local '+file+' ['+(typeof data === 'string' ? data.length:typeof data)+']');
    var data = JSON.parse(dataText);
    localFetchJson[file] = data;
  }


  var result = /[\?\&]page\=/.test(url) ?
    { meta: { hint: 'EOF' }, data: {} } :
  	{ meta: { hint: 'data '+typeof data }, data: data };

  callback(result);
}


function processTree(commits, branches) {

  var commitData = initCommits(commits);
  var branchData = initBranches(branches, commitData);

  return {
    commits: commitData.commits,
    runs: commitData.runs,
    joints: commitData.joints,
    branches: branchData.branches,
    impliedBranches: branchData.implied
  };

  function initCommits(commits) {
    // sequences of commits without merging
    var allCommits = {};
    var externalCommits = {};

    var authorCommitterCache = [];
    var authorIncompleteEmailCache = {};

    var distinctCommits;
    // populate allCommits for existing nodes
    for (var i = commits.length-1;i>=0;i--) {
      var cm = commits[i];
      if (allCommits[cm.sha]) {
        if (!distinctCommits) distinctCommits = commits.slice(0, i);
        continue;
      }

      if (distinctCommits) distinctCommits.push(cm);

      allCommits[cm.sha] = initSimple(cm);
      delete externalCommits[cm.sha];
      for (var j = 0; j < cm.parents.length; j++) {
        var psha = cm.parents[j].sha;
        if (!allCommits[psha]) externalCommits[psha] = 1;
      }
    }
    if (!distinctCommits) distinctCommits = commits;

    // populate missing (external) commit nodes
    for (var sha in externalCommits) if (externalCommits[sha]===1) {
      if (!allCommits[sha])
        allCommits[sha] = initExternal(sha);
    }

    var joints = {};

    // populate parents and children, and joints
    for (var i =0; i < distinctCommits.length; i++) {
      var cm = distinctCommits[i];
      var node = allCommits[cm.sha];
      for (var j = 0; j < cm.parents.length; j++) {

        var pnode = allCommits[cm.parents[j].sha];
        if (pnode.children) {
          pnode.kind = 'merge';
          pnode.children.push(node);
          joints[pnode.sha] = 1;
        }
        else {
          pnode.children = [node];
        }

        if (j) { // [0] is single, non-zero means second
          node.parents.push(pnode);
          node.kind = 'merge';
          joints[node.sha] = 1;
        }
        else {
          node.parents = [pnode];
        }
      }
    }

    var runs = [];

    // create runs
    for (var sha in joints) {

      var jnode = allCommits[sha];
      if (!jnode.sha) continue;

      if (jnode.parents) {
        for (var i = 0; i < jnode.parents.length; i++) {
          var r = initRun(jnode.parents[i], true /*viaParent*/);
          if (r) runs.push(r);
        }
      }

      if (jnode.children) {
        for (var i = 0; i < jnode.children.length; i++) {
          var r = initRun(jnode.children[i], false /*viaParent*/);
          if (r) runs.push(r);
        }
      }

    }

    var jointArray = [];

    // create runs for lonely hanging commits
    for (var sha in allCommits) {
      var node = allCommits[sha];
      if (!node.sha) continue;
      if (!node.children || !node.children.length) {
        var r = initRun(node, true /*viaParent*/);
        if (r)
          runs.push(r);
      }
      else if (!node.run) {
        jointArray.push(node);
      }
    }


    return {
      commits: allCommits,
      runs: runs,
      joints: jointArray
    };


    function initRun(node, viaParent) {
      if (node.run) return;

      var run;
      while (true) {
        var nextArr = viaParent?node.parents:node.children;
        if (!nextArr || nextArr.length!==1) break;

        if (!run) {
          run = {
            branches: null,
            commentCount: node.commentCount,
            commits: [node]
          };
        }
        else {
          run.commentCount += node.commentCount;
          run.commits.push(node);
        }

        node.run = run;

        node = nextArr[0];
      }

      return run;
    }

    function initSimple(cm) {
      return {
        sha: cm.sha,
        kind: 'run',
        message: cm.commit.message,
        date: commitDate(cm),
        commentCount: cm.commit.comment_count,
        author: commitAuthor(cm),
        run: null,
        parents: null,
        children: null,
        branches: null
      };
    }

    function initExternal(sha) {
      return {
        sha: sha,
        kind: 'external',
        message: 'external '+sha,
        date: null,
        commentCount: 0,
        author: null,
        run: null,
        parents: null,
        children: null,
        branches: null
      };
    }

    function commitDate(cm) {
      return +new Date(
        cm.commit.author.date > cm.commit.committer.date ?
        cm.commit.author.date :
        cm.commit.committer.date);
    }

    function commitAuthor(cm) {

      if (cm.author && cm.committer) {
        var byCommitter = authorCommitterCache[cm.author.id] ||
            (authorCommitterCache[cm.author.id] = []);
        var obj = byCommitter[cm.committer.id];
      }
      else {
        var byCommitter = authorIncompleteEmailCache[cm.commit.author.email] ||
            (authorIncompleteEmailCache[cm.commit.author.email] = {});
        var obj = byCommitter[cm.commit.committer.email]
        }

      if (obj) return obj;

      var authorIsCommitter = cm.author && cm.committer ?
          cm.author.id===cm.committer.id :
      cm.commit.author.email===cm.commit.committer.email;

      obj = {
        login: cm.author ? cm.author.login : cm.commit.author.email,
        name: cm.commit.author.name,
        email: cm.commit.author.email,
        avatar: cm.author ? cm.author.avatar_url : null,
        admin: cm.author && cm.author.site_admin,
        committer: authorIsCommitter ? null :
        {
          login: cm.committer ? cm.committer.login : cm.commit.committer.email,
          name: cm.commit.committer.name,
          email: cm.commit.committer.email,
          avatar: cm.committer ? cm.committer.avatar_url : null,
          admin: cm.committer && cm.committer.site_admin
        }
      };

      if (cm.author && cm.committer)
        byCommitter[cm.committer.id] = obj;
      else
        byCommitter[cm.commit.committer.email] = obj;

      return obj;
    }
  }

  function initBranches(branches, commitData) {
    var branchMap = {};
    var branchArray = [];
    for (var i = 0; i < branches.length; i++) {
      var br = branches[i];
      if (branchMap[br.commit.sha]) continue;
      var brnode = commitData.commits[br.commit.sha];
      if (!brnode) {
        var branch = {
          kind: 'external',
          sha: br.commit.sha,
          head: null,
          name: br.name,
          commentCount: 0,
          commits: null,
          runs: null
        };
        branchArray.push(branch);
        continue;
      }

      var branch = initNamedBranch(brnode, br);
      branchArray.push(branch);
      branchMap[branch.sha] = branch;
    }

    branchArray.sort(compareBranches);

    for (var i = 0; i < branchArray.length; i++) {
      traceBranch(branchArray[i]);
    }

    var impliedBranchMap = {};
    var impliedBranchArray = [];

    for (var sha in commitData.joints) {
      var node = commitData.commits[sha];
      if (!node || !node.sha) continue;
      if (node.branches) continue;
      var branch = initImpliedBranch(node);
      impliedBranchMap[branch.sha] = branch;
      impliedBranchArray.push(branch);
      traceBranch(branch);
    }

    for (var i = 0; i < commitData.runs.length; i++) {
      var run = commitData.runs[i];
      if (run.branches) continue;

      var head = run.commits[0];
      //   if (head.branches) throw new Error('ASSERT');
      var branch = initImpliedBranch(head);
      impliedBranchMap[branch.sha] = branch;
      impliedBranchArray.push(branch);
      traceBranch(branch);
    }

    return {
      branches: branchArray,
      implied: impliedBranchArray
    };

    function compareBranches(b1, b2) {
      var r1 = branchRank(b1);
      var r2 = branchRank(b2);
      if (r1 < r2) return -1;
      if (r1 > r2) return +1;

      var d1 = b1.head ? b1.head.date : null;
      var d2 = b2.head ? b2.head.date : null;
      if (d1 < d2) return -1;
      if (d1 > d2) return +1;

      if (b1.name < b2.name) return -1;
      if (b1.name > b2.name) return +1;
      return 0;
    }

    function branchRank(branch) {
      if (branch.name==='master') return 1;
      if (branch.kind==='dedicated') return 10;
      if (branch.kind==='named') return 100;
      return 1000;
    }

    function initImpliedBranch(brnode) {
      var derivedName = deriveBranchNameFromRunHead(brnode);
      var branch = {
        kind: 'implied',
        sha: brnode.sha,
        head: brnode,
        name: derivedName,
        commentCount: 0,
        commits: null,
        runs: null
      };
      return branch;
    }

    function deriveBranchNameFromRunHead(brnode) {
      var mergeTo = brnode.children && brnode.children.length===1 ?
          brnode.children[0] : null;

      if (mergeTo) {
        if (mergeTo.parents && mergeTo.parents.length>1) {
          if (/^Merge pull request \#\d+ from /.test(mergeTo.name)) {
            var rest = mergeTo.slice(mergeTo.indexOf(' from ')+' from '.length);
            var rest = rest.split('\n')[0];
            return rest;
          }
          else if (/^Merge branch \'[^']+\' into /.test(mergeTo.name)) {
            var rest = mergeTo.slice(mergeTo.indexOf(' into ')+' into '.length);
            var rest = rest.split('\n')[0];
            return rest;
          }
        }
      }

      var msg = brnode.message.split('\n')[0];
      return msg;
    }

    function initNamedBranch(brnode, br) {
      var kind = br.name === 'master' ? 'dedicated' : 'named';
      var branch = {
        kind: kind,
        sha: brnode.sha,
        head: brnode,
        name: br.name,
        commentCount: 0,
        commits: null,
        runs: null
      };
      return branch;
    }

    function traceBranch(branch) {
      var node = branch.head;
      if (!node) return;
      var runsByFirstHash = {};
      while (true) {

        if (branch.commits) branch.commits.push(node);
        else branch.commits = [node];
        if (node.branches) node.branches.push(branch);
        else node.branches = [branch];
        branch.commentCount += node.commentCount;

        if (node.run &&!runsByFirstHash[node.run.commits[0].sha]) {
          runsByFirstHash[node.run.commits[0].sha] = node.run;
          if (node.run.branches) node.run.branches.push(branch);
          else node.run.branches = [branch];
        }

        if (!node.parents) break;

        if (node.parents.length===1) {
          node = node.parents[0];
          continue;
        }
        else {
          if (branch.commits.length>1 && node.branches.length>1) break; // do not trace across merges
          var continueNodes = null;
          for (var i = 0; i < node.parents.length; i++) {
            var pnode = node.parents[i];
            if (pnode.branches) continue; // avoid continuing over existing branches
            if (continueNodes) continueNodes.push(pnode);
            else continueNodes = [pnode];
          }
          if (!continueNodes) break; // traced branch to the end
          if (continueNodes.length>1)
            continueNodes.sort(compareContinueNodes);
          node = continueNodes[0];
          continue;
        }
      }
    }

    function compareContinueNodes(n1, n2) {
      var r1 = continueNodeRank(n1);
      var r2 = continueNodeRank(n2);

      return r1 > r2 ? +1 : r1 < r2 ? -1 : 0;
    }

    function continueNodeRank(n) {
      return !n.run ? -1 : n.run.branches ? 10000 + n.run.commentCount : n.run.commentCount + n.run.commits.length;
    }
  }
}

/// </script>