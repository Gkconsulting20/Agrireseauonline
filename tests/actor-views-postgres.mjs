// Disposable local PostgreSQL, no application DB module or connection URL.
import assert from 'node:assert/strict';
import { execFile as exec } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { createActorViews } from '../analytics/actor-views.js';

const execFile = promisify(exec);
const dir = await mkdtemp(path.join(tmpdir(),'actor-views-'));
const data = path.join(dir,'data');
let started = false, pool;
try {
  await execFile('initdb',['-D',data,'-U','views_test','-A','trust','--no-locale']);
  await execFile('pg_ctl',['-D',data,'-l',path.join(dir,'postgres.log'),'-o',
    `-k ${dir} -h '' -p 5432 -F`,'-w','start']);
  started = true;
  pool = new pg.Pool({host:dir,port:5432,user:'views_test',database:'postgres',max:12});
  const db = {
    query:(sql,p)=>pool.query(sql,p),
    getAll:async(sql,p)=>(await pool.query(sql,p)).rows
  };
  await db.query('CREATE TABLE actors (id INTEGER PRIMARY KEY, owner_id INTEGER); INSERT INTO actors VALUES (11,1),(12,1),(21,2),(31,NULL)');
  let day = '2026-11-16';
  const options = {secret:'isolated-postgres-test',now:()=>new Date(day+'T12:00:00Z')};
  const service = createActorViews(db,options);
  assert.equal((await service.countsForOwner(1)).total,0);
  assert.equal(await service.record(11,1),false);
  assert.equal(await service.record(999,2),false);
  const parallel = await Promise.all(Array.from({length:30},()=>service.record(11,2)));
  assert.equal(parallel.filter(Boolean).length,1);
  assert.equal(await service.record(12,2),true);
  assert.equal(await service.record(11,3),true);
  let counts = await service.countsForOwner(1);
  assert.equal(counts.total,3);
  assert.deepEqual([...counts.counts].sort(),[[11,2],[12,1]]);
  assert.equal((await service.countsForOwner(2)).total,0);
  assert.equal((await service.countsForOwner(3)).total,0);
  assert.equal(await service.record(21,1),true);
  assert.equal((await service.countsForOwner(2)).total,1);
  // A second service and a real PostgreSQL restart must preserve deduplication and totals.
  await pool.end();
  await execFile('pg_ctl',['-D',data,'-w','restart','-l',path.join(dir,'postgres.log')]);
  pool = new pg.Pool({host:dir,port:5432,user:'views_test',database:'postgres',max:12});
  const reloaded = createActorViews(db,options);
  assert.equal(await reloaded.record(11,2),false);
  assert.equal((await reloaded.countsForOwner(1)).total,3);
  day = '2026-11-17';
  assert.equal(await reloaded.record(11,2),true);
  counts = await reloaded.countsForOwner(1);
  assert.equal(counts.total,4);
  assert.equal(counts.total,[...counts.counts.values()].reduce((a,b)=>a+b,0));
  const keys = (await pool.query('SELECT * FROM actor_view_dedup')).rows;
  assert.equal(keys.length,1);
  assert.match(keys[0].visitor_digest,/^[0-9a-f]{64}$/);
  assert.deepEqual(Object.keys(keys[0]).sort(),['actor_id','view_day','visitor_digest']);
  // Actual FK cascade, account scoping and recovery after a schema error.
  await db.query('DELETE FROM actors WHERE id=11');
  assert.equal((await reloaded.countsForOwner(1)).total,1);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM actor_view_dedup')).rows[0].n,0);
  await db.query('ALTER TABLE actor_view_totals RENAME TO broken_totals');
  const unavailable = await reloaded.countsForOwner(1);
  assert.equal(unavailable.available,false);
  assert.equal(unavailable.total,null);
  await assert.rejects(()=>reloaded.record(12,3));
  await db.query('ALTER TABLE broken_totals RENAME TO actor_view_totals');
  assert.equal((await reloaded.countsForOwner(1)).total,1);
  // Initial schema setup failure can be retried; no permanent cached rejection.
  let reject = true;
  const flaky = createActorViews({
    ...db, query:async(...args)=>{if(reject) throw Error('denied');return db.query(...args);}
  },options);
  assert.equal((await flaky.countsForOwner(1)).available,false);
  reject=false;
  assert.equal((await flaky.countsForOwner(1)).total,1);
  console.log('PASS: PostgreSQL temporaire, 30 écritures concurrentes, persistance après redémarrage, purge et suppression en cascade');
} finally {
  if (pool) await pool.end();
  if (started) await execFile('pg_ctl',['-D',data,'-m','immediate','-w','stop']);
  await rm(dir,{recursive:true,force:true});
}
