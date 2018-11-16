'use strict';

import vscode = require("vscode");

import fs = require("fs");
import path = require("path");
import TemplateManager from "../templateManager";

import fsutil = require("../utilities/fsutils");

/**
 * Main command to create a file from a template.
 * This command can be invoked by the Command Palette or in a folder context menu on the explorer view.
 * @export
 * @param {TemplateManager} templateManager
 * @param {*} args
 */
export function run(templateManager: TemplateManager, args: any) {

	// read templates
	let templates = templateManager.getTemplates();
	
	for (let template of templates) {
		console.log("Found template " + template);
	}

    // gets the source folder. if its invoked from a context menu,
	// we use that reference, otherwise we use the file system path
	// of the current project's root
    let sourceDir = args ? args.fsPath : vscode.workspace.rootPath;
	console.log("Source folder: " + sourceDir);

    let projectName = path.basename(sourceDir);

    // ask for project name
    let inputOptions = <vscode.InputBoxOptions> {
        prompt: "Please enter the desired template name",
        value: projectName
    };

	// prompt user
    vscode.window.showInputBox(inputOptions).then(
		
		filename => {

			// determine template dir
			let templateDir = path.join(templateManager.getTemplatesDir(), path.basename(filename!));
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
								await fsutil.deleteDir(templateDir);
								fsutil.copyDir(sourceDir, templateDir);
							}
                        });
            } else {
				// copy current workspace to new template folder
				fsutil.copyDir(sourceDir, templateDir);
			}
		}
    );
    
}