module teapo.tests.WebSQLStorageTests {

  export var browser;

  if (typeof openDatabase==='function')
    browser = new AttachedStorageTests(
      new teapo.storage.attached.webSQL.DetectStorage());
}