namespace tests.attached.indexedDBTests {

  export var browser;

  try {
    if (typeof indexedDB !== 'undefined' && indexedDB && typeof indexedDB.open === 'function')
      browser = _generateAttachedStorageTests((<any>persistence).attached.indexedDB);
  }
  catch (error) {
    browser = () => assert(false, 'Failure accessing indexedDB '+error.message);
  }
}