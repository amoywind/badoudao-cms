'use client';

import { useEffect, useState } from 'react';
import { Toast, useToast } from '../_ui';

export default function SettingsPage() {
  const [s, setS] = useState(null);
  const {toast, show, dismiss } = useToast();

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => setS(d.settings));
  }, []);

  if (!s) return <div className="empty"><span className="spin" /></div>;

  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));
  const keys = Object.keys(s);

  async function save() {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s)
    });
    const d = await res.json();
    show(res.ok ? '已保存' : d.error, res.ok ? 'ok' : 'err');
  }

  return (
    <>
      <div className="card">
        <div className="card-h">
          <h3>系统设置</h3>
          <div className="r"><button className="btn btn-p btn-sm" onClick={save}>保存全部</button></div>
        </div>
        <div className="card-b">
          <div className="note note-g">
            这里改的信息会显示在前台页脚、联系表单和 Schema 中，改一次全站生效。
          </div>

          <div className="grid2">
            {keys.map((k) => (
              <div className="fg" key={k}>
                <label className="fl">{LABELS[k] || k}</label>
                {/logo|favicon/i.test(k)
                  ? <input className="inp" value={s[k]} onChange={(e) => set(k, e.target.value)} placeholder="图片路径" />
                  : <input className="inp" value={s[k]} onChange={(e) => set(k, e.target.value)} />}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Toast toast={toast} dismiss={dismiss} />
    </>
  );
}

const LABELS: Record<string, string> = {
  siteName: '站点名称',
  siteUrl: '站点网址',
  email: '联系邮箱',
  whatsapp: 'WhatsApp',
  phone: '电话',
  address: '工厂地址',
  capacityMin: '日产能下限',
  capacityMax: '日产能上限',
  moq: '起订量 MOQ',
  quoteHours: '报价响应时长（小时）',
  sampleDays: '打样周期',
  logoLight: 'LOGO（浅底用）',
  logoDark: 'LOGO（深底用）',
  brandColor: '品牌主色',
  accentColor: '辅助色'
};
