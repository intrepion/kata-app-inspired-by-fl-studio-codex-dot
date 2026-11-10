import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

test('localhost server serves the app, blocks hidden paths and rejects writes',async()=>{
  const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
  try{
    const url=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timed out')),5000);child.stdout.once('data',chunk=>{clearTimeout(timer);const match=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);match?resolve(match[0]):reject(new Error(String(chunk)));});child.once('error',reject);});
    const page=await fetch(url);assert.equal(page.status,200);assert.match(await page.text(),/Kata Pulse Foundry/);
    const module=await fetch(`${url}/src/model.js`);assert.equal(module.status,200);assert.match(module.headers.get('content-type'),/javascript/);
    assert.equal((await fetch(`${url}/.git/config`)).status,404);
    assert.equal((await fetch(`${url}/%2ehidden`)).status,404);
    assert.equal((await fetch(`${url}/src/%5cfoo`)).status,404);
    assert.equal((await fetch(url,{method:'POST',body:'no'})).status,405);
    const head=await fetch(`${url}/styles.css`,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  }finally{child.kill();}
});
