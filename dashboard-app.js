const esc=v=>String(v??'미기재').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n==null?'미기재':n.toLocaleString('ko-KR',{maximumFractionDigits:3});
function groups(rows,field){const out=new Map();for(const row of rows){const k=row[field]||'미확인';if(!out.has(k))out.set(k,[]);out.get(k).push(row);}return [...out];}
function section(title,body){return '<section class="card"><h2>'+esc(title)+'</h2>'+body+'</section>';}
export function start(data,config){
 const main=document.getElementById('main'),all=config.regions.flatMap(r=>data[r].cards||[]);
 if(all.length!==data['전국'].total.n)throw Error('요약서 기준 자료를 다시 등록해 주세요.');
 const dialog=document.createElement('dialog');dialog.style.cssText='width:min(840px,90vw);max-height:80vh;border:0;border-radius:14px';document.body.append(dialog);
 let selections=[];
 function button(label,rows){const i=selections.push(rows)-1;return '<button class="sumPick" data-group="'+i+'">'+esc(label)+'</button>';}
 function list(rows){dialog.innerHTML='<button data-close>닫기</button><h2>실천과제 '+fmt(rows.length)+'건</h2>'+rows.map(p=>'<p><button class="sumPick" data-id="'+esc(p.key)+'">'+esc(p.title)+'</button><br><small>'+esc(p.region+' · '+p.category+' · '+(p.code||'번호 미기재'))+'</small></p>').join('');if(!dialog.open)dialog.showModal();}
 let previous=[];
 main.onclick=e=>{const b=e.target.closest('[data-group]');if(b){previous=selections[Number(b.dataset.group)];list(previous);}};
 dialog.onclick=e=>{if(e.target.closest('[data-close]'))dialog.close();else if(e.target.closest('[data-back]'))list(previous);else{const b=e.target.closest('[data-id]');if(!b)return;const p=all.find(x=>x.key===b.dataset.id);dialog.innerHTML='<button data-close>닫기</button> <button data-back>목록으로</button><h2>'+esc(p.title)+'</h2><p>'+esc(p.region+' · '+p.category+' · '+(p.code||'번호 미기재'))+'</p><p>'+esc(p.about||'사업내용 미기재')+'</p><dl>'+Object.entries({'사업 기간':p.period,'요약서 기재 기관':p.agencyRaw||'미기재','총사업비(억원)':p.whole==null?p.wholeStatus:fmt(p.whole),'국비(억원)':p.national==null?p.nationalStatus:fmt(p.national),'지원 유형 또는 정주여건':p.economic||p.living,'성장엔진':p.engine,'기존 산업':p.existing.join(' · ')||'연결 미확인'}).map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl>'; }};
 function table(pairs){
  const max=Math.max(1,...pairs.map(([,g])=>g.length));return '<div class="sumTable"><table class="tables"><thead><tr>'+['범위','전략번호 묶음','실천과제','총사업비(억원)','국비(억원)','금액 미집계(총사업비 · 국비)'].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+pairs.map(([label,g])=>{
   const value=k=>{const known=g.filter(p=>p[k]!=null),sum=known.reduce((s,p)=>s+p[k],0),limit=Math.max(1,...pairs.map(([,v])=>v.reduce((s,p)=>s+(p[k]||0),0)));return button(known.length?fmt(sum):'미기재',known)+'<span class="sumBar" style="width:'+100*sum/limit+'%"></span>';};
   const missing=k=>g.filter(p=>p[k]==null);return '<tr><td>'+esc(label)+'</td><td>'+new Set(g.filter(p=>p.strategy).map(p=>p.region+'|'+p.category+'|'+p.strategy)).size+'</td><td>'+button(fmt(g.length),g)+'<div class="sumBar" style="width:'+Math.max(0,100*g.length/max)+'%"></div></td><td>'+value('whole')+'</td><td>'+value('national')+'</td><td>'+button(missing('whole').length,missing('whole'))+' · '+button(missing('national').length,missing('national'))+'</td></tr>';}).join('')+'</tbody></table></div>';
 }
 function breakdown(g){return section('부처·기관별 국비', '<p>사업 수는 요약서에 기재된 각 기관에 연결하고, 금액은 첫 표기 기관에 한 번 귀속합니다.</p>'+table([...new Set(g.flatMap(p=>p.agency))].sort().map(k=>[k+' (연결 '+g.filter(p=>p.agency.includes(k)).length+'건)',g.filter(p=>p.agency[0]===k)])));}
 function render(){selections=[];const [route='overview',raw='']=location.hash.slice(1).split('/'),r=config.regions.find(k=>k===decodeURIComponent(raw))||config.regions[0],g=all.filter(p=>p.region===r);
 const tabs='<p class="sumTabs">'+config.regions.map(k=>'<a class="tag" href="#'+route+'/'+encodeURIComponent(k)+'">'+esc(k)+'</a>').join(' ')+'</p>';
 const reg=config.regions.map(k=>[k,all.filter(p=>p.region===k)]);
 let body='',title='';
 if(route==='regions'){title=r+' 현황';body=tabs+section('분야별 실천과제',table([['전체',g],...groups(g,'category')]))+section('광역 SOC 분리',table([['광역 SOC',g.filter(p=>p.soc)],['그 외 사업',g.filter(p=>!p.soc)]]))+breakdown(g);}
 else if(route==='economy'){title=r+' 성장엔진';const econ=g.filter(p=>p.economic);body=tabs+section('경제권 지원 유형',table(groups(econ,'economic')))+section('성장엔진별 연결',table(groups(econ,'engine')))+section('기존 주력산업과 성장엔진',table(groups(econ,'axis')))+section('지역 고용 비중','<p>2024년 전국사업체조사 · 권역 전체 종사자 대비 비중. 산업 대분류와 제조업 세부 업종은 겹칠 수 있습니다.</p>'+data[r].jobs.map(([name,pct])=>'<p>'+esc(name)+'　'+fmt(pct)+'%<span class="sumBar" style="width:'+pct+'%"></span></p>').join(''));}
 else if(route==='living'){title=r+' 정주여건';const life=g.filter(p=>p.category==='생활권');body=tabs+section('정주여건 유형 · 광역 SOC 별도',table(groups(life.filter(p=>!p.soc),'living')))+section('생활권 예산 비교',table([['생활권 전체',life],['철도 제외',life.filter(p=>!p.rail)],['광역 SOC 제외',life.filter(p=>!p.soc)],['대중교통 (트램 포함)',life.filter(p=>p.public)]]));}
 else if(route==='rail'){title='권역별 광역 SOC';body=section('권역 비교',table(reg.map(([k,v])=>[k,v.filter(p=>p.soc)])))+tabs+section(r+' 사업 유형',table([['광역 SOC 전체',g.filter(p=>p.soc)],['철도망',g.filter(p=>p.rail)],['도로·공항 등',g.filter(p=>p.soc&&!p.rail)],['철도와 대중교통에 함께 표시',g.filter(p=>p.rail&&p.public)]]))+section('요약서의 추진 단계 문구',table(groups(g.filter(p=>p.soc),'stage')));}
 else if(route==='search'){title='사업 검색';body=section('실천과제 찾기','<label>사업명·권역·과제번호·부처 <input id="lookup" type="search"></label><p id="hits"></p>');}
 else if(route==='method'){title='집계 기준';body=section('자료와 단위','<p>7개 권역 붙임4 요약서의 실천과제 행을 집계했습니다. 전략사업명이 없는 경우 과제번호 첫 자리를 같은 권역·분야 안에서 묶었습니다. 번호가 없는 행은 묶음 수에서 제외합니다.</p><p>총사업비와 국비는 요약서의 억원 표기를 읽습니다. 국비는 사업기간 기준이며 2027~2032년으로 환산하지 않습니다. 글자 겹치기 재원 표시를 복원했습니다. 총액을 넘는 국비, 잘못된 숫자, 기획비만 기재된 총액 등은 보류합니다. 비예산·미기재와 보류는 합계에서 제외합니다.</p><p>성장엔진과 정주여건은 제출 분야를 유지하고 사업명·요약 내용으로 분류했습니다. 광역 SOC는 생활권 사업명에서 철도망·광역도로·공항 등 시설 사업을 식별합니다. 기추진과 신규는 요약서에 해당 문구가 있을 때만 구분합니다.</p>')+section('국비 확인 상태',table(groups(all,'nationalStatus')))+section('총사업비 확인 상태',table(groups(all,'wholeStatus')));}
 else{title='전국 발전계획 개요';body=section('권역별 성장엔진','<img alt="7개 권역 시도 경계" src="korea-regions.svg" style="max-width:min(440px,100%);display:block">'+config.regions.map(k=>'<p><a href="#regions/'+encodeURIComponent(k)+'">'+esc(k)+'</a>　'+esc(config.engines[k].join(' · '))+'</p>').join(''))+section('전국 현황',table([['전국',all],...groups(all,'category')]))+section('7개 권역 비교',table(reg))+breakdown(all);}
 main.innerHTML='<h1>'+esc(title)+'</h1><p>붙임4 실천과제 요약서 기준 · 금액은 억원 · 수치 선택 시 사업 목록</p>'+body;
 if(route==='search'){const input=main.querySelector('#lookup');const show=()=>{const words=input.value.trim().toLowerCase().split(/\s+/).filter(Boolean),hits=all.filter(p=>words.every(w=>[p.title,p.region,p.category,p.code,...p.agency,p.engine,...p.sectors].join(' ').toLowerCase().includes(w)));main.querySelector('#hits').innerHTML=button(fmt(hits.length)+'건 열기',hits);};input.oninput=show;show();}
 }
 window.addEventListener('hashchange',render);render();
}

