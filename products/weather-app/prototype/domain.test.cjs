const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('./domain.js');

test('missing gusts never become a favourable recommendation',()=>{
  assert.equal(D.scenario('eastbourne').kind,'unknown');
});
test('a third model can disagree even when two models support a window',()=>{
  const r=D.scenario('brighton');
  assert.equal(r.supported,2);
  assert.equal(r.kind,'mixed');
});
test('consistent scenarios can change when preferences or day change',()=>{
  assert.equal(D.scenario('lewes').kind,'good');
  assert.equal(D.scenario('lewes',4).kind,'poor');
  assert.equal(D.scenario('lewes',3,'custom',2,false,10).kind,'mixed');
});
test('saved baseline survives a changed forecast',()=>{
  const baseline=D.scenario('brighton');
  const plan=D.makePlan(baseline,3,'outdoors','short',100);
  assert.equal(D.scenario('brighton',3,'outdoors',2,true).kind,'poor');
  assert.equal(plan.baseline,'mixed');
});
test('saved plans retain their original duration and custom wind preference',()=>{
  const plan=D.makePlan(D.scenario('lewes',3,'custom',3,false,10),3,'custom');
  assert.equal(plan.duration,3);
  assert.equal(plan.wind,10);
  assert.equal(plan.window,'10:00–13:00');
  assert.equal(D.scenario(plan.placeId,plan.day,plan.activity,plan.duration,false,plan.wind).kind,plan.baseline);
});
test('duplicate grants never extend active access',()=>{
  const grant=D.grantAccess(null,'ad-demo',1000);
  assert.equal(grant.until,1000+D.DAY);
  assert.deepEqual(D.grantAccess(grant,'ad-demo',2000),grant);
});
test('expiry is exact, invalid expiry is not access, new access can be issued',()=>{
  const grant=D.grantAccess(null,'trial',0);
  assert.equal(D.hasAccess(grant,D.DAY-1),true);
  assert.equal(D.hasAccess(grant,D.DAY),false);
  assert.equal(D.hasAccess({until:'forever'},0),false);
  assert.equal(D.grantAccess(grant,'ad-demo',D.DAY+1).reason,'ad-demo');
});
