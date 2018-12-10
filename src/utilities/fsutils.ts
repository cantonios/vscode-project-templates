'use strict';

import fs = require("fs");
import path = require("path");

/**
 * Recursively copy folder from src to dest
 * @param src source folder
 * @param dest destination folder
 */
export async function copyDir(src : string, dest : string) {

	// read contents of source directory
	const entries : string[] = fs.readdirSync(src);

	// synchronously create destination if it doesn't exist to ensure 
	//    its existence before we copy individual items into it
	if (!fs.existsSync(dest)) {
		try {
			fs.mkdirSync(dest);
		} catch (err) {
			return Promise.reject(err);
		}
	} else if (!fs.lstatSync(dest).isDirectory()) {
		return Promise.reject(new Error("Unable to create directory '" + dest + "': already exists as file."));
	}

	let promises : Promise<boolean>[] = [];
    for(let entry of entries) {
		
		// full path of src/dest
		const srcPath = path.join(src,entry);
		const destPath = path.join(dest,entry);
		
		// if directory, recursively copy, otherwise copy file
        if(fs.lstatSync(srcPath).isDirectory()) {
            promises.push(copyDir(srcPath, destPath));
        } else {
			try {
				fs.copyFileSync(srcPath, destPath);
			} catch (err) {
				promises.push(Promise.reject(err));
			}
        }
	}

	await Promise.all(promises).then(
		(value: boolean[] )  => { 
			return value; 
		},
		(reason: any) => {
			console.log(reason);
			return Promise.reject(reason);
		}
	);

	return Promise.resolve(true);
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
					try {
						fs.unlinkSync(fn);
					} catch (err) {
						console.error("Failed to delete '" + fn + "':" + err);
						return Promise.reject(err);
					}
					return Promise.resolve(true);
				}
			}
		);

		// wait for all promises
		await Promise.all(promises).then(
			(value: boolean[] )  => { 
				return value; 
			},
			(reason: any) => {
				console.log(reason);
				return Promise.reject(reason);
			}
		);
		
		// remove directory
		try {
			fs.rmdirSync(dir);
		} catch(err) {
			console.error("Failed to remove directory '" + dir + "': " + err);
			return Promise.reject(err);
		}
		return Promise.resolve(true);
	}
	return Promise.resolve(false);
}

/**
 * Recursively make directories
 * @param path destination path
 */
export function mkdirsSync(dest : string, mode : string | number | null | undefined = undefined) : boolean {

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
	if (!mkdirsSync(parent, mode)) {
		return false;
	}

	// make current directory
	fs.mkdirSync(dest, mode);
	return true;
}