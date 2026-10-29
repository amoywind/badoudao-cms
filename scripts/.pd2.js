const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const fs = require('fs');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'https://www.oemwallclocks.com/products/resin-wall-clocks/modern-resin-wall-clock-with-3d-numerals?v=' + Date.now();
(async () => {
  const port = 9957, w = Number(process.argv[2]||1440);
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

  for (const y of [400, 700, 1000]) {
    console.log('scrollY=' + y + ' → ' + await ev(`(function(){
      window.scrollTo(0, ${y});
      return new Promise(function(res){ setTimeout(function(){
        /* 图片框的中心与四角各取一点，看最上层是谁 */
        var m=document.querySelector('.pd-main');
        var r=m.getBoundingClientRect();
        var pts=[['center',(r.left+r.right)/2,(r.top+r.bottom)/2],
                ['topleft',r.left+30,r.top+30],
                ['botleft',r.left+30,r.bottom-30]];
        var found=pts.map(function(p){
          var el=document.elementFromPoint(p[1],p[2]);
          var inImg=false;
          while(el){ if(el===m||el.closest&&el.closest('.pd-main')) inImg=true; el=el.parentElement; }
          var top=el?String(el.className||el.tagName).slice(0,34):'null';
          return p[0]+'→'+(inImg?'[图片自己]':'[被遮挡!] '+top);
        });
        res(JSON.stringify(found));
      }, 700); });
    })()`));
  }
  ws.close();try{process.kill(proc.pid);}catch{};process.exit(0);
})();
