declare var timings: {
  domStarted: number;
  scriptStart: number;
  driveLoaded: number;
  documentLoaded: number;
};

declare var persistence;

var bootState: any;
var fitFrameList: any[];
var boot: HTMLIFrameElement;
var shell: HTMLIFrameElement;
var sz: {
  update: Function;
  fitframe: Function;
  windowWidth: number;
  windowHeight: number;
  scrollX: number;
  scrollY: number;
  onresize: Function;
};

var progressCallbacks: Function[];
var loadedCallbacks: Function[];
var resizeCallbacks: Function[];
var resizeReportCallbacks: Function[];


var uniqueKey: string;
var bootDrive: any; // BootState
var drive: any; // Drive

var keepLoading: number;

function startBoot() {
  if (typeof timings==='undefined' || !timings) timings = <any>{ domStarted: + new Date() }
  else if (!timings.domStarted) timings.domStarted = +new Date();
  timings.scriptStart = +new Date();

  window.onerror = function() {
    var msg = 'UNHANDLED';
    for (var i = 0; i < arguments.length; i++) {
      var a = arguments[i];
      try {
        if (a && typeof a==='object') {
          if (a.constructor && a.constructor.name && a.constructor.name!=='Object') msg+='\n{'+a.constructor.name+':';
          else msg+='\n{';
          for (var k in a) if (a[k] && typeof a[k]!=='function' && !String[k]) {
            try {
              msg += '\n  '+k+': '+a[k];
            }
            catch (err) { msg += '\n  '+k+': [##'+err.message+']'; }
          }
          msg += ' }';
        }
        else {
          msg += '\n'+a;
        }
      }
      catch (err) { msg+='[##'+err.message+']'; }
    }

    alert(msg);
  };


  bootState = {};
  fitFrameList = [];



  document.title = '.';

  removeSpyElements();

  document.title = ':';

  // creates both frames invisible
  boot = createFrame();
  boot.style.zIndex = <any>100;
  shell = createFrame();
  shell.style.zIndex = <any>10;

  document.title = '/';

  sz = fitresize();
  sz.fitframe(boot);
  sz.fitframe(shell);

  document.title = '/.';

  progressCallbacks = [];
  loadedCallbacks = [];
  resizeCallbacks = [];
  resizeReportCallbacks = [];


  uniqueKey = deriveUniqueKey(location);
  bootDrive = persistence(document, uniqueKey);


  document.title = '/:';

  if (window.addEventListener) {
    window.addEventListener('load', window_onload, true);
  }
  else if ((<any>window).attachEvent) {
    (<any>window).attachEvent('onload', window_onload);
  }
  else {
    window.onload = window_onload;
  }

  keepLoading = setInterval(onkeeploading, 30);
}