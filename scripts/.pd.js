const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const fs = require('fs');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'https://www.oemwallclocks.com/products/resin-wall-clocks/modern-resin-wall-clock-with-3d-numerals?v=' + Date.now();
(async () => {
  const port = 9955, w = Number(process.argv[2]||1440);
  const proc = spawn(EDGE, ['--headless=new','--disable-gpu','--hide-scrollbars','--no-sandbox',
    `--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'pd'+port)}`],{stdio:'ignore'});
  let wsUrl;
  for (let i=0;i<40;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/list`);const l=await r.json();const p=l.find(t=>t.type==='page');if(p?.webSocketDebuggerUrl){wsUrl=p.webSocketDebuggerUrl;break;}}catch{}await new Promise(r=>setTimeout(r,400));}
  const ws=new WebSocket(wsUrl);await new Promise((res,rej)=>{ws.on('open',res);ws.on('error',rej);});
  let id=0;const send=(m,p)=>new Promise((res,rej)=>{const hh=(raw)=>{const m2=JSON.parse(raw.toString());if(m2.id===id){ws.off('message',hh);m2.error?rej(new Error(m2.error.message)):res(m2.result);}};ws.on('message',hh);ws.send(JSON.stringify({id:++id,method:m,params:p}));});
  const ev=async(e,aw)=>(await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:aw!==false})).result?.value;
  await send('Page.enable',{});
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:900,deviceScaleFactor:1,mobile:w<500});
  await send('Page.navigate',{url:URL});
  await new Promise(r=>setTimeout(r,8000));

  console.log('W=' + w);
  console.log('所有 fixed/sticky 元素:');
  console.log(await ev(`(function(){
    var out=[];
    [].slice.call(document.querySelectorAll('body *')).forEach(function(el){
      var cs=getComputedStyle(el);
      if(cs.position==='fixed'||cs.position==='sticky'){
        var r=el.getBoundingClientRect();
        out.push({p:cs.position, z:cs.zIndex, top:cs.top,
          cls:String(el.className||'').slice(0,30), tag:el.tagName,
          box:Math.round(r.width)+'x'+Math.round(r.height),
          vis: (r.width>0&&r.height>0)?'yes':'hidden'});
      }
    });
    return JSON.stringify(out);
  })()`));

  for (const y of [0, 600, 1200, 2000]) {
    const r = await ev(`(function(){
      window.scrollTo(0, ${y});
      return new Promise(function(res){ setTimeout(function(){
        var g=document.querySelector('.pd-gallery-area');
        var gr=g.getBoundingClientRect();
        var hits=[];
        [].slice.call(document.querySelectorAll('.pd-info *, .pd-desc *')).forEach(function(el){
          if(el.children.length>0) return;
          var r=el.getBoundingClientRect();
          if(r.width===0||r.height===0) return;
          if(!(r.right<=gr.left||r.left>=gr.right||r.bottom<=gr.top||r.top>=gr.bottom)) return;
          hits.push((el.innerText||'').replace(/\\s+/g,' ').slice(0,30));
        });
        res(JSON.stringify({y:window.scrollY, gTop:Math.round(gr.top), gBot:Math.round(gr.bottom),
          gH:Math.round(gr.height), overlaps:hits.length, sample:hits.slice(0,3)}));
      }, 700); });
    })()`);
    console.log('  ' + r);
  }
  ws.close();try{process.kill(proc.pid);}catch{};process.exit(0);
})();
