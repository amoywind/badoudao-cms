const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'https://www.oemwallclocks.com/products/resin-wall-clocks/modern-resin-wall-clock-with-3d-numerals?v=' + Date.now();
(async () => {
  const port = 9963, w = Number(process.argv[2]||1440);
  const proc = spawn(EDGE, ['--headless=new','--disable-gpu','--hide-scrollbars','--no-sandbox',
    `--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'pd'+port)}`],{stdio:'ignore'});
  let wsUrl;
  for (let i=0;i<40;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/list`);const l=await r.json();const p=l.find(t=>t.type==='page');if(p?.webSocketDebuggerUrl){wsUrl=p.webSocketDebuggerUrl;break;}}catch{}await new Promise(r=>setTimeout(r,400));}
  const ws=new WebSocket(wsUrl);await new Promise((res,rej)=>{ws.on('open',res);ws.on('error',rej);});
  let id=0;const send=(m,p)=>new Promise((res,rej)=>{const hh=(raw)=>{const m2=JSON.parse(raw.toString());if(m2.id===id){ws.off('message',hh);m2.error?rej(new Error(m2.error.message)):res(m2.result);}};ws.on('message',hh);ws.send(JSON.stringify({id:++id,method:m,params:p}));});
  const ev=async e=>(await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
  await send('Page.enable',{});
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:900,deviceScaleFactor:1,mobile:w<500});
  await send('Page.navigate',{url:URL});
  await new Promise(r=>setTimeout(r,8000));
  console.log('W=' + w);
  console.log(await ev(`(function(){
    function H(sel){ var e=document.querySelector(sel); return e?Math.round(e.getBoundingClientRect().height):null; }
    var mb=document.querySelector('.mbar');
    var r=mb?mb.getBoundingClientRect():null;
    return JSON.stringify({
      pdInfoH: H('.pd-info'),
      galleryH: H('.pd-gallery-area'),
      descH: H('.pd-desc-area'),
      pdH: H('.pd'),
      mbar: mb?{pos:getComputedStyle(mb).position, z:getComputedStyle(mb).zIndex,
                 w:Math.round(r.width), h:Math.round(r.height), display:getComputedStyle(mb).display}:null,
      headerH: H('.site-header')
    });
  })()`));
  ws.close();try{process.kill(proc.pid);}catch{};process.exit(0);
})();
