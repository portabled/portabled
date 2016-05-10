// TODO: re-enable DOM storage too

/*



module teapo.tests.DomStorageTests {

  export function constructor_nullArgs_succeeds() {
    new teapo.storage.attached.dom.DetectStorage(null,null);
  }

  export function constructor_dummyElement_succeeds() {
    var dummyElement = document.createElement('div');
    new teapo.storage.attached.dom.DetectStorage(dummyElement);
  }


  export function detectStorageAsync_whenNullPassedToConstructor_throwsError() {
    var s = new teapo.storage.attached.dom.DetectStorage(null);
    var err: Error;
    s.detectStorageAsync('', (error, loaded) => err = error);

    if (!err)
      throw new Error('No exception.');
  }

  export function detectStorageAsync_whenTwoNullsPassedToConstructor_throwsError() {
    var s = new teapo.storage.attached.dom.DetectStorage(null, null);
    var err: Error;
    s.detectStorageAsync('', (error, loaded) => err = error);

    if (!err)
      throw new Error('No exception.');
  }

  export function detectStorageAsync_dummyElement_editedUTC_falsy(callback: (error: Error) => void) {
    var dummyElement = document.createElement('div');
    var s = new teapo.storage.attached.dom.DetectStorage(dummyElement);

    s.detectStorageAsync('', (error, loaded) => {
      if (error) { 
        callback(error);
        return;
      }

      if (loaded.editedUTC)
        callback(new Error(<any>loaded.editedUTC));
      else
        callback(null);
    });
  }


  export var browser;
  {
    var byName: { [name: string]: HTMLElement; } = {};
    function detectStorageAsync(
       uniqueKey: string,
       callback: (error: Error, load: teapo.storage.attached.LoadStorage) => void) {

      var detect = byName[uniqueKey];
      if (!detect)
        byName[uniqueKey] = detect = document.createElement('div');

      var result = new teapo.storage.attached.dom.DetectStorage(detect);
      result.detectStorageAsync(null, callback);

    }

    browser = new AttachedStorageTests({ detectStorageAsync: detectStorageAsync });
  }
}

*/