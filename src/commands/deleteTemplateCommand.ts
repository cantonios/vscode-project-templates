'use strict';

import vscode = require("vscode");

import path = require("path");
import TemplateManager from "../templateManager";

import fsutils = require("../utilities/fsutils");
import fmutils = require("../utilities/fmutils");

/**
 * Main command to delete an existing template.
 * This command can be invoked by the Command Palette or in a folder context menu on the explorer view.
 * @export
 * @param {TemplateManager} templateManager
 * @param {*} args
 */
export function run(templateManager: TemplateManager, args: any) {

	// read templates
	let templates = templateManager.getTemplates();
	let templateRoot = templateManager.getTemplatesDir();

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

        return;
    }

    // show the list of available templates.
    vscode.window.showQuickPick(templates).then(selection => {

        // nothing selected. cancel
        if (!selection) {
            return;
		}
		
		// confirm delete
		vscode.window.showQuickPick(["Yes", "No"], { 
			placeHolder: "Are you sure you wish to delete the project template '" + selection + "'?"
		}).then(
			async (choice) => {
				if (choice === "Yes") {
					// delete template
					let templateDir : string = path.join(templateRoot, selection);
					console.log("Deleting template folder '" + templateDir + "'");
					fsutils.deleteDir(templateDir);
				}
			});
	});
    
}