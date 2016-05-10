namespace tests.attached.localStorageTests {

  export var browser;

  try {
    if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.getItem === 'function')
      browser = _generateAttachedStorageTests((<any>persistence).attached.localStorage);
  }
  catch (error) {
    browser = () => assert(false, 'Failure accessing localStorage '+error.message);
  }

}