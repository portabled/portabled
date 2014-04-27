module teapo.storage.attached.webSQL {

  export class LoadStorage implements attached.LoadStorage {

    constructor(
      public editedUTC: number,
      private _db: Database,
      private _metadataTableExists: boolean) {
    }

    load(recipient: LoadStorageRecipient) {

      if (typeof this.editedUTC !== 'number') {
        this._createUpdateStorage(
          [],
          (error, update) => {
            if (error)
              recipient.failed(error);
            else
              recipient.completed(update);
          });
        return;
      }
      

      this._db.readTransaction(
        transaction => {

          listAllTables(
            transaction,
            tableNames => this._processTableNames(transaction, tableNames, recipient),
            sqlError=> recipient.failed(wrapSQLError(sqlError, 'load: listAllTables')));
        },
        sqlError => recipient.failed(wrapSQLError(sqlError, 'load: readTransaction')));
    }

    migrate(
      editedUTC: number,
      filesByName: { [name: string]: { [name: string]: string; }; },
      callback: (error: Error, updater: attached.UpdateStorage) => void) {

      this._db.transaction(
        transaction=> {

          this._dropAllTables(
            transaction,
            error => {
              if (error) {
                callback(wrapSQLError(error, 'migrate:dropAllTables'), null);
                return;
              }

              var migratedTables = 0;
              var anyError = false;
              var filenames: string[] = [];

              for (var file in filesByName) if (filesByName.hasOwnProperty(file)) {
                filenames.push(file);
              }

              var completeMigration = () => {
                // all tables deleted, so metadata does not exist

                this._createMetadata(
                  transaction,
                  () => updateEdited(
                    editedUTC,
                    transaction,
                    sqlError=> {
                      if (sqlError) {
                        callback(wrapSQLError(sqlError, 'migrate: updateEdited(' + editedUTC + ')'), null);
                      }
                      else {
                        this._createUpdateStorage(filenames, callback);
                      }
                    }),
                  sqlError => callback(wrapSQLError(sqlError, 'migrate: _createMetadata'), null));
              };
              
              if(!filenames.length){
                completeMigration();
                return;
              }
              
              filenames.forEach(file => {

                this._migrateTable(
                  transaction,
                  file,
                  filesByName[file],
                  sqlError => {
                    if (error) {
                      if (!anyError) {
                        anyError = true;
                        callback(wrapSQLError(error, 'migrate: _migrateTable(' +file+')'), null);
                      }
                      return;
                    }

                    migratedTables++;

                    if (!anyError && migratedTables === filenames.length) {
                      completeMigration();
                    }
                  });
              });
            });

        },
        sqlError => callback(wrapSQLError(sqlError,'migrate: transaction'), null));

    }
    
    private _createUpdateStorage(fileNames: string[], callback: (error: Error, update: UpdateStorage) => void) {
      if (this._metadataTableExists) {
        callback(null, new UpdateStorage(this._db, fileNames));
        return;
      }

      this._db.transaction(
        transaction=>
          this._createMetadata(
            transaction,
            () => callback(null, new UpdateStorage(this._db, fileNames)),
            sqlError => callback(wrapSQLError(sqlError, '_createUpdateStorage: _createMetadata'), null)),
      sqlError=> callback(wrapSQLError(sqlError, '_createUpdateStorage: transaction'), null));
    }

    private _createMetadata(transaction: SQLTransaction, callback: () => void, errorCallback: (sqlError: SQLError) => void) { 
      transaction.executeSql(
        'CREATE TABLE "*metadata" (name PRIMARY KEY, value)',
        [],
        (transaction, result) => {
          this._metadataTableExists = true;
          callback();
        },
        (tranaction, sqlError) => errorCallback(sqlError));
    }

    private _dropAllTables(transaction: SQLTransaction, callback: (error: SQLError) => void) {
      listAllTables(
        transaction,
        allTableNames=> {

          var tableNames = allTableNames;//.filter(table=> table !== '*metadata');
          
          if (!tableNames.length){
            this._metadataTableExists = false;
            callback(null);
            return;
          }

          var anyError = false;
          var dropped = 0;
          tableNames.forEach(table=>
            transaction.executeSql(
              'DROP TABLE "' + table + '"',
              [],
              (transaction, result) => {
                if (anyError) return;
                dropped++;
                if(dropped === tableNames.length){
                  this._metadataTableExists = false;
                  callback(null);
                }
              },
              (transaction, sqlError) => {
                if (anyError) return;
                anyError = true;
                callback(sqlError);
              }));
        },
        callback);
    }

    private _migrateTable(
      transaction: SQLTransaction,
      file: string,
      properties: { [name: string]: string; },
      callback: (error: SQLError) => void) {

      transaction.executeSql(
        'CREATE TABLE "' + mangleDatabaseObjectName(file) + '" (name PRIMARY KEY, value)',
        [],
        (transaction, result) => {
          var updateSql = 'INSERT INTO "' + mangleDatabaseObjectName(file) + '" (name,value) VALUES (?,?)';

          var propertiesToUpdate = 0;
          var updatedProperties = 0;
          var allPropertiesPassed = false;
          var anyError = false;

          for (var propertyName in properties) if (properties.hasOwnProperty(propertyName)) {

            var value = properties[propertyName];

            propertiesToUpdate++;

            transaction.executeSql(
              updateSql,
              [propertyName, value],
              (transaction, result) => {
                updatedProperties++;
                if (!anyError && allPropertiesPassed && updatedProperties === propertiesToUpdate)
                  callback(null);
              },
              (transaction, sqlError) => {
                if (anyError) return;
                anyError = true;
                callback(sqlError);
              });
          }

          allPropertiesPassed = true;
          if (!anyError && updatedProperties == propertiesToUpdate)
            callback(null);
        },
        (transaction, sqlError) => callback(sqlError))
    }

    private _processTableNames(
      transaction: SQLTransaction,
      tableNames: string[],
      recipient: LoadStorageRecipient) {

        var ftab = tableNames.map(table => {
          return {
            table: table,
            file: unmangleDatabaseObjectName(table)
          };
        }).filter(ft=> <any>ft.file);
      
      if (!ftab.length) {
        recipient.completed(new UpdateStorage(this._db, []));
        return;
      }

      var anyError = false;
      var reportedFileCount = 0;
      
      ftab.forEach(ft=> {
        transaction.executeSql(
          'SELECT * FROM "' + ft.table + '"',
          [],
          (transaction, result) => {
            if (anyError) return;

            var properties = this._extractFileProperties(result);

            recipient.file(ft.file, properties);
            reportedFileCount++;

            if (reportedFileCount === ftab.length)
              this._createUpdateStorage(
                ftab.map(ft=> ft.file),
                (error, update) => {
                  if (error)
                    recipient.failed(error);
                  else
                    recipient.completed(update);
                });
          },
          (transaction, sqlError) => {
            anyError = true;
            recipient.failed(wrapSQLError(sqlError, '_processTableNames: SELECT FROM '+ft.table));
          });

      });
    }

    private _extractFileProperties(result: SQLResultSet) {
      var properties: { [name: string]: string; } = {};
      if (result.rows) {
        for (var i = 0; i < result.rows.length; i++) {
          var row = result.rows.item(i);
          properties[row.name] = fromSqlText(row.value);
        }
      }

      return properties;
    }
  }

}