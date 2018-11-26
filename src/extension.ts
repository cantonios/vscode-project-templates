'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// import manager
import TemplateManager from './templateManager';

// import commands
import OpenTemplatesFolderCommand = require('./commands/openTemplatesFolderCommand');
import SaveProjectAsTemplateCommand = require('./commands/saveProjectAsTemplateCommand');
import DeleteTemplateCommand = require('./commands/deleteTemplateCommand');
import CreateProjectFromTemplateCommand = require('./commands/createProjectFromTemplateCommand');

/**
 * Main entry point for extension
 * @export
 * @param {vscode.ExtensionContext} context 
 */
export function activate(context: vscode.ExtensionContext) {

    // create manager and initialize template folder
    let templateManager = new TemplateManager(vscode.workspace.getConfiguration('projectTemplates'));
    templateManager.createTemplatesDirIfNotExists();

    // register commands

    // open templates folder
    let openTemplatesFolder = vscode.commands.registerCommand('extension.openTemplatesFolder', 
        OpenTemplatesFolderCommand.run.bind(undefined, templateManager));
    context.subscriptions.push(openTemplatesFolder);
    
    // save as template
    let saveProjectAsTemplate = vscode.commands.registerCommand('extension.saveProjectAsTemplate', 
        SaveProjectAsTemplateCommand.run.bind(undefined, templateManager));
    context.subscriptions.push(saveProjectAsTemplate);

    // delete template
    let deleteTemplate = vscode.commands.registerCommand('extension.deleteTemplate', 
        DeleteTemplateCommand.run.bind(undefined, templateManager));
    context.subscriptions.push(deleteTemplate);

    // create project from template
    let createProjectFromTemplate = vscode.commands.registerCommand('extension.createProjectFromTemplate',
        CreateProjectFromTemplateCommand.run.bind(undefined, templateManager));
    context.subscriptions.push(createProjectFromTemplate);

}

// this method is called when your extension is deactivated
export function deactivate() {
}