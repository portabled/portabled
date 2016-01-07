module persistence {

  function getOpenDatabase() {
    return typeof openDatabase !== 'function' ? null : openDatabase;
  }

  export module attached.webSQL {

    export var name = 'webSQL';

    export function detect(uniqueKey: string, callback: (detached: Drive.Detached) => void): void {

      var openDatabaseInstance = getOpenDatabase();
      if (!openDatabaseInstance) {
        callback(null);
        return;
      }

      var dbName = uniqueKey || 'portabled';

      var db = openDatabase(
        dbName, // name
        1, // version
        'Portabled virtual filesystem data', // displayName
        1024 * 1024); // size
      // upgradeCallback?


      db.readTransaction(
        transaction => {
          transaction.executeSql(
            'SELECT value from "*metadata" WHERE name=\'editedUTC\'',
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
                    // unexpected value for the timestamp, continue as if no value found
                  }
                }
                else if (typeof editedValueStr === 'number') {
                  editedValue = editedValueStr;
                }
              }

              callback(new WebSQLDetached(db, editedValue || 0, true));
            },
            (transaction, sqlError) => {
              // no data
              callback(new WebSQLDetached(db, 0, false));
            });
        },
        sqlError=> {
          // failed to load
          callback(null);
        });

    }

    class WebSQLDetached implements Drive.Detached {

      constructor(
        private _db: Database,
        public timestamp: number,
        private _metadataTableIsValid: boolean) {
      }

      applyTo(mainDrive: Drive, callback: Drive.Detached.CallbackWithShadow): void {
        this._db.readTransaction(
          transaction => listAllTables(
            transaction,
            tables => {

              var ftab = getFilenamesFromTables(tables);

              this._applyToWithFiles(transaction, ftab, mainDrive, callback);
            },
            sqlError => {
              reportSQLError('Failed to list tables for the webSQL database.', sqlError);
              callback(new WebSQLShadow(this._db, this.timestamp, this._metadataTableIsValid));
            }),
          sqlError => {
            reportSQLError('Failed to open read transaction for the webSQL database.', sqlError);
            callback(new WebSQLShadow(this._db, this.timestamp, this._metadataTableIsValid));
          });
      }

      purge(callback: Drive.Detached.CallbackWithShadow): void {
        this._db.transaction(
          transaction => listAllTables(
            transaction,
            tables => {
              this._purgeWithTables(transaction, tables, callback);
            },
            sqlError => {
              reportSQLError('Failed to list tables for the webSQL database.', sqlError);
              callback(new WebSQLShadow(this._db, 0, false));
            }),
          sqlError => {
            reportSQLError('Failed to open read-write transaction for the webSQL database.', sqlError);
            callback(new WebSQLShadow(this._db, 0, false));
          });
      }

      private _applyToWithFiles(transaction: SQLTransaction, ftab: { file: string; table: string; }[], mainDrive: Drive, callback: Drive.Detached.CallbackWithShadow): void {

        if (!ftab.length) {
          callback(new WebSQLShadow(this._db, this.timestamp, this._metadataTableIsValid));
          return;
        }

        var reportedFileCount = 0;

        var completeOne = () => {
          reportedFileCount++;
          if (reportedFileCount === ftab.length) {
            callback(new WebSQLShadow(this._db, this.timestamp, this._metadataTableIsValid));
          }
        };

        var applyFile = (file: string, table: string) => {
          transaction.executeSql(
            'SELECT * FROM "' + table + '"',
            [],
            (transaction, result) => {
              if (result.rows.length) {
                var row = result.rows.item(0);
                if (row.value === null)
                  mainDrive.write(file, null);
                else if (typeof row.value === 'string')
                  mainDrive.write(file, fromSqlText(row.value));
              }
              completeOne();
            },
            sqlError => {
              completeOne();
            });
        };

        for (var i = 0; i < ftab.length; i++) {
          applyFile(ftab[i].file, ftab[i].table);
        }

      }

      private _purgeWithTables(transaction: SQLTransaction, tables: string[], callback: Drive.Detached.CallbackWithShadow) {
        if (!tables.length) {
          callback(new WebSQLShadow(this._db, 0, false));
          return;
        }

        var droppedCount = 0;

        var completeOne = () => {
          droppedCount++;
          if (droppedCount === tables.length) {
            callback(new WebSQLShadow(this._db, 0, false));
          }
        };

        for (var i = 0; i < tables.length; i++) {
          transaction.executeSql(
            'DROP TABLE "' + tables[i] + '"',
            [],
            (transaction, result) => {
              completeOne();
            },
            (transaction, sqlError) => {
              reportSQLError('Failed to drop table for the webSQL database.', sqlError);
              completeOne();
            });
        }
      }

    }

    class WebSQLShadow implements Drive.Shadow {

      private _cachedUpdateStatementsByFile: { [name: string]: string; } = {};
      private _closures = {
        updateMetadata: (transaction: SQLTransaction) => this._updateMetadata(transaction)
      };

      constructor(private _db: Database, public timestamp: number, private _metadataTableIsValid: boolean) {
      }

      write(file: string, content: string) {

        if (content || typeof content === 'string') {
          this._updateCore(file, content);
        }
        else {
          this._dropFileTable(file);
        }
      }

      private _updateCore(file: string, content: string) {
        var updateSQL = this._cachedUpdateStatementsByFile[file];
        if (!updateSQL) {
          var tableName = mangleDatabaseObjectName(file);
          updateSQL = this._createUpdateStatement(file, tableName);
        }
        this._db.transaction(
          transaction => {
            transaction.executeSql(
              updateSQL,
              ['content', content],
              this._closures.updateMetadata,
              (transaction, sqlError) => this._createTableAndUpdate(transaction, file, tableName, updateSQL, content));
          },
          sqlError => {
            reportSQLError('Transaction failure updating file "' + file + '".', sqlError);
          });
      }

      private _createTableAndUpdate(transaction: SQLTransaction, file: string, tableName: string, updateSQL: string, content: string) {
        if (!tableName)
          tableName = mangleDatabaseObjectName(file);

        transaction.executeSql(
          'CREATE TABLE "' + tableName + '" (name PRIMARY KEY, value)',
          [],
          (transaction, result) => {
            transaction.executeSql(
              updateSQL,
              ['content', content],
              this._closures.updateMetadata,
              (transaction, sqlError) => {
                reportSQLError('Failed to update table "' + tableName + '" for file "' + file + '" after creation.', sqlError);
              });
          },
          (transaction, sqlError) => {
            reportSQLError('Failed to create a table "' + tableName + '" for file "' + file + '".', sqlError);
          });
      }

      private _dropFileTable(file: string) {
        var tableName = mangleDatabaseObjectName(file);
        this._db.transaction(
          transaction => {
            transaction.executeSql(
              'DROP TABLE "' + tableName + '"',
              [],
              this._closures.updateMetadata,
              (transaction, sqlError) => {
                reportSQLError('Failed to drop table "' + tableName + '" for file "' + file + '".', sqlError);
              });
          },
          sqlError => {
            reportSQLError('Transaction failure dropping table "' + tableName + '" for file "' + file + '".', sqlError);
          });
      }

      private _updateMetadata(transaction: SQLTransaction) {
        var updateMetadataSQL = 'INSERT OR REPLACE INTO "*metadata" VALUES (?,?)';
        transaction.executeSql(
          updateMetadataSQL,
          ['editedUTC', this.timestamp],
          (transaction, result) => { }, // TODO: generate closure statically
          (transaction, error) => {
            transaction.executeSql(
              'CREATE TABLE "*metadata" (name PRIMARY KEY, value)',
              [],
              (transaction, result) => {
                transaction.executeSql(updateMetadataSQL, [], () => { }, () => { });
              },
              (transaction, sqlError) => {
                reportSQLError('Failed to update metadata table after creation.', sqlError);
              });
          });

      }

      private _createUpdateStatement(file: string, tableName: string): string {
        return this._cachedUpdateStatementsByFile[file] =
          'INSERT OR REPLACE INTO "' + tableName + '" VALUES (?,?)';
      }
    }


    function mangleDatabaseObjectName(name: string): string {
      // no need to polyfill btoa, if webSQL exists
      if (name.toLowerCase() === name)
        return name;
      else
        return '=' + btoa(name);
    }

    function unmangleDatabaseObjectName(name: string): string {
      if (!name || name.charAt(0) === '*') return null;

      if (name.charAt(0) !== '=') return name;

      try {
        return atob(name.slice(1));
      }
      catch (error) {
        return name;
      }
    }

    export function listAllTables(
      transaction: SQLTransaction,
      callback: (tables: string[]) => void,
      errorCallback: (sqlError: SQLError) => void) {
      transaction.executeSql(
        'SELECT tbl_name  from sqlite_master WHERE type=\'table\'',
        [],
        (transaction, result) => {
          var tables: string[] = [];
          for (var i = 0; i < result.rows.length; i++) {
            var row = result.rows.item(i);
            var table = row.tbl_name;
            if (!table || (table[0] !== '*' && table.charAt(0) !== '=' && table.charAt(0) !== '/')) continue;
            tables.push(row.tbl_name);
          }
          callback(tables);
        },
        (transaction, sqlError) => errorCallback(sqlError));
    }

    function getFilenamesFromTables(tables: string[]) {
      var filenames: { table: string; file: string; }[] = [];
      for (var i = 0; i < tables.length; i++) {
        var file = unmangleDatabaseObjectName(tables[i]);
        if (file)
          filenames.push({ table: tables[i], file: file });
      }
      return filenames;
    }

    function toSqlText(text: string) {
      if (text.indexOf('\u00FF') < 0 && text.indexOf('\u0000') < 0) return text;

      return text.replace(/\u00FF/g, '\u00FFf').replace(/\u0000/g, '\u00FF0');
    }

    function fromSqlText(sqlText: string) {
      if (sqlText.indexOf('\u00FF') < 0 && sqlText.indexOf('\u0000') < 0) return sqlText;

      return sqlText.replace(/\u00FFf/g, '\u00FF').replace(/\u00FF0/g, '\u0000');
    }

    function reportSQLError(message: string, sqlError: SQLError);
    function reportSQLError(sqlError: SQLError);
    function reportSQLError(message, sqlError?) {
      if (typeof console !== 'undefined' && typeof console.error === 'function') {
        if (sqlError)
          console.error(message, sqlError);
        else
          console.error(sqlError);
      }
    }


  }

}