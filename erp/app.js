'use strict';
/* 원자재 조달 및 재고관리 - 데이터는 브라우저 localStorage에 저장됩니다. */
const KEY = 'erp-inventory-v1';
const $ = (s, r = document) => r.querySelector(s);
const won = n => Number(n || 0).toLocaleString('ko-KR') + '원';
const num = n => Number(n || 0).toLocaleString('ko-KR');
const today = () => new Date().toISOString().slice(0, 10);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- 데이터 ---------- */
function seed() {
  const d = today();
  return {
    seq: { item: 6, sup: 4, po: 3, mv: 8 },
    suppliers: [
      { id: 'S001', name: '대한철강', contact: '김철수', phone: '02-1111-2222', leadDays: 5 },
      { id: 'S002', name: '한국화학', contact: '이영희', phone: '031-333-4444', leadDays: 7 },
      { id: 'S003', name: '삼성포장', contact: '박민수', phone: '032-555-6666', leadDays: 3 },
    ],
    items: [
      { id: 'M001', name: '냉연강판 1.0T', category: '금속', unit: 'kg', supplierId: 'S001', price: 1200, safety: 500, stock: 820 },
      { id: 'M002', name: '알루미늄 판재', category: '금속', unit: 'kg', supplierId: 'S001', price: 3500, safety: 300, stock: 120 },
      { id: 'M003', name: 'ABS 수지', category: '화학', unit: 'kg', supplierId: 'S002', price: 2100, safety: 400, stock: 650 },
      { id: 'M004', name: '도료(백색)', category: '화학', unit: 'L', supplierId: 'S002', price: 8000, safety: 100, stock: 40 },
      { id: 'M005', name: '골판지 박스', category: '포장', unit: 'EA', supplierId: 'S003', price: 450, safety: 1000, stock: 2400 },
    ],
    pos: [
      { id: 'PO-0001', supplierId: 'S001', date: d, due: d, status: '발주', lines: [{ itemId: 'M002', qty: 400, price: 3500, received: 0 }] },
      { id: 'PO-0002', supplierId: 'S002', date: d, due: d, status: '작성', lines: [{ itemId: 'M004', qty: 100, price: 8000, received: 0 }] },
    ],
    moves: [
      { id: 1, date: d, type: '입고', itemId: 'M001', qty: 820, ref: '기초재고', memo: '' },
      { id: 2, date: d, type: '입고', itemId: 'M002', qty: 120, ref: '기초재고', memo: '' },
      { id: 3, date: d, type: '입고', itemId: 'M003', qty: 650, ref: '기초재고', memo: '' },
      { id: 4, date: d, type: '입고', itemId: 'M004', qty: 40, ref: '기초재고', memo: '' },
      { id: 5, date: d, type: '입고', itemId: 'M005', qty: 2400, ref: '기초재고', memo: '' },
    ],
  };
}
let db;
try { db = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { db = seed(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* 저장 불가 시 메모리만 사용 */ } };
const nextId = (k, prefix, pad) => prefix + String(++db.seq[k]).padStart(pad, '0');
const item = id => db.items.find(i => i.id === id);
const sup = id => db.suppliers.find(s => s.id === id);
const poTotal = po => po.lines.reduce((a, l) => a + l.qty * l.price, 0);
/* 발주 잔량(미입고) = 발주 중인 PO의 미입고 수량 합 */
const onOrder = itemId => db.pos.filter(p => ['발주', '부분입고'].includes(p.status))
  .flatMap(p => p.lines).filter(l => l.itemId === itemId).reduce((a, l) => a + l.qty - l.received, 0);
const shortage = i => Math.max(0, i.safety - i.stock - onOrder(i.id));

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 2200); }

