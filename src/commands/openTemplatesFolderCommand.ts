'use strict';

import vscode = require("vscode");

import fmutils = require("../utilities/fmutils");
import TemplatesManager from "../projectTemplatesPlugin";

/**
 * Main command to create a file from a template.
 * This command can be invoked by the Command Palette or in a folder context menu on the explorer view.
 * @export
 * @param {TemplatesManager} templatesManager
 * @param {*} args
 * @returns
 */
export async function run(templateManager: TemplatesManager, args: any) {

	// load latest configuration
	templateManager.updateConfiguration(vscode.workspace.getConfiguration('projectTemplates'));

	// create template directory
	await templateManager.createTemplatesDirIfNotExists();

	// open template directory
	fmutils.openFolderInExplorer(await templateManager.getTemplatesDir());

    
}