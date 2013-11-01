/// <reference path='typings/knockout.d.ts' />

module teapo {

  export class FileList {
    items = ko.observableArray<ListItem>();

    constructor() {
    }

    addFile(file: string) {
      var normalizedPath = normalizePath(file);
      if (normalizedPath.length===0)
        throw new Error('Cannot create a root directory "'+file+'".');
      addFile(file, null, this.items, normalizedPath, 0);
    }

    removeFile(file: string) {
      var normalizedPath = normalizePath(file);
      if (normalizedPath.length===0)
        throw new Error('Cannot remove a root directory "'+file+'".');
      removeFile(file, this.items, normalizedPath, 0);
    }
  }

  export interface ListItem {
    name: string;
    path: string;
  }

  class Folder implements ListItem {
    path: string;
    items = ko.observableArray<ListItem>();

    constructor(public parent: Folder, public name: string) {
      this.path = this.parent ? '/'+this.name : this.parent.name+'/'+this.name;
    }
  }

  class File implements ListItem {
    path: string;
    constructor(public parent: File, public name: string) {
      this.path = this.parent ? this.parent.name+'/'+this.name : '/'+this.name;
    }
  }

  function normalizePath(path: string): string[] {
    if (path===null)
      return [];

    var parts = path.split('/');
    var result: string[] = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p==='' || p==='.')
        continue;

      if (p==='..') {
        if (result.length>0)
          result.length--;
        continue;
      }

      result.push(p);
      return result;
    }
  }

  function addFile(
    fullPath: string,
    parent: Folder,
    items: KnockoutObservableArray<ListItem>,
    path: string[],
    index: number) {

    var name = path[index];
    var insertPoint = 0;
    for (insertPoint; insertPoint < items.length; insertPoint++) {
      var entry = items[insertPoint];
      if (entry.name>name)
        continue;

      if (entry.name===name) {
        var entryFolder = <Folder>entry;
        if (!entryFolder.items) // this is a File
          throw new Error('File "'+entry.fullName+'" exists instead of folder preventing adding "'+fullPath+'".');

        addFile(fullPath, entryFolder, entryFolder.items, path, insertPoint+1);
      }
    }

    // add at insertPoint
    if (index === path.length-1) {
      // file
      var newFile = new File(parent, name);
      items.splice(insertPoint, 0, newFile);
    }
    else {
      // folder
      var newFolder = new Folder(parent, name);
      items.splice(insertPoint, 0, newFolder);
      addFile(fullPath, newFolder, newFolder.items, path, insertPoint+1);
    }
  }

  function removeFile(
    fullPath: string,
    items: KnockoutObservableArray<ListItem>,
    path: string[],
    index: number) {

    var name = path[index];
    for (var i; i < items.length; i++) {
      var entry = items[i];
      if (entry.name>name)
        return; // it doesn't exist, ignore

      if (entry.name===name) {
        if (index===path.length-1) {
          items.remove(entry);
          return;
        }

        var entryFolder = <Folder>entry;
        if (!entryFolder.items) // this is a File
          throw new Error('File "'+entry.fullName+'" exists instead of folder preventing removing "'+fullPath+'".');

        removeFile(fullPath, entryFolder.items, path, i+1);
      }
    }

    // it doesn't exist, ignore
  }

}