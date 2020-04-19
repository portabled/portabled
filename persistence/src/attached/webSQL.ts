namespace attached.webSQL {

  function getOpenDatabase() {
    return typeof openDatabase !== 'function' ? null : openDatabase;
  }

  export const name = 'webSQL';

  export function detect(uniqueKey: string, callback: persistence.Drive.ErrorOrDetachedCallback): void {
    try {
      detectCore(uniqueKey, callback);
    }
    catch (error) {
      callback(error.message);
    }
  }

  function detectCore(uniqueKey: string, callback: persistence.Drive.ErrorOrDetachedCallback): void {

    const openDatabaseInstance = getOpenDatabase();
    if (!openDatabaseInstance) {
      callback('Variable openDatabase is not available.');
      return;
    }

    const dbName = uniqueKey || 'portabled';

    const db = openDatabase(
      dbName, // name
      1, // version
      'Portabled virtual filesystem data', // displayName
      1024 * 1024); // size
    // upgradeCallback?


    var repeatingFailures_unexpected = 0; // protect against multiple transaction errors causing one another
    var finished = false; // protect against reporting results multiple times

    db.readTransaction(
      transaction => {

        transaction.executeSql(
          'SELECT value from "*metadata" WHERE name=\'editedUTC\'',
          [],
          (transaction, result) => {
            let editedValue: number | undefined;
            if (result.rows && result.rows.length === 1) {
              const row = result.rows.item(0);
              const editedValueStr = row && row.value;
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

            finished = true;
            callback(null, new WebSQLDetached(db, editedValue || 0, true));
          },
          (transaction, sqlError) => {
            if (finished) return;
            else finished = true;
            // no data
            callback(null, new WebSQLDetached(db, 0, false));
          });
      },
      sqlError=> {
        if (finished) return;

        repeatingFailures_unexpected++;
        if (repeatingFailures_unexpected>5) {
          finished = true;
          callback('Loading from metadata table failed, generating multiple failures ' + sqlError.message);
          return;
        }

        db.transaction(
          transaction =>
            createMetadataTable(
              transaction,
              sqlError_creation => {
                if (finished) return;
                else finished = true;

                if (sqlError_creation)
                  callback('Loading from metadata table failed: ' + sqlError.message + ' and creation metadata table failed: ' + sqlError_creation.message);
                else
                  // original metadata access failed, but create table succeeded
                  callback(null, new WebSQLDetached(db, 0, false));
              }),
          sqlError => {
            if (finished) return;
            else finished = true;

            callback('Creating metadata table failed: ' + sqlError.message);
          });
      });

  }

  function createMetadataTable(transaction: SQLTransaction, callback: (error: SQLError | null) => void) {
    transaction.executeSql(
      'CREATE TABLE "*metadata" (name PRIMARY KEY, value)',
      [],
      (transaction, result) =>
        callback(null),
      (transaction, sqlError) =>
        callback(sqlError));
  }

  class WebSQLDetached implements persistence.Drive.Detached {

    constructor(
      private _db: Database,
      public timestamp: number,
      private _metadataTableIsValid: boolean) {
    }

    applyTo(mainDrive: persistence.Drive.Detached.DOMUpdater, callback: persistence.Drive.Detached.CallbackWithShadow): void {
      this._db.readTransaction(
        transaction => listAllTables(
          transaction,
          tables => {

            const ftab = getFilenamesFromTables(tables);

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

    purge(callback: persistence.Drive.Detached.CallbackWithShadow): void {
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

    private _applyToWithFiles(
      transaction: SQLTransaction,
      ftab: { file: string; table: string; }[],
      mainDrive: persistence.Drive.Detached.DOMUpdater,
      callback: persistence.Drive.Detached.CallbackWithShadow): void {

      if (!ftab.length) {
        callback(new WebSQLShadow(this._db, this.timestamp, this._metadataTableIsValid));
        return;
      }

      var reportedFileCount = 0;

      const completeOne = () => {
        reportedFileCount++;
        if (reportedFileCount === ftab.length) {
          callback(new WebSQLShadow(this._db, this.timestamp, this._metadataTableIsValid));
        }
      };

      const applyFile = (file: string, table: string) => {
        transaction.executeSql(
          'SELECT * FROM "' + table + '"',
          [],
          (transaction, result) => {
            if (result.rows.length) {
              const row = result.rows.item(0);
              if (row.value === null)
                mainDrive.write(file, null);
              else if (typeof row.value === 'string')
                mainDrive.write(file, fromSqlText(row.value), fromSqlText(row.encoding));
            }
            completeOne();
          },
          sqlError => {
            completeOne();
          });
      };

      for (let i = 0; i < ftab.length; i++) {
        applyFile(ftab[i].file, ftab[i].table);
      }

    }

    private _purgeWithTables(transaction: SQLTransaction, tables: string[], callback: persistence.Drive.Detached.CallbackWithShadow) {
      if (!tables.length) {
        callback(new WebSQLShadow(this._db, 0, false));
        return;
      }

      var droppedCount = 0;

      const completeOne = () => {
        droppedCount++;
        if (droppedCount === tables.length) {
          callback(new WebSQLShadow(this._db, 0, false));
        }
      };

      for (let i = 0; i < tables.length; i++) {
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

  class WebSQLShadow implements persistence.Drive.Shadow {

    private _cachedUpdateStatementsByFile: { [name: string]: string; } = {};
    private _closures = {
      noop: () => {
        // nothing to do
      },
      updateMetadata: (transaction: SQLTransaction) => this._updateMetadata(transaction),
      updateMetdata_noMetadataCase: (transaction: SQLTransaction) => this._updateMetdata_noMetadataCase(transaction)
    };

    constructor(private _db: Database, public timestamp: number, private _metadataTableIsValid: boolean) {
    }

    write(file: string, content: string, encoding: string) {

      if (content || typeof content === 'string') {
        this._updateCore(file, content, encoding);
      }
      else {
        this._deleteAllFromTable(file);
      }
    }

    forget(file: string) {
      this._dropFileTable(file);
    }

    private _updateCore(file: string, content: string, encoding: string) {
      let updateSQL = this._cachedUpdateStatementsByFile[file];
      if (!updateSQL) {
        var tableName = mangleDatabaseObjectName(file);
        updateSQL = this._createUpdateStatement(file, tableName);
      }

      var repeatingTransactionErrorCount_unexpected = 0;
      this._db.transaction(
        transaction => {
          transaction.executeSql(
            updateSQL,
            ['content', content, encoding],
            this._closures.updateMetadata,
            (transaction, sqlError) => {
              this._createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding)
            });
        },
        sqlError => {
          repeatingTransactionErrorCount_unexpected++;
          if (repeatingTransactionErrorCount_unexpected>5) {
          	reportSQLError('Transaction failures ('+repeatingTransactionErrorCount_unexpected+') updating file "' + file + '".', sqlError);
            return;
          }

          // failure might have been due to table absence?
          // -- redo with a new transaction
      		this._db.transaction(
            transaction => {
          		this._createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding);
            },
            sqlError_inner => {
              // failure might have been due to *metadata table ansence
              // -- redo with a new transaction (last attempt)
      				this._db.transaction(
                transaction => {
                  this._updateMetdata_noMetadataCase(transaction);
                  // OK, once again for extremely confused browsers like Opera
                  transaction.executeSql(
                    updateSQL,
                    ['content', content, encoding],
                    this._closures.updateMetadata,
                    (transaction, sqlError) => {
                      this._createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding)
                    });
                },
                sqlError_ever_inner => {
                  reportSQLError(
                    'Transaction failure updating file "' + file + '" '+
                    '(after '+
                    (repeatingTransactionErrorCount_unexpected>1 ? repeatingTransactionErrorCount_unexpected:'')+
                    ' errors like ' +sqlError_inner.message +' and '+sqlError_ever_inner.message+
                    ').',
                    sqlError);
                });
            });
        });
    }

    private _createTableAndUpdate(transaction: SQLTransaction, file: string, tableName: string, updateSQL: string, content: string, encoding: string) {
      if (!tableName)
        tableName = mangleDatabaseObjectName(file);

      transaction.executeSql(
        'CREATE TABLE "' + tableName + '" (name PRIMARY KEY, value, encoding)',
        [],
        (transaction, result) => {
          transaction.executeSql(
            updateSQL,
            ['content', content, encoding],
            this._closures.updateMetadata,
            (transaction, sqlError) => {
              reportSQLError('Failed to update table "' + tableName + '" for file "' + file + '" after creation.', sqlError);
            });
        },
        (transaction, sqlError) => {
          reportSQLError('Failed to create a table "' + tableName + '" for file "' + file + '".', sqlError);
        });
    }

    private _deleteAllFromTable(file: string) {
      const tableName = mangleDatabaseObjectName(file);
      this._db.transaction(
        transaction => {
          transaction.executeSql(
            'DELETE FROM TABLE "' + tableName + '"',
            [],
            this._closures.updateMetadata,
            (transaction, sqlError) => {
              reportSQLError('Failed to delete all from table "' + tableName + '" for file "' + file + '".', sqlError);
            });
        },
        sqlError => {
          reportSQLError('Transaction failure deleting all from table "' + tableName + '" for file "' + file + '".', sqlError);
        });
    }

    private _dropFileTable(file: string) {
      const tableName = mangleDatabaseObjectName(file);
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
      transaction.executeSql(
        'INSERT OR REPLACE INTO "*metadata" VALUES (?,?)',
        ['editedUTC', this.timestamp],
        this._closures.noop, // TODO: generate closure statically
        this._closures.updateMetdata_noMetadataCase);
    }

    private _updateMetdata_noMetadataCase(transaction: SQLTransaction) {
      createMetadataTable(
        transaction,
        sqlerr => {
          if (sqlerr) {
            reportSQLError('Failed create metadata table.', sqlerr);
            return;
          }

          transaction.executeSql(
            'INSERT OR REPLACE INTO "*metadata" VALUES (?,?)',
            ['editedUTC', this.timestamp],
            (tr, result) => {
              // OK
            },
            (tr, sqlerr) => {
              reportSQLError('Failed to update metadata table after creation.', sqlerr);
            });
        });
    }

    private _createUpdateStatement(file: string, tableName: string): string {
      return this._cachedUpdateStatementsByFile[file] =
        'INSERT OR REPLACE INTO "' + tableName + '" VALUES (?,?,?)';
    }
  }


  function mangleDatabaseObjectName(name: string): string {
    // no need to polyfill btoa, if webSQL exists
    if (name.toLowerCase() === name)
      return name;
    else
      return '=' + btoa(name);
  }

  function unmangleDatabaseObjectName(name: string): string | null {
    if (!name || name.charAt(0) === '*') return null;

    if (name.charAt(0) !== '=') return name;

    try {
      return atob(name.slice(1));
    }
    catch (error) {
      return name;
    }
  }

  function listAllTables(
    transaction: SQLTransaction,
    callback: (tables: string[]) => void,
    errorCallback: (sqlError: SQLError) => void) {
      transaction.executeSql(
        'SELECT tbl_name  from sqlite_master WHERE type=\'table\'',
        [],
        (transaction, result) => {
          const tables: string[] = [];
          for (let i = 0; i < result.rows.length; i++) {
            const row = result.rows.item(i);
            const table = row.tbl_name;
            if (!table || (table[0] !== '*' && table.charAt(0) !== '=' && table.charAt(0) !== '/')) continue;
            tables.push(row.tbl_name);
          }
          callback(tables);
        },
        (transaction, sqlError) => errorCallback(sqlError));
    }

  function getFilenamesFromTables(tables: string[]) {
    const filenames: { table: string; file: string; }[] = [];
    for (let i = 0; i < tables.length; i++) {
      const file = unmangleDatabaseObjectName(tables[i]);
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

  function reportSQLError(message: string, sqlError: SQLError): void;
  function reportSQLError(sqlError: SQLError): void;
  function reportSQLError(message: any, sqlError?: any): void {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      if (sqlError)
        console.error(message, sqlError);
      else
        console.error(sqlError);
    }
  }


}