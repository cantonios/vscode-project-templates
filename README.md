
# Project Templates VSCode Extension

[Visual Studio code](https://code.visualstudio.com) extension that allows you to quickly create new projects based on custom templates. 

Inspired by [this File Templates Extension](https://github.com/brpaz/vscode-file-templates-ext).

## Features

* Create a new project from a template directory
* Save the current project as a template
* Use of variable placeholders for easy interactive configuration

<!-- ## Screenshots

![preview](images/preview01.jpg) -->

## Install

In Visual Studio code, Press F1 to open the command menu and type ```ext install project-templates```.

## Extension Settings

This extension contributes the following settings:

* `projectTemplates.templatesDirectory`: directory containing templates
* `projectTemplates.usePlaceholders`: activate variable placeholder substitution
* `projectTemplates.placeholders`: dictionary of placeholder key-value pairs for common substitutions
* `projectTemplates.placeholderRegExp`: regular expression to use for detecting placeholders

## Known Issues

* None

## Release Notes

See [CHANGELOG](./CHANGELOG.md) for release notes.


## Usage

### Creating a Project from a Template

* In VSCode, open a folder that will contain your new project.  Use the Command Palette to execute the command "Project: Create Project From Template".  A list of available templates should appear. Select the template and the contents of the template will be copied to the current root workspace directory.

### Saving a Project as a Template

* Create the desired template project in your current root workspace directory.  Use the Command Palette to execute the command "Project: Save Project As Template".  Enter the name for your template.  The contents of your root directory will then be copied to a new template folder.

## Placeholders

Variable placeholders can be used in templates in the following way:

```
normal text #{placeholder_key}
```

When a file is created from the template, the user is prompted with a value to enter.  Placeholders can also be used in filenames.

## Templates Location

By default, this extension expects the project templates to be placed at the following location, depending of your OS:

Linux:

```
$HOME/.config/Code/User/ProjectTemplates
```

Mac:

```
$HOME/Library/Application Support/Code/User/ProjectTemplates
```

Windows:

```
C:\Users\User\AppData\Roaming\Code\User\ProjectTemplates
```

However, you can change the default location by adding the following to your user or workspace settings:

```
"projectTemplates.templatesDirectory": "path/to/my/templates"
```






