'use strict';

import {WorkspaceConfiguration} from 'vscode';
import * as vscode from 'vscode';

import fs = require('fs');
import path = require('path');
import os = require('os');

import fsutils = require("./utilities/fsutils");
import fmutils = require("./utilities/fmutils");

/**
 * Main class to handle the logic of the Project Templates
 * @export
 * @class TemplateManager
 */
export default class TemplateManager {

    config: WorkspaceConfiguration;

    constructor(config: WorkspaceConfiguration) {
        this.config = config;
    }

    public updateConfiguration(config : WorkspaceConfiguration) {
        this.config = config;
    }

    /**
     * Returns a list of available project templates by reading the Templates Directory.
     * @returns string[]
     */
    public getTemplates(): string[] {

        this.createTemplatesDirIfNotExists();

		let templateDir: string = this.getTemplatesDir();
        
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
     * Returns the templates directory location.
     * If no user configuration is found, the extension will look for
     * templates in USER_DATA_DIR/Code/ProjectTemplates.
     * Otherwise it will look for the path defined in the extension configuration.
     * @return {string}
     */
    public getTemplatesDir(): string {
        let dir = this.config.get('projectTemplatesDir', this.getDefaultTemplatesDir());
        if (!dir) {
            dir = this.getDefaultTemplatesDir();
        }
        return dir;
    }

    /**
     * Returns the default templates location based on the user OS.
     * @returns {string}
     */
    private getDefaultTemplatesDir(): string {
        let userDataDir : string;

        switch (process.platform) {
            case 'linux':
                userDataDir = path.join(os.homedir(), '.config');
                break;
            case 'darwin':
                userDataDir = path.join(os.homedir(), 'Library', 'Application Support');
                break;
            case 'win32':
                userDataDir = process.env.APPDATA!;
                break;
            default:
                throw Error("Unrecognized operating system: " + process.platform);
        }

        return path.join(userDataDir, 'Code', 'User', 'ProjectTemplates');
    }

    /**
     * Creates the templates directory if it does not exists
	 * @throws Error
     */
    public createTemplatesDirIfNotExists() {
		let templatesDir = this.getTemplatesDir();
		
		if (!fs.existsSync(templatesDir)) {
			try {
				fs.mkdirSync(templatesDir, 0o775);
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
     * @returns chosen template name, or undefined if none selected
     */
    public async chooseTemplate() : Promise<string | undefined> {
        
        // read templates
        let templates = this.getTemplates();
        let templateRoot = this.getTemplatesDir();

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
     */
    public async deleteTemplate(template : string) {
        
        // no template, cancel
        if (!template) {
            return;
        }
            
        let templateRoot = this.getTemplatesDir();
        let templateDir : string = path.join(templateRoot, template);

        if (fs.existsSync(templateDir) && fs.lstatSync(templateDir).isDirectory()) {
            // confirm delete
            vscode.window.showQuickPick(["Yes", "No"], { 
                placeHolder: "Are you sure you wish to delete the project template '" + template + "'?"
            }).then(
                async (choice) => {
                    if (choice === "Yes") {
                        // delete template
                        console.log("Deleting template folder '" + templateDir + "'");
                        fsutils.deleteDir(templateDir);
                    }
                });
        }
    }

    /**
     * Saves a workspace as a new template
     * @param workspace absolute path of workspace
     */
    public async saveAsTemplate(workspace : string) {

        // ensure templates directory exists
        this.createTemplatesDirIfNotExists();

        let projectName = path.basename(workspace);

        // ask for project name
        let inputOptions = <vscode.InputBoxOptions> {
            prompt: "Please enter the desired template name",
            value: projectName
        };
    
        // prompt user
        vscode.window.showInputBox(inputOptions).then(
            
            filename => {
    
                // determine template dir
                let templateDir = path.join(this.getTemplatesDir(), path.basename(filename!));
                console.log("Destination folder: " + templateDir);
    
                // check if exists
                if (fs.existsSync(templateDir)) {
                    // confirm over-write
                    vscode.window.showQuickPick(["Yes", "No"], { 
                        placeHolder: "Template '" + filename + "' already exists.  Do you wish to overwrite?" 
                        }).then(
                            async (choice) => {
                                   if (choice === "Yes") {
                                    // delete original and copy new template folder
                                    await fsutils.deleteDir(templateDir);
                                    fsutils.copyDir(workspace, templateDir);
                                }
                            });
                } else {
                    // copy current workspace to new template folder
                    fsutils.copyDir(workspace, templateDir);
                }
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
     * @returns {Promise<string|Buffer>} the (potentially) modified data, with 
     *                                   the same type as the input data 
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

        this.createTemplatesDirIfNotExists();

        // choose a template
        let template = await this.chooseTemplate();
        if (!template) {
            return;
        }

        // get template folder
        let templateRoot = this.getTemplatesDir();
        let templateDir = path.join(templateRoot, template);

        if (!fs.existsSync(templateDir) || !fs.lstatSync(templateDir).isDirectory()) {
            vscode.window.showErrorMessage("Template '" + template + "' does not exist.");
            return;
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

			if (fs.lstatSync(src).isDirectory()) {
                // create directory if doesn't exist
				if (!fs.existsSync(dest)) {
					fs.mkdirSync(dest);
				} else if (!fs.lstatSync(dest).isDirectory()) {
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
                        let choice = await vscode.window.showQuickPick(["Yes", "No", "Cancel"], { 
                            placeHolder: `Destination file "${reldest}" already exists.  Do you wish to replace it?`
                        });

                        if (choice === "Yes") {
                            // delete existing file
                            fs.unlinkSync(dest);
                        } else if (choice === "No") {
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
                        } else {
                            // cancel
                            return;
                        } // overwrite or rename
                    }  // if file
                } // while file exists

                // get src file contents
                let fileContents : Buffer = fs.readFileSync(src);
                if (usePlaceholders) {
                    fileContents = await this.resolvePlaceholders(fileContents, placeholderRegExp, placeholders) as Buffer;
                }

                // write file contents to destination
                fs.writeFile(dest, fileContents, 
                    function (err) {
                        if (err) {
                            vscode.window.showErrorMessage(err.message);
                        }
                    }
                );
            }
        };  // copy function
        
        // actually copy the file recursively
        await fsutils.recursiveApplyInDirSync(templateDir, workspace, copyFunc);        
    }

} // templateManager