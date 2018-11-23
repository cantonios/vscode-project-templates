'use strict';

import vscode = require("vscode");

import TemplateManager from "../templateManager";

/**
 * Main command to save the current project as a template.
 * This command can be invoked by the Command Palette or in a folder context menu on the explorer view.
 * @export
 * @param {TemplateManager} templateManager
 * @param {*} args
 */
export function run(templateManager: TemplateManager, args: any) {

    // gets the source folder. if its invoked from a context menu,
	// we use that reference, otherwise we use the file system path
	// of the current project's root
    let workspace = args ? args.fsPath : vscode.workspace.workspaceFolders![0].uri.fsPath;
	
	// load latest configuration
	templateManager.updateConfiguration(vscode.workspace.getConfiguration('projectTemplates'));

    templateManager.saveAsTemplate(workspace);
    
}