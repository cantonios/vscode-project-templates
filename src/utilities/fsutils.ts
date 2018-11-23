'use strict';

import fs = require("fs");
import path = require("path");

/**
 * Recursively apply a function on a pair of files or directories from source to dest
 * @param src source file or folder
 * @param dest destination file or folder
 * @param func function to apply between src and dest
 * @throws Error if function fails
 */
export async function recursiveApplyInDir(src : string, dest : string, 
	func : (src : string, dest : string) => any) {

	// apply function between src/dest
	func(src, dest);

	if (fs.lstatSync(src).isDirectory()) {
		
		// read contents of source directory and iterate
		const entries : string[] = fs.readdirSync(src);

		for(let entry of entries) {
			
			// full path of src/dest
			const srcPath = path.join(src,entry);
			const destPath = path.join(dest,entry);
			
			// if directory, recursively copy, otherwise copy file
			recursiveApplyInDir(srcPath, destPath, func);
		}
	}
}

/**
 * Recursively apply a function on a pair of files or directories from source to dest.
 * Synchronous version.
 * 
 * @param src source file or folder
 * @param dest destination file or folder
 * @param func function to apply between src and dest
 * @throws Error if function fails
 */
export async function recursiveApplyInDirSync(src : string, dest : string, 
	func : (src : string, dest : string) => Promise<any>) {

	// apply function between src/dest
	await func(src, dest);

	if (fs.lstatSync(src).isDirectory()) {
		
		// read contents of source directory and iterate
		const entries : string[] = fs.readdirSync(src);

		for(let entry of entries) {
			
			// full path of src/dest
			const srcPath = path.join(src,entry);
			const destPath = path.join(dest,entry);
			
			// if directory, recursively copy, otherwise copy file
			await recursiveApplyInDirSync(srcPath, destPath, func);
		}
	}
}

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