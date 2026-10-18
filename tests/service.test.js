import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ITEMS, TABLEWARE, TASK_GROUPS } from '../src/catalog.js';
import { createGame, dispatch, tick, getStats, getSupplies, serialize, deserialize } from '../src/engine.js';

// Bound: deterministic public engine inputs, literal old saves, and explicit invalid/old-validator edge records. Native timing/retrieval and browser controls are separate evidence.
const historyBytes = readFileSync(new URL('./fixtures/v2-service-history.json', import.meta.url));
const history = JSON.parse(historyBytes);
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-7, `${message || 'amount'}: ${actual} != ${expected}`);
const act = (game, action) => { const result = dispatch(game, action); assert.equal(result.ok, true, result.message); };
const run = (game, seconds) => { for (let elapsed = 0; elapsed < seconds; elapsed += 0.25) tick(game, Math.min(0.25, seconds - elapsed)); };
const until = (game, predicate, limit = 700) => { for (let time = 0; time < limit && !predicate(); time += 0.25) tick(game, 0.25); assert.ok(predicate(), `Phase not reached in ${limit}s: ${JSON.stringify(getSupplies(game).dishwashers)}`); };
const place = (game, itemType, x, z) => { act(game, { type: 'PLACE', itemType, x, z }); return game.objects.at(-1); };
const reject = (game, action) => { const before = serialize(game); assert.equal(dispatch(game, action).ok, false); assert.equal(serialize(game), before); };
function hire(game, group, x = 11, z = 9) {
  act(game, { type: 'HIRE', candidateId: game.candidates[0].id, x, z });
  const member = game.staff.at(-1);
  for (const taskGroup of TASK_GROUPS) act(game, { type: 'PRIORITY', id: member.id, taskGroup, priority: taskGroup === group ? 'high' : 'off' });
  return member;
}
function conservation(game) {
  for (const type of Object.keys(TABLEWARE)) {
    const ledger = game.supplies.wareLedger[type], row = getSupplies(game).tableware.find(row => row.id === type);
    assert.equal(ledger.granted + ledger.delivered, game.supplies.ware.filter(unit => unit.type === type).length + ledger.broken);
    assert.equal(row.clean + row.inUse + row.dirty + row.returning, ledger.granted + ledger.delivered - ledger.broken);
  }
  for (const machine of getSupplies(game).dishwashers) { assert.equal(machine.occupied, machine.dirty + machine.washing + machine.cleanReady); assert.ok(machine.occupied + machine.inbound <= 5); }
}
function restaurant(plates = 5, meals = plates, withWasher = true) {
  const game = createGame('empty');
  place(game, 'counter', 8, 8); place(game, 'cuttingboard', 8, 8);
  place(game, 'counter', 10, 8); place(game, 'fryer', 10, 8);
  place(game, 'shelf', 12, 8); const machine = place(game, 'dishwasher', 14, 8);
  for (const [x,z] of [[7,12],[10,12],[13,12],[16,12],[7,15],[10,15]]) { place(game, 'table', x, z); place(game, 'chair', x-1, z); }
  for (const recipeId of ['burger', 'salad', 'pasta']) act(game, { type:'TOGGLE_RECIPE', recipeId });
  act(game, { type:'INGREDIENT_BATCH', ingredientId:'potato', quantity:meals });
  for (let count = 0; count < plates; count++) act(game, { type:'TABLEWARE_ORDER', tablewareId:'plate', delta:1 });
  run(game,135); act(game, { type:'INGREDIENT_BATCH', ingredientId:'potato', quantity:0 });
  act(game, { type:'TOGGLE_RECIPE', recipeId:'fries' });
  hire(game,'cooking',11,9); hire(game,'serving',12,9);
  const washer = withWasher ? hire(game,'dishwashing',13,9) : null;
  act(game,{type:'TOGGLE_OPEN'});
  return {game,machine,washer};
}

