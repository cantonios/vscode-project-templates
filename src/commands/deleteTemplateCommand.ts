'use strict';

import vscode = require("vscode");

import TemplateManager from "../templateManager";

/**
 * Main command to delete an existing template.
 * This command can be invoked by the Command Palette or in a folder context menu on the explorer view.
 * @export
 * @param {TemplateManager} templateManager
 * @param {*} args
 */
export async function run(templateManager: TemplateManager, args: any) {

    // load latest configuration
    templateManager.updateConfiguration(vscode.workspace.getConfiguration('projectTemplates'));

    // choose a template then delete
    templateManager.chooseTemplate().then( 
        template => {
            // no template chosen, simply exit
            if (!template) {
                return;
            }

            // delete template
            templateManager.deleteTemplate(template).then(
                (deleted : boolean) => { 
                    if (deleted) {
                        vscode.window.showInformationMessage("Deleted template '" + template + "'");
                    }
                },
                (reason : any) => { 
                    vscode.window.showErrorMessage("Failed to delete template '" + template + "': " + reason);
                }
            );
        }
    );
    
}