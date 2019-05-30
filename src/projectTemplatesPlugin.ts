'use strict';

import {WorkspaceConfiguration} from 'vscode';
import * as vscode from 'vscode';

import fs = require('fs');
import path = require('path');

import fsutils = require("./utilities/fsutils");
import fmutils = require("./utilities/fmutils");
import VariableResolver from './utilities/variableResolver';
import { cloneOrPull } from './utilities/git';

/**
 * Main class to handle the logic of the Project Templates
 * @export
 * @class TemplateManager
 */
export default class ProjectTemplatesPlugin {

    /**
     * local copy of workspace configuration to maintain consistency between calls
     */
    config: WorkspaceConfiguration;
    econtext: vscode.ExtensionContext;

    constructor(econtext : vscode.ExtensionContext, config: WorkspaceConfiguration) {
        this.config = config;
        this.econtext = econtext;
    }

    /**
     * Updates the current configuration settings
     * @param config workspace configuration
     */
    public updateConfiguration(config : WorkspaceConfiguration) {
        this.config = config;
    }

    /**
     * Selects a workspace folder.  If args contains an fsPath, then it uses
     * that.  Otherwise, for single root workspaces it will select the root directory,
     * or for multi-root will present a chooser to select a workspace.
     * @param args 
     */
    public async selectWorkspace(args : any) : Promise<string> {

        let workspace : string = "";

        // check arguments
        if (args && args.fsPath) {
            workspace = args.fsPath;
        } else if (vscode.workspace.workspaceFolders) {
            // single or multi-root
            if (vscode.workspace.workspaceFolders.length === 1) {
                workspace = vscode.workspace.workspaceFolders[0].uri.fsPath;
            } else if (vscode.workspace.workspaceFolders.length > 1) {
                // choose workspace
                let ws = await vscode.window.showWorkspaceFolderPick();
                if (ws) {
                    workspace = ws.uri.fsPath;
                }
            }
        }
        return workspace;
    }

    /**
     * Returns a list of available project templates by reading the Templates Directory.
     * @returns list of templates found
     */
    public async getTemplates(): Promise<string[]> {

        await this.createTemplatesDirIfNotExists();

		let templateDir: string = await this.getTemplatesDir();
        
        let templates: string[] = fs.readdirSync(templateDir).map( function (item) {
			// ignore hidden folders
            if (!/^\./.exec(item)) {
                return fs.statSync(path.join(templateDir, item)).isDirectory ? item : null;
            }
            return null;
        }).filter(function (filename) {
            return filename !== null;
		}) as string[];
		
        return templates;
    }

    /**
     * Returns a list of available git project templates by reading the git settings.
     * @returns list of git templates found
     */
    public async getRepositories(): Promise<string[]> {

        let gitPrefix: string = this.config.get('gitPrefix', 'Git:');

        let repositores: string[] = this.config.get('gitRepositories', []).map( function (item: string) {
            let name: string = item.substr(item.lastIndexOf('/') + 1);
            return `${gitPrefix} ${name}`;
        }).filter(function (filename) {
            return filename !== null;
        }) as string[];

        return repositores;
    }

    /**
     * Returns the templates directory location.
     * If no user configuration is found, the extension will look for
     * templates in USER_DATA_DIR/Code/ProjectTemplates.
     * Otherwise it will look for the path defined in the extension configuration.
     * @return the templates directory
     */
    public async getTemplatesDir(): Promise<string> {

        let dir = this.config.get('templatesDirectory', this.getDefaultTemplatesDir());
        if (!dir) {
            dir = path.normalize(this.getDefaultTemplatesDir());
            return Promise.resolve(dir);
        }

        // resolve path with variables
        const resolver = new VariableResolver();
        let rdir = await resolver.resolve(dir);
        dir = path.normalize(rdir);

        return Promise.resolve(dir);
    }

