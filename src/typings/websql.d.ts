declare function openDatabase(name: string, version, description: string, upgrade: Function): openDatabase.Database;

declare module openDatabase {
  interface Database {
  }
}