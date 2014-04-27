module teapo.storage.attached.webSQL {

  export class UpdateStorage implements attached.UpdateStorage {

    private _cachedUpdateStatementsByFile: { [name: string]: string; } = {};
    private _unhandledClosure = (e: SQLError) => this.unhandledSQLError(e);
    private _unhandledTransClosure = (t: SQLTransaction, e: SQLError) => this.unhandledSQLError(e);

    constructor(
      private _db: Database,
      existingFiles: string[]) {
      existingFiles.forEach(file=> this._createUpdateStatement(file));
    }

    update(file: string, property: string, value: string, callback?: (error: Error) => void) {
      var updateSQL = this._cachedUpdateStatementsByFile[file];
      if (typeof updateSQL === 'string') {
        this._updateCore(updateSQL, property, value, callback);
      }
      else {
        this._createTable(
          mangleDatabaseObjectName(file),
          transaction => {
            updateSQL = this._createUpdateStatement(file);
            this._updateCore(updateSQL, property, value, callback);
          },
          sqlError => callback(wrapSQLError(sqlError, 'update: _createTable')));
      }
    }

    remove(file: string, callback?: (error: Error) => void) {
      this._db.transaction(
        transaction =>
          transaction.executeSql(
            'DROP TABLE "' + mangleDatabaseObjectName(file) + '"',
            [],
            (transaction, result) => updateEdited(
              Date.now(),
              transaction,
              sqlError => callback(wrapSQLError(sqlError, 'remove: updateEdited'))),
            (transaction, sqlError) => callback(wrapSQLError(sqlError, 'remove: DROP TABLE ~'+file))),
        sqlError => callback(wrapSQLError(sqlError,'remove: transaction')));
    }

    unhandledSQLError(sqlError: SQLError) {
      if (typeof console !== 'undefined' && console && console.error)
        console.error(sqlError);
    }
    
    private _updateCore(updateSQL: string, property: string, value: string, callback: (error: Error) => void) {
      var sqlCallback = (sqlError: SQLError) => callback(sqlError ? wrapSQLError(sqlError, '_updateCore: ' + updateSQL) : null);
      this._db.transaction(
        transaction=> transaction.executeSql(
          updateSQL,
          [property, toSqlText(value)],
          (transaction, result) => updateEdited(Date.now(), transaction, sqlCallback),
          (transaction, sqlError) => sqlCallback(sqlError)));
    }

    private _createUpdateStatement(file: string) {
      return this._cachedUpdateStatementsByFile[file] =
        'INSERT OR REPLACE INTO "' +
        mangleDatabaseObjectName(file) +
        '" VALUES (?,?)';
    }

    private _createTable(
      tableName: string,
      callback: (transaction: SQLTransaction) => void,
      errorCallback = this._unhandledClosure) {

      this._db.transaction(
        transaction=>
          transaction.executeSql(
            'CREATE TABLE "' + tableName + '" (name PRIMARY KEY, value)',
            [],
            (transaction, result) => callback(transaction),
            (transaction, error) => errorCallback(error)),
        errorCallback);

    }

  }
  
}