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
    seq: { item: 5, sup: 3, po: 2, mv: 5, emp: 3, pay: 2, cust: 2, so: 2, pr: 1, ar: 1, ap: 1, jv: 3 },
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
    employees: [
      { id: 'E001', name: '김정규', dept: '생산', position: '팀장', type: '정규직', hireDate: '2021-03-02', contractEnd: '', baseSalary: 4200000, phone: '010-1111-0001', status: '재직',
        salaryLog: [{ date: '2021-03-02', amount: 3600000, memo: '입사' }, { date: '2024-01-01', amount: 4200000, memo: '승진 인상' }] },
      { id: 'E002', name: '이계약', dept: '자재', position: '사원', type: '계약직', hireDate: '2026-03-01', contractEnd: addDays(20), baseSalary: 2800000, phone: '010-1111-0002', status: '재직',
        salaryLog: [{ date: '2026-03-01', amount: 2800000, memo: '입사' }] },
      { id: 'E003', name: '박계약', dept: '현장', position: '작업자', type: '계약직', hireDate: '2026-06-01', contractEnd: addDays(150), baseSalary: 2600000, phone: '010-1111-0003', status: '재직',
        salaryLog: [{ date: '2026-06-01', amount: 2600000, memo: '입사' }] },
    ],
    payroll: [
      { id: 'PAY-0001', month: today().slice(0, 7), empId: 'E001', base: 4200000, allowance: 200000, deduction: 450000, net: 3950000, paidDate: '' },
      { id: 'PAY-0002', month: today().slice(0, 7), empId: 'E002', base: 2800000, allowance: 0, deduction: 260000, net: 2540000, paidDate: '' },
    ],
    customers: [
      { id: 'C001', name: '(주)한빛전자', contact: '정대리', phone: '02-700-1000' },
      { id: 'C002', name: '미래산업', contact: '최과장', phone: '031-800-2000' },
    ],
    salesOrders: [
      { id: 'SO-0001', customerId: 'C001', date: today(), due: addDays(10), status: '수주', lines: [{ name: '제품A', qty: 100, price: 18000 }] },
      { id: 'SO-0002', customerId: 'C002', date: today(), due: today(), status: '출하완료', shipDate: today(), lines: [{ name: '제품B', qty: 60, price: 30000 }] },
    ],
    prs: [
      { id: 'PR-0001', date: today(), requester: '이계약', itemId: 'M004', qty: 100, reason: '도료 재고 부족', status: '요청', poId: '' },
    ],
    ar: [{ id: 'AR-0001', ref: 'SO-0002', customerId: 'C002', date: today(), due: addDays(30), amount: 1800000, paidDate: '' }],
    ap: [{ id: 'AP-0001', ref: '기초매입', supplierId: 'S001', date: today(), due: addDays(30), amount: 840000, paidDate: '' }],
    journal: [
      { id: 'JV-0001', date: today(), debit: '현금', credit: '자본금', amount: 10000000, memo: '자본금 납입', ref: '' },
      { id: 'JV-0002', date: today(), debit: '외상매출금', credit: '매출', amount: 1800000, memo: '제품B 출하 매출', ref: 'SO-0002' },
      { id: 'JV-0003', date: today(), debit: '원재료', credit: '외상매입금', amount: 840000, memo: '원자재 매입', ref: 'AP-0001' },
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
{ const s = seed(); ['employees', 'payroll', 'customers', 'salesOrders', 'prs', 'ar', 'ap', 'journal'].forEach(k => { db[k] ||= s[k]; }); Object.keys(s.seq).forEach(k => { db.seq[k] ??= s.seq[k]; }); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* 저장 불가 시 메모리만 사용 */ } };
const nextId = (k, prefix, pad) => prefix + String(++db.seq[k]).padStart(pad, '0');
const item = id => db.items.find(i => i.id === id);
const sup = id => db.suppliers.find(s => s.id === id);
const cust = id => db.customers.find(c => c.id === id);
const lineTotal = o => o.lines.reduce((a, l) => a + l.qty * l.price, 0);
const ACCTS = [['현금', '자산'], ['외상매출금', '자산'], ['원재료', '자산'], ['외상매입금', '부채'], ['예수금', '부채'], ['자본금', '자본'], ['매출', '수익'], ['기타수익', '수익'], ['급여', '비용'], ['기타비용', '비용']];
const acctType = n => ACCTS.find(a => a[0] === n)[1];
function jv(debit, credit, amount, memo, ref = '') { if (amount > 0) db.journal.push({ id: nextId('jv', 'JV-', 4), date: today(), debit, credit, amount, memo, ref }); }
/* 계정 잔액: 자산·비용은 차변-대변, 부채·자본·수익은 대변-차변 */
function balances() {
  const b = Object.fromEntries(ACCTS.map(([n]) => [n, { d: 0, c: 0 }]));
  db.journal.forEach(j => { b[j.debit].d += j.amount; b[j.credit].c += j.amount; });
  return ACCTS.map(([n, t]) => ({ n, t, d: b[n].d, c: b[n].c, bal: ['자산', '비용'].includes(t) ? b[n].d - b[n].c : b[n].c - b[n].d }));
}
const emp = id => db.employees.find(e => e.id === id);
const dday = e => Math.ceil((new Date(e.contractEnd) - new Date(today())) / 864e5);
const contractWarn = e => e.status === '재직' && e.type === '계약직' && e.contractEnd && dday(e) <= 30;
const poTotal = po => po.lines.reduce((a, l) => a + l.qty * l.price, 0);
/* 발주 잔량(미입고) = 발주 중인 PO의 미입고 수량 합 */
const onOrder = itemId => db.pos.filter(p => ['발주', '부분입고'].includes(p.status))
  .flatMap(p => p.lines).filter(l => l.itemId === itemId).reduce((a, l) => a + l.qty - l.received, 0);
