module portabled.build.functions {
  
  export function embedTree() {

      var docNames = processTemplate.mainDrive.files();
      docNames.sort();

      var rootDir = {};
      for (var i = 0; i < docNames.length; i++) {
        var fullPath = docNames[i];
        var file = fullPath;
        if (file.charAt(0) === '/') file = file.slice(1);
        var parts = file.split('/');
        var dir = rootDir;
        for (var j = 0; j < parts.length - 1; j++) {
          dir = dir[parts[j]] || (dir[parts[j]] = {});
        }
        var docState = processTemplate.mainDrive.read(fullPath);
        dir[parts[parts.length - 1]] = docState;
      }

      var tmp = document.createElement('pre');

      var addDir = (dir) => {
        for (var k in dir) if (dir.hasOwnProperty(k)) {
          var child = dir[k];
          if (typeof child === 'string') {
            output.push('<li class=portabled-file><div class=portabled-file-name>' + k + '</div>');
            tmp.textContent = child;
            output.push('<pre class=portabled-file-content>' + tmp.innerHTML + '</pre></li>');
          }
          else {
            output.push('<li class="portabled-dir portabled-dir-collapsed"><div class=portabled-dir-name>' + k + '</div><ul>');
            addDir(child);
            output.push('</ul></li>');
          }
        }
      }

      var output: string[] = [];

      addDir(rootDir);

      return output.join('');

  }
  
}