test('daily salary settlement, partial-day dismissal, pause, speed and month boundary conserve liability', () => {
  const game = createGame('empty'), cash = game.cash;
  run(game, 7.5); const worker = hire(game, null), wage = worker.monthlyWage;
  assert.equal(game.cash, cash); run(game,7.25); assert.equal(game.cash,cash); near(worker.wageAccrued,wage*7.25/450);
  act(game,{type:'SPEED',speed:0}); const paused=serialize(game); tick(game,60); assert.equal(serialize(game),paused);
  act(game,{type:'SPEED',speed:1}); tick(game,0.25); near(game.cash,cash-wage/60); near(game.daily.expenses,wage/60); assert.equal(worker.wageAccrued,0);
  const restored=deserialize(serialize(game)); run(game,0.25);run(restored,0.25);assert.equal(serialize(game),serialize(restored));
  run(game,434.75); near(game.cash,cash-wage*(29.5/30));near(game.stats.expenses,wage*(29.5/30));near(game.daily.expenses,wage/30);assert.equal(worker.wageAccrued,0);
  const stats=getStats(game);near(stats.dailyWages,wage/30);assert.equal(stats.wagePeriodDays,30);assert.equal(stats.wageSettlementDays,1);
  act(game,{type:'SPEED',speed:3});tick(game,1000);near(game.calendarSeconds,630);near(game.cash,cash-wage*(41.5/30));assert.equal(worker.wageAccrued,0);
  act(game,{type:'SPEED',speed:1});run(game,3.5);const due=worker.wageAccrued,paid=game.cash;act(game,{type:'FIRE',id:worker.id});near(game.cash,paid-due);reject(game,{type:'FIRE',id:worker.id});
  const failing=createGame('empty'), staff=hire(failing,null);failing.cash=-499;run(failing,15);near(failing.cash,-499-staff.monthlyWage/30);assert.equal(failing.bankrupt,true);assert.equal(failing.open,false);
  for (const speed of [1,2,3]) {
    const paced=createGame('empty'),employee=hire(paced,null),initial=paced.cash;
    act(paced,{type:'SPEED',speed});tick(paced,10);
    near(paced.calendarSeconds,10*speed);near(initial-paced.cash,Math.floor(10*speed/15)*employee.monthlyWage/30);near(employee.wageAccrued,(10*speed%15)*employee.monthlyWage/450);assert.deepEqual(deserialize(serialize(paced)),paced);
  }
});

test('literal pre-change version 2 states preserve money and sink graphs, then settle arrears once', () => {
  assert.equal(createHash('sha256').update(historyBytes).digest('hex'),'3267876c1daaf29a37a7437d63953f384f044a6fddbbc972ec203bd277f3b1b8');
  assert.equal(history.provenance.revision,'1508bb3aff609be2f556ca0403a8f79043a2c002');
  for (const [phase, old] of Object.entries(history.states)) {
    const game=deserialize(JSON.stringify(old));assert.deepEqual(game,old,phase);
    const twin=deserialize(serialize(game));run(game,8);run(twin,8);assert.equal(serialize(game),serialize(twin),phase);conservation(game);
  }
  const game=deserialize(JSON.stringify(history.states['month-unpaid-before-boundary'])),worker=game.staff[0],cash=game.cash,expenses=game.stats.expenses;
  tick(game,0.25);near(game.cash,cash-worker.monthlyWage);near(game.stats.expenses,expenses+worker.monthlyWage);assert.equal(worker.wageAccrued,0);
  run(game,15);near(game.cash,cash-worker.monthlyWage*(31/30));
  // Named old-validator edge: the prior v2 ceiling admitted a full salary even at the start of a day.
  const ceiling=structuredClone(history.states['month-paid-at-boundary']);ceiling.staff[0].wageAccrued=ceiling.staff[0].monthlyWage;
  const edge=deserialize(JSON.stringify(ceiling)),start=edge.cash;run(edge,14.75);assert.deepEqual(deserialize(serialize(edge)),edge);tick(edge,0.25);near(edge.cash,start-edge.staff[0].monthlyWage*(31/30));assert.equal(edge.staff[0].wageAccrued,0);
});

