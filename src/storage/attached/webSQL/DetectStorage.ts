module teapo.storage.attached.webSQL {

  export class DetectStorage implements attached.DetectStorage {

    constructor(
      private _window: {
        openDatabase(name: string,
          version: any,
          displayName: string,
          size: number,
          upgrade?: DatabaseCallback): Database;
      } = <any>window) {
    }

    detectStorageAsync(uniqueKey: string, callback: (error: Error, load: LoadStorage) => void) {

      var openDatabase = this._window.openDatabase;

      if (!openDatabase) {
        callback(new Error('Browser does not expose openDatabase.'), null);
        return;
      }

      if (typeof openDatabase !== 'function') {
        callback(new Error('Function type expected for openDatabase (' + (typeof openDatabase) + ' found).'), null);
        return;
      }

      var dbName = uniqueKey || 'teapo';
      var db = openDatabase(
        dbName,
        1,
        'Teapo virtual filesystem data',
        1024 * 1024);


      db.readTransaction(
        transaction => {
          transaction.executeSql(
            'SELECT value from "*metadata" WHERE name=\'edited\'',
            [],
            (transaction, result) => {
              var editedValue: number = null;
              if (result.rows && result.rows.length === 1) {
                var editedValueStr = result.rows.item(0).value;
                if (typeof editedValueStr === 'string') {
                  try {
                    editedValue = parseInt(editedValueStr);
                  }
                  catch (error) {
                  }
                }
              }

              callback(null, new LoadStorage(editedValue, db, true));
            },
            (transaction, sqlError) => {
              // no data
              callback(null, new LoadStorage(null, db, false));
            });
        },
        sqlError=> {
          callback(wrapSQLError(sqlError, 'SELECT FROM *metadata'), null);
        });

    }

  }

}