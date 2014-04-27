module teapo.tests.FileListTests {

  export function constructor_succeeds() { 
    var fl = new teapo.app.files.FileList();
  }

  export function constructor_null_succeeds() {
    var fl = new teapo.app.files.FileList(null);
  }

  export function constructor_empty_succeeds() {
    var fl = new teapo.app.files.FileList([]);
  }

  export function constructor_single_simple() {
    var fl = new teapo.app.files.FileList(['root.txt']);
    if (fl.folders().length) throw new Error('Should not have any folders, '+fl.folders().length);
    if (fl.files().length!==1) throw new Error('File expected, found ' + fl.files().length);
    if (fl.files()[0].name !== 'root.txt') throw new Error('Expected "root.txt", ' + fl.files()[0].name);
    if (fl.files()[0].path !== '/root.txt') throw new Error('Expected "/root.txt", ' + fl.files()[0].path);
  }

  export function constructor_single_root() {
    var fl = new teapo.app.files.FileList(['/root.txt']);
    if (fl.folders().length) throw new Error('Should not have any folders, ' + fl.folders().length);
    if (fl.files().length!==1) throw new Error('File expected, found ' + fl.files().length);
    if (fl.files()[0].name !== 'root.txt') throw new Error('Expected "root.txt", ' + fl.files()[0].name);
    if (fl.files()[0].path !== '/root.txt') throw new Error('Expected "/root.txt", ' + fl.files()[0].path);
  }

  export function constructor_single_rootAndTrailSlash() {
    var fl = new teapo.app.files.FileList(['/root.txt/']);
    if (fl.folders().length) throw new Error('Should not have any folders, ' + fl.folders().length);
    if (fl.files().length !== 1) throw new Error('File expected, found ' + fl.files().length);
    if (fl.files()[0].name !== 'root.txt') throw new Error('Expected "root.txt", ' + fl.files()[0].name);
    if (fl.files()[0].path !== '/root.txt') throw new Error('Expected "/root.txt", ' + fl.files()[0].path);
  }
    
  export function constructor_single_nest1() {
    var fl = new teapo.app.files.FileList(['/fold/root.txt']);
    if (fl.files().length) throw new Error('No root files expected, ' + fl.files().length);
    if (fl.folders().length!==1) throw new Error('Folder expected, found ' + fl.folders().length);
    var fold = fl.folders()[0];
    if (fold.name !== 'fold') throw new Error('Expected "fold", ' + fold.name);
    if (fold.path !== '/fold/') throw new Error('Expected "/fold/", ' + fold.path);
    if (fold.folders().length) throw new Error('Shoud not have subfolders, ' + fold.folders().length);

    if (fold.files().length !== 1) throw new Error('File expected, found ' + fold.files().length);
    if (fold.files()[0].name !== 'root.txt') throw new Error('Expected "root.txt", ' + fold.files()[0].name);
    if (fold.files()[0].path !== '/fold/root.txt') throw new Error('Expected "/fold/root.txt", ' + fold.files()[0].path);
  }

  export function file_simple() {
    var fl = new teapo.app.files.FileList();
    fl.file('root.txt');
    if (fl.folders().length) throw new Error('Should not have any folders, ' + fl.folders().length);
    if (fl.files().length !== 1) throw new Error('File expected, found ' + fl.files().length);
    if (fl.files()[0].name !== 'root.txt') throw new Error('Expected "root.txt", ' + fl.files()[0].name);
    if (fl.files()[0].path !== '/root.txt') throw new Error('Expected "/root.txt", ' + fl.files()[0].path);
  }

  export function file_root() {
    var fl = new teapo.app.files.FileList();
    fl.file('/root.txt');
    if (fl.folders().length) throw new Error('Should not have any folders, ' + fl.folders().length);
    if (fl.files().length !== 1) throw new Error('File expected, found ' + fl.files().length);
    if (fl.files()[0].name !== 'root.txt') throw new Error('Expected "root.txt", ' + fl.files()[0].name);
    if (fl.files()[0].path !== '/root.txt') throw new Error('Expected "/root.txt", ' + fl.files()[0].path);
  }

  export function file_rootAndTrailSlash() {
    var fl = new teapo.app.files.FileList();
    fl.file('/root.txt/');
    if (fl.folders().length) throw new Error('Should not have any folders, ' + fl.folders().length);
    if (fl.files().length !== 1) throw new Error('File expected, found ' + fl.files().length);
    if (fl.files()[0].name !== 'root.txt') throw new Error('Expected "root.txt", ' + fl.files()[0].name);
    if (fl.files()[0].path !== '/root.txt') throw new Error('Expected "/root.txt", ' + fl.files()[0].path);
  }

  export function file_nest1() {
    var fl = new teapo.app.files.FileList();
    fl.file('/fold/root.txt');
    if (fl.files().length) throw new Error('No root files expected, ' + fl.files().length);
    if (fl.folders().length !== 1) throw new Error('Folder expected, found ' + fl.folders().length);
    var fold = fl.folders()[0];
    if (fold.name !== 'fold') throw new Error('Expected "fold", ' + fold.name);
    if (fold.path !== '/fold/') throw new Error('Expected "/fold/", ' + fold.path);
    if (fold.folders().length) throw new Error('Shoud not have subfolders, ' + fold.folders().length);

    if (fold.files().length !== 1) throw new Error('File expected, found ' + fold.files().length);
    if (fold.files()[0].name !== 'root.txt') throw new Error('Expected "root.txt", ' + fold.files()[0].name);
    if (fold.files()[0].path !== '/fold/root.txt') throw new Error('Expected "/fold/root.txt", ' + fold.files()[0].path);
  }


  export function file1_file2() {
    var fl = new teapo.app.files.FileList();
    
    fl.file('file1.txt');
    fl.file('/folder/file2.txt');
    
    if (fl.files().length !== 1) throw new Error('Files expected, found ' + fl.files().length);
    if (fl.folders().length !== 1) throw new Error('Folder expected, found ' + fl.folders().length);
    var file1 = fl.files()[0];
    var file2 = fl.folders()[0].files()[0];

    if (file1.path !== '/file1.txt') throw new Error('Expected "/file1.txt", ' + file1.path);
    if (file2.path !== '/folder/file2.txt') throw new Error('Expected "/folder/file2.txt", ' + file2.path);
  }

}