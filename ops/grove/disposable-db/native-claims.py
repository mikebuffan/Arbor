"""Synthetic native claims with 12 independent psql sessions; no hosted DB."""
import concurrent.futures, json, os, subprocess, sys, threading, time
assert sys.argv[1:] == ['--disposable-local']
assert os.environ.get('PGDATABASE') == 'grove_disposable'
assert os.environ.get('PGHOST', '').startswith('/tmp/grove-native-')
env = {k: os.environ[k] for k in ('PATH','PGHOST','PGPORT')}
env.update(PGDATABASE='grove_disposable',PGUSER='postgres',PGCONNECT_TIMEOUT='3')
cmd = ['psql','-XAt','-v','ON_ERROR_STOP=1']
def sql(q):
    r = subprocess.run(cmd+['-c',q],env=env,capture_output=True,text=True,timeout=15)
    if r.returncode: raise RuntimeError('disposable SQL failed: '+r.stderr)
    return r.stdout.strip()
def uid(n): return '00000000-0000-4000-8000-'+str(n).zfill(12)
owner,project,conversation = map(uid,(101,102,103))
sql(f"INSERT INTO auth.users VALUES('{owner}'); INSERT INTO grove_private_owner_access(user_id) VALUES('{owner}'); INSERT INTO grove_private_firefly_bridge(grove_user_id,firefly_user_id) VALUES('{owner}','{owner}'); INSERT INTO grove_private_ark_project_grants(grove_user_id,firefly_project_id) VALUES('{owner}','{project}');")
text = 'Synthetic native turn'
hashsql = "encode(sha256(convert_to('"+text+"','UTF8')),'hex')"
def claim(request):
    return json.loads(sql(f"SELECT grove_private_claim_turn('{owner}','{project}','{conversation}','{request}',{hashsql});"))
def complete(request,token):
    return f"SELECT grove_private_complete_turn('{owner}','{project}','{conversation}','{request}','{token}','{text}','Synthetic answer','unverified_model_text',true,true);"
request=uid(104);barrier=threading.Barrier(12)
def race(_): barrier.wait(timeout=10);return claim(request)
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool: results=list(pool.map(race,range(12)))
assert [r['status'] for r in results].count('claimed')==1,results
assert [r['status'] for r in results].count('in_progress')==11,results
token=next(r['leaseToken'] for r in results if r['status']=='claimed')
sql(f"UPDATE grove_private_turn_claims SET claimed_at=now()-interval '300 seconds',lease_expires_at=now()-interval '1 second' WHERE request_id='{request}';")
reclaimed=claim(request);assert reclaimed['status']=='claimed' and reclaimed['leaseToken']!=token
assert sql(complete(request,token))=='stale'
token=reclaimed['leaseToken'];barrier=threading.Barrier(12)
def finish(_):barrier.wait(timeout=10);return sql(complete(request,token))
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool: finished=list(pool.map(finish,range(12)))
assert finished.count('created')==1 and finished.count('replayed')==11,finished
assert claim(request)['status']=='completed'
assert sql(complete(request,token))=='replayed' # lost response / new process
assert sql(f"SELECT count(*) FROM grove_private_turns WHERE request_id='{request}';")=='1'
assert sql(complete(request,token).replace(text,'Changed synthetic text'))=='stale'
# Revocation commits while completion waits: completion must deny persistence.
request2=uid(105);token2=claim(request2)['leaseToken']
tx=subprocess.Popen(cmd,env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
try:
    tx.stdin.write(f"BEGIN; UPDATE grove_private_owner_access SET revoked_at=now() WHERE user_id='{owner}'; SELECT 'locked';\n");tx.stdin.flush()
    while tx.stdout.readline().strip()!='locked':
        if tx.poll() is not None:raise RuntimeError('revocation transaction failed')
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        f=pool.submit(sql,complete(request2,token2));time.sleep(.2);assert not f.done()
        tx.stdin.write('COMMIT;\n');tx.stdin.flush();assert f.result(timeout=10)=='no_access'
finally:
    tx.stdin.close();tx.wait(timeout=10)
assert sql(f"SELECT count(*) FROM grove_private_turns WHERE request_id='{request2}';")=='0'
assert claim(uid(106))['status']=='no_access'
print(json.dumps(dict(nativeClaims='PASS',connections=12,oneClaimWinner=True,expiredLeaseReclaimed=True,
    staleTokenFenced=True,oneCanonicalCompletion=True,restartReplay=True,changedTextDenied=True,
    revocationBeforeCompletionCommit=True,hostedWrites=False,exactlyOnceInference=False)))
