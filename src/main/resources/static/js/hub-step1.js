/* AI Modernization Hub Step 1. No backend mutation; previews are explicit placeholders. */
(()=>{'use strict';
const shell=document.querySelector('.app-shell');const nav=document.querySelector('nav.sidebar');const panel=document.getElementById('hubPreview');
const pages={
 'modern-dashboard':['Modernization Dashboard','32개 Java 애플리케이션 현대화 통합 현황','<div class="hub-cards"><div class="hub-card"><small>Modernization Scope</small><strong>32</strong><small>Java Applications</small></div><div class="hub-card"><small>Target Stack</small><strong>Java 21</strong><small>Spring 6 · Jakarta EE (목표)</small></div></div>'],
 portfolio:['Application Portfolio','대상 시스템의 현재/목표 기술 스택과 전환 위험을 관리합니다.','<table class="hub-mini-table"><thead><tr><th>Application ID</th><th>Current</th><th>Target</th><th>Status</th></tr></thead><tbody><tr><td>APP-001 (예시)</td><td>Java 6</td><td>Java 21</td><td>미등록</td></tr><tr><td>APP-002 (예시)</td><td>Java 8</td><td>Java 21</td><td>미등록</td></tr></tbody></table>'],
 libraries:['Library Compatibility','Maven Central / 사내 / Solution 라이브러리 호환성 관리',''],
 progress:['Modernization Progress','Discovery → Assessment → Transformation → Build → Testing → Validation','<div class="hub-cards"><div class="hub-card"><small>Discovery</small><strong>—</strong><small>실제 결과 미연결</small></div><div class="hub-card"><small>Build / Test</small><strong>—</strong><small>실제 결과 미연결</small></div></div>'],
 reports:['Reports & Analytics','시스템별 현대화 현황과 테스트 품질 지표',''],
 automation:['Test Automation','Playwright API/E2E 테스트 실행 결과 관리',''],
 configuration:['Configuration','관리자 전용 메뉴 표시 설정 (Step 2에서 구현)','']
};
function showPreview(id){const p=pages[id];if(!p)return;document.querySelectorAll('main section.panel').forEach(el=>el.hidden=true);panel.hidden=false;document.dispatchEvent(new CustomEvent('hub:page',{detail:{id}}));document.getElementById('hubPreviewTitle').textContent=p[0];document.getElementById('hubPreviewSubtitle').textContent=p[1];document.getElementById('hubPreviewBody').innerHTML=p[2]+'<p class="hub-message">이 화면은 Step 1 UI Preview입니다. 시스템 등록, 진행률, 관리자 설정 및 테스트 결과는 다음 단계에서 API와 연결됩니다.</p>';for(const [sel,value] of [['#pageTitle',p[0]],['#currentPage',p[0]],['#pageDescription',p[1]]]){const el=document.querySelector(sel);if(el)el.textContent=value}nav.querySelectorAll('[data-tab]').forEach(el=>el.classList.remove('active'));nav.querySelectorAll('[data-hub-page]').forEach(el=>el.classList.toggle('hub-active',el.dataset.hubPage===id));}
function activate(el){if(el.dataset.hubPage){showPreview(el.dataset.hubPage);return}if(el.dataset.groupTrigger){const id=el.dataset.groupTrigger;const body=nav.querySelector(`[data-group-body="${id}"]`);const willOpen=body.hidden;body.hidden=!willOpen;el.setAttribute('aria-expanded',String(willOpen));el.querySelector('.hub-chevron').textContent=willOpen?'⌄':'›';}}
nav.addEventListener('click',e=>{const el=e.target.closest('[data-hub-page],[data-group-trigger]');if(el)activate(el)});
nav.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role="button"]')){e.preventDefault();activate(e.target)}});
nav.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{nav.querySelectorAll('[data-hub-page]').forEach(el=>el.classList.remove('hub-active'))}));
const collapse=document.getElementById('hubCollapse');const toggleCollapse=()=>{const c=shell.classList.toggle('hub-collapsed');collapse.setAttribute('aria-label',c?'사이드바 펼치기':'사이드바 접기');collapse.title=c?'사이드바 펼치기':'사이드바 접기'};collapse.addEventListener('click',toggleCollapse);collapse.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleCollapse()}});
})();