/* ---------- 모달 ---------- */
function openModal(title, html, onSubmit) {
  $('#mTitle').textContent = title;
  $('#mForm').innerHTML = html + '<div class="foot"><button type="button" id="mCancel">취소</button><button class="pri">저장</button></div>';
  $('#modal').classList.remove('hidden');
  $('#mCancel').onclick = closeModal;
  $('#mForm').onsubmit = e => { e.preventDefault(); if (onSubmit(new FormData(e.target), e.target) !== false) closeModal(); };
}
const closeModal = () => $('#modal').classList.add('hidden');
const field = (label, name, val = '', type = 'text', extra = '') => `<label>${label}<input name="${name}" type="${type}" value="${esc(val)}" ${extra}></label>`;
const select = (label, name, opts, sel, cls = '') => `<label class="${cls}">${label}<select name="${name}">${opts.map(([v, t]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;

/* ---------- 화면 ---------- */
const views = {
  dashboard: { title: '대시보드', render() {
    const value = db.items.reduce((a, i) => a + i.stock * i.price, 0);
    const low = db.items.filter(i => i.stock < i.safety);
    const open = db.pos.filter(p => ['발주', '부분입고'].includes(p.status));
    const need = db.items.filter(i => shortage(i) > 0);
    const recent = db.moves.slice(-6).reverse();
    return `<div class="kpis">
      <div class="kpi"><span>등록 품목</span><b>${num(db.items.length)}</b></div>
      <div class="kpi"><span>재고 총액</span><b>${won(value)}</b></div>
      <div class="kpi ${low.length ? 'bad' : ''}"><span>안전재고 미달</span><b>${low.length}</b></div>
      <div class="kpi ${need.length ? 'warn' : ''}"><span>발주 필요 품목</span><b>${need.length}</b></div>
      <div class="kpi"><span>진행중 발주</span><b>${open.length}</b></div></div>
    <div class="card"><h3>발주 필요 품목 (안전재고 − 현재고 − 발주잔량)</h3>${table(['품목', '현재고', '안전재고', '발주잔량', '부족수량'],
      need.map(i => [esc(i.name), num(i.stock) + i.unit, num(i.safety), num(onOrder(i.id)), `<span class="low">${num(shortage(i))}${i.unit}</span>`]), [1, 2, 3, 4])}
      ${need.length ? '<div class="foot"><button class="pri" data-act="autoPO">부족분 발주서 자동 생성</button></div>' : ''}</div>
    <div class="card"><h3>최근 입출고</h3>${movesTable(recent)}</div>`;
  } },

  items: { title: '품목 관리', actions: '<button class="pri" data-act="addItem">+ 품목 등록</button>', render() {
    return table(['코드', '품목명', '분류', '단위', '공급업체', '단가', '안전재고', '작업'],
      db.items.map(i => [i.id, esc(i.name), esc(i.category), i.unit, esc(sup(i.supplierId)?.name || '-'), won(i.price), num(i.safety),
        `<button class="sm" data-act="editItem" data-id="${i.id}">수정</button> <button class="sm danger" data-act="delItem" data-id="${i.id}">삭제</button>`]), [5, 6]);
  } },

  inventory: { title: '재고 현황', actions: '<button data-act="adjust">재고 조정</button> <button data-act="issue">출고 처리</button>', render() {
    const q = (views.inventory.q || '').toLowerCase();
    const rows = db.items.filter(i => !q || (i.name + i.id + i.category).toLowerCase().includes(q));
    return `<div class="bar"><input id="q" placeholder="품목명/코드/분류 검색" value="${esc(views.inventory.q || '')}"></div>` +
      table(['코드', '품목명', '현재고', '안전재고', '발주잔량', '재고금액', '상태'], rows.map(i => {
        const st = i.stock < i.safety ? (onOrder(i.id) ? '<span class="badge b-warn">미달(발주중)</span>' : '<span class="badge b-bad">미달</span>') : '<span class="badge b-ok">정상</span>';
        return [i.id, esc(i.name), `<span class="${i.stock < i.safety ? 'low' : ''}">${num(i.stock)}${i.unit}</span>`, num(i.safety), num(onOrder(i.id)), won(i.stock * i.price), st];
      }), [2, 3, 4, 5]);
  } },

  orders: { title: '발주 관리', actions: '<button class="pri" data-act="addPO">+ 발주서 작성</button>', render() {
    const cls = { 작성: '', 발주: 'b-info', 부분입고: 'b-warn', 입고완료: 'b-ok', 취소: 'b-bad' };
    return table(['발주번호', '공급업체', '발주일', '납기일', '품목', '금액', '상태', '작업'], [...db.pos].reverse().map(p => {
      const b = [];
      if (p.status === '작성') b.push(`<button class="sm" data-act="placePO" data-id="${p.id}">발주 확정</button>`);
      if (['발주', '부분입고'].includes(p.status)) b.push(`<button class="sm pri" data-act="receivePO" data-id="${p.id}">입고 처리</button>`);
      if (['작성', '발주'].includes(p.status)) b.push(`<button class="sm danger" data-act="cancelPO" data-id="${p.id}">취소</button>`);
      const names = p.lines.map(l => `${item(l.itemId)?.name || l.itemId} ${num(l.qty)}${l.received ? `(입고 ${num(l.received)})` : ''}`).join(', ');
      return [p.id, esc(sup(p.supplierId)?.name || '-'), p.date, p.due, esc(names), won(poTotal(p)), `<span class="badge ${cls[p.status]}">${p.status}</span>`, b.join(' ')];
    }), [5]);
  } },

  movements: { title: '입출고 내역', render() { return movesTable([...db.moves].reverse()); } },

  suppliers: { title: '공급업체', actions: '<button class="pri" data-act="addSup">+ 업체 등록</button>', render() {
    return table(['코드', '업체명', '담당자', '연락처', '리드타임', '작업'],
      db.suppliers.map(s => [s.id, esc(s.name), esc(s.contact), esc(s.phone), s.leadDays + '일',
        `<button class="sm" data-act="editSup" data-id="${s.id}">수정</button> <button class="sm danger" data-act="delSup" data-id="${s.id}">삭제</button>`]), []);
  } },
};

function table(head, rows, numCols = []) {
  if (!rows.length) return '<div class="card" style="color:var(--mute)">데이터가 없습니다.</div>';
  return `<div class="tw"><table><thead><tr>${head.map((h, i) => `<th class="${numCols.includes(i) ? 'num' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${
    rows.map(r => `<tr>${r.map((c, i) => `<td class="${numCols.includes(i) ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function movesTable(list) {
  const cls = { 입고: 'b-ok', 출고: 'b-bad', 조정: 'b-info' };
  return table(['일자', '구분', '품목', '수량', '참조', '비고'], list.map(m => {
    const i = item(m.itemId);
    return [m.date, `<span class="badge ${cls[m.type]}">${m.type}</span>`, esc(i?.name || m.itemId), (m.qty > 0 && m.type !== '입고' ? '+' : '') + num(m.qty) + (i?.unit || ''), esc(m.ref), esc(m.memo)];
  }), [3]);
}

/* ---------- 라우팅/렌더 ---------- */
let current = 'dashboard';
function show(v) {
  current = v;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  $('#title').textContent = views[v].title;
  $('#actions').innerHTML = views[v].actions || '';
  $('#view').innerHTML = views[v].render();
  const q = $('#q');
  if (q) q.oninput = () => { views.inventory.q = q.value; const p = q.selectionStart; show('inventory'); const n = $('#q'); n.focus(); n.setSelectionRange(p, p); };
}
const refresh = () => { save(); show(current); };

/* ---------- 재고 이동 ---------- */
function move(type, itemId, qty, ref, memo = '') {
  const i = item(itemId);
  i.stock += qty;
  db.moves.push({ id: ++db.seq.mv, date: today(), type, itemId, qty, ref, memo });
}

/* ---------- 액션 ---------- */
const itemForm = (i = {}) => `<div class="grid">${field('품목명', 'name', i.name, 'text', 'required')}${field('분류', 'category', i.category || '')}
  ${field('단위(kg, EA 등)', 'unit', i.unit || 'EA', 'text', 'required')}${select('기본 공급업체', 'supplierId', db.suppliers.map(s => [s.id, s.name]), i.supplierId)}
  ${field('단가(원)', 'price', i.price ?? 0, 'number', 'min="0" required')}${field('안전재고', 'safety', i.safety ?? 0, 'number', 'min="0" required')}</div>`;
const supForm = (s = {}) => `<div class="grid">${field('업체명', 'name', s.name, 'text', 'required')}${field('담당자', 'contact', s.contact || '')}
  ${field('연락처', 'phone', s.phone || '')}${field('리드타임(일)', 'leadDays', s.leadDays ?? 3, 'number', 'min="0"')}</div>`;

function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

function poForm(po = { lines: [{ itemId: db.items[0]?.id, qty: 1, price: 0 }] }, supplierId = db.suppliers[0]?.id) {
  const lineRow = l => `<div class="row">${select('', 'itemId', db.items.map(i => [i.id, `${i.name} (${i.unit})`]), l.itemId)}
    <input name="qty" type="number" min="1" value="${l.qty}" placeholder="수량" required><input name="price" type="number" min="0" value="${l.price}" placeholder="단가" required>
    <button type="button" class="sm danger" data-rm>✕</button></div>`;
  return `<div class="grid">${select('공급업체', 'supplierId', db.suppliers.map(s => [s.id, s.name]), supplierId)}${field('납기일', 'due', po.due || addDays(sup(supplierId)?.leadDays || 7), 'date', 'required')}</div>
    <div class="lines"><b>발주 품목</b><div id="lines">${po.lines.map(lineRow).join('')}</div><button type="button" class="sm" id="addLine">+ 품목 추가</button></div>`
    + `<template id="lineTpl">${lineRow({ itemId: db.items[0]?.id, qty: 1, price: item(db.items[0]?.id)?.price || 0 })}</template>`;
}
function bindPoForm() {
  const f = $('#mForm');
  $('#addLine').onclick = () => { $('#lines').append($('#lineTpl').content.cloneNode(true)); };
  f.onclick = e => { if (e.target.dataset.rm !== undefined && $('#lines').children.length > 1) e.target.closest('.row').remove(); };
  f.onchange = e => { if (e.target.name === 'itemId') e.target.closest('.row').querySelector('[name=price]').value = item(e.target.value).price; };
}
function readLines(fd) {
  const ids = fd.getAll('itemId'), qty = fd.getAll('qty'), price = fd.getAll('price');
  return ids.map((id, k) => ({ itemId: id, qty: +qty[k], price: +price[k], received: 0 }));
}
function savePO(fd, existing) {
  const lines = readLines(fd);
  if (!lines.length) return false;
  const po = existing || { id: nextId('po', 'PO-', 4), date: today(), status: '작성' };
  Object.assign(po, { supplierId: fd.get('supplierId'), due: fd.get('due'), lines });
  if (!existing) db.pos.push(po);
  toast(`${po.id} 저장`);
}

const A = {
  addItem() { openModal('품목 등록', itemForm(), fd => { db.items.push({ id: nextId('item', 'M', 3), name: fd.get('name'), category: fd.get('category'), unit: fd.get('unit'), supplierId: fd.get('supplierId'), price: +fd.get('price'), safety: +fd.get('safety'), stock: 0 }); refresh(); }); },
  editItem(id) { const i = item(id); openModal('품목 수정', itemForm(i), fd => { Object.assign(i, { name: fd.get('name'), category: fd.get('category'), unit: fd.get('unit'), supplierId: fd.get('supplierId'), price: +fd.get('price'), safety: +fd.get('safety') }); refresh(); }); },
  delItem(id) {
    if (db.moves.some(m => m.itemId === id) || db.pos.some(p => p.lines.some(l => l.itemId === id))) return toast('입출고/발주 이력이 있는 품목은 삭제할 수 없습니다.');
    if (confirm('삭제할까요?')) { db.items = db.items.filter(i => i.id !== id); refresh(); }
  },
  addSup() { openModal('업체 등록', supForm(), fd => { db.suppliers.push({ id: nextId('sup', 'S', 3), name: fd.get('name'), contact: fd.get('contact'), phone: fd.get('phone'), leadDays: +fd.get('leadDays') }); refresh(); }); },
  editSup(id) { const s = sup(id); openModal('업체 수정', supForm(s), fd => { Object.assign(s, { name: fd.get('name'), contact: fd.get('contact'), phone: fd.get('phone'), leadDays: +fd.get('leadDays') }); refresh(); }); },
  delSup(id) {
    if (db.items.some(i => i.supplierId === id) || db.pos.some(p => p.supplierId === id)) return toast('품목/발주에서 사용 중인 업체는 삭제할 수 없습니다.');
    if (confirm('삭제할까요?')) { db.suppliers = db.suppliers.filter(s => s.id !== id); refresh(); }
  },
  addPO() {
    if (!db.items.length || !db.suppliers.length) return toast('품목과 공급업체를 먼저 등록하세요.');
    openModal('발주서 작성', poForm(), fd => { const r = savePO(fd); if (r !== false) refresh(); return r; }); bindPoForm();
  },
  autoPO() {
    const by = {};
    db.items.filter(i => shortage(i) > 0).forEach(i => (by[i.supplierId] ||= []).push({ itemId: i.id, qty: shortage(i), price: i.price, received: 0 }));
    Object.entries(by).forEach(([supplierId, lines]) => db.pos.push({ id: nextId('po', 'PO-', 4), supplierId, date: today(), due: addDays(sup(supplierId)?.leadDays || 7), status: '작성', lines }));
    toast(`발주서 ${Object.keys(by).length}건 생성 (작성 상태)`); refresh();
  },
  placePO(id) { db.pos.find(p => p.id === id).status = '발주'; toast('발주 확정'); refresh(); },
  cancelPO(id) {
    const p = db.pos.find(x => x.id === id);
    if (p.lines.some(l => l.received)) return toast('입고된 내역이 있어 취소할 수 없습니다.');
    if (confirm(`${id} 발주를 취소할까요?`)) { p.status = '취소'; refresh(); }
  },
  receivePO(id) {
    const p = db.pos.find(x => x.id === id);
    const rows = p.lines.map((l, k) => `<tr><td>${esc(item(l.itemId).name)}</td><td class="num">${num(l.qty)}</td><td class="num">${num(l.received)}</td>
      <td><input name="r${k}" type="number" min="0" max="${l.qty - l.received}" value="${l.qty - l.received}"></td></tr>`).join('');
    openModal(`${id} 입고 처리`, `<table><thead><tr><th>품목</th><th class="num">발주</th><th class="num">기입고</th><th>이번 입고수량</th></tr></thead><tbody>${rows}</tbody></table>`, fd => {
      let any = false;
      p.lines.forEach((l, k) => {
        const q = Math.min(Math.max(0, +fd.get('r' + k) || 0), l.qty - l.received);
        if (q > 0) { move('입고', l.itemId, q, p.id); l.received += q; any = true; }
      });
      if (!any) { toast('입고수량을 입력하세요.'); return false; }
      p.status = p.lines.every(l => l.received >= l.qty) ? '입고완료' : '부분입고';
      toast('입고 처리 완료'); refresh();
    });
  },
  issue() {
    openModal('출고 처리', `<div class="grid">${select('품목', 'itemId', db.items.map(i => [i.id, `${i.name} (재고 ${num(i.stock)}${i.unit})`]), '', 'full')}
      ${field('출고수량', 'qty', 1, 'number', 'min="1" required')}${field('출고처/작업지시', 'ref', '')}${field('비고', 'memo', '')}</div>`, fd => {
      const i = item(fd.get('itemId')), q = +fd.get('qty');
      if (q > i.stock) { toast('재고가 부족합니다.'); return false; }
      move('출고', i.id, -q, fd.get('ref') || '-', fd.get('memo')); toast('출고 처리 완료'); refresh();
    });
  },
  adjust() {
    openModal('재고 조정(실사)', `<div class="grid">${select('품목', 'itemId', db.items.map(i => [i.id, `${i.name} (장부 ${num(i.stock)}${i.unit})`]), '', 'full')}
      ${field('실사 수량', 'actual', 0, 'number', 'min="0" required')}${field('사유', 'memo', '')}</div>`, fd => {
      const i = item(fd.get('itemId')), diff = +fd.get('actual') - i.stock;
      if (!diff) { toast('차이가 없습니다.'); return false; }
      move('조정', i.id, diff, '재고실사', fd.get('memo')); toast('재고 조정 완료'); refresh();
    });
  },
};

/* ---------- 초기화 ---------- */
document.addEventListener('click', e => {
  const nav = e.target.closest('#nav button'); if (nav) return show(nav.dataset.view);
  const b = e.target.closest('[data-act]'); if (b && A[b.dataset.act]) A[b.dataset.act](b.dataset.id);
});
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });
$('#resetBtn').onclick = () => { if (confirm('모든 데이터를 샘플 데이터로 초기화할까요?')) { db = seed(); refresh(); } };
show('dashboard');