test('five dirty loads start one unattended batch and employees retrieve clean output with conserved reservations', () => {
  const {game,machine,washer}=restaurant();let sawFour=false,sawInbound=false;
  for(let time=0;time<700 && machine.washProgress===undefined;time+=0.25){tick(game,0.25);const row=getSupplies(game).dishwashers[0];sawFour ||= row.dirty===4 && row.washing===0;sawInbound ||= row.inbound>0;conservation(game);assert.deepEqual(deserialize(serialize(game)),game);}
  assert.equal(sawFour,true);assert.equal(sawInbound,true);assert.equal(machine.washProgress,0);assert.equal(washer.task,'idle');
  const ids=game.supplies.ware.filter(unit=>unit.state==='rackWashing').map(unit=>unit.id);assert.equal(ids.length,5);
  act(game,{type:'PRIORITY',id:washer.id,taskGroup:'dishwashing',priority:'off'});
  reject(game,{type:'MOVE',id:machine.id,x:18,z:8});reject(game,{type:'REMOVE',id:machine.id});
  const unchanged=serialize(game);act(game,{type:'MOVE',id:machine.id,x:machine.x,z:machine.z});assert.equal(serialize(game),unchanged);
  run(game,3.75);assert.equal(getSupplies(game).dishwashers[0].progress,0.9375);assert.ok(ids.every(id=>game.supplies.ware.find(unit=>unit.id===id).state==='rackWashing'));
  tick(game,0.25);assert.equal(machine.washProgress,undefined);assert.ok(ids.every(id=>game.supplies.ware.find(unit=>unit.id===id).state==='rackClean'));
  const rows=getSupplies(game);assert.equal(rows.tableware.find(row=>row.id==='plate').usable,0);assert.equal(rows.tableware.find(row=>row.id==='plate').cleanReady,5);assert.equal(rows.storage.reduce((sum,row)=>sum+row.reserved,0),5);
  run(game,8);assert.equal(getSupplies(game).dishwashers[0].cleanReady,5,'No employee is retained by the autonomous cycle');
  const unloader=hire(game,'dishwashing',18,10);until(game,()=>unloader.task==='machine-unload');const reserved=unloader.wareId;
  act(game,{type:'FIRE',id:unloader.id});assert.equal(game.supplies.ware.find(unit=>unit.id===reserved).state,'rackClean');assert.equal(game.supplies.ware.find(unit=>unit.id===reserved).assigneeId,undefined);
  const returning=hire(game,'dishwashing',18,10);until(game,()=>returning.task==='machine-return');assert.equal(returning.dishwasherId,undefined);assert.equal(getSupplies(game).dishwashers[0].occupied,4);reject(game,{type:'FIRE',id:returning.id});
  until(game,()=>getSupplies(game).dishwashers[0].occupied===0 && returning.task==='machine-return');act(game,{type:'MOVE',id:machine.id,x:18,z:8});
  until(game,()=>ids.every(id=>game.supplies.ware.find(unit=>unit.id===id).state==='clean'));conservation(game);assert.deepEqual(deserialize(serialize(game)),game);
  assert.equal(getSupplies(game).storage.reduce((sum,row)=>sum+row.reserved,0),0);
});

