
import { spawn } from 'child_process';
import fs = require('fs');
import path = require('path');

export async function cloneOrPull(repo : string, dest : string) {
    return new Promise((resolve, reject) => {
      const name = repo.substr(repo.lastIndexOf('/') + 1);
      const repoDest = path.join(dest, name);

      let process;
      if (!fs.existsSync(repoDest) || !fs.lstatSync(repoDest).isDirectory()) {
        const url = repo.replace(/http(s)?/, 'git');
        process = spawn('git', ['clone', url], { cwd: dest });
      } else {
        process = spawn('git', ['pull', '-f'], { cwd: repoDest });
      }
      
      process.stdout.on('data', function (data) {
        console.log('process stdout: ' + data);
      });

      process.stderr.on('data', function (data) {
        console.log('process stderr: ' + data);
      });

      process.on('exit', function (code) {
        if (code > 0) {
          reject('git process exited with code ' + code);
        }
        
        resolve();
      });
    });
}