namespace tests.attached.webSQLTests {

  export var browser;

  try {
    if (typeof openDatabase !== 'undefined' && typeof openDatabase === 'function')
      browser = _generateAttachedStorageTests((<any>persistence).attached.webSQL);
  }
  catch (error) {
    browser = () => assert(false, 'Failure accessing webSQL '+error.message);
  }

}