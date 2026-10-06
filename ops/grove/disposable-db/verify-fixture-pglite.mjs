// Optional isolated test dependency; never an app runtime or live DB connection.
const { PGlite } = await import(process.env.GROVE_OFFLINE_PGLITE_MODULE ?? '@electric-sql/pglite');
import {readFileSync} from 'node:fs';
import {resolve, dirname, relative} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(new URL('../../../', import.meta.url).pathname);
const files=[];
function expand(path){
 const full=resolve(path);if(!full.startsWith(root+'/'))throw new Error('fixture outside source');
 const text=readFileSync(full,'utf8');files.push({path:relative(root,full),sha256:createHash('sha256').update(text).digest('hex')});
 return text.split('\n').map(line=>{
  if(line==='\\set ON_ERROR_STOP on')return '';
  if(line.startsWith('\\ir '))return expand(resolve(dirname(full),line.slice(4).trim()));
  if(line.startsWith('\\'))throw new Error('unsupported psql directive');
  return line;
 }).join('\n');
}
const db=new PGlite();
try{
 await db.exec(expand(resolve(root,'ops/grove/disposable-db/00-private-transcript-acceptance.sql')));
 const version=(await db.query('SELECT version() AS version')).rows[0].version;
 console.log(JSON.stringify({status:'passed',database:'ephemeral PGlite PostgreSQL WASM',version,files,hostedWrites:false,nativeMultiConnectionConcurrency:false}));
}catch(e){console.error(JSON.stringify({status:'failed',message:e.message,code:e.code,position:e.position}));process.exitCode=1;}
finally{await db.close();}
