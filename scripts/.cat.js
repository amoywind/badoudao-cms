const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
(async () => {
  const port = 9988;
  const proc = spawn(EDGE, ['--headless=new','--disable-gpu','--hide-scrollbars','--no-sandbox',
    `--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'ct'+port)}`],{stdio:'ignore'});
  let wsUrl;
  for (let i=0;i<40;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/list`);const l=await r.json();const p=l.find(t=>t.type==='page');if(p?.webSocketDebuggerUrl){wsUrl=p.webSocketDebuggerUrl;break;}}catch{}await new Promise(r=>setTimeout(r,400));}
  const ws=new WebSocket(wsUrl);await new Promise((res,rej)=>{ws.on('open',res);ws.on('error',rej);});
  let id=0;const send=(m,p)=>new Promise((res,rej)=>{const hh=(raw)=>{const m2=JSON.parse(raw.toString());if(m2.id===id){ws.off('message',hh);m2.error?rej(new Error(m2.error.message)):res(m2.result);}};ws.on('message',hh);ws.send(JSON.stringify({id:++id,method:m,params:p}));});
  const ev=async e=>(await send('Runtime.evaluate',{expression:e,returnByValue:true})).result?.value;
  await send('Page.enable',{});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});

  // 首页：导航下拉里的分类
  await send('Page.navigate',{url:'https://oemwallclocks.com/?v='+Date.now()});
  await new Promise(r=>setTimeout(r,6000));
  const drop = await ev(`(function(){
    var items=[].slice.call(document.querySelectorAll('.navdrop-item'));
    var g=document.querySelector('.drop-grid');
    return JSON.stringify({
      n: items.length,
      names: items.map(function(i){return i.querySelector('.navdrop-name').innerText;}),
      cols: g?getComputedStyle(g).gridTemplateColumns:null,
      descLens: items.map(function(i){var d=i.querySelector('.navdrop-desc');return d?d.innerText.length:0;})
    });
  })()`);
  console.log('导航下拉:', drop);

  // 侧栏
  await send('Page.navigate',{url:'https://oemwallclocks.com/products?tab=all&v='+Date.now()});
  await new Promise(r=>setTimeout(r,6000));
  const rail = await ev(`(function(){
    var links=[].slice.call(document.querySelectorAll('.rail-link'));
    return JSON.stringify({
      n: links.length,
      names: links.map(function(l){return l.innerText.replace(/\\s+/g,' ').trim();})
    });
  })()`);
  console.log('分类侧栏:', rail);

  // 新分类页
  await send('Page.navigate',{url:'https://oemwallclocks.com/products/marble-wall-clocks?v='+Date.now()});
  await new Promise(r=>setTimeout(r,6000));
  const page = await ev(`(function(){
    var h1=document.querySelector('h1');
    var desc=document.querySelector('.cat-desc, .coll p');
    var empty=document.querySelector('.rail-empty');
    var m=document.querySelector('meta[name=description]');
    var t=document.querySelector('title');
    return JSON.stringify({
      h1: h1?h1.innerText:null,
      title: t?t.innerText:null,
      metaDesc: m?m.content:null,
      empty: empty?empty.innerText.replace(/\\s+/g,' ').trim().slice(0,90):null,
      pcard: document.querySelectorAll('.pcard').length
    });
  })()`);
  console.log('大理石分类页:', page);

  ws.close();try{process.kill(proc.pid);}catch{};process.exit(0);
})();