test('incoming reservations cap a machine at five, dismissal releases only its slot and blocked loads preserve owners', () => {
  const {game,machine}=restaurant(6,6,false);
  until(game,()=>game.supplies.ware.filter(unit=>unit.state==='dirty').length===6);
  const washers=Array.from({length:6},(_,index)=>hire(game,'dishwashing',7+index,10));
  tick(game,0.25);const initial=getSupplies(game).dishwashers[0];assert.equal(initial.inbound,5);assert.equal(initial.occupied,0);assert.equal(washers.filter(member=>member.task==='idle').length,1);
  const overflow=structuredClone(game),first=overflow.staff.find(member=>member.task==='machine-collect'),idle=overflow.staff.find(member=>member.task==='idle'&&washers.some(worker=>worker.id===member.id)),extra=overflow.supplies.ware.find(unit=>unit.state==='dirty'&&!unit.assigneeId);
  for(const field of ['task','path','timer','x','z','dishwasherId','taskTarget']) idle[field]=structuredClone(first[field]);idle.wareId=extra.id;extra.locationId=first.taskTarget;extra.assigneeId=idle.id;extra.returnStorageId=overflow.supplies.ware.find(unit=>unit.id===first.wareId).returnStorageId;
  assert.throws(()=>deserialize(JSON.stringify(overflow)),/five slots/,'The sixth valid reciprocal inbound graph is rejected by combined capacity');
  const fired=game.staff.find(member=>member.task==='machine-collect');act(game,{type:'FIRE',id:fired.id});assert.equal(getSupplies(game).dishwashers[0].inbound,4);assert.equal(getSupplies(game).storage.reduce((sum,row)=>sum+row.reserved,0),4);
  tick(game,0.25);assert.equal(getSupplies(game).dishwashers[0].inbound,5);
  for(const [x,z] of [[13,8],[15,8],[14,7],[14,9]]) place(game,'wall',x,z);
  until(game,()=>game.staff.filter(member=>member.task==='machine-load'&&member.blocked).length===5);
  assert.equal(getSupplies(game).dishwashers[0].inbound,5);reject(game,{type:'REMOVE',id:machine.id});reject(game,{type:'MOVE',id:machine.id,x:18,z:8});
  const twin=deserialize(serialize(game));run(game,20);run(twin,20);assert.equal(serialize(game),serialize(twin));conservation(game);
  const wall=game.objects.find(object=>object.type==='wall'&&object.x===14&&object.z===9);act(game,{type:'REMOVE',id:wall.id});act(twin,{type:'REMOVE',id:wall.id});
  for(let count=0;count<600;count++){tick(game,0.25);tick(twin,0.25);assert.equal(serialize(game),serialize(twin));assert.deepEqual(deserialize(serialize(game)),game);conservation(game);}
});

test('underfilled racks retain dishes and warn about too little total tableware; later deliveries enable a full batch', () => {
  const {game,machine}=restaurant(4,4);
  until(game,()=>getSupplies(game).dishwashers[0].dirty===4);
  const ids=game.supplies.ware.map(unit=>unit.id);run(game,45);assert.equal(machine.washProgress,undefined);assert.equal(getSupplies(game).dishwashers[0].batchNeeded,1);assert.ok(ids.every(id=>game.supplies.ware.find(unit=>unit.id===id).state==='rackDirty'));
  assert.ok(getStats(game).warnings.some(warning=>/five dirty dishes/.test(warning)));
  act(game,{type:'TABLEWARE_ORDER',tablewareId:'plate',delta:1});assert.equal(getStats(game).warnings.some(warning=>/five dirty dishes/.test(warning)),false,'Five future units removes only the proven total-stock shortage, not a promise of a working route or recipe');
  act(game,{type:'INGREDIENT_BATCH',ingredientId:'potato',quantity:1});until(game,()=>machine.washProgress!==undefined);assert.equal(getSupplies(game).dishwashers[0].washing,5);conservation(game);
});

function machineSnapshots() {
  const {game,machine,washer}=restaurant(),states={};
  for(let count=0;count<2800 && machine.washProgress===undefined;count++) {
    tick(game,0.25);
    for(const member of game.staff) if(member.task.startsWith('machine-')&&!states[member.task]) states[member.task]=structuredClone(game);
    if(game.supplies.ware.some(unit=>unit.state==='rackDirty')&&!states.rackDirty) states.rackDirty=structuredClone(game);
  }
  assert.equal(machine.washProgress,0);states.rackWashing=structuredClone(game);
  act(game,{type:'PRIORITY',id:washer.id,taskGroup:'dishwashing',priority:'off'});run(game,4);states.rackClean=structuredClone(game);
  const unloader=hire(game,'dishwashing',18,10);until(game,()=>unloader.task==='machine-unload');states['machine-unload']=structuredClone(game);until(game,()=>unloader.task==='machine-return');states['machine-return']=structuredClone(game);
  for(const phase of ['machine-collect','machine-load','rackDirty','rackWashing','rackClean','machine-unload','machine-return']) assert.ok(states[phase],phase);
  return states;
}

