'use strict';

import vscode = require("vscode");

import fmutils = require("../utilities/fmutils");
import TemplatesManager from "../templateManager";

/**
 * Main command to create a file from a template.
 * This command can be invoked by the Command Palette or in a folder context menu on the explorer view.
 * @export
 * @param {TemplatesManager} templatesManager
 * @param {*} args
 * @returns
 */
export function run(templateManager: TemplatesManager, args: any) {

	// read templates
	let templates = templateManager.getTemplates();
	
	for (let template of templates) {
		console.log("Found template " + template);
	}

    // gets the target folder. if its invoked from a context menu,
    // we use that reference, otherwise we use the file system path
    let targetFolder = args ? args.fsPath : vscode.workspace.rootPath;
	console.log("Target folder: " + targetFolder);

	fmutils.openFolderInExplorer(templateManager.getTemplatesDir());

    
}