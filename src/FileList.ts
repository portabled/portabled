/// <reference path='typings/knockout.d.ts' />

module teapo {

  export class FileList {
    bindable = ko.observableArray<ListItem>();

    constructor() {
    }
  }

  export interface ListItem {
    name: string;
  }
}