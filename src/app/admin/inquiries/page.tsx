'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Toast, useToast } from '../_ui';

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: '新询盘', cls: 'pl-b' },
  contacted: { label: '已联系', cls: 'pl-n' },
  quoted: { label: '已报价', cls: 'pl-y' },
  negotiating: { label: '谈判中', cls: 'pl-y' },
  won: { label: '成交', cls: 'pl-g' },
  lost: { label: '流失', cls: 'pl-r' }
};

export default function InquiriesPage() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { toast, show } = useToast();

  async function load() {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (search) p.set('q', search);

    const res = await fetch(`/api/inquiries?${p}`);
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    setData(await res.json());
  }

  useEffect(() => {
    load();
  }, [status]);

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [search]);

  async function claim(inq) {
    await fetch('/api/inquiries', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: inq.id, owner: '张伟', status: inq.status === 'new' ? 'contacted' : inq.status })
    });
    show('已认领');
    load();
  }

  if (!data) return <div className="empty"><span className="spin" /></div>;
  const s = data.stats;

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="stat-l">今日新增</div>
          <div className="stat-n">{s.today}</div>
        </div>
        <div className="stat">
          <div className="stat-l">近 7 天</div>
          <div className="stat-n">{s.week}</div>
        </div>
        <div className="stat">
          <div className="stat-l">待跟进</div>
          <div className="stat-n">{s.pending}</div>
        </div>
        <div className="stat">
          <div className="stat-l">近 7 天成交</div>
          <div className="stat-n" style={{ color: s.won ? '#15803d' : undefined }}>{s.won}</div>
        </div>
        <div className="stat">
          <div className="stat-l">超 24h 未回复</div>
          <div className="stat-n" style={{ color: s.stale ? '#b91c1c' : undefined }}>{s.stale}</div>
          {s.stale > 0 && <div className="stat-f alert-c">优先处理</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>询盘管理</h3>
          <span className="sub">{data.inquiries.length} 条</span>
          <div className="r">
            <input className="inp fld" style={{ width: 200 }} placeholder="搜索邮箱 / 公司 / 姓名"
              value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="inp fld" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">全部状态</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button className="btn btn-sm" onClick={load}>刷新</button>
          </div>
        </div>

        <div className="card-b flush">
          {data.inquiries.length === 0 ? (
            <div className="empty">
              <div class="t">还没有询盘</div>
              <p style={{ fontSize: 13 }}>访客在前台提交表单后会出现在这里，同时发邮件到你邮箱</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 130 }}>时间</th>
                  <th>客户</th>
                  <th>国家</th>
                  <th>关注产品</th>
                  <th style={{ textAlign: 'right' }}>数量</th>
                  <th>定制</th>
                  <th>负责人</th>
                  <th>状态</th>
                  <th style={{ width: 110 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.inquiries.map((i) => {
                  const st = STATUS[i.status] || STATUS.new;
                  const hours = (Date.now() - new Date(i.created_at.replace(' ', 'T') + 'Z').getTime()) / 3600000;
                  const late = i.status === 'new' && hours > 24;
                  return (
                    <tr key={i.id} style={late ? { background: '#fffbeb' } : undefined}>
                      <td>
                        <div style={{ fontWeight: late ? 600 : 400 }}>{i.created_at.slice(5, 16)}</div>
                        {late && <div style={{ fontSize: 10.5, color: '#b91c1c', fontWeight: 600 }}>
                          超 {Math.floor(hours)}h
                        </div>}
                      </td>
                      <td>
                        <div className="pname">{i.name || '—'}</div>
                        <div style={{ fontSize: 11, color: '#767f8c' }}>{i.email}</div>
                        {i.company && <div style={{ fontSize: 11, color: '#767f8c' }}>{i.company}</div>}
                      </td>
                      <td style={{ fontSize: 12.5 }}>{i.country || i.country_code || '—'}</td>
                      <td style={{ fontSize: 12.5, maxWidth: 220 }}>
                        {i.products.length ? i.products.slice(0, 2).join(', ') : '—'}
                        {i.products.length > 2 && ` +${i.products.length - 2}`}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 12.5, whiteSpace: 'nowrap' }}>{i.quantity}</td>
                      <td>{i.custom_logo === 'yes'
                        ? <span className="pl pl-y">LOGO</span>
                        : <span className="pl pl-n">标准</span>}</td>
                      <td style={{ fontSize: 12.5 }}>{i.owner || <span style={{ color: '#b45309' }}>未分配</span>}</td>
                      <td><span className={`pl ${st.cls}`}>{st.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <Link href={`/admin/inquiries/${i.id}`} className="btn btn-sm">打开</Link>
                          {!i.owner && <button className="btn btn-sm" onClick={() => claim(i)}>认领</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </>
  );
}