/// <reference path="../../persistence/src/API.d.ts"/>
/// <reference path="../../isolation/host/API.d.ts"/>

/// <reference path="../../isolation/noapi/path_fs_and_http.refs.ts"/>

declare var /* webkitRequestAnimationFrame, -- see lib.d.ts around 18017 */ mozRequestAnimationFrame;

declare var loader: {
  drive: persistence.Drive;
  build: { timestamp: number; taken: number; platform: string; };
  ui: {
    contentWindow: {
  		build: { timestamp: number; taken: number; platform: string; };
    };
  };
  timings: {
    start: number;
    domStarted: number;
    documentLoaded: number;
    driveLoaded: number;
  };
};

declare var build;
