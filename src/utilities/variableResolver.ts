/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 * 
 *  Modified from
 *      vscode/src/vs/workbench/services/configurationResolver/node/variableResolver.ts
 *      vscode/src/vs/workbench/services/configurationResolver/electron-browser/configurationResolverService.ts
 *  to reduce dependencies, for use with extensions
 * 
 *  cantonios 2018
 *--------------------------------------------------------------------------------------------*/

'use strict';

import {WorkspaceFolder, Uri} from 'vscode';
import * as vscode from 'vscode';
import path = require("path");

export default class VariableResolver {

    static VARIABLE_REGEXP = /\$\{(.*?)\}/g;

    private _envVariables : {[key: string] : string};

    constructor (envVariables = process.env) {
        
        // convert dictionary to lowercase for windows, otherwise use directly
        this._envVariables = {};
        if (process.platform === 'win32') {
			this._envVariables = Object.create(null);
			Object.keys(envVariables).forEach(key => {
                let val : string | undefined = envVariables[key];
                if (val) {
                    this._envVariables[key.toLowerCase()] = val;
                }
			});
		} else {
            this._envVariables = Object.create(null);
			Object.keys(envVariables).forEach(key => {
                let val : string | undefined = envVariables[key];
                if (val) {
                    this._envVariables[key] = val;
                }
			});
        }
    }

    /**
	 * Finds all variables in object using cmdVar and pushes them into commands.
	 * @param cmdVar Regex to use for finding variables.
	 * @param object object is searched for variables.
	 * @param commands All found variables are returned in commands.
	 */
	private findVariables(cmdVar: RegExp, object: any, commands: string[]) {
		if (!object) {
			return;
		} else if (typeof object === 'string') {
			let matches;
			while ((matches = cmdVar.exec(object)) !== null) {
				if (matches.length === 2) {
					const command = matches[1];
					if (commands.indexOf(command) < 0) {
						commands.push(command);
					}
				}
			}
		} else if (object instanceof Array) {
			object.forEach(value => {
				this.findVariables(cmdVar, value, commands);
			});
		} else {
			Object.keys(object).forEach(key => {
				const value = object[key];
				this.findVariables(cmdVar, value, commands);
			});
		}
	}

    private async sequence<T>(promiseFactories: { (): Promise<any> }[]): Promise<T[]> {
        const results: T[] = [];
        let index = 0;
        const len = promiseFactories.length;
    
        function next(): Thenable<T> | null {
            return index < len ? promiseFactories[index++]() : null;
        }
    
        function thenHandler(result: any): Thenable<any> {
            if (result !== undefined && result !== null) {
                results.push(result);
            }
    
            const n = next();
            if (n) {
                return n.then(thenHandler);
            }
    
            return Promise.resolve(results);
        }
    
        return Promise.resolve(null).then(thenHandler);
    }

    private resolveFromMap(match: string, argument: string, commandValueMapping: {[key: string]: string}, prefix: string): string {
		if (argument && commandValueMapping) {
			const v = commandValueMapping[prefix + ':' + argument];
			if (typeof v === 'string') {
				return v;
			}
			throw new Error("noValueForCommand: '" + match + "' can not be resolved because the command has no value.");
		}
		return match;
	}

    private async resolveCommands( configuration : any ) : Promise<{[command: string] : string} | undefined> {
      
		// use an array to preserve order of first appearance
		const cmd_var = /\${command:(.*?)}/g;
		const commands: string[] = [];
        this.findVariables(cmd_var, configuration, commands);
        
		let cancelled = false;
		const commandValueMapping: {[command: string] : string} = Object.create(null);

        if (commands.length > 0) {
            const factory: { (): Promise<any> }[] = commands.map(commandVariable => {
                return async () => {
                    
                    return vscode.commands.executeCommand<string>(commandVariable, configuration).then(result => {
                        if (typeof result === 'string') {
                            commandValueMapping['command:' + commandVariable] = result;
                        } else if (!result) {
                            cancelled = true;
                        } else {
                            return Promise.reject("stringsOnlySupported: Command '" + commandVariable 
                                +  "' did not return a string result. Only strings are supported as results for commands used for variable substitution.");
                        }
                    });
                };
            });
            return this.sequence(factory).then(() => cancelled ? undefined : commandValueMapping);
        }

		return Promise.resolve(undefined);
    }

    private hasDriveLetter(path: string): boolean {
        return !!(process.platform === 'win32' && path && path[1] === ':');
    }

    private normalizeDriveLetter(path: string): string {
        if (this.hasDriveLetter(path)) {
            return path.charAt(0).toUpperCase() + path.slice(1);
        }
    
        return path;
    }

