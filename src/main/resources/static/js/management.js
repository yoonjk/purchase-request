let csrf='';const $=s=>document.querySelector(s);const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function notice(s,err=false){$('#notice').className=err?'error':'ok';$('#notice').textContent=s}async function api(path,method='GET',data){let r=await fetch(path,{method,credentials:'same-origin',headers:{...(method!=='GET'?{'X-XSRF-TOKEN':csrf}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});if(r.status===401){location.href='/login.html';throw Error('로그인이 필요합니다')}if(!r.ok){let msg=await r.text();throw Error(`${r.status} ${msg.slice(0,220)}`)}return r.status===204?null:r.json()}async function run(fn){try{await fn()}catch(e){notice(e.message,true)}}function table(headers,rows){return '<table><thead><tr>'+headers.map(x=>`<th>${escapeHtml(x)}</th>`).join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table>'}function cell(v){return `<td>${escapeHtml(v)}</td>`}function tab(name){document.querySelectorAll('main section.panel').forEach(x=>x.hidden=(x.id!==name && !(name==='products' && x.id==='productsList')));const titles={create:['구매 요청','구매 요청을 등록하고 승인 상태를 확인할 수 있습니다.'],lookup:['구매 요청 조회','요청 ID와 Test Run ID로 구매 요청을 조회합니다.'],items:['구매 물품 관리','구매 요청에 포함된 물품을 관리합니다.'],list:['구매 요청 목록조회','등록된 구매 요청과 승인 상태를 확인합니다.'],products:['상품 관리','구매 요청에 사용할 상품을 등록하고 관리할 수 있습니다.']};$('#pageTitle').textContent=titles[name][0];$('#currentPage').textContent=titles[name][0];$('#pageDescription').textContent=titles[name][1];document.querySelectorAll('nav button[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));if(name==='products')run(loadProducts);if(name==='list')run(loadRequests)}document.querySelectorAll('nav button[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));$('#createForm').onsubmit=e=>{e.preventDefault();run(async()=>{let x=Object.fromEntries(new FormData(e.target));x.amount=Number(x.amount);x.budget=Number(x.budget);let r=await api('/api/purchase-requests','POST',x);$('#created').textContent=JSON.stringify(r,null,2);notice('구매 요청 등록 완료')})};$('#lookupForm').onsubmit=e=>{e.preventDefault();run(async()=>{let x=Object.fromEntries(new FormData(e.target));const result=await api(`/api/purchase-requests/${encodeURIComponent(x.id)}?test_run_id=${encodeURIComponent(x.run)}`);$('#lookupResult').textContent=JSON.stringify(result,null,2);renderLookupResult(result);notice('조회 완료')})};async function loadRequests(){let list=await api('/api/purchase-requests');$('#requestTable').innerHTML=table(['ID','요청자','금액','예산','승인 상태','Test Run ID'],list.map(x=>'<tr>'+[x.requestId,x.requester,x.totalAmount,x.budget,x.status,x.testRunId].map(cell).join('')+'</tr>'))}$('#loadRequests').onclick=()=>run(loadRequests);async function loadItems(){let id=$('#itemRequest').value;if(!id)throw Error('Request ID를 입력하세요');let list=await api(`/api/purchase-requests/${encodeURIComponent(id)}/items`);$('#itemTable').innerHTML=table(['Item ID','SKU','수량','단가','합계','작업'],list.map(x=>'<tr>'+[x.itemId,x.sku,x.quantity,x.unitPrice,x.lineTotal].map(cell).join('')+`<td><button data-edit-item="${x.itemId}" data-sku="${escapeHtml(x.sku)}" data-qty="${x.quantity}">수정</button><button class="danger" data-del-item="${x.itemId}">삭제</button></td></tr>`));}$('#loadItems').onclick=()=>run(loadItems);$('#itemForm').onsubmit=e=>{e.preventDefault();run(async()=>{let x=Object.fromEntries(new FormData(e.target));await api(`/api/purchase-requests/${encodeURIComponent($('#itemRequest').value)}/items`,'POST',{sku:x.sku,quantity:Number(x.quantity)});notice('물품 등록 완료 / 요청 금액 및 상태 재계산');await loadItems()})};$('#itemTable').onclick=e=>{let b=e.target.closest('button');if(!b)return;run(async()=>{if(b.dataset.editItem){let sku=prompt('SKU',b.dataset.sku);if(sku===null)return;let qty=prompt('수량',b.dataset.qty);if(qty===null)return;await api(`/api/purchase-items/${b.dataset.editItem}`,'PUT',{sku,quantity:Number(qty)})}else if(b.dataset.delItem){if(!confirm('물품을 삭제하시겠습니까?'))return;await api(`/api/purchase-items/${b.dataset.delItem}`,'DELETE')}notice('처리 완료 / 금액 및 승인 상태 재계산');await loadItems()})};let productCache=[];function renderProducts(){const query=($('#productSearch').value||'').trim().toLowerCase();const list=productCache.filter(x=>(x.sku+' '+x.name).toLowerCase().includes(query));$('#productCount').textContent=`총 ${list.length}개`;$('#productTable').innerHTML=table(['SKU','상품명','단가 (₩)','활성','작업'],list.map(x=>'<tr>'+cell(x.sku)+cell(x.name)+cell(Number(x.unitPrice).toLocaleString('ko-KR'))+`<td><span class="status-tag ${x.active?'enabled':'disabled'}">${x.active?'● 활성':'● 비활성'}</span></td>`+`<td class="actions"><button class="outline" data-edit-product="${escapeHtml(x.sku)}">수정</button><button class="danger" data-del-product="${escapeHtml(x.sku)}">삭제</button></td></tr>`))}async function loadProducts(){productCache=await api('/api/products');renderProducts()}$('#productSearch').addEventListener('input',renderProducts);$('#loadProducts').onclick=()=>run(loadProducts);$('#productForm').onsubmit=e=>{e.preventDefault();run(async()=>{let x=Object.fromEntries(new FormData(e.target));x.unitPrice=Number(x.unitPrice);x.active=x.active==='true';await api('/api/products','POST',x);notice('상품 등록 완료');await loadProducts()})};let editReturnFocus=null;let editingProductSku=null;const editModal=$('#productEditModal');const editDialog=editModal.querySelector('.modal-dialog');function closeProductModal(){if(editModal.hidden)return;editModal.hidden=true;document.body.classList.remove('modal-open');editingProductSku=null;$('#productEditError').hidden=true;if(editReturnFocus&&editReturnFocus.isConnected)editReturnFocus.focus();}async function openProductModal(sku,trigger){const p=await api('/api/products/'+encodeURIComponent(sku));editingProductSku=sku;editReturnFocus=trigger;$('#editProductSku').value=p.sku;$('#editProductName').value=p.name;$('#editProductPrice').value=p.unitPrice;$('#editProductActive').value=String(Boolean(p.active));$('#productEditError').hidden=true;editModal.hidden=false;document.body.classList.add('modal-open');$('#editProductName').focus();}$('#closeProductEdit').onclick=closeProductModal;$('#cancelProductEdit').onclick=closeProductModal;editModal.addEventListener('click',e=>{if(e.target===editModal)closeProductModal()});document.addEventListener('keydown',e=>{if(editModal.hidden)return;if(e.key==='Escape'){e.preventDefault();closeProductModal();return}if(e.key==='Tab'){const els=[...editModal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])')].filter(el=>el.getClientRects().length);const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});$('#productEditForm').onsubmit=e=>{e.preventDefault();run(async()=>{const name=$('#editProductName').value.trim();const unitPrice=Number($('#editProductPrice').value);if(!name||!Number.isFinite(unitPrice)||unitPrice<0)throw Error('상품명과 올바른 단가를 입력하세요');const btn=$('#saveProductEdit');btn.disabled=true;btn.textContent='저장 중...';try{await api('/api/products/'+encodeURIComponent(editingProductSku),'PUT',{name,unitPrice,active:$('#editProductActive').value==='true'});closeProductModal();notice('상품 정보가 수정되었습니다.');await loadProducts()}catch(err){$('#productEditError').textContent=err.message;$('#productEditError').hidden=false}finally{btn.disabled=false;btn.textContent='변경사항 저장'}})};$('#productTable').onclick=e=>{let b=e.target.closest('button');if(!b)return;run(async()=>{let sku=b.dataset.editProduct??b.dataset.delProduct;if(b.dataset.editProduct){await openProductModal(sku,b)}else if(b.dataset.delProduct){if(!confirm(`${sku} 상품을 삭제하시겠습니까?`))return;await api('/api/products/'+encodeURIComponent(sku),'DELETE');notice('상품이 삭제되었습니다.');await loadProducts()}})};run(async()=>{let c=await api('/api/auth/csrf');csrf=c.token;$('#logoutCsrf').value=csrf;let u=await api('/api/auth/me');$('#user').textContent=u.loginId;tab('create')});
// Carbon-inspired request details: retains the existing lookup API and raw JSON.
let currentLookup=null;
function getRequestField(o,...keys){for(const k of keys){if(o?.[k]!==undefined&&o[k]!==null)return o[k]}return null}
function currencyKRW(value){const n=Number(value);return Number.isFinite(n)?n.toLocaleString('ko-KR',{maximumFractionDigits:2})+' 원':'—'}
function renderLookupResult(raw){
  currentLookup=raw;
  const x=raw?.data && typeof raw.data==='object' && !Array.isArray(raw.data)?raw.data:raw;
  const requestId=getRequestField(x,'request_id','requestId');
  const runId=getRequestField(x,'test_run_id','testRunId');
  const requester=getRequestField(x,'requester');
  const amount=getRequestField(x,'amount','total_amount','totalAmount');
  const budget=getRequestField(x,'budget');
  const status=getRequestField(x,'status');
  const statuses={AUTO_APPROVED:['자동 승인','approved'],PENDING_APPROVAL:['승인 대기','pending'],REJECTED:['반려','rejected']};
  const [label,kind]=statuses[status]||[status||'확인 필요','unknown'];
  const e=escapeHtml;
  $('#lookupSummary').innerHTML=`<div class="summary-top"><div class="summary-metric"><span>요청 번호</span><strong>${e(requestId??'—')}</strong></div><div class="summary-metric"><span>요청자</span><strong>${e(requester??'—')}</strong></div><div class="summary-metric run-id"><span>테스트 실행 ID</span><strong>${e(runId??'—')}</strong></div><div class="summary-metric"><span>승인 상태</span><strong><span class="approval-pill ${kind}">${e(label)}</span></strong><small>${e(status??'')}</small></div></div><div class="summary-bottom"><div><span>요청 금액</span><strong>${e(currencyKRW(amount))}</strong></div><div><span>예산</span><strong>${e(currencyKRW(budget))}</strong></div></div>`;
  $('#lookupDetails').innerHTML=`<div class="detail-grid">${[['요청 번호',requestId],['요청자',requester],['Test Run ID',runId],['승인 상태',label],['요청 금액',currencyKRW(amount)],['예산',currencyKRW(budget)]].map(([k,v])=>`<div class="detail-field"><span>${e(k)}</span><strong>${e(v??'—')}</strong></div>`).join('')}</div>`;
  $('#lookupJsonPre').textContent=JSON.stringify(raw,null,2);
  $('#lookupDetailPanel').hidden=false;
  document.querySelectorAll('.result-tab').forEach(b=>b.classList.toggle('active',b.dataset.view==='details'));
  $('#lookupDetails').hidden=false;$('#lookupJson').hidden=true;
}
document.querySelectorAll('.result-tab').forEach(b=>b.addEventListener('click',()=>{
  const json=b.dataset.view==='json';
  $('#lookupDetails').hidden=json;$('#lookupJson').hidden=!json;
  document.querySelectorAll('.result-tab').forEach(t=>t.classList.toggle('active',t===b));
}));
$('#copyLookup').onclick=async()=>{if(!currentLookup)return;try{await navigator.clipboard.writeText(JSON.stringify(currentLookup,null,2));notice('조회 결과를 복사했습니다.')}catch(e){notice('클립보드 복사에 실패했습니다.',true)}};
$('#downloadLookup').onclick=()=>{if(!currentLookup)return;const blob=new Blob([JSON.stringify(currentLookup,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='purchase-request-'+(getRequestField(currentLookup,'request_id','requestId')??'result')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
// Keep result card aligned with active navigation.
const originalTab=tab;
tab=function(name){originalTab(name);if(name!=='lookup')$('#lookupDetailPanel').hidden=true;else if(currentLookup)$('#lookupDetailPanel').hidden=false};

// Dashboard overview enhancement. Existing API and element IDs remain unchanged.
(function(){
  const originalRenderProducts=renderProducts;
  renderProducts=function(){
    originalRenderProducts();
    const total=productCache.length;
    const active=productCache.filter(p=>p.active===true || p.active===1).length;
    const a=document.querySelector('#metricTotal'),b=document.querySelector('#metricActive'),c=document.querySelector('#metricInactive');
    if(a)a.textContent=total.toLocaleString('ko-KR');
    if(b)b.textContent=active.toLocaleString('ko-KR');
    if(c)c.textContent=(total-active).toLocaleString('ko-KR');
  };
  const originalTabForOverview=tab;
  tab=function(name){
    originalTabForOverview(name);
    const el=document.querySelector('#productOverview');
    if(el)el.hidden=name!=='products';
  };
  const jump=document.querySelector('#jumpToProductForm');
  if(jump)jump.addEventListener('click',()=>{document.querySelector('#productForm [name="sku"]').focus();document.querySelector('#products').scrollIntoView({behavior:'smooth',block:'start'});});
})();

// HR screens: reuse authenticated API helper, CSRF header and notification surface.
let hrEmployees=[];
function hrEmployeePayload(form){const v=Object.fromEntries(new FormData(form));return {name:v.name.trim(),department:v.department.trim(),employeeId:v.employeeId.trim(),managerId:v.managerId?v.managerId.trim():null,annualLeaveDays:Number(v.annualLeaveDays)};}
function hrResetForm(){const f=$('#employeeForm');f.reset();f.elements.employeeId.value='';f.elements.employeeId.readOnly=false;$('#employeeSubmit').textContent='직원 등록';}
function hrRenderEmployees(){
 const q=$('#employeeSearch').value.trim().toLowerCase();const list=hrEmployees.filter(x=>(x.name+' '+x.department+' '+x.employeeId).toLowerCase().includes(q));
 $('#hrEmployeeTotal').textContent=hrEmployees.length;$('#hrLeaveGranted').textContent=hrEmployees.reduce((n,x)=>n+x.annualLeaveDays,0)+'일';$('#hrLeaveUsed').textContent=hrEmployees.reduce((n,x)=>n+x.usedLeaveDays,0)+'일';
 $('#employeeTable').innerHTML=table(['ID','직원명','부서','관리자 ID','연차 총량','사용','잔여','작업'],list.map(x=>'<tr>'+[x.employeeId,x.name,x.department,x.managerId??'—',x.annualLeaveDays,x.usedLeaveDays,x.annualLeaveDays-x.usedLeaveDays].map(cell).join('')+`<td class="actions"><button class="outline" data-hr-edit="${x.employeeId}">수정</button><button class="outline" data-hr-leave="${x.employeeId}">연차</button><button class="danger" data-hr-delete="${x.employeeId}">삭제</button></td></tr>`));
 const selected=$('#leaveEmployee').value;$('#leaveEmployee').innerHTML='<option value="">직원을 선택하세요</option>'+hrEmployees.map(x=>`<option value="${x.employeeId}">${escapeHtml(x.name)} (${x.employeeId})</option>`).join('');$('#leaveEmployee').value=hrEmployees.some(x=>String(x.employeeId)===selected)?selected:'';
}
async function hrLoadEmployees(){hrEmployees=await api('/api/hr/employees');hrRenderEmployees();}
$('#employeeSearch').oninput=hrRenderEmployees;$('#refreshEmployees').onclick=()=>run(hrLoadEmployees);$('#employeeReset').onclick=hrResetForm;
$('#employeeForm').onsubmit=e=>{e.preventDefault();run(async()=>{const f=e.target,id=f.elements.employeeId.value;await api(id?'/api/hr/employees/'+encodeURIComponent(id):'/api/hr/employees',id?'PUT':'POST',hrEmployeePayload(f));notice(id?'직원 정보 수정 완료':'직원 등록 완료');hrResetForm();await hrLoadEmployees();})};
$('#employeeTable').onclick=e=>{const b=e.target.closest('button');if(!b)return;run(async()=>{
 const id=b.dataset.hrEdit||b.dataset.hrDelete||b.dataset.hrLeave,emp=hrEmployees.find(x=>x.employeeId===id);if(!emp)return;
 if(b.dataset.hrEdit){const f=$('#employeeForm');f.elements.employeeId.value=id;f.elements.employeeId.readOnly=true;f.elements.name.value=emp.name;f.elements.department.value=emp.department;f.elements.managerId.value=emp.managerId??'';f.elements.annualLeaveDays.value=emp.annualLeaveDays;$('#employeeSubmit').textContent='변경사항 저장';f.scrollIntoView({behavior:'smooth',block:'center'});f.elements.name.focus();}
 else if(b.dataset.hrLeave){tab('leave');await hrLoadEmployees();$('#leaveEmployee').value=id;await hrLoadLeaves();}
 else if(b.dataset.hrDelete){if(!confirm(`${emp.name} 직원 정보를 삭제하시겠습니까? 연결된 연차 이력이나 부하 직원이 있으면 삭제할 수 없습니다.`))return;await api('/api/hr/employees/'+id,'DELETE');notice('직원 삭제 완료');await hrLoadEmployees();}
})};
async function hrLoadLeaves(){const id=$('#leaveEmployee').value;if(!id){$('#leaveTable').innerHTML='';['leaveTotal','leaveUsed','leaveRemaining'].forEach(k=>$('#'+k).textContent='—');return;}
 const emp=hrEmployees.find(x=>String(x.employeeId)===id);if(emp){$('#leaveTotal').textContent=emp.annualLeaveDays+'일';$('#leaveUsed').textContent=emp.usedLeaveDays+'일';$('#leaveRemaining').textContent=(emp.annualLeaveDays-emp.usedLeaveDays)+'일';}
 const list=await api('/api/hr/employees/'+encodeURIComponent(id)+'/leaves');window.hrLeaveCache=list;$('#leaveTable').innerHTML=table(['번호','시작일','종료일','사용 일수','사유','상태','작업'],list.map(x=>'<tr>'+[x.leaveId,x.startDate,x.endDate,x.days,x.reason||'—',x.status==='APPROVED'?'사용 완료':'취소'].map(cell).join('')+`<td class="actions">${x.status==='APPROVED'?`<button class="outline" data-hr-edit-leave="${x.leaveId}">수정</button><button class="outline" data-hr-cancel="${x.leaveId}">사용 취소</button>`:`<button class="danger" data-hr-delete-leave="${x.leaveId}">삭제</button>`}</td></tr>`));}
$('#leaveEmployee').onchange=()=>run(hrLoadLeaves);
$('#leaveForm').onsubmit=e=>{e.preventDefault();run(async()=>{const id=$('#leaveEmployee').value;if(!id)throw Error('직원을 선택하세요');const x=Object.fromEntries(new FormData(e.target));const leaveId=x.leaveId;await api(leaveId?'/api/hr/leaves/'+encodeURIComponent(leaveId):'/api/hr/employees/'+encodeURIComponent(id)+'/leaves',leaveId?'PUT':'POST',{startDate:x.startDate,endDate:x.endDate,days:Number(x.days),reason:x.reason});notice(leaveId?'연차 수정 완료':'연차 사용이 등록되었습니다.');hrResetLeaveForm();await hrLoadEmployees();$('#leaveEmployee').value=id;await hrLoadLeaves();})};
function hrResetLeaveForm(){const f=$('#leaveForm');f.reset();f.elements.leaveId.value='';$('#leaveSubmit').textContent='연차 사용 등록';}
$('#leaveReset').onclick=hrResetLeaveForm;
$('#leaveTable').onclick=e=>{const b=e.target.closest('button');if(!b)return;run(async()=>{
 const id=$('#leaveEmployee').value,leaveId=b.dataset.hrEditLeave||b.dataset.hrCancel||b.dataset.hrDeleteLeave;
 if(b.dataset.hrEditLeave){const l=(window.hrLeaveCache||[]).find(x=>String(x.leaveId)===leaveId);if(!l)return;const f=$('#leaveForm');f.elements.leaveId.value=leaveId;f.elements.startDate.value=l.startDate;f.elements.endDate.value=l.endDate;f.elements.days.value=l.days;f.elements.reason.value=l.reason||'';$('#leaveSubmit').textContent='연차 수정 저장';f.scrollIntoView({behavior:'smooth',block:'center'});return;}
 if(b.dataset.hrCancel){if(!confirm('연차 사용을 취소하고 사용 일수를 복원하시겠습니까?'))return;await api('/api/hr/leaves/'+encodeURIComponent(leaveId)+'/cancel','POST');notice('연차 사용 취소 완료');}
 if(b.dataset.hrDeleteLeave){if(!confirm('취소된 연차 내역을 영구 삭제하시겠습니까? 감사 이력이 사라집니다.'))return;await api('/api/hr/leaves/'+encodeURIComponent(leaveId),'DELETE');notice('취소된 연차 내역 삭제 완료');}
 hrResetLeaveForm();await hrLoadEmployees();$('#leaveEmployee').value=id;await hrLoadLeaves();
})};
const hrOriginalTab=tab;
tab=function(name){if(name!=='employees'&&name!=='leave')hrOriginalTab(name);const titles={employees:['사용자 관리','직원 등록·조회·수정·삭제 및 인사정보를 관리합니다.'],leave:['연차 관리','직원별 연차 사용 내역과 잔여 일수를 관리합니다.']};if(titles[name]){document.querySelectorAll('main section.panel').forEach(x=>x.hidden=x.id!==name);$('#pageTitle').textContent=titles[name][0];$('#currentPage').textContent=titles[name][0];$('#pageDescription').textContent=titles[name][1];document.querySelectorAll('nav button[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));}if(name==='employees')run(hrLoadEmployees);if(name==='leave')run(async()=>{const selected=$('#leaveEmployee').value;await hrLoadEmployees();$('#leaveEmployee').value=selected;await hrLoadLeaves();});};

// Sidebar groups: keep the existing tab(name) navigation intact.
function initSidebarAccordion(){
  document.querySelectorAll('.nav-group-toggle').forEach(toggle=>{
    toggle.addEventListener('click',()=>{
      const panel=document.getElementById(toggle.getAttribute('aria-controls'));
      if(!panel)return;
      const expanded=toggle.getAttribute('aria-expanded')==='true';
      toggle.setAttribute('aria-expanded',String(!expanded));
      panel.hidden=expanded;
    });
  });
}
initSidebarAccordion();
