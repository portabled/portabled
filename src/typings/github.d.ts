/**
 * See https://github.com/michael/github
 */
declare class Github {

  constructor(config: {
    username?: string;
    password?: string;
    token?: string;
    auth?: string;
  });

  constructor(config: {
    token?: string;
    auth?: string;
  });

  getRepo(username?: string, password?: string): Github.Repo;

}

declare module Github {

  export interface Repo {

    show(callback: (error: Error, repo: any) => void): void;

    deleteRepo(callback: (error: Error, res: any) => void): void;

    contents(branch: string, pathToDir: string, callback: (err: Error, contents: any) => void, sync?: boolean);

    fork(callback: (err: Error) => void): void;
    
    branch(oldBranchName: string, newBranchName: string, callback: (err: Error) => void);

  	createPullRequest(pull: PullRequest, callback: (err: Error, pullRequest: any) => void);

    listBranches(callback: (error: Error, braches: any) => void);

    write(branch: string, pathToFile: string, contents: string, commitMessage: string, callback: (err: Error) => void);
    
    read(master: string, pathToFile: string, callback: (err, data) => void);
    
    move(branch: string, pathToFile: string, pathToNewFile: string, callback: (err: Error) => void);

    remove(branch: string, pathToFile: string, callback: (err: Error) => void);
    
    /** also try branch like master?recursive=true */
    getTree(branch: string, callback: (err: Error, tree: any) => void);
    
    getSha(branch: string, pathToFile: string, callback: (err, sha) => void);
    

  }
  
  export interface PullRequest {
    title: string;
    body: string;
    base: string;
    head: string;
  }

}