module teapo.storage.attached.webSQL {

  export function mangleDatabaseObjectName(name: string): string {
    return '='+btoa(name);
  }

  export function unmangleDatabaseObjectName(name: string): string {
    if (!name || name.charAt(0) !== '=') return null;

    try {
      return atob(name.slice(1));
    }
    catch (error) {
      return null;
    }
  }

  export function wrapSQLError(sqlError: SQLError, context: string): Error {
    if (!sqlError) return null;
    return new Error(context+' '+sqlError.message + ' [' + sqlError.code + ']');
  }

  export function listAllTables(
    transaction: SQLTransaction,
    callback: (tables: string[]) => void,
    errorCallback: (sqlError: SQLError)=>void) {
    transaction.executeSql(
      'SELECT tbl_name  from sqlite_master WHERE type=\'table\'',
      [],
      (transaction, result) => {
        var tables: string[] = [];
        for (var i = 0; i < result.rows.length; i++) {
          var row = result.rows.item(i);
          var table = row.tbl_name;
          if(!table || (table[0] !== '*' && table.charAt(0) !== '=')) continue;
          tables.push(row.tbl_name);
        }
        callback(tables);
      },
      (transaction, sqlError) => errorCallback(sqlError));
  }

   export function updateEdited(
     editedUTC: number,
     transaction: SQLTransaction,
     callback: (sqlError: SQLError) => void ) {

    transaction.executeSql(
      'INSERT OR REPLACE INTO "*metadata" VALUES(\'edited\',?)',
      [editedUTC.toString()],
      (transaction, result) => callback(null),
      (transaction, sqlError) => callback(sqlError));

  }

  export function toSqlText(text: string) {
    if (text.indexOf('\u00FF') < 0 && text.indexOf('\u0000') < 0) return text;

    return text.replace(/\u00FF/g, '\u00FFf').replace(/\u0000/g, '\u00FF0');
  }

  export function fromSqlText(sqlText: string) { 
    if (sqlText.indexOf('\u00FF') < 0 && sqlText.indexOf('\u0000') < 0) return sqlText;

    return sqlText.replace(/\u00FFf/g, '\u00FF').replace(/\u00FF0/g, '\u0000');
  }

  
}