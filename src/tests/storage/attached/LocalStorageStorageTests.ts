module teapo.tests.LocalStorageStorageTests {

  export function constructor_noArgs_succeeds() {
    new teapo.storage.attached.localStorage.DetectStorage();
  }

  export function constructor_null_succeeds() {
    new teapo.storage.attached.localStorage.DetectStorage(null);
  }

  export function constructor_empty_succeeds() {
    new teapo.storage.attached.localStorage.DetectStorage({});
  }


  export function detectStorageAsync_whenNullPassedToConstructor_throwsError() {
    var s = new teapo.storage.attached.localStorage.DetectStorage(null);
    try {
      s.detectStorageAsync('', (error, loaded) => { });
    }
    catch (error) {
      // fine, expected
      return;
    }

    throw new Error('No exception.');
  }

  export function detectStorageAsync_noLocalStorage_passesError(callback: (error: Error) => void) {
    var s = new teapo.storage.attached.localStorage.DetectStorage({});

    s.detectStorageAsync('', (error, loaded) =>
      callback(error ? null : new Error('No error passed. State: ' + loaded)));

  }

  export function detectStorageAsync_localStorageNoMethods_passesError(callback: (error: Error) => void) {
    var s = new teapo.storage.attached.localStorage.DetectStorage(<any>{ localStorage: {} });

    s.detectStorageAsync('', (error, loaded) =>
      callback(error ? null : new Error('No error passed. State: ' + loaded)));

  }

  export function detectStorageAsync_localStorageLengthGetItemSetItemRemoveItem_passesResult(callback: (error: Error) => void) {

    var localStorage = {
      length: 0,
      getItem: () => { },
      setItem: () => { },
      removeItem: () => { }
    };

    var s = new teapo.storage.attached.localStorage.DetectStorage(<any>{ localStorage: localStorage });

    s.detectStorageAsync('', (error, loaded) =>
      callback(error));

  }


  export var browserNew;


  export var browser;
  if (window.localStorage) {
    browser = new AttachedStorageTests(new teapo.storage.attached.localStorage.DetectStorage());

    browserNew = new AttachedStorageTestsNew(
      new teapo.storage.attached.localStorage.StorageDetect());
    
  }

}