test('all machine owner phases round trip and malformed cycles, owners and capacity fail with specific causes', () => {
  const states=machineSnapshots();
  for(const [phase,state] of Object.entries(states)) {assert.deepEqual(deserialize(JSON.stringify(state)),state,phase);const game=deserialize(JSON.stringify(state)),twin=deserialize(JSON.stringify(state));run(game,30);run(twin,30);assert.equal(serialize(game),serialize(twin));conservation(game);}
  const cases=[
    ['rackDirty',game=>{game.supplies.ware.find(unit=>unit.state==='rackDirty').dishwasherId='missing-1';},/dishwasher/],
    ['rackDirty',game=>{game.supplies.ware.find(unit=>unit.state==='rackDirty').rackSince=game.elapsed+1;},/loading time/],
    ['rackDirty',game=>{game.supplies.ware.find(unit=>unit.state==='rackDirty').returnStorageId='missing-1';},/return reservation/],
    ['rackDirty',game=>{game.supplies.ware.find(unit=>unit.state==='rackDirty').staffId=game.staff[0].id;},/ownership fields/],
    ['rackDirty',game=>{game.objects.find(object=>object.type==='dishwasher').washProgress=0;},/batch ownership/],
    ['rackWashing',game=>{game.objects.find(object=>object.type==='dishwasher').washProgress=4;},/cycle progress/],
    ['rackWashing',game=>{delete game.objects.find(object=>object.type==='dishwasher').washProgress;},/batch ownership/],
    ['rackWashing',game=>{game.supplies.ware[0].state='rackDirty';},/batch ownership/],
    ['rackWashing',game=>{game.supplies.ware[0].state='rackClean';},/batch ownership/],
    ['rackWashing',game=>{const extra=structuredClone(game.supplies.ware[0]);extra.id=`ware-${game.nextId++}`;game.supplies.ware.push(extra);game.supplies.wareLedger[extra.type].delivered++;},/five slots/],
    ['rackClean',game=>{game.supplies.ware[0].assigneeId=game.staff[0].id;},/unload employee/],
    ['machine-load',game=>{const member=game.staff.find(member=>member.task==='machine-load');game.supplies.ware.find(unit=>unit.id===member.wareId).breakageChecked='yes';},/breakage check/],
    ['machine-collect',game=>{const member=game.staff.find(member=>member.task==='machine-collect');member.dishwasherId=game.objects.find(object=>object.type==='sink')?.id||game.objects.find(object=>object.type==='counter').id;},/existing dishwasher/],
    ['machine-unload',game=>{const member=game.staff.find(member=>member.task==='machine-unload');game.supplies.ware.find(unit=>unit.id===member.wareId).assigneeId=game.staff[0].id;},/reciprocal dish owner/],
    ['machine-return',game=>{game.staff.find(member=>member.task==='machine-return').dishwasherId=game.objects.find(object=>object.type==='dishwasher').id;},/incompatible ownership links/],
  ];
  for(const [phase,mutate,reason] of cases){const broken=structuredClone(states[phase]);mutate(broken);assert.throws(()=>deserialize(JSON.stringify(broken)),reason,`${phase}: ${mutate}`);}
});

test('blocked cabinet before clean pickup keeps the rack owner and reserved slot, while post-pickup blockage keeps its carrier', () => {
  const states=machineSnapshots(),game=deserialize(JSON.stringify(states['machine-unload']));
  const unloader=game.staff.find(member=>member.task==='machine-unload'),unit=game.supplies.ware.find(unit=>unit.id===unloader.wareId),cabinet=game.objects.find(object=>object.id===unit.returnStorageId);
  // All five units reserved this cabinet through normal service; moving it before return is an ordinary public action.
  act(game,{type:'MOVE',id:cabinet.id,x:18,z:16});
  const walls=[[17,16],[19,16],[18,15],[18,17]].map(([x,z])=>place(game,'wall',x,z));
  until(game,()=>unloader.task==='idle');assert.equal(unit.state,'rackClean');assert.equal(unit.assigneeId,undefined);assert.equal(unit.returnStorageId,cabinet.id);assert.equal(getSupplies(game).dishwashers[0].occupied,5);assert.deepEqual(deserialize(serialize(game)),game);
  act(game,{type:'REMOVE',id:walls[0].id});until(game,()=>unloader.task==='machine-return');assert.equal(unit.state,'carriedClean');const at=unloader.path.at(-1);assert.equal(Math.abs(at.x-cabinet.x)+Math.abs(at.z-cabinet.z),1);
  reject(game,{type:'MOVE',id:cabinet.id,x:16,z:18});
  const reopened=place(game,'wall',17,16);assert.equal(unloader.blocked,true);assert.equal(unit.state,'carriedClean');const twin=deserialize(serialize(game));run(game,8);run(twin,8);assert.equal(serialize(game),serialize(twin));
  act(game,{type:'REMOVE',id:reopened.id});until(game,()=>unit.state==='clean');conservation(game);
});

