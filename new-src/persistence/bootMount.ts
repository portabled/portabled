module persistence {

  // TODO: pass in progress callback
  export function bootMount(uniqueKey: string, document: Document): bootMount.ContinueLoading {

    var continueParse: persistence.dom.parseDOMStorage.ContinueParsing;

    var ondomdriveloaded;
    var domDriveLoaded: Drive;
    var storedFinishCallback;

    mountDrive(
      callback => {
        if (domDriveLoaded)
          callback(domDriveLoaded);
        else
          ondomdriveloaded = callback;
      },
      uniqueKey,
      [attached.indexedDB, attached.webSQL, attached.localStorage],
      mountedDrive => {

        storedFinishCallback(mountedDrive);

      });

    return continueLoading();

    function continueLoading(): bootMount.ContinueLoading {

      continueDOMLoading();

      // TODO: record progress

      return { continueLoading, finishLoading };
    }

    function finishLoading(finishCallback: (monutedDrive: Drive) => void) {

      storedFinishCallback = finishCallback;

      continueDOMLoading();

      domDriveLoaded = continueParse.finishParsing();

      if (ondomdriveloaded) {
        ondomdriveloaded(domDriveLoaded);
      }

    }


    function continueDOMLoading() {
      continueParse = continueParse ? continueParse.continueParsing() : dom.parseDOMStorage(document);
    }

  }

  module bootMount {

    export interface ContinueLoading {

      continueLoading(): ContinueLoading;

      finishLoading(finishCallback: (mountedDrive: Drive) => void);

    }

  }
}