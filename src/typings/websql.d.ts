declare function openDatabase(
  name: string,
  version: any,
  description: string,
  upgrade: Function): openDatabase.Database;

declare module openDatabase {

  export interface Database {
    transaction(intransaction: (t: openDatabase.SqlTransaction) => void): void;
  }

  export interface SqlTransaction {
    executeSql(
      sql: string,
      args: any[],
      callback: (result: SqlResult) => void,
      errorcallback: (error: Error) => void): void;
  }

  export interface SqlResult {
    rows: { length: number; item(index: number): any; };
  }
}