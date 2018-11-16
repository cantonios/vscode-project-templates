'use strict';

import {WorkspaceConfiguration} from 'vscode';

import fs = require('fs');
import path = require('path');
import os = require('os');

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

    /**
     * Returns a list of available project templates by reading the Templates Directory.
     * @returns string[]
     */
    public getTemplates(): string[] {

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
     * Read the contents of a templates
     * @param filename The name of the template file.
     * @return Buffer
     */
    public getTemplate(filename: string): string {
        return fs.readFileSync(path.join(this.getTemplatesDir(), filename), 'utf8');
    }

    /**
     * Returns the templates directory location.
     * If no user configuration is found, the extension will look for
     * templates in USER_DATA_DIR/Code/ProjectTemplates.
     * Otherwise it will look for the path defined in the extension configuration.
     * @return {string}
     */
    public getTemplatesDir(): string {
        return this.config.get('project_templates_dir', this.getDefaultTemplatesDir());
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
	
}