    /**
     * Returns the git directory location.
     * If no user configuration is found, the extension will look for
     * templates in USER_DATA_DIR/Code/ProjectGitTemplates.
     * Otherwise it will look for the path defined in the extension configuration.
     * @return the templates git directory
     */
    public async getGitDir(): Promise<string> {

        let dir = this.config.get('gitDirectory', this.getDefaultGitDir());
        if (!dir) {
            dir = path.normalize(this.getDefaultGitDir());
            return Promise.resolve(dir);
        }

        // resolve path with variables
        const resolver = new VariableResolver();
        let rdir = await resolver.resolve(dir);
        dir = path.normalize(rdir);

        return Promise.resolve(dir);
    }

    /**
     * Returns the default templates location, which is based on the global storage-path directory.
     * @returns default template directory
     */
    private getDefaultTemplatesDir(): string {

        // extract from workspace-specific storage path
        let userDataDir = this.econtext.storagePath;

        if (!userDataDir) {
            // no workspace, default to OS-specific hard-coded path
            // switch (process.platform) {
            //     case 'linux':
            //         userDataDir = path.join(os.homedir(), '.config');
            //         break;
            //     case 'darwin':
            //         userDataDir = path.join(os.homedir(), 'Library', 'Application Support');
            //         break;
            //     case 'win32':
            //         userDataDir = process.env.APPDATA!;
            //         break;
            //     default:
            //         throw Error("Unrecognized operating system: " + process.platform);
            // }
            // userDataDir = path.join(userDataDir, 'Code', 'User', 'ProjectTemplates');

            // extract from log path
            userDataDir = this.econtext.logPath;
            let gggparent = path.dirname(path.dirname(path.dirname(path.dirname(userDataDir))));
            userDataDir = path.join(gggparent, 'User', 'ProjectTemplates');
        } else {
            // get parent of parent of parent to remove workspaceStorage/<UID>/<extension>
            let ggparent = path.dirname(path.dirname(path.dirname(userDataDir)));
            // add subfolder 'ProjectTemplates'
            userDataDir = path.join(ggparent, 'ProjectTemplates');
        }

        return userDataDir;
    }

    /**
     * Returns the default git template location, which is based on the global storage-path directory.
     * @returns default template git directory
     */
    private getDefaultGitDir(): string {

        // extract from workspace-specific storage path
        let userDataDir = this.econtext.storagePath;

        if (!userDataDir) {
            userDataDir = this.econtext.logPath;
            let gggparent = path.dirname(path.dirname(path.dirname(path.dirname(userDataDir))));
            userDataDir = path.join(gggparent, 'User', 'ProjectGitTemplates');
        } else {
            // get parent of parent of parent to remove workspaceStorage/<UID>/<extension>
            let ggparent = path.dirname(path.dirname(path.dirname(userDataDir)));
            // add subfolder 'ProjectGitTemplates'
            userDataDir = path.join(ggparent, 'ProjectGitTemplates');
        }

        return userDataDir;
    }

    /**
     * Creates the templates directory if it does not exists
	 * @throws Error
     */
    public async createTemplatesDirIfNotExists() {
		let templatesDir = await this.getTemplatesDir();
		
		if (templatesDir && !fs.existsSync(templatesDir)) {
			try {
                fsutils.mkdirsSync(templatesDir, 0o775);
				fs.mkdirSync(templatesDir);
			} catch (err) {
				if (err.code !== 'EEXIST') {
					throw err;
				}
			}
		}
    }

    /**
     * Creates the git template directory if it does not exists
	 * @throws Error
     */
    public async createGitDirIfNotExists() {
		let templatesDir = await this.getGitDir();
		
		if (templatesDir && !fs.existsSync(templatesDir)) {
			try {
                fsutils.mkdirsSync(templatesDir, 0o775);
				fs.mkdirSync(templatesDir);
			} catch (err) {
				if (err.code !== 'EEXIST') {
					throw err;
				}
			}
		}
    }