test('clean output can share a rack with later dirty loads without joining their next batch', () => {
  const {game,machine}=restaurant(6,6,false);until(game,()=>game.supplies.ware.every(unit=>unit.state==='dirty'));
  hire(game,'dishwashing',13,9);until(game,()=>getSupplies(game).dishwashers[0].dirty>0&&getSupplies(game).dishwashers[0].cleanReady>0);
  const row=getSupplies(game).dishwashers[0];assert.equal(row.washing,0);assert.equal(machine.washProgress,undefined);assert.equal(row.dirty,1);assert.equal(row.cleanReady,4);assert.equal(row.batchNeeded,4);
  const waiting=game.supplies.ware.find(unit=>unit.state==='rackDirty').id;run(game,10);assert.equal(game.supplies.ware.find(unit=>unit.id===waiting).state,'rackDirty');assert.equal(machine.washProgress,undefined);conservation(game);assert.deepEqual(deserialize(serialize(game)),game);
});

test('a public candidate and fixed service trace roll machine-carry breakage once and release both reservations', () => {
  const game=createGame();for(const member of game.staff)act(game,{type:'PRIORITY',id:member.id,taskGroup:'dishwashing',priority:'off'});
  // Pinned public candidate sequence: reject the first starter candidate, then select the generated 0.97-clumsiness candidate.
  act(game,{type:'HIRE',candidateId:game.candidates[0].id,x:11,z:9});act(game,{type:'FIRE',id:game.staff.at(-1).id});
  const selected=game.candidates.find(candidate=>candidate.skills.clumsiness===0.97);assert.ok(selected);act(game,{type:'HIRE',candidateId:selected.id,x:11,z:9});const washer=game.staff.at(-1);
  for(const group of TASK_GROUPS)act(game,{type:'PRIORITY',id:washer.id,taskGroup:group,priority:group==='dishwashing'?'high':'off'});
  let broke=false,sawCheckedCarry=false;
  for(let count=0;count<1000&&!broke;count++){
    const id=washer.wareId,unit=game.supplies.ware.find(unit=>unit.id===id),task=washer.task,before=getSupplies(game).dishwashers[0],reserved=getSupplies(game).storage.reduce((sum,row)=>sum+row.reserved,0),broken=Object.values(game.supplies.wareLedger).reduce((sum,row)=>sum+row.broken,0);
    const twin=task==='machine-load'&&!unit.breakageChecked?deserialize(serialize(game)):null;
    tick(game,0.25);if(twin){tick(twin,0.25);assert.equal(serialize(game),serialize(twin),'Reload before the first carry movement preserves the single random outcome');}
    const afterBroken=Object.values(game.supplies.wareLedger).reduce((sum,row)=>sum+row.broken,0);
    if(task==='machine-load'&&game.supplies.ware.find(unit=>unit.id===id)?.breakageChecked)sawCheckedCarry=true;
    if(afterBroken>broken){assert.equal(task,'machine-load');assert.equal(afterBroken,broken+1);assert.equal(game.supplies.ware.some(unit=>unit.id===id),false);assert.equal(getSupplies(game).dishwashers[0].inbound,before.inbound-1);assert.equal(getSupplies(game).storage.reduce((sum,row)=>sum+row.reserved,0),reserved-1);assert.equal(washer.task,'idle');broke=true;}
  }
  assert.equal(sawCheckedCarry,true);assert.equal(broke,true);near(game.elapsed,184.25);conservation(game);const twin=deserialize(serialize(game));run(game,20);run(twin,20);assert.equal(serialize(game),serialize(twin));conservation(game);
});

