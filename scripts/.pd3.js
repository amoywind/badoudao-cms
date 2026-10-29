const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'https://www.oemwallclocks.com/products/resin-wall-clocks/modern-resin-wall-clock-with-3d-numerals?v=' + Date.now();
(async () => {
  const port = 9961, w = Number(process.argv[2]||1440);
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

  for (const y of [0, 700]) {
    console.log('--- scrollY=' + y + ' ---');
    console.log(await ev(`(function(){
      window.scrollTo(0, ${y});
      return new Promise(function(res){ setTimeout(function(){
        var g=document.querySelector('.pd-gallery-area');
        var m=document.querySelector('.pd-main');
        var th=document.querySelector('.pd-thumbs');
        var hd=document.querySelector('.site-header');
        var d2=document.querySelector('.pd-desc-area');
        var d2h=d2?d2.querySelector('h2'):null;
        function R(el){ if(!el) return null; var r=el.getBoundingClientRect();
          return {top:Math.round(r.top), bot:Math.round(r.bottom), left:Math.round(r.left), right:Math.round(r.right), h:Math.round(r.height)}; }
        /* 头盖住图片多少 */
        var gR=R(g), hR=R(hd), mR=R(m);
        var headerCovers = mR && hR ? Math.max(0, Math.min(mR.bot,hR.bot)-Math.max(mR.top,hR.top)) : 0;
        /* 画廊盒是否超出它的 grid 行 */
        var pd=document.querySelector('.pd');
        var rowH = parseFloat(getComputedStyle(pd).gridTemplateRows.split(' ')[0]);
        res(JSON.stringify({
          headerH: hR?hR.h:null,
          gallery: gR, main: mR, thumbs: R(th), descArea: R(d2), descH2: R(d2h),
          row1H: Math.round(rowH),
          galleryExceedsRow: gR? Math.round(gR.h - rowH):null,
          headerCoversImage: Math.round(headerCovers),
          galleryOverlapsDesc: (gR&&d2)? Math.round(Math.min(gR.bot,d2.bot)-Math.max(gR.top,d2.top)) : null
        }));
      }, 800); });
    })()`));
  }
  ws.close();try{process.kill(proc.pid);}catch{};process.exit(0);
})();