    /**
     * Chooses a template from the set of templates available in the root 
     * template directory.  If none exists, presents option to open root
     * template folder.
     * 
     * @param includeGit
     * 
     * @returns chosen template name, or undefined if none selected
     */
    public async chooseTemplate(includeGit: boolean) : Promise<string | undefined> {
        
        // read templates
        let templates = await this.getTemplates();
        let templateRoot = await this.getTemplatesDir();

        if (includeGit) {
            const repos = await this.getRepositories();
            templates = templates.concat(repos);
        }

        if (templates.length === 0) {
            let optionGoToTemplates = <vscode.MessageItem> {
                title: "Open Templates Folder"
            };

            vscode.window.showInformationMessage("No templates found!", optionGoToTemplates).then(option => {
                // nothing selected
                if (!option) {
                    return;
                }

                fmutils.openFolderInExplorer(templateRoot);
            });

            return undefined;
        }

        // show the list of available templates.
        return vscode.window.showQuickPick(templates);
    }

    /**
     * Deletes a template from the template root directory
     * @param template name of template
     * @returns success or failure
     */
    public async deleteTemplate(template : string) {
        
        // no template, cancel
        if (!template) {
            return false;
        }
            
        let templateRoot = await this.getTemplatesDir();
        let templateDir : string = path.join(templateRoot, template);

        if (fs.existsSync(templateDir) && fs.lstatSync(templateDir).isDirectory()) {
            // confirm delete
            let success = await vscode.window.showQuickPick(["Yes", "No"], { 
                placeHolder: "Are you sure you wish to delete the project template '" + template + "'?"
            }).then(
                async (choice) => {
                    if (choice === "Yes") {
                        // delete template
                        // console.log("Deleting template folder '" + templateDir + "'");
                        let ds = await fsutils.deleteDir(templateDir).then(
                            (value : boolean) => {
                                return value;
                            },
                            (reason : any) => {
                                return Promise.reject(reason);
                            }
                        );
                        return ds;
                    } 
                    return false;
                },
                (reason : any) => {
                    console.log(reason);
                    return Promise.reject(reason);
                }
                );

            return success;
        }

        return false;
    }

    /**
     * Saves a workspace as a new template
     * @param  workspace absolute path of workspace
     * @returns  name of template
     */
    public async saveAsTemplate(workspace : string) {

        // ensure templates directory exists
        await this.createTemplatesDirIfNotExists();

        let projectName = path.basename(workspace);

        // ask for project name
        let inputOptions = <vscode.InputBoxOptions> {
            prompt: "Please enter the desired template name",
            value: projectName
        };
    
        // prompt user
        return await vscode.window.showInputBox(inputOptions).then(
            
            async filename => {
    
                // empty filename exits
                if (!filename) {
                    return undefined;
                }

                // determine template dir
                let template = path.basename(filename);
                let templateDir = path.join(await this.getTemplatesDir(), template);
                console.log("Destination folder: " + templateDir);
    
                // check if exists
                if (fs.existsSync(templateDir)) {
                    // confirm over-write
                    await vscode.window.showQuickPick(["Yes", "No"], { 
                            placeHolder: "Template '" + filename + "' already exists.  Do you wish to overwrite?" 
                        }).then(
                            async (choice) => {
                                if (choice === "Yes") {
                                    // delete original and copy new template folder
                                    await fsutils.deleteDir(templateDir);
                                    await fsutils.copyDir(workspace, templateDir);
                                }
                            },
                            (reason) => {
                                return Promise.reject(reason);
                            });
                } else {
                    // copy current workspace to new template folder
                    await fsutils.copyDir(workspace, templateDir);
                }

                return template;
            }
        );
    }