    public async resolve(value : string) : Promise<string> {

        
        let variableName: string;
        let resolvedValue: string;

        // command maps
        let commandValueMapping = await this.resolveCommands(value);
        
		const replaced = value.replace(VariableResolver.VARIABLE_REGEXP, (match: string, variable: string) => {

            variableName = variable;
            
            let argument: string = "";
            let folderUri: Uri | undefined = undefined;
            let filePath: string = "";
            
			const parts = variable.split(':');
			if (parts && parts.length > 1) {
				variable = parts[0];
				argument = parts[1];
			} else {
                argument = "";
            }

			switch (variable) {

                case 'env':
                
					if (argument) {
						if (process.platform === "win32") {
							argument = argument.toLowerCase();
                        }
                        
						const val = this._envVariables[argument];
						if (val) {
							return resolvedValue = val;
						}
						// For `env` we should do the same as a normal shell does - evaluates missing envs to an empty string #46436
						return resolvedValue = "";
                    }
                    
                    throw new Error("missingEnvVarName: '" + match + "' cannot be resolved because no environment variable name is given.");

				case 'config':
					if (argument) {
                        const config = vscode.workspace.getConfiguration();
                        const val = config.get(argument, "");
						if (!val) {
							throw new Error("configNotFound: '" + match +  "' cannot be resolved because setting '" +  argument + "' not found.");
						}
						if (typeof val === 'object') {
							throw new Error("configNoString: '" + match + "' cannot be resolved because '" + argument + "' is a structured value.");
						}
						return resolvedValue = val;
					}
					throw new Error("missingConfigName '" + match + "' cannot be resolved because no settings name is given.");

				case 'command': {
                    if (commandValueMapping) {
                        return resolvedValue = this.resolveFromMap(match, argument, commandValueMapping, 'command');
                    } else {
                        throw new Error("commandNoMapping: '" + match + "' cannot be resolved because command values were not computed");
                    }
                }      
                case 'input': {
                    throw new Error("canNotResolveInput: '" + match + "' not implemented.");
                }              
				default: {

					// common error handling for all variables that require an open folder and accept a folder name argument
					switch (variable) {
						case 'workspaceRoot':
						case 'workspaceFolder':
						case 'workspaceRootFolderName':
						case 'workspaceFolderBasename':
						case 'relativeFile':
							if (argument) {
                                if (vscode.workspace.workspaceFolders) {
                                    const folder = vscode.workspace.workspaceFolders.filter(f => f.name === argument).pop();
                                    if (folder) {
                                        folderUri = folder.uri;
                                    }
                                } else {
									throw new Error("canNotFindFolder: '" + match + "' can not be resolved. No such folder '" + argument + "'.",);
								}
                            }
                            
							if (!folderUri) {
                                // only work if single workspace
                                if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
                                    folderUri = vscode.workspace.workspaceFolders[0].uri;
                                } else {
                                    throw new Error("canNotResolveWorkspace: '" + match + "' cannot resolve workspace.  Please open a single folder, or specify a root path name");
                                }
							}
							break;
						default:
							break;
					}

					// common error handling for all variables that require an open file
					switch (variable) {
						case 'file':
						case 'relativeFile':
						case 'fileDirname':
						case 'fileExtname':
						case 'fileBasename':
                        case 'fileBasenameNoExtension':
                            let activeEditor = vscode.window.activeTextEditor;
                            if (activeEditor) {
                                filePath = activeEditor.document.fileName;
                            }
							break;
						default:
							break;
					}

					switch (variable) {
						case 'workspaceRoot':
						case 'workspaceFolder':
							return resolvedValue = folderUri ? this.normalizeDriveLetter(folderUri.fsPath) : "";

						case 'cwd':
							return resolvedValue = (folderUri ? this.normalizeDriveLetter(folderUri.fsPath) : process.cwd());

						case 'workspaceRootFolderName':
						case 'workspaceFolderBasename':
							return resolvedValue = folderUri ? path.basename(folderUri.fsPath) : "";

						case 'lineNumber': {
                            const activeEditor = vscode.window.activeTextEditor;
                            if (activeEditor) {
                                return resolvedValue = activeEditor.selection.active.line.toString();
                            }
                            throw new Error("canNotResolveLineNumber: '" + match + "' cannot be resolved. Make sure to have a line selected in the active editor.");
                        }
                        case 'selectedText': {
                            const activeEditor = vscode.window.activeTextEditor;
                            if (activeEditor) {
                                const selectedText = activeEditor.document.getText(activeEditor.selection);
                                if (selectedText) {
                                    return resolvedValue = selectedText;
                                }
                            }
							throw new Error("canNotResolveSelectedText: '" + match + "' can not be resolved. Make sure to have some text selected in the active editor.");
                        }
						case 'file':
							return resolvedValue = filePath;

						case 'relativeFile':
							if (folderUri) {
								return resolvedValue = path.normalize(path.relative(folderUri.fsPath, filePath));
							}
							return resolvedValue = filePath;

						case 'fileDirname':
							return resolvedValue = path.dirname(filePath);

						case 'fileExtname':
							return resolvedValue = path.extname(filePath);

						case 'fileBasename':
							return resolvedValue = path.basename(filePath);

						case 'fileBasenameNoExtension':
							const basename = path.basename(filePath);
							return resolvedValue = (basename.slice(0, basename.length - path.extname(basename).length));

						case 'execPath': {
							throw new Error("canNotResolveExecPath: '" + match + "' not implemented.");
                        }
						default:
							return resolvedValue = match;
					}
				}
			}
        });
        
		return replaced;

    }


}