const shortage = i => Math.max(0, i.safety - i.stock - onOrder(i.id));

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 2200); }

/* ---------- 모달 ---------- */
function openModal(title, html, onSubmit, label = '저장') {
  $('#mTitle').textContent = title;
  $('#mForm').innerHTML = html + '<div class="foot"><button type="button" id="mCancel">취소</button><button class="pri">' + label + '</button></div>';
  $('#modal').classList.remove('hidden');
  $('#mCancel').onclick = closeModal;
  $('#mForm').onsubmit = e => { e.preventDefault(); if (onSubmit(new FormData(e.target), e.target) !== false) closeModal(); };
}
const ask = (msg, fn) => openModal('확인', `<p>${esc(msg)}</p>`, () => { fn(); }, '확인');
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
      <div class="kpi"><span>진행중 발주</span><b>${open.length}</b></div>
      <div class="kpi"><span>재직 정규직 / 계약직</span><b>${db.employees.filter(e => e.status === '재직' && e.type === '정규직').length} / ${db.employees.filter(e => e.status === '재직' && e.type === '계약직').length}</b></div>
      <div class="kpi"><span>미수금</span><b>${won(db.ar.filter(a => !a.paidDate).reduce((s, a) => s + a.amount, 0))}</b></div>
      <div class="kpi"><span>미지급금</span><b>${won(db.ap.filter(a => !a.paidDate).reduce((s, a) => s + a.amount, 0))}</b></div>
      <div class="kpi ${db.employees.some(contractWarn) ? 'warn' : ''}"><span>계약 만료 임박(30일)</span><b>${db.employees.filter(contractWarn).length}</b></div></div>
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

  employees: { title: '인사 관리', actions: '<button class="pri" data-act="addEmp">+ 직원 등록</button>', render() {
    const f = views.employees.f || '전체', q = (views.employees.q || '').toLowerCase();
    const rows = db.employees.filter(e => (f === '전체' || e.type === f) && (!q || (e.name + e.dept + e.position).toLowerCase().includes(q)));
    const act = e => `<button class="sm" data-act="empHistory" data-id="${e.id}">급여이력</button> <button class="sm" data-act="editEmp" data-id="${e.id}">수정</button>` +
      (e.status === '재직' ? ` <button class="sm danger" data-act="retireEmp" data-id="${e.id}">퇴직</button>` : '');
    return `<div class="bar"><select id="ef">${['전체', '정규직', '계약직'].map(t => `<option ${t === f ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <input id="eq" placeholder="이름/부서/직급 검색" value="${esc(views.employees.q || '')}"></div>` +
      table(['사번', '이름', '부서', '직급', '고용형태', '입사일', '계약만료', '월 기본급', '상태', '작업'], rows.map(e => [e.id, esc(e.name), esc(e.dept), esc(e.position),
        `<span class="badge ${e.type === '정규직' ? 'b-ok' : 'b-info'}">${e.type}</span>`, e.hireDate, contractBadge(e), won(e.baseSalary),
        e.status === '재직' ? '재직' : `<span class="badge">퇴직 ${e.retireDate || ''}</span>`, act(e)]), [7]);
  } },

  payroll: { title: '급여 관리', actions: '<button class="pri" data-act="genPayroll">재직자 급여 일괄 생성</button>', render() {
    const m = views.payroll.m || today().slice(0, 7);
    const rows = db.payroll.filter(p => p.month === m);
    const sum = k => rows.reduce((a, p) => a + p[k], 0);
    return `<div class="bar"><input id="pm" type="month" value="${m}"></div>
      <div class="kpis"><div class="kpi"><span>${m} 지급 대상</span><b>${rows.length}명</b></div><div class="kpi"><span>급여 총액(세전)</span><b>${won(sum('base') + sum('allowance'))}</b></div>
      <div class="kpi"><span>실지급액 합계</span><b>${won(sum('net'))}</b></div><div class="kpi"><span>미지급</span><b>${rows.filter(p => !p.paidDate).length}건</b></div></div>` +
      table(['명세번호', '직원', '고용형태', '기본급', '수당', '공제', '실지급액', '지급일', '작업'], rows.map(p => {
        const e = emp(p.empId);
        return [p.id, esc(e?.name || p.empId), e?.type || '-', won(p.base), won(p.allowance), won(p.deduction), `<b>${won(p.net)}</b>`,
          p.paidDate || '<span class="badge b-warn">미지급</span>',
          p.paidDate ? '' : `<button class="sm" data-act="editPay" data-id="${p.id}">수정</button> <button class="sm pri" data-act="payPay" data-id="${p.id}">지급 처리</button> <button class="sm danger" data-act="delPay" data-id="${p.id}">삭제</button>`];
      }), [3, 4, 5, 6]);
  } },

  customers: { title: '고객 관리', actions: '<button class="pri" data-act="addCust">+ 고객 등록</button>', render() {
    return table(['코드', '고객명', '담당자', '연락처', '수주 건수', '미수금', '작업'], db.customers.map(c => [c.id, esc(c.name), esc(c.contact), esc(c.phone),
      db.salesOrders.filter(o => o.customerId === c.id && o.status !== '취소').length, won(db.ar.filter(a => a.customerId === c.id && !a.paidDate).reduce((s, a) => s + a.amount, 0)),
      `<button class="sm" data-act="editCust" data-id="${c.id}">수정</button> <button class="sm danger" data-act="delCust" data-id="${c.id}">삭제</button>`]), [4, 5]);
  } },

  sales: { title: '수주 관리', actions: '<button class="pri" data-act="addSO">+ 수주 등록</button>', render() {
    const cls = { 수주: 'b-info', 출하완료: 'b-ok', 취소: 'b-bad' };
    return table(['수주번호', '고객', '수주일', '납기일', '품목', '금액', '상태', '작업'], [...db.salesOrders].reverse().map(o => [o.id, esc(cust(o.customerId)?.name || '-'), o.date, o.due,
      esc(o.lines.map(l => `${l.name} ${num(l.qty)}`).join(', ')), won(lineTotal(o)), `<span class="badge ${cls[o.status]}">${o.status}</span>`,
      o.status === '수주' ? `<button class="sm pri" data-act="shipSO" data-id="${o.id}">출하 처리</button> <button class="sm danger" data-act="cancelSO" data-id="${o.id}">취소</button>` : '']), [5]);
  } },

  requests: { title: '구매요청', actions: '<button class="pri" data-act="addPR">+ 구매요청</button>', render() {
    const cls = { 요청: 'b-info', 승인: 'b-warn', 반려: 'b-bad', 발주전환: 'b-ok' };
    return table(['요청번호', '요청일', '요청자', '품목', '수량', '사유', '상태', '작업'], [...db.prs].reverse().map(r => {
      const i = item(r.itemId);
      const b = r.status === '요청' ? `<button class="sm pri" data-act="approvePR" data-id="${r.id}">승인</button> <button class="sm danger" data-act="rejectPR" data-id="${r.id}">반려</button>`
        : r.status === '승인' ? `<button class="sm pri" data-act="prToPO" data-id="${r.id}">발주서 생성</button>` : esc(r.poId);
      return [r.id, r.date, esc(r.requester), esc(i?.name || r.itemId), num(r.qty) + (i?.unit || ''), esc(r.reason), `<span class="badge ${cls[r.status]}">${r.status}</span>`, b];
    }), [4]);
  } },

  arap: { title: '채권·채무', render() {
    const od = x => !x.paidDate && x.due < today() ? ' <span class="badge b-bad">연체</span>' : '';
    const sum = l => won(l.filter(x => !x.paidDate).reduce((s, x) => s + x.amount, 0));
    return `<h3>미수금 (매출채권) - 미입금 합계 ${sum(db.ar)}</h3>` + table(['번호', '고객', '발생일', '입금기한', '금액', '입금일', '작업'], [...db.ar].reverse().map(a => [a.id, esc(cust(a.customerId)?.name || '-'), a.date, a.due + od(a), won(a.amount),
      a.paidDate || '<span class="badge b-warn">미입금</span>', a.paidDate ? '' : `<button class="sm pri" data-act="receiveAR" data-id="${a.id}">입금 처리</button>`]), [4])
      + `<h3 style="margin-top:22px">미지급금 (매입채무) - 미지급 합계 ${sum(db.ap)}</h3>` + table(['번호', '공급업체', '발생일', '지급기한', '금액', '참조', '지급일', '작업'], [...db.ap].reverse().map(a => [a.id, esc(sup(a.supplierId)?.name || '-'), a.date, a.due + od(a), won(a.amount), esc(a.ref),
      a.paidDate || '<span class="badge b-warn">미지급</span>', a.paidDate ? '' : `<button class="sm pri" data-act="payAP" data-id="${a.id}">지급 처리</button>`]), [4]);
  } },

  journal: { title: '전표(분개장)', actions: '<button class="pri" data-act="addJV">+ 수기 전표</button>', render() {
    return table(['전표번호', '일자', '차변', '대변', '금액', '적요', '참조'], [...db.journal].reverse().map(j => [j.id, j.date, esc(j.debit), esc(j.credit), won(j.amount), esc(j.memo), esc(j.ref)]), [4]);
  } },

  finance: { title: '재무 현황', render() {
    const b = balances(), bal = n => b.find(x => x.n === n).bal;
    const rev = b.filter(x => x.t === '수익').reduce((s, x) => s + x.bal, 0), exp = b.filter(x => x.t === '비용').reduce((s, x) => s + x.bal, 0);
    const assets = b.filter(x => x.t === '자산').reduce((s, x) => s + x.bal, 0), debt = b.filter(x => x.t === '부채').reduce((s, x) => s + x.bal, 0), capital = bal('자본금');
    const months = {};
    db.journal.forEach(j => { const m = j.date.slice(0, 7); const r = months[m] ||= { rev: 0, exp: 0 };
      [[j.debit, -1], [j.credit, 1]].forEach(([n, s]) => { const t = acctType(n); if (t === '수익') r.rev += s * j.amount; if (t === '비용') r.exp -= s * j.amount; }); });
    return `<div class="kpis"><div class="kpi"><span>현금 잔액</span><b>${won(bal('현금'))}</b></div><div class="kpi"><span>누적 수익</span><b>${won(rev)}</b></div>
      <div class="kpi"><span>누적 비용</span><b>${won(exp)}</b></div><div class="kpi ${rev - exp < 0 ? 'bad' : ''}"><span>누적 손익</span><b>${won(rev - exp)}</b></div></div>
      <div class="card"><h3>재무상태 요약</h3>${table(['자산', '부채', '자본금', '누적 손익', '부채+자본+손익'], [[won(assets), won(debt), won(capital), won(rev - exp), `${won(debt + capital + rev - exp)} ${assets === debt + capital + rev - exp ? '<span class="badge b-ok">일치</span>' : '<span class="badge b-bad">불일치</span>'}`]], [0, 1, 2, 3, 4])}</div>
      <div class="card"><h3>월별 손익</h3>${table(['월', '수익', '비용', '손익'], Object.keys(months).sort().reverse().map(m => [m, won(months[m].rev), won(months[m].exp), `<b class="${months[m].rev - months[m].exp < 0 ? 'low' : ''}">${won(months[m].rev - months[m].exp)}</b>`]), [1, 2, 3])}</div>
      <div class="card"><h3>시산표</h3>${table(['계정', '구분', '차변 합계', '대변 합계', '잔액'], b.map(x => [x.n, x.t, won(x.d), won(x.c), won(x.bal)]), [2, 3, 4])}</div>`;
  } },

  suppliers: { title: '공급업체', actions: '<button class="pri" data-act="addSup">+ 업체 등록</button>', render() {
    return table(['코드', '업체명', '담당자', '연락처', '리드타임', '작업'],
      db.suppliers.map(s => [s.id, esc(s.name), esc(s.contact), esc(s.phone), s.leadDays + '일',
        `<button class="sm" data-act="editSup" data-id="${s.id}">수정</button> <button class="sm danger" data-act="delSup" data-id="${s.id}">삭제</button>`]), []);
  } },
};

function contractBadge(e) {
  if (e.type !== '계약직' || e.status !== '재직' || !e.contractEnd) return '-';
  const d = dday(e);
  if (d < 0) return `<span class="badge b-bad">만료 (${e.contractEnd})</span>`;
  if (d <= 30) return `<span class="badge b-warn">D-${d} (${e.contractEnd})</span>`;
  return e.contractEnd;
}
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
  const ef = $('#ef'), eq = $('#eq'), pm = $('#pm');
  if (ef) ef.onchange = () => { views.employees.f = ef.value; show('employees'); };
  if (eq) eq.oninput = () => { views.employees.q = eq.value; const p = eq.selectionStart; show('employees'); const n = $('#eq'); n.focus(); n.setSelectionRange(p, p); };
  if (pm) pm.onchange = () => { if (pm.value) { views.payroll.m = pm.value; show('payroll'); } };
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

const empForm = (e = {}) => `<div class="grid">${field('이름', 'name', e.name, 'text', 'required')}${field('부서', 'dept', e.dept || '')}${field('직급', 'position', e.position || '')}
  ${select('고용형태', 'type', [['정규직', '정규직'], ['계약직', '계약직']], e.type || '정규직')}${field('입사일', 'hireDate', e.hireDate || today(), 'date', 'required')}
  ${field('계약 만료일(계약직)', 'contractEnd', e.contractEnd || '', 'date')}${field('월 기본급(원)', 'baseSalary', e.baseSalary ?? 0, 'number', 'min="0" required')}${field('연락처', 'phone', e.phone || '')}
  ${e.id ? field('기본급 변경 사유', 'memo', '', 'text', 'placeholder="기본급을 바꿀 때 입력"') : ''}</div>`;
function bindEmpForm() {
  const f = $('#mForm'), sync = () => { const c = f.elements.contractEnd, c2 = f.elements.type.value === '계약직'; c.disabled = !c2; c.required = c2; if (!c2) c.value = ''; };
  f.elements.type.onchange = sync; sync();
}
function saveEmp(fd, e) {
  const data = { name: fd.get('name'), dept: fd.get('dept'), position: fd.get('position'), type: fd.get('type'), hireDate: fd.get('hireDate'),
    contractEnd: fd.get('type') === '계약직' ? fd.get('contractEnd') : '', baseSalary: +fd.get('baseSalary'), phone: fd.get('phone') };
  if (!e) { Object.assign(data, { id: nextId('emp', 'E', 3), status: '재직', salaryLog: [{ date: data.hireDate, amount: data.baseSalary, memo: '입사' }] }); db.employees.push(data); }
  else {
    if (data.baseSalary !== e.baseSalary) e.salaryLog.push({ date: today(), amount: data.baseSalary, memo: fd.get('memo') || '기본급 변경' });
    if (data.type !== e.type) e.salaryLog.push({ date: today(), amount: data.baseSalary, memo: `${e.type} → ${data.type} 전환` });
    Object.assign(e, data);
  }
  toast('저장 완료'); refresh();
}
const custForm = (c = {}) => `<div class="grid">${field('고객명', 'name', c.name, 'text', 'required')}${field('담당자', 'contact', c.contact || '')}${field('연락처', 'phone', c.phone || '')}</div>`;
function soForm() {
  const row = `<div class="row"><input name="pname" placeholder="제품명" required><input name="qty" type="number" min="1" value="1" required><input name="price" type="number" min="0" value="0" required><button type="button" class="sm danger" data-rm>✕</button></div>`;
  return `<div class="grid">${select('고객', 'customerId', db.customers.map(c => [c.id, c.name]), '')}${field('납기일', 'due', addDays(7), 'date', 'required')}</div>
    <div class="lines"><b>수주 품목 (제품명 / 수량 / 단가)</b><div id="lines">${row}</div><button type="button" class="sm" id="addLine">+ 품목 추가</button></div><template id="lineTpl">${row}</template>`;
}
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
  addEmp() { openModal('직원 등록', empForm(), fd => saveEmp(fd)); bindEmpForm(); },
  editEmp(id) { openModal('직원 수정', empForm(emp(id)), fd => saveEmp(fd, emp(id))); bindEmpForm(); },
  retireEmp(id) { ask(`${emp(id).name} 직원을 퇴직 처리할까요? (급여·이력은 유지됩니다)`, () => { Object.assign(emp(id), { status: '퇴직', retireDate: today() }); refresh(); }); },
  empHistory(id) {
    const e = emp(id);
    const log = [...e.salaryLog].reverse().map((l, k, a) => { const prev = a[k + 1]; const d = prev ? l.amount - prev.amount : 0;
      return [l.date, won(l.amount), prev ? `<span class="${d >= 0 ? '' : 'low'}">${d >= 0 ? '+' : ''}${num(d)}원</span>` : '-', esc(l.memo)]; });
    const pays = db.payroll.filter(p => p.empId === id).sort((a, b) => b.month.localeCompare(a.month))
      .map(p => [p.month, won(p.base), won(p.allowance), won(p.deduction), `<b>${won(p.net)}</b>`, p.paidDate || '미지급']);
    openModal(`${e.name} (${e.type}) 급여 이력`, `<h4>기본급 변경 이력</h4>${table(['적용일', '월 기본급', '변동', '사유'], log, [1, 2])}
      <h4>월별 지급 이력</h4>${table(['귀속월', '기본급', '수당', '공제', '실지급액', '지급일'], pays, [1, 2, 3, 4])}`, () => {}, '닫기');
  },
  genPayroll() {
    const m = views.payroll.m || today().slice(0, 7);
    let n = 0;
    db.employees.filter(e => e.status === '재직' && !db.payroll.some(p => p.month === m && p.empId === e.id)).forEach(e => {
      db.payroll.push({ id: nextId('pay', 'PAY-', 4), month: m, empId: e.id, base: e.baseSalary, allowance: 0, deduction: 0, net: e.baseSalary, paidDate: '' }); n++;
    });
    toast(n ? `${m} 급여 ${n}건 생성 (수당·공제는 수정에서 입력)` : '생성할 대상이 없습니다.'); refresh();
  },
  editPay(id) {
    const p = db.payroll.find(x => x.id === id);
    openModal(`${p.id} 수정 - ${emp(p.empId)?.name}`, `<div class="grid">${field('기본급', 'base', p.base, 'number', 'min="0" required')}${field('수당', 'allowance', p.allowance, 'number', 'min="0"')}
      ${field('공제(세금·보험 등)', 'deduction', p.deduction, 'number', 'min="0"')}</div>`, fd => {
      Object.assign(p, { base: +fd.get('base'), allowance: +fd.get('allowance') || 0, deduction: +fd.get('deduction') || 0 });
      p.net = p.base + p.allowance - p.deduction; refresh();
    });
  },
  payPay(id) {
    const p = db.payroll.find(x => x.id === id); p.paidDate = today();
    jv('급여', '현금', p.net, `${p.month} 급여 지급 (${emp(p.empId)?.name})`, p.id); jv('급여', '예수금', p.deduction, `${p.month} 급여 공제분 (${emp(p.empId)?.name})`, p.id);
    toast('지급 처리 완료 (전표 자동 생성)'); refresh();
  },
  delPay(id) { ask('이 급여 명세를 삭제할까요?', () => { db.payroll = db.payroll.filter(p => p.id !== id); refresh(); }); },
  addCust() { openModal('고객 등록', custForm(), fd => { db.customers.push({ id: nextId('cust', 'C', 3), name: fd.get('name'), contact: fd.get('contact'), phone: fd.get('phone') }); refresh(); }); },
  editCust(id) { const c = cust(id); openModal('고객 수정', custForm(c), fd => { Object.assign(c, { name: fd.get('name'), contact: fd.get('contact'), phone: fd.get('phone') }); refresh(); }); },
  delCust(id) {
    if (db.salesOrders.some(o => o.customerId === id) || db.ar.some(a => a.customerId === id)) return toast('수주/채권 이력이 있는 고객은 삭제할 수 없습니다.');
    ask('삭제할까요?', () => { db.customers = db.customers.filter(c => c.id !== id); refresh(); });
  },
  addSO() {
    if (!db.customers.length) return toast('고객을 먼저 등록하세요.');
    openModal('수주 등록', soForm(), fd => {
      const n = fd.getAll('pname'), q = fd.getAll('qty'), pr = fd.getAll('price');
      db.salesOrders.push({ id: nextId('so', 'SO-', 4), customerId: fd.get('customerId'), date: today(), due: fd.get('due'), status: '수주', lines: n.map((x, k) => ({ name: x, qty: +q[k], price: +pr[k] })) });
      toast('수주 등록'); refresh();
    }); bindPoForm();
  },
  shipSO(id) {
    const o = db.salesOrders.find(x => x.id === id), amt = lineTotal(o), arId = nextId('ar', 'AR-', 4);
    ask(`${id} 출하 처리하면 매출 ${won(amt)}과 미수금이 생성됩니다. 진행할까요?`, () => {
      o.status = '출하완료'; o.shipDate = today();
      db.ar.push({ id: arId, ref: o.id, customerId: o.customerId, date: today(), due: addDays(30), amount: amt, paidDate: '' });
      jv('외상매출금', '매출', amt, `${o.id} 출하 매출 (${cust(o.customerId)?.name})`, o.id); refresh();
    });
  },
  cancelSO(id) { ask(`${id} 수주를 취소할까요?`, () => { db.salesOrders.find(o => o.id === id).status = '취소'; refresh(); }); },
  addPR() {
    if (!db.items.length) return toast('품목을 먼저 등록하세요.');
    openModal('구매요청', `<div class="grid">${field('요청자', 'requester', '')}${select('품목', 'itemId', db.items.map(i => [i.id, `${i.name} (재고 ${num(i.stock)}${i.unit})`]), '')}
      ${field('수량', 'qty', 1, 'number', 'min="1" required')}${field('사유', 'reason', '')}</div>`, fd => {
      db.prs.push({ id: nextId('pr', 'PR-', 4), date: today(), requester: fd.get('requester') || '-', itemId: fd.get('itemId'), qty: +fd.get('qty'), reason: fd.get('reason'), status: '요청', poId: '' });
      toast('구매요청 등록'); refresh();
    });
  },
  approvePR(id) { db.prs.find(r => r.id === id).status = '승인'; toast('승인 완료'); refresh(); },
  rejectPR(id) { ask('이 구매요청을 반려할까요?', () => { db.prs.find(r => r.id === id).status = '반려'; refresh(); }); },
  prToPO(id) {
    const r = db.prs.find(x => x.id === id), i = item(r.itemId), poId = nextId('po', 'PO-', 4);
    db.pos.push({ id: poId, supplierId: i.supplierId, date: today(), due: addDays(sup(i.supplierId)?.leadDays || 7), status: '작성', lines: [{ itemId: i.id, qty: r.qty, price: i.price, received: 0 }] });
    r.status = '발주전환'; r.poId = poId; toast(`${poId} 발주서 생성 (발주 관리에서 확정)`); refresh();
  },
  receiveAR(id) {
    const a = db.ar.find(x => x.id === id); a.paidDate = today();
    jv('현금', '외상매출금', a.amount, `${a.ref} 매출대금 입금 (${cust(a.customerId)?.name})`, a.id); toast('입금 처리 (전표 자동 생성)'); refresh();
  },
  payAP(id) {
    const a = db.ap.find(x => x.id === id); a.paidDate = today();
    jv('외상매입금', '현금', a.amount, `${a.ref} 매입대금 지급 (${sup(a.supplierId)?.name})`, a.id); toast('지급 처리 (전표 자동 생성)'); refresh();
  },
  addJV() {
    openModal('수기 전표', `<div class="grid">${field('일자', 'date', today(), 'date', 'required')}${field('금액(원)', 'amount', 0, 'number', 'min="1" required')}
      ${select('차변 계정', 'debit', ACCTS.map(a => [a[0], `${a[0]} (${a[1]})`]), '기타비용')}${select('대변 계정', 'credit', ACCTS.map(a => [a[0], `${a[0]} (${a[1]})`]), '현금')}${field('적요', 'memo', '', 'text', 'class="full"')}</div>`, fd => {
      if (fd.get('debit') === fd.get('credit')) { toast('차변과 대변 계정이 같습니다.'); return false; }
      db.journal.push({ id: nextId('jv', 'JV-', 4), date: fd.get('date'), debit: fd.get('debit'), credit: fd.get('credit'), amount: +fd.get('amount'), memo: fd.get('memo'), ref: '수기' });
      toast('전표 등록'); refresh();
    });
  },
  addItem() { openModal('품목 등록', itemForm(), fd => { db.items.push({ id: nextId('item', 'M', 3), name: fd.get('name'), category: fd.get('category'), unit: fd.get('unit'), supplierId: fd.get('supplierId'), price: +fd.get('price'), safety: +fd.get('safety'), stock: 0 }); refresh(); }); },
  editItem(id) { const i = item(id); openModal('품목 수정', itemForm(i), fd => { Object.assign(i, { name: fd.get('name'), category: fd.get('category'), unit: fd.get('unit'), supplierId: fd.get('supplierId'), price: +fd.get('price'), safety: +fd.get('safety') }); refresh(); }); },
  delItem(id) {
    if (db.moves.some(m => m.itemId === id) || db.pos.some(p => p.lines.some(l => l.itemId === id))) return toast('입출고/발주 이력이 있는 품목은 삭제할 수 없습니다.');
    ask('삭제할까요?', () => { db.items = db.items.filter(i => i.id !== id); refresh(); });
  },
  addSup() { openModal('업체 등록', supForm(), fd => { db.suppliers.push({ id: nextId('sup', 'S', 3), name: fd.get('name'), contact: fd.get('contact'), phone: fd.get('phone'), leadDays: +fd.get('leadDays') }); refresh(); }); },
  editSup(id) { const s = sup(id); openModal('업체 수정', supForm(s), fd => { Object.assign(s, { name: fd.get('name'), contact: fd.get('contact'), phone: fd.get('phone'), leadDays: +fd.get('leadDays') }); refresh(); }); },
  delSup(id) {
    if (db.items.some(i => i.supplierId === id) || db.pos.some(p => p.supplierId === id)) return toast('품목/발주에서 사용 중인 업체는 삭제할 수 없습니다.');
    ask('삭제할까요?', () => { db.suppliers = db.suppliers.filter(s => s.id !== id); refresh(); });
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
    ask(`${id} 발주를 취소할까요?`, () => { p.status = '취소'; refresh(); });
  },
  receivePO(id) {
    const p = db.pos.find(x => x.id === id);
    const rows = p.lines.map((l, k) => `<tr><td>${esc(item(l.itemId).name)}</td><td class="num">${num(l.qty)}</td><td class="num">${num(l.received)}</td>
      <td><input name="r${k}" type="number" min="0" max="${l.qty - l.received}" value="${l.qty - l.received}"></td></tr>`).join('');
    openModal(`${id} 입고 처리`, `<table><thead><tr><th>품목</th><th class="num">발주</th><th class="num">기입고</th><th>이번 입고수량</th></tr></thead><tbody>${rows}</tbody></table>`, fd => {
      let any = false, amt = 0;
      p.lines.forEach((l, k) => {
        const q = Math.min(Math.max(0, +fd.get('r' + k) || 0), l.qty - l.received);
        if (q > 0) { move('입고', l.itemId, q, p.id); l.received += q; any = true; amt += q * l.price; }
      });
      if (!any) { toast('입고수량을 입력하세요.'); return false; }
      const s = sup(p.supplierId), apId = nextId('ap', 'AP-', 4);
      db.ap.push({ id: apId, ref: p.id, supplierId: p.supplierId, date: today(), due: addDays(30), amount: amt, paidDate: '' });
      jv('원재료', '외상매입금', amt, `${p.id} 입고 매입 (${s?.name || ''})`, apId);
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
$('#resetBtn').onclick = () => ask('모든 데이터를 샘플 데이터로 초기화할까요?', () => { db = seed(); refresh(); });
show('dashboard');