    /**
     * Replaces any placeholders found within the input data.  Will use a 
     * dictionary of values from the user's workspace settings, or will prompt
     * if value is not known.
     * 
     * @param data input data
     * @param placeholderRegExp  regular expression to use for detecting 
     *                           placeholders.  The first capture group is used
     *                           as the key.
     * @param placeholders dictionary of placeholder key-value pairs
     * @returns the (potentially) modified data, with the same type as the input data 
     */
    private async resolvePlaceholders(data : string | Buffer, placeholderRegExp : string,
        placeholders : {[placeholder: string] : string | undefined} ) : Promise<string | Buffer> {

        // resolve each placeholder
        let regex = RegExp(placeholderRegExp, 'g');

        // collect set of expressions and their replacements
        let match;
        let nmatches = 0;
        let str : string;
        let encoding : string = "utf8";

        if (Buffer.isBuffer(data)) {
            // get default encoding
            let fconfig = vscode.workspace.getConfiguration('files');
            encoding = fconfig.get("files.encoding", "utf8");
            try {
                str = data.toString(encoding);
            } catch(Err) {
                // cannot decipher text from encoding, assume raw data
                return data;
            }
        } else {
            str = data;
        }

        while (match = regex.exec(str)) {
            let key = match[1];
            let val : string | undefined = placeholders[key];
            if (!val) {

                let variableInput = <vscode.InputBoxOptions> {
                    prompt: `Please enter the desired value for "${match[0]}"`
                };

                val = await vscode.window.showInputBox(variableInput).then(
                    value => {
                        if (value) {
                            // update map
                            placeholders[key] = value;
                        }
                        return value;
                    }
                );
            }
            ++nmatches;
        }

        // reset regex
        regex.lastIndex = 0;

        // compute output
        let out : string | Buffer = data;
        if (nmatches > 0) {
            // replace placeholders in string
            str = str.replace(regex, 
                (match, key) => {
                    let val = placeholders[key];
                    if (!val) {
                        val = match;
                    }
                    return val;
                }
            );

            // if input was a buffer, re-encode to buffer
            if (Buffer.isBuffer(data)) {
                out = Buffer.from(str, encoding);
            } else {
                out = str;
            }
        }

        return out;
    }

