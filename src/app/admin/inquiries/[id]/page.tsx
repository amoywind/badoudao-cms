'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Toast, useToast } from '../../_ui';

const STATUS: Record<string, string> = {
  new: '新询盘', contacted: '已联系', quoted: '已报价',
  negotiating: '谈判中', won: '成交', lost: '流失'
};

/* D1 can hand numbers back as strings; Number() normalises before formatting. */
function money(v) {
  const n = Number(v);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '—';
}

export default function InquiryDetail() {
  const { id } = useParams();
  const router = useRouter();
  const {toast, show, dismiss } = useToast();

  const [d, setD] = useState(null);
  const [note, setNote] = useState('');
  const [owner, setOwner] = useState('');
  const [quote, setQuote] = useState({ qty: '', unitPrice: '', leadTime: '', note: '' });

  async function load() {
    const res = await fetch(`/api/inquiries?id=${encodeURIComponent(Array.isArray(id) ? id[0] : String(id))}`);
    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json().catch(() => ({}));
    /* Default every collection the template below iterates over. Without this,
       a partial payload (e.g. the 404 body) throws on `.length` and React
       blanks the whole page instead of showing the "not found" state. */
    setD({
      inquiry: null,
      quotes: [],
      history: [],
      logs: [],
      attachments: [],
      product: null,
      ...data
    });
    if (data.inquiry) {
      setNote(data.inquiry.owner_note || '');
      setOwner(data.inquiry.owner || '');
      setQuote((q) => ({
        ...q,
        qty: data.inquiry.quantity?.replace(/[^0-9]/g, '') || '',
        unitPrice: data.product?.price_min || '',
        leadTime: data.product?.lead_time || ''
      }));
    }
  }

  useEffect(() => { load(); }, [id]);

  if (!d) return <div className="empty"><span className="spin" /></div>;
  if (!d.inquiry) return <div className="empty"><div className="t">询盘不存在</div></div>;

  const i = d.inquiry;
  const prods = Array.isArray(i.products) ? i.products : [];
  const atts = Array.isArray(d.attachments) ? d.attachments : [];
  /* useParams() gives an array on a catch-all and a string here — always
     normalise before it reaches the API, or the PUT silently writes nothing. */
  const inqId = String(Array.isArray(id) ? id[0] : id ?? i.id);

  async function save(status) {
    await fetch('/api/inquiries', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: inqId, status, owner, ownerNote: note })
    });
    show('已保存');
    load();
  }

  async function addQuote() {
    if (!quote.qty || !quote.unitPrice) { show('请填写数量和单价', 'err'); return; }
    await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inquiryId: inqId, ...quote })
    });
    setQuote({ qty: '', unitPrice: '', leadTime: '', note: '' });
    show('报价已记录');
    load();
  }

  const total = (Number(quote.qty) || 0) * (Number(quote.unitPrice) || 0);

  return (
    <>
      <div className="card">
        <div className="card-h">
          <Link href="/admin/inquiries" className="btn btn-sm">← 返回</Link>
          <h3>{i.name || i.email}</h3>
          <span className="sub">{i.company} · {i.country}</span>
          <div className="r">
            <select className="inp fld" style={{ width: 120 }} value={i.status}
              onChange={(e) => save(e.target.value)}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="stats">
        {Object.entries(STATUS).map(([k, v]) => (
          <div key={k} className="stat" style={{
            cursor: 'pointer',
            borderColor: i.status === k ? '#0f5c4a' : undefined,
            background: i.status === k ? '#e8f2ef' : undefined
          }} onClick={() => save(k)}>
            <div className="stat-l">{v}</div>
            <div className="stat-n" style={{ fontSize: 20 }}>
              {i.status === k ? '●' : ''}
            </div>
          </div>
        ))}
      </div>

      <div className="grid2" style={{ alignItems: 'start' }}>
        <div>
          <div className="card">
            <div className="card-h"><h3>询盘内容</h3>
              <div className="r">
                <a href={`mailto:${i.email}?subject=Re: Your Badoudao enquiry`} className="btn btn-p btn-sm">
                  回复邮件
                </a>
              </div>
            </div>
            <div className="card-b">
              <div className="fg3">
                <div><div className="help">邮箱</div><div className="pname" style={{ fontSize: 13 }}>{i.email}</div></div>
                <div><div className="help">电话</div><div style={{ fontSize: 13 }}>{i.name}</div></div>
                <div><div className="help">数量</div><div style={{ fontSize: 13, fontWeight: 600 }}>{i.quantity}</div></div>
              </div>

              {/* The buyer's configuration, when they filled it in. The
                  row is hidden entirely when there is nothing to show —
                  five rows of em-dashes is noise, and the enquiry that
                  says nothing about the specification is the common case
                  outside a product page. */}
              {(i.spec || i.material || i.movement || i.hands || i.packaging || i.timeline) && (
                <div className="fg" style={{ marginTop: 14 }}>
                  <div className="help">产品规格</div>
                  <div className="fg3" style={{ marginTop: 6 }}>
                    {i.spec && <div><div className="help">配置编码</div><div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{i.spec}</div></div>}
                    {i.material && <div><div className="help">材质</div><div style={{ fontSize: 13 }}>{i.material}</div></div>}
                    {i.movement && <div><div className="help">机芯</div><div style={{ fontSize: 13 }}>{i.movement}</div></div>}
                    {i.hands && <div><div className="help">指针</div><div style={{ fontSize: 13 }}>{i.hands}</div></div>}
                    {i.packaging && <div><div className="help">包装</div><div style={{ fontSize: 13 }}>{i.packaging}</div></div>}
                    {i.timeline && <div><div className="help">交期</div><div style={{ fontSize: 13 }}>{i.timeline}</div></div>}
                  </div>
                </div>
              )}

              <div className="fg2" style={{ marginTop: 14 }}>
                <div><div className="help">来源页面</div><div style={{ fontSize: 12.5 }}>{i.source_page || '—'}</div></div>
                <div><div className="help">提交时间</div><div style={{ fontSize: 12.5 }}>{i.created_at}</div></div>
                <div><div className="help">IP / 国家</div><div style={{ fontSize: 12.5 }}>{i.ip} {i.country_code}</div></div>
                <div><div className="help">来源渠道</div><div style={{ fontSize: 12.5 }}>{i.utm_source || i.referrer || '直接访问'}</div></div>
              </div>

              {prods.length > 0 && (
                <div className="fg">
                  <div className="help">关注产品</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                    {prods.map((p) => <span key={p} className="pl pl-bs">{p}</span>)}
                  </div>
                </div>
              )}

              {/* The flag is set when the drawing is stored, so a row marked
                  has_attachment with nothing in the attachments table means
                  the write failed. Worth saying plainly: the enquiry looks
                  complete but the drawing is not recoverable. The uploads
                  before the storage order was fixed are in this state. */}
              {i.has_attachment === 1 && atts.length === 0 && (
                <div className="note note-w">
                  这条询盘标记为带附件，但文件没有保存下来。
                  如果还需要这份设计图，请让买家重新发送。
                </div>
              )}

              {atts.length > 0 && (
                <div className="fg">
                  <div className="help">附件</div>
                  <div className="att-list">
                    {atts.map((a) => {
                      const isImg = String(a.mime || '').startsWith('image/');
                      return (
                        <a key={a.id} className="att-item" href={a.url} target="_blank" rel="noopener noreferrer">
                          {isImg
                            ? <img src={a.url} alt={a.filename} loading="lazy" />
                            : <span className="att-ico" aria-hidden="true">PDF</span>}
                          <span className="att-meta">
                            <span className="att-name">{a.filename}</span>
                            <span className="att-size">{(Number(a.size) / 1024).toFixed(0)} KB · 点击打开</span>
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="fg">
                <div className="help">客户留言</div>
                <div style={{
                  background: '#fafbfc', borderLeft: '3px solid #0f5c4a', borderRadius: 5,
                  padding: '14px 16px', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                  marginTop: 5, color: '#3d4450'
                }}>
                  {i.message}
                </div>
              </div>

              {d.product && (
                <div className="note note-i">
                  关联产品 <strong>{d.product.name}</strong> ·
                  出厂价 {money(d.product.price_min)}–{money(d.product.price_max)} ·
                  MOQ {d.product.moq} · <Link href={`/admin/products/${d.product.id}`}>编辑产品</Link>
                </div>
              )}
            </div>
          </div>

          {d.history.length > 0 && (
            <div className="card">
              <div className="card-h"><h3>该客户的历史询盘</h3><span className="sub">{d.history.length} 条</span></div>
              <div className="card-b flush">
                <table>
                  <tbody>
                    {d.history.map((h) => (
                      <tr key={h.id}>
                        <td style={{ width: 120 }}>{h.created_at.slice(5, 16)}</td>
                        <td>{h.products.join(', ') || String(h.message || '').slice(0, 40)}</td>
                        <td style={{ textAlign: 'right' }}>{h.quantity}</td>
                        <td><span className="pl pl-n">{STATUS[h.status] || h.status}</span></td>
                        <td><Link href={`/admin/inquiries/${h.id}`} className="btn btn-sm">打开</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="card">
            <div className="card-h"><h3>跟进</h3></div>
            <div className="card-b">
              <div className="fg">
                <label className="fl">负责人</label>
                <input className="inp" value={owner} onChange={(e) => setOwner(e.target.value)}
                  placeholder="未分配" />
              </div>
              <div className="fg">
                <label className="fl">内部备注<span className="hint">买家看不到</span></label>
                <textarea className="inp" style={{ minHeight: 90 }} value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="沟通要点、客户偏好、议价空间…" />
              </div>
              <button className="btn btn-p" style={{ width: '100%' }} onClick={() => save(i.status)}>
                保存跟进
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>报价记录</h3><span className="sub">{d.quotes.length} 条</span></div>
            <div className="card-b">
              {d.quotes.length > 0 && (
                <table style={{ marginBottom: 16 }}>
                  <thead><tr><th>日期</th><th style={{ textAlign: 'right' }}>数量</th><th style={{ textAlign: 'right' }}>单价</th><th style={{ textAlign: 'right' }}>总额</th></tr></thead>
                  <tbody>
                    {d.quotes.map((q) => (
                      <tr key={q.id}>
                        <td style={{ fontSize: 11.5 }}>{q.created_at.slice(5, 16)}</td>
                        <td style={{ textAlign: 'right' }}>{q.qty}</td>
                        <td style={{ textAlign: 'right' }}>{money(q.unit_price)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{money(q.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px' }}>新增报价</h4>
              <div className="fg2">
                <div className="fg">
                  <label className="fl">数量</label>
                  <input className="inp" type="number" value={quote.qty}
                    onChange={(e) => setQuote({ ...quote, qty: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="fl">单价 (EXW)</label>
                  <input className="inp" type="number" step="0.01" value={quote.unitPrice}
                    onChange={(e) => setQuote({ ...quote, unitPrice: e.target.value })} />
                </div>
              </div>
              <div className="fg">
                <label className="fl">交期</label>
                <input className="inp" value={quote.leadTime}
                  onChange={(e) => setQuote({ ...quote, leadTime: e.target.value })} />
              </div>
              <div className="fg">
                <label className="fl">备注</label>
                <input className="inp" value={quote.note}
                  onChange={(e) => setQuote({ ...quote, note: e.target.value })}
                  placeholder="含运费 / 不含开模费…" />
              </div>
              {total > 0 && (
                <div className="note note-g" style={{ marginBottom: 12 }}>
                  订单总额 <strong>${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                </div>
              )}
              <button className="btn btn-p" style={{ width: '100%' }} onClick={addQuote}>记录报价</button>
            </div>
          </div>

          {d.logs.length > 0 && (
            <div className="card">
              <div className="card-h"><h3>操作记录</h3></div>
              <div className="card-b">
                {d.logs.map((l) => (
                  <div key={l.id} style={{ padding: '9px 0', borderBottom: '1px solid #f0f2f4', fontSize: 12.5 }}>
                    <div style={{ fontWeight: 500 }}>{l.summary || l.action}</div>
                    <div style={{ fontSize: 11, color: '#767f8c' }}>{l.created_at} · {l.user_id || '系统'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} dismiss={dismiss} />
    </>
  );
}