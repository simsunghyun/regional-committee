const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => n==null?'미기재':n.toLocaleString('ko-KR',{maximumFractionDigits:3});
function table(headers,rows){
 return '<table class="tables"><thead><tr>'+headers.map(h=>'<th>'+escape(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((v,i)=>'<td data-label="'+escape(headers[i])+'">'+escape(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
}
function totals(groups){
 return table(['범위','전략사업','실천과제','철도망','총사업비 포함 / 제외','국비 포함 / 제외','금액 제외 건수 총사업비 / 국비'],Object.entries(groups).map(([name,v])=>[name,v.s,v.n,v.rail,fmt(v.whole[0])+' / '+fmt(v.wholeEx[0]),fmt(v.national[0])+' / '+fmt(v.nationalEx[0]),v.whole[1]+' / '+v.national[1]]));
}
function block(title,body){return '<section class="card"><h2>'+escape(title)+'</h2>'+body+'</section>';}
export function start(data,config){
 const main=document.querySelector('#main');
 function render(){
  const [path,raw]=location.hash.slice(1).split('/');
  const region=config.regions.find(r=>encodeURIComponent(r)===raw||r===raw)||config.regions[0];
  const scoped=data[region];
  const tabs='<nav aria-label="권역 선택">'+config.regions.map(r=>'<a class="tag" href="#'+path+'/'+encodeURIComponent(r)+'">'+escape(r)+'</a>').join(' ')+'</nav>';
  let content,title;
  if(path==='regions'){
   title=region+' 현황';content=tabs+block('권역 및 분야별 집계',totals({전체:scoped.total,...scoped.categories}))+block('기재 부처·기관',table(['기관','연결 과제','첫 표기 과제','첫 표기 국비(억원)'],Object.entries(scoped.agencies).sort((a,b)=>(b[1].first.national[0]||0)-(a[1].first.national[0]||0)).map(([k,v])=>[k,v.connected,v.first.n,fmt(v.first.national[0])])));
  }else if(path==='economy'){
   title=region+' 성장엔진';content=tabs+block('지원 유형',totals(scoped.economy))+block('권역 성장엔진',totals(scoped.engines))+block('적용 산업 · 복수 분야 중복 가능',totals(scoped.applications));
  }else if(path==='living'){
   title=region+' 정주여건';content=tabs+block('생활권 집계',totals({전체:scoped.categories['생활권'],...scoped.living}))+block('철도망 집계 기준','<p>트램은 대중교통에도 포함됩니다. 철도망 수와 전체 합계는 과제번호를 기준으로 집계했습니다.</p>');
  }else if(path==='method'){
   title='집계 기준';content=block('사업 수와 예산','<p>전략사업은 범위별 상위 제목의 고유값, 실천과제는 과제 수입니다. 총사업비는 전체 기간, 국비 요구액은 2027~2032년 금액입니다. 단위는 억원입니다. 양수인 기재 금액만 합산하며 보류와 0 표기는 제외합니다. 부처·기관 연결 건수는 중복될 수 있고 국비는 첫 표기 기관에 한 번 귀속합니다.</p>');
  }else{
   title='권역별 발전계획 분석 결과';content=block('전국 현황',totals({전국:data['전국'].total,...data['전국'].categories}))+block('7개 권역 비교',totals(Object.fromEntries(config.regions.map(r=>[r,data[r].total]))));
  }
  main.innerHTML='<h1>'+escape(title)+'</h1><p>등록 위원 열람용 · 금액 단위 억원 · 철도 포함 / 제외</p>'+content;
 }
 window.addEventListener('hashchange',render);render();
}