test('a naturally cancelled carried legacy meal disposes before joining the new machine queue', () => {
  const legacy=JSON.parse(readFileSync(new URL('./fixtures/v1-service.json',import.meta.url),'utf8')).states.carriedReady;
  const game=deserialize(JSON.stringify(legacy)),carrier=game.staff.find(member=>member.task==='serving'),wareId=carrier.wareId;
  act(game,{type:'TOGGLE_OPEN'});for(const member of game.staff)act(game,{type:'PRIORITY',id:member.id,taskGroup:'dishwashing',priority:'off'});
  const machine=place(game,'dishwasher',15,8),wall=place(game,'wall',8,8);
  until(game,()=>game.supplies.ware.find(unit=>unit.id===wareId).state==='dirty',150);
  const unit=game.supplies.ware.find(unit=>unit.id===wareId);assert.equal(unit.returnStorageId,undefined);assert.equal(unit.dishwasherId,undefined);assert.equal(carrier.task,'idle');assert.equal(game.orders.some(order=>order.wareId===wareId),false);
  act(game,{type:'REMOVE',id:wall.id});const washer=game.staff.find(member=>member.name==='Jordan');act(game,{type:'PRIORITY',id:washer.id,taskGroup:'dishwashing',priority:'high'});
  until(game,()=>unit.state==='rackDirty');assert.equal(unit.dishwasherId,machine.id);assert.ok(unit.returnStorageId);assert.deepEqual(deserialize(serialize(game)),game);conservation(game);
});

test('phase-aware accepted salary ceilings at 0, 7.5 and 14.75 seconds remain valid until one settlement, and old arrears can settle by dismissal', () => {
  for(const phase of [0,7.5,14.75]) for(const kind of ['current-ceiling','old-month-maximum']) {
    // Deliberate save-edge records: only the named clock/accrual fields differ from the literal already-paid v2 save.
    const fixture=structuredClone(history.states['month-paid-at-boundary']),worker=fixture.staff[0],monthly=worker.monthlyWage;
    fixture.calendarSeconds=450+phase;fixture.elapsed=450+phase;fixture.day=31;fixture.time=phase/15*24;
    const ceiling=monthly*(1+phase/450);worker.wageAccrued=kind==='current-ceiling'?ceiling:monthly;
    const initial=structuredClone(fixture),game=deserialize(JSON.stringify(fixture));assert.deepEqual(game,initial,`${kind} at ${phase}: load changes no history or liability`);
    const over=structuredClone(fixture);over.staff[0].wageAccrued=ceiling+0.00002;assert.throws(()=>deserialize(JSON.stringify(over)),/accrued wages/,`${phase}: exceeds the ceiling plus 1e-5 tolerance`);
    let twin=deserialize(serialize(game));const remaining=15-phase;
    for(let time=0;time<remaining;time+=0.25){tick(game,0.25);tick(twin,0.25);twin=deserialize(serialize(twin));assert.equal(serialize(game),serialize(twin),`${kind} at ${phase}, advance ${time}`);}
    const payment=initial.staff[0].wageAccrued+monthly*remaining/450;
    near(game.cash,initial.cash-payment);near(game.stats.expenses,initial.stats.expenses+payment);near(game.daily.expenses,payment);assert.equal(game.staff[0].wageAccrued,0);
    assert.equal(game.day,32);tick(game,0.25);near(game.cash,initial.cash-payment);near(game.staff[0].wageAccrued,monthly*0.25/450);
  }
  for(const phase of [0,7.5,14.75]) {
    const old=structuredClone(history.states['month-paid-at-boundary']),monthly=old.staff[0].monthlyWage;
    old.calendarSeconds=450+phase;old.elapsed=450+phase;old.day=31;old.time=phase/15*24;old.staff[0].wageAccrued=monthly;
    const game=deserialize(JSON.stringify(old));assert.deepEqual(game,old);act(game,{type:'FIRE',id:game.staff[0].id});
    near(game.cash,old.cash-monthly);near(game.stats.expenses,old.stats.expenses+monthly);near(game.daily.expenses,old.daily.expenses+monthly);assert.equal(game.staff.length,0);
    reject(game,{type:'FIRE',id:old.staff[0].id});const after=game.cash;run(game,30);near(game.cash,after);near(game.stats.expenses,old.stats.expenses+monthly);
  }
});
