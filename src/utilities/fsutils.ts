'use strict';

import fs = require("fs");
import path = require("path");

/**
 * Recursively copy folder from src to dest
 * @param src source folder
 * @param dest destination folder
 * @throws Error if copy fails
 */
export async function copyDir(src : string, dest : string) {

	// read contents of source directory
	const entries : string[] = fs.readdirSync(src);

	// synchronously create destination if it doesn't exist to ensure 
	//    its existence before we copy individual items into it
	if (!fs.existsSync(dest)) {
		fs.mkdirSync(dest);
	} else if (!fs.lstatSync(dest).isDirectory()) {
		throw new Error("Unable to create directory '" + dest + "': already exists as file.");
	}

    for(let entry of entries) {
		
		// full path of src/dest
		const srcPath = path.join(src,entry);
		const destPath = path.join(dest,entry);
		
		// if directory, recursively copy, otherwise copy file
        if(fs.lstatSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
			fs.copyFile(srcPath, destPath, 
				(err) => {
					if (err) {
						throw err;
					}
				});
        }
    }
}

/**
 * Recursively delete a directory and all contained contents
 * @param dir directory to delete
 */
export async function deleteDir(dir : string) {

	if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()) {
		let promises = fs.readdirSync(dir).map(
			function(entry : string) {
				let fn = path.join(dir, entry);
				if (fs.lstatSync(fn).isDirectory()) {
					return deleteDir(fn);
				} else {
					return fs.unlink(fn, 
							(err) => {
								if (err) {
									console.log("Failed to delete '" + fn + "':" + err);
									throw err;
								}
							}
						);
				}
			}
		);

		// wait for everything to delete
		await Promise.all(promises);
		
		// remove directory
		try {
			fs.rmdirSync(dir);
		} catch(err) {
			console.log("Failed to remove directory '" + dir + "': " + err);
		}
	}
}

/**
 * Recursively make directories
 * @param path destination path
 */
export function mkdirsSync(dest : string) : boolean {

	// check if exists
	if (fs.existsSync(dest)) {
		if (fs.lstatSync(dest).isDirectory()) {
			return true;
		} else {
			return false;
		}
	}

	// empty path, we failed
	if (!path) {
		return false;
	}

	// ensure existence of parent
	let parent = path.dirname(dest);
	if (!mkdirsSync(parent)) {
		return false;
	}

	// make current directory
	fs.mkdirSync(dest);
	return true;
}