    /**
     * Populates a workspace folder with the contents of a template
     * @param workspace current workspace folder to populate
     */
    public async createFromTemplate(workspace : string) {

        await this.createTemplatesDirIfNotExists();

        // choose a template
        let template = await this.chooseTemplate(true);
        if (!template) {
            return;
        }

        // get template folder
        let templateDir: string;
        
        let gitPrefix = this.config.get('gitPrefix', 'Git:');
        if (template.startsWith(gitPrefix)) {
            let name = template.replace(`${gitPrefix} `, '');
            let repo = this.config.get('gitRepositories', []).find((item: string) => item.endsWith(name));

            if (!repo) {
                vscode.window.showErrorMessage("Template '" + template + "' was not found.");
                return undefined;
            }

            let templateRoot = await this.getGitDir();

            await cloneOrPull(repo, templateRoot);

            templateDir = path.join(templateRoot, name);
        } else {
            let templateRoot = await this.getTemplatesDir();
            templateDir = path.join(templateRoot, template);
        }

        if (!fs.existsSync(templateDir) || !fs.lstatSync(templateDir).isDirectory()) {
            vscode.window.showErrorMessage("Template '" + template + "' does not exist.");
            return undefined;
        }

        // update placeholder configuration
        let usePlaceholders = this.config.get("usePlaceholders", false);
        let placeholderRegExp = this.config.get("placeholderRegExp", "#{(\\w+?)}");
        let placeholders : {[placeholder:string] : string|undefined} = this.config.get("placeholders", {});

        // re-read configuration, merge with current list of placeholders
        let newplaceholders : {[placeholder : string] : string} = this.config.get("placeholders", {});
        for (let key in newplaceholders) {
            placeholders[key] = newplaceholders[key];
        }

        // recursively copy files, replacing placeholders as necessary
		let copyFunc = async (src : string, dest : string) => {

            // maybe replace placeholders in filename
            if (usePlaceholders) {
                dest = await this.resolvePlaceholders(dest, placeholderRegExp, placeholders) as string;
            }

            // if we copy from a git repo, we need to skip the .git directory
            if (/\/.git($|\/)/ig.test(src)) {
                return true;
            }

			if (fs.lstatSync(src).isDirectory()) {
                // create directory if doesn't exist
				if (!fs.existsSync(dest)) {
					fs.mkdirSync(dest);
				} else if (!fs.lstatSync(dest).isDirectory()) {
                    // fail if file exists
					throw new Error("Failed to create directory '" + dest + "': file with same name exists.");
				}
            } else {

                // ask before overwriting existing file
                while (fs.existsSync(dest)) {

                    // if it is not a file, cannot overwrite
                    if (!fs.lstatSync(dest).isFile()) {
                        let reldest = path.relative(workspace, dest);
                        
                        let variableInput = <vscode.InputBoxOptions> {
                            prompt: `Cannot overwrite "${reldest}".  Please enter a new filename"`,
                            value: reldest
                        };
        
                        // get user's input
                        dest = await vscode.window.showInputBox(variableInput).then(
                            value => {
                                if (!value) {
                                    return dest;
                                }
                                return value;
                            }
                        );

                        // if not absolute path, make workspace-relative
                        if (!path.isAbsolute(dest)) {
                            dest = path.join(workspace, dest);
                        }

                    } else {
                        
                        // ask if user wants to replace, otherwise prompt for new filename
                        let reldest = path.relative(workspace, dest);
                        let choice = await vscode.window.showQuickPick(["Overwrite", "Rename", "Skip", "Abort"], { 
                            placeHolder: `Destination file "${reldest}" already exists.  What would you like to do?`
                        });

                        if (choice === "Overwrite") {
                            // delete existing file
                            fs.unlinkSync(dest);
                        } else if (choice === "Rename") {
                            // prompt user for new filename
                            let variableInput = <vscode.InputBoxOptions> {
                                prompt: "Please enter a new filename",
                                value: reldest
                            };

                            // get user's input
                            dest = await vscode.window.showInputBox(variableInput).then(
                                value => {
                                    if (!value) {
                                        return dest;
                                    }
                                    return value;
                                }
                            );

                            // if not absolute path, make workspace-relative
                            if (!path.isAbsolute(dest)) {
                                dest = path.join(workspace, dest);
                            }
                        } else if (choice === "Skip") {
                            // skip
                            return true;
                        } else {
                            // abort
                            return false;
                        }// overwrite or rename
                    }  // if file
                } // while file exists

                // get src file contents
                let fileContents : Buffer = fs.readFileSync(src);
                if (usePlaceholders) {
                    fileContents = await this.resolvePlaceholders(fileContents, placeholderRegExp, placeholders) as Buffer;
                }

                // ensure directories exist
                let parent = path.dirname(dest);
                fsutils.mkdirsSync(parent);

                // write file contents to destination
                fs.writeFileSync(dest, fileContents);

            }
            return true;
        };  // copy function
        
        // actually copy the file recursively
        await this.recursiveApplyInDir(templateDir, workspace, copyFunc);    
        
        return template;
    }

    /**
    * Recursively apply a function on a pair of files or directories from source to dest.
    * 
    * @param src source file or folder
    * @param dest destination file or folder
    * @param func function to apply between src and dest
    * @return if recursion should continue
    * @throws Error if function fails
    */
   private async recursiveApplyInDir(src : string, dest : string, 
        func : (src : string, dest : string) => Promise<boolean>) : Promise<boolean> {
   
        // apply function between src/dest
        let success = await func(src, dest);
        if (!success) {
            return false;
        }
   
        if (fs.lstatSync(src).isDirectory()) {
            
            // read contents of source directory and iterate
            const entries : string[] = fs.readdirSync(src);
    
            for(let entry of entries) {
                
                // full path of src/dest
                const srcPath = path.join(src,entry);
                const destPath = path.join(dest,entry);
                
                // if directory, recursively copy, otherwise copy file
                success = await this.recursiveApplyInDir(srcPath, destPath, func);
                if (!success) {
                    return false;
                }
            }
        }

        return true;
   }

} // templateManager