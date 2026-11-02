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
 const badge=p=>p.errors?.length?'<strong style="color:#922f22">[오류]</strong> ':'';function list(rows){dialog.innerHTML='<button data-close>닫기</button><h2>실천과제 '+fmt(rows.length)+'건</h2>'+rows.map(p=>'<p><button class="sumPick" data-id="'+esc(p.key)+'">'+badge(p)+esc(p.title)+'</button><br><small>'+esc(p.region+' · '+p.category+' · '+(p.code||'번호 미기재'))+'</small></p>').join('');if(!dialog.open)dialog.showModal();}
 let previous=[];
 main.onclick=e=>{const b=e.target.closest('[data-group]');if(b){previous=selections[Number(b.dataset.group)];list(previous);}};
 dialog.onclick=e=>{if(e.target.closest('[data-close]'))dialog.close();else if(e.target.closest('[data-back]'))list(previous);else{const b=e.target.closest('[data-id]');if(!b)return;const p=all.find(x=>x.key===b.dataset.id);dialog.innerHTML='<button data-close>닫기</button> <button data-back>목록으로</button><h2>'+badge(p)+esc(p.title)+'</h2><p>'+esc(p.region+' · '+p.category+' · '+(p.code||'번호 미기재'))+'</p>'+(p.errors?.length?'<h3>오류 사유</h3><ul>'+p.errors.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul>'+(p.amountText?'<p>요약서 예산 표기 · '+esc(p.amountText)+'</p>':''):'')+'<p>'+esc(p.about||'사업내용 미기재')+'</p><dl>'+Object.entries({'사업 기간':p.period,'요약서 기재 기관':p.agencyRaw||'미기재','총사업비(억원)':p.whole==null?p.wholeStatus:fmt(p.whole)+(p.wholeStatus==='기재'?'':' · '+p.wholeStatus),'국비(억원)':p.national==null?p.nationalStatus:fmt(p.national),'지원 유형 또는 정주여건':p.economic||p.living,'성장엔진':p.engine,'기존 산업':p.existing.join(' · ')||'연결 미확인'}).map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl>'; }};
 function table(pairs){
  const max=Math.max(1,...pairs.map(([,g])=>g.length));return '<div class="sumTable"><table class="tables"><thead><tr>'+['범위','상위 과제번호 수','실천과제 수','총사업비(억원)','국비(억원)','총사업비 미집계(건)','국비 미집계(건)'].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+pairs.map(([label,g])=>{
   const value=k=>{const known=g.filter(p=>p[k]!=null),sum=known.reduce((s,p)=>s+p[k],0),limit=Math.max(1,...pairs.map(([,v])=>v.reduce((s,p)=>s+(p[k]||0),0)));return button(known.length?fmt(sum):'미기재',known)+'<span class="sumBar" style="width:'+100*sum/limit+'%"></span>';};
   const missing=k=>g.filter(p=>p[k]==null);return '<tr><td>'+esc(label)+'</td><td>'+new Set(g.filter(p=>p.strategy).map(p=>p.region+'|'+p.category+'|'+p.strategy)).size+'</td><td>'+button(fmt(g.length),g)+'<div class="sumBar" style="width:'+Math.max(0,100*g.length/max)+'%"></div></td><td>'+value('whole')+'</td><td>'+value('national')+'</td><td>'+button(missing('whole').length,missing('whole'))+'</td><td>'+button(missing('national').length,missing('national'))+'</td></tr>';}).join('')+'</tbody></table></div>';
 }
 function breakdown(g){
  const headers=['요약서 기재 기관','참여 과제 수','첫 번째로 기재된 과제 수','첫 표기 과제 총사업비(억원)','첫 표기 과제 국비(억원)'];
  const rows=[...new Set(g.flatMap(p=>p.agency))].sort().map(k=>{
   const linked=g.filter(p=>p.agency.includes(k)),first=linked.filter(p=>p.agency[0]===k);
   const money=key=>{const known=first.filter(p=>p[key]!=null);return button(known.length?fmt(known.reduce((s,p)=>s+p[key],0)):'미기재',known);};
   return '<tr><td>'+esc(k)+'</td><td>'+button(linked.length,linked)+'</td><td>'+button(first.length,first)+'</td><td>'+money('whole')+'</td><td>'+money('national')+'</td></tr>';
  });
  return section('부처·기관별 참여 과제와 예산','<p>참여 과제 수는 요약서에 해당 기관 이름이 나온 과제 수입니다. 여러 기관이 기재된 과제는 각 기관의 참여 건수에 포함하고, 예산은 첫 번째 기관에 한 번만 합산합니다.</p><table class="tables"><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table>');
 }
 function issueLabel(s){
  if(s.includes('과제번호'))return '과제번호 중복';
  if(s.includes('사업명이 반복'))return '사업명·내용 불일치';
  if(s.includes('보다 큽니다'))return '국비가 총사업비 초과';
  if(s.includes('기재 총사업비')&&s.includes('다릅니다'))return '재원 합계 불일치';
  if(s.includes('금액 뒤'))return '국비 표기 위치 불명확';
  return '금액 표기 불명확';
 }
 function errorRows(rows){return rows.map(p=>'<article><small>'+esc(p.region+' · '+p.category+' · '+(p.code||'번호 미기재'))+'</small><h3>'+esc(p.title)+'</h3>'+p.errors.map(reason=>'<p><strong>'+esc(issueLabel(reason))+'</strong><br>'+esc(reason)+'</p>').join('')+'</article>').join('<hr>');}
 function keyFigures(rows){
  const metric=(name,value,subset,unit)=>'<div><small>'+name+'</small><strong>'+button(fmt(value),subset)+'</strong><span>'+unit+'</span></div>';
  const money=(k,label)=>{const known=rows.filter(p=>p[k]!=null);return metric(label,known.length?known.reduce((v,p)=>v+p[k],0):null,known,'억원');};
  return '<div class="keyFigures">'+metric('실천과제',rows.length,rows,'건')+money('whole','원문 기재 총사업비')+money('national','원문 기재 국비')+'</div>';
 }
 function comparison(pairs){
  const values=pairs.map(([name,g])=>{const known=g.filter(p=>p.national!=null);return {name,known,sum:known.reduce((a,p)=>a+p.national,0)};});
  const max=Math.max(1,...values.map(v=>v.sum));
  return '<figure class="compareFigure"><figcaption>국비 규모 비교 <small>요약서 기재 금액 · 억원</small></figcaption>'+values.map(({name,known,sum})=>'<div class="compareRow"><span>'+esc(name)+'</span><i><b style="width:'+100*sum/max+'%"></b></i>'+button(known.length?fmt(sum):'미기재',known)+'</div>').join('')+'</figure>';
 }
 function regionalDetails(pairs,renderGroup){
  return pairs.map(([name,rows])=>'<details><summary>'+esc(name)+' · '+fmt(rows.length)+'건</summary>'+renderGroup(rows)+'</details>').join('');
 }
 function shareTable(pairs){
  const total=(rows,key)=>rows.reduce((v,p)=>v+(p[key]??0),0);
  const headers=['권역','실천과제 수 비중','총사업비 비중','국비요구액 비중','총사업비(광역SOC 제외)','국비요구액(광역SOC 제외)'];
  const cells=pairs.map(([region,rows])=>{
   const net=rows.filter(p=>!p.soc);
   const share=k=>{const known=rows.filter(p=>p[k]!=null);return button(known.length?fmt(100*total(rows,k)/total(all,k))+'%':'미기재',known);};
   const amount=k=>{const known=net.filter(p=>p[k]!=null);return button(known.length?fmt(total(known,k)):'미기재',known);};
   return [esc(region),button(fmt(100*rows.length/all.length)+'%',rows),share('whole'),share('national'),amount('whole'),amount('national')];
  });
  return '<p>비중은 광역SOC를 포함한 전국 합계 대비 권역의 비율입니다. 오른쪽 두 열은 광역SOC 과제를 제외한 기재 금액입니다. 금액 단위는 억원입니다.</p>'+overviewTable(headers,cells);
 }
 function overviewTable(headers,rows){
  return '<table class="tables"><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 }
 function areaWording(p){
  const text=p.about||'';
  if(/(?:권역|도내|도|시·도|제주|강원|전북|부울경)\s*(?:전역|전체|전 지역)/.test(text))return '전역·전체 표현';
  if(/(?:사업\s*위치|대상\s*지역|공간적?\s*범위)\s*[:：]|\(위치\)/.test(text))return '위치·대상 지역 명시';
  return '해당 표현 미확인';
 }
 function overviewBlocks(reg){
  const axes={'양쪽 연결':'고용 상위 업종과 성장엔진 모두 해당','기존 산업만':'고용 상위 업종만 해당','성장엔진만':'성장엔진만 해당','양쪽 미확인':'두 기준 모두 미확인'};
  const soc=all.filter(p=>p.soc);
  return section('권역별 발전전략 총 사업 수와 예산 비중',shareTable(reg))
   +section('기 발표된 성장엔진과 권역별 발전전략 과제 연계성 비교','<p>경제권 실천과제의 요약서에서 해당 권역의 성장엔진과 고용 상위 업종에 관련된 문구를 각각 확인했습니다.</p>'+regionalDetails(reg,rows=>table(groups(rows.filter(p=>p.economic),'axis').map(([k,v])=>[axes[k]||k,v]))))
   +section('권역별 전략과제·실천과제 수 및 예산 비교','<p>전략과제 수는 같은 권역·범주의 과제번호 첫 구간을 기준으로 셌습니다. 번호가 없는 실천과제도 실천과제 수에는 포함합니다.</p>'+comparison(reg)+table(reg))
   +section('참고) 권역별 기존 산업 고용 비중 1위 업종 비교','<p>2024년 전국사업체조사 기준, 권역 전체 종사자 중 해당 산업 대분류 종사자의 비중입니다.</p>'+overviewTable(['권역','고용 비중 1위 업종','권역 종사자 대비 비중'],reg.map(([region])=>{const top=data[region].jobs[0];return [esc(region),esc(top[0]),fmt(top[1])+'%'];})))
   +section('권역별 경제권·생활권·행재정 범주별 과제·예산 비교',regionalDetails(reg,rows=>table(groups(rows,'category'))))
   +section('권역별 부처·기관별 국비 요구액 비교',regionalDetails(reg,rows=>breakdown(rows)))
   +section('범주별 소관 부처·기관 및 예산 상세 보기',regionalDetails(reg,rows=>regionalDetails(groups(rows,'category'),subset=>breakdown(subset))))
   +section('권역별 사업의 공간 범위 비교','<p>위원 화면에 등록된 사업 요약에서 권역 전역·전체 표현이나 위치·대상 지역의 명시 여부를 비교합니다. 전역 표현은 사업 효과에 대한 설명도 포함할 수 있어 실제 시행 지역과 다를 수 있습니다. 해당 표현이 없는 과제는 미확인으로 표시합니다.</p>'+regionalDetails(reg,rows=>table(['전역·전체 표현','위치·대상 지역 명시','해당 표현 미확인'].map(k=>[k,rows.filter(p=>areaWording(p)===k)]))))
   +section('광역SOC 사업 별도 분류',table([['전체 실천과제',all],['광역SOC 사업',soc],['광역SOC 제외 사업',all.filter(p=>!p.soc)]]))
   +section('권역별 광역SOC 사업 비교',comparison(reg.map(([k,v])=>[k,v.filter(p=>p.soc)]))+table(reg.map(([k,v])=>[k,v.filter(p=>p.soc)])));
 }
 function render(){selections=[];const [route='overview',raw='']=location.hash.slice(1).split('/'),r=config.regions.find(k=>k===decodeURIComponent(raw))||config.regions[0],g=all.filter(p=>p.region===r);
 const tabs='<p class="sumTabs">'+config.regions.map(k=>'<a class="tag" href="#'+route+'/'+encodeURIComponent(k)+'">'+esc(k)+'</a>').join(' ')+'</p>';
 const reg=config.regions.map(k=>[k,all.filter(p=>p.region===k)]);
 let body='',title='';
 if(route==='regions'){title=r+' 현황';body=tabs+section('경제권·생활권·행재정별 사업 수와 예산',comparison(groups(g,'category'))+table([['전체',g],...groups(g,'category')]))+section('광역 SOC와 그 외 사업 비교',table([['광역 SOC',g.filter(p=>p.soc)],['그 외 사업',g.filter(p=>!p.soc)]]))+breakdown(g);}
 else if(route==='economy'){title=r+' 성장엔진';const econ=g.filter(p=>p.economic);body=tabs+section('경제권 사업의 주된 지원 유형',table(groups(econ,'economic')))+section('경제권 사업의 성장엔진별 분포',table(groups(econ,'engine')))+section('경제권 사업과 지역 고용 상위 업종·성장엔진의 관련성','<p>각 과제의 요약서에서 지역 고용 상위 업종과 성장엔진에 해당하는 문구를 각각 확인했습니다. 두 기준에 모두 해당해도 두 산업 분야가 서로 같다는 뜻은 아닙니다.</p>'+table(groups(econ,'axis').map(([k,v])=>[({'양쪽 연결':'고용 상위 업종과 성장엔진 모두 해당','기존 산업만':'고용 상위 업종만 해당','성장엔진만':'성장엔진만 해당','양쪽 미확인':'두 기준 모두 관련 문구 미확인'})[k]||k,v])))+section('권역 종사자 비중 상위 업종','<p>2024년 전국사업체조사 · 권역 전체 종사자 대비 비중. 산업 대분류와 제조업 세부 업종을 각각 상위 5개까지 표시합니다. 제조업 세부 업종은 대분류 제조업에도 포함됩니다.</p>'+data[r].jobs.map(([name,pct])=>'<p>'+esc(name)+'　'+fmt(pct)+'%<span class="sumBar" style="width:'+pct+'%"></span></p>').join(''));}
 else if(route==='living'){title=r+' 정주여건';const life=g.filter(p=>p.category==='생활권');body=tabs+section('광역 SOC를 제외한 생활권 사업의 정주여건 유형',table(groups(life.filter(p=>!p.soc),'living')))+section('생활권 사업 수와 예산 · 집계 대상별 비교','<p>같은 생활권 과제를 서로 다른 조건으로 조회한 값입니다. 각 행에는 같은 과제가 다시 포함될 수 있습니다.</p>'+table([['생활권 전체',life],['철도 제외',life.filter(p=>!p.rail)],['광역 SOC 제외',life.filter(p=>!p.soc)],['대중교통 (트램 포함)',life.filter(p=>p.public)]]));}
 else if(route==='rail'){title='권역별 광역 SOC';body=section('7개 권역의 광역 SOC 사업 수와 예산',table(reg.map(([k,v])=>[k,v.filter(p=>p.soc)])))+tabs+section(r+' 광역 SOC 사업 유형','<p>마지막 행은 철도망과 대중교통에 모두 해당하는 과제입니다. 광역 SOC 전체에는 한 번만 집계합니다.</p>'+table([['광역 SOC 전체',g.filter(p=>p.soc)],['철도망',g.filter(p=>p.rail)],['도로·공항 등',g.filter(p=>p.soc&&!p.rail)],['철도망 중 대중교통에도 해당',g.filter(p=>p.rail&&p.public)]]))+section('광역 SOC 요약서의 추진 단계 표기','<p>착공·공사 중 등 기추진 문구, 신규 반영 문구, 표기 미확인으로 구분했습니다.</p>'+table(groups(g.filter(p=>p.soc),'stage')));}
 else if(route==='errors'){title='오류 과제';body='';}
 else if(route==='search'){title='사업 검색';body=section('실천과제 찾기','<label>사업명·권역·분야·과제번호·기관·성장엔진 등으로 검색 <input id="lookup" type="search"></label><p id="hits"></p>');}
 else if(route==='method'){title='집계 기준';body=section('자료와 단위','<p>7개 권역 붙임4 요약서의 실천과제 행을 집계했습니다. ‘상위 과제번호 수’는 같은 권역·분야에서 과제번호의 첫 구간이 같은 과제를 한 묶음으로 센 값입니다. 예를 들어 1-2-3과 1-4-1은 한 묶음입니다. 번호가 없는 과제도 실천과제 수에는 포함합니다.</p><p>총사업비와 국비는 요약서의 억원 표기를 읽습니다. 국비는 사업기간 기준이며 2027~2032년으로 환산하지 않습니다. 글자 겹치기 재원 표시를 복원했습니다. 총액을 넘는 국비도 원문 기재 합계에 포함합니다. 하한·잠정·부지조성비는 기재 성격을 표시합니다. 숫자를 확정할 수 없는 값이나 선행기획비만 적힌 사업 총액은 보류합니다. 비예산·미기재와 보류는 합계에서 제외합니다.</p><p>성장엔진과 정주여건은 제출 분야를 유지하고 사업명·요약 내용으로 분류했습니다. 광역 SOC는 생활권 사업명에서 철도망·광역도로·공항 등 시설 사업을 식별합니다. 기추진과 신규는 요약서에 해당 문구가 있을 때만 구분합니다.</p>')+section('국비 기재 상태별 사업 수와 예산',table(groups(all,'nationalStatus')))+section('총사업비 기재 상태별 사업 수와 예산',table(groups(all,'wholeStatus')));}
 else{title='전국 발전계획 개요';body=section('권역별 성장엔진 지도','<div class="atlasGrid"><div class="atlasMap">'+document.querySelector('#atlas').innerHTML+'</div><div class="atlasKey">'+config.regions.map(k=>'<a href="#regions/'+encodeURIComponent(k)+'"><strong>'+esc(k)+'</strong><span>'+esc(config.engines[k].join(' · '))+'</span></a>').join('')+'</div></div>')+overviewBlocks(reg);}
 if(route==='errors'){const scope=all; const exceptions=scope.filter(p=>p.errors?.length);const nums=k=>{const known=scope.filter(p=>p[k]!=null),reviewed=known.filter(p=>!(p.errorAmountFields||[]).includes(k));return '<p>'+esc(k==='national'?'국비':'총사업비')+'　원문 기재 합계 '+button(fmt(known.reduce((s,p)=>s+p[k],0))+'억원',known)+' · 해당 항목의 금액 오류분을 뺀 합계 '+button(fmt(reviewed.reduce((s,p)=>s+p[k],0))+'억원',reviewed)+'</p>';};body=section('전국 기재 금액 합계와 오류 과제 목록',button('오류 과제 '+exceptions.length+'건',exceptions)+nums('whole')+nums('national')+'<p>번호·사업명 오류는 예산에서 차감하지 않습니다. 재원 합계 불일치는 비교 합계에서 양쪽 금액을, 국비가 총사업비보다 크면 국비만 제외합니다.</p>')+section('과제별 오류 사유 · '+exceptions.length+'건',errorRows(exceptions));}
 main.innerHTML='<h1>'+esc(title)+'</h1><p>붙임4 실천과제 요약서 기준 · 금액은 억원 · 밑줄이 있는 수치를 누르면 해당 사업 목록이 열립니다</p>'+body;
 if(route==='regions'||!route||route==='overview')main.querySelector('h1').insertAdjacentHTML('afterend',keyFigures(route==='regions'?g:all));
 for(const t of main.querySelectorAll('table')){const labels=[...t.querySelectorAll('thead th')].map(th=>th.textContent);for(const row of t.querySelectorAll('tbody tr'))[...row.cells].forEach((cell,i)=>cell.dataset.label=labels[i]||'');}
 for(const a of document.querySelectorAll('#navigation a,.sumTabs a')){const current=a.hash===location.hash||(a.closest('#navigation')&&a.hash==='#'+(route||'overview'));if(current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
 if(route==='search'){const input=main.querySelector('#lookup');const show=()=>{const words=input.value.trim().toLowerCase().split(/\s+/).filter(Boolean),hits=all.filter(p=>words.every(w=>[p.title,p.region,p.category,p.code,...p.agency,p.engine,...p.sectors,...(p.errors?.length?['오류',...p.errors]:[])].join(' ').toLowerCase().includes(w)));main.querySelector('#hits').innerHTML=button(fmt(hits.length)+'건 열기',hits);};input.oninput=show;show();}
 }
 window.addEventListener('hashchange',render);render();
}



