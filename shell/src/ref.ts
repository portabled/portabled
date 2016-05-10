/// <reference path="../../persistence/src/API.d.ts"/>
/// <reference path="../../isolation/src/API.d.ts"/>

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
