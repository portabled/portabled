module teapo.tests.IndexedDBStorageTests {

  export var browser;

  if (typeof indexedDB !== 'undefined' && indexedDB && typeof indexedDB.open === 'function')
    browser = new AttachedStorageTests(
      new teapo.storage.attached.indexedDB.DetectStorage());
}