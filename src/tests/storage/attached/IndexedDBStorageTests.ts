module teapo.tests.IndexedDBStorageTests {

  export var browser, browserNew;

  if (typeof indexedDB !== 'undefined' && indexedDB && typeof indexedDB.open === 'function') {
    browser = new AttachedStorageTests(
      new teapo.storage.attached.indexedDB.DetectStorage());
    
    browserNew = new AttachedStorageTestsNew(
      new teapo.storage.attached.indexedDB.StorageDetect());
    
  }
}