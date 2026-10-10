'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Toast, useToast } from '../_ui';

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast, show } = useToast();
  const isNew = id === 'new';

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [media, setMedia] = useState([]);
  const [tab, setTab] = useState('basic');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) {
      setProduct({
        id: '', slug: '', name: '', category: 'wall-clocks', summary: '',
        priceMin: 0, priceMax: 0, moq: 500, leadTime: '20-30 days',
        moveLevel: 'China quartz', difficulty: 'simple', content: '',
        featured: false, status: 'draft',
        specs: [], options: [], prices: [], images: []
      });
    }
    fetch(`/api/products${isNew ? '' : `?id=${encodeURIComponent(id)}`}`)
      .then((r) => r.json())
      .then((d) => {
        if (!isNew && d.product) setProduct(d.product);
        if (d.categories) setCategories(d.categories);
      });
    fetch('/api/media')
      .then((r) => r.json())
      .then((d) => setMedia(d.media || []));
  }, [id]);

  if (!product) return <div className="empty"><span className="spin" /></div>;

  const set = (k, v) => setProduct((p) => ({ ...p, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch('/api/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      const data = await res.json();
      if (!res.ok) {
        show(data.error || '保存失败', 'err');
        return;
      }
      show(isNew ? '产品已创建' : '已保存', 'ok');
      if (isNew) {
        router.push(`/admin/products/${data.id}`);
        router.refresh();
      }
    } catch {
      show('网络错误', 'err');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`删除 ${product.id}？不可撤销。`)) return;
    await fetch(`/api/products?id=${encodeURIComponent(product.id)}`, { method: 'DELETE' });
    router.push('/admin/products');
    router.refresh();
  }

  return (
    <>
      <div className="card">
        <div className="card-h">
          <Link href="/admin/products" className="btn btn-sm">← 返回</Link>
          <h3>{isNew ? '新建产品' : product.id}</h3>
          <span className="sub">{product.name}</span>
          <div className="r">
            <select
              className="inp fld"
              value={product.status}
              onChange={(e) => set('status', e.target.value)}
              style={{ width: 110 }}
            >
              <option value="draft">草稿</option>
              <option value="published">已上架</option>
              <option value="archived">已归档</option>
            </select>
            <button className="btn btn-p btn-sm" onClick={save} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </button>
            {!isNew && <button className="btn btn-sm btn-d" onClick={remove}>删除</button>}
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'basic' ? 'on' : ''}`} onClick={() => setTab('basic')}>基本信息</button>
          <button className={`tab ${tab === 'specs' ? 'on' : ''}`} onClick={() => setTab('specs')}>
            规格参数
            {!product.specs.length && <span className="n">空</span>}
          </button>
          <button className={`tab ${tab === 'options' ? 'on' : ''}`} onClick={() => setTab('options')}>定制选项</button>
          <button className={`tab ${tab === 'prices' ? 'on' : ''}`} onClick={() => setTab('prices')}>价格阶梯</button>
          <button className={`tab ${tab === 'images' ? 'on' : ''}`} onClick={() => setTab('images')}>
            图片
            {!product.images.length && <span className="n">缺</span>}
          </button>
          <button className={`tab ${tab === 'content' ? 'on' : ''}`} onClick={() => setTab('content')}>详情文案</button>
        </div>
      </div>

      <div className="grid2" style={{ alignItems: 'start' }}>
        <div>
          {tab === 'basic' && (
            <div className="card">
              <div className="card-h"><h3>基本信息</h3></div>
              <div className="card-b">
                <div className="fg2">
                  <div className="fg">
                    <label className="fl">型号 / SKU<span className="req">*</span></label>
                    <input className="inp" value={product.id} onChange={(e) => set('id', e.target.value)}
                      placeholder="BD-W-1201" disabled={!isNew} />
                    {!isNew && <div className="help">SKU 创建后不可修改</div>}
                  </div>
                  <div className="fg">
                    <label className="fl">URL slug</label>
                    <input className="inp" value={product.slug} onChange={(e) => set('slug', e.target.value)}
                      placeholder="自动从名称生成" />
                  </div>
                </div>

                <div className="fg">
                  <label className="fl">产品名称<span className="req">*</span></label>
                  <input className="inp" value={product.name} onChange={(e) => set('name', e.target.value)}
                    placeholder="12 Inch Round Plastic Quartz Wall Clock" />
                </div>

                <div className="fg2">
                  <div className="fg">
                    <label className="fl">分类<span className="req">*</span></label>
                    <select className="inp" value={product.category} onChange={(e) => set('category', e.target.value)}>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="fg">
                    <label className="fl">工艺难度</label>
                    <select className="inp" value={product.difficulty} onChange={(e) => set('difficulty', e.target.value)}>
                      <option value="simple">简单（20-30 天）</option>
                      <option value="moderate">中等（30-40 天）</option>
                      <option value="complex">复杂（35-45 天）</option>
                    </select>
                  </div>
                </div>

                <div className="fg">
                  <label className="fl">短描述<span className="hint">150 字符内，用于列表和 SEO</span></label>
                  <textarea className="inp" value={product.summary} onChange={(e) => set('summary', e.target.value)}
                    style={{ minHeight: 70 }} />
                  <div className="help">{product.summary.length} / 150</div>
                </div>

                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
                  <input type="checkbox" checked={product.featured}
                    onChange={(e) => set('featured', e.target.checked)} />
                  在首页产品区展示
                </label>
              </div>
            </div>
          )}

          {tab === 'specs' && (
            <div className="card">
              <div className="card-h">
                <h3>规格参数</h3>
                <span className="sub">留空的行会自动忽略</span>
                <div className="r">
                  <button className="btn btn-sm" onClick={() => set('specs', [...product.specs, { label: '', value: '' }])}>
                    + 添加字段
                  </button>
                </div>
              </div>
              <div className="card-b">
                {product.specs.length === 0 && (
                  <p style={{ color: '#767f8c', fontSize: 13.5 }}>
                    还没有参数。产品页会显示参数表，参数越全越有利于 SEO。
                  </p>
                )}
                {product.specs.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input className="inp" style={{ flex: 1 }} value={s.label} placeholder="参数名（Diameter）"
                      onChange={(e) => {
                        const next = [...product.specs];
                        next[i] = { ...s, label: e.target.value };
                        set('specs', next);
                      }} />
                    <input className="inp" style={{ flex: 1.4 }} value={s.value} placeholder="值（12 inch / 30.5 cm）"
                      onChange={(e) => {
                        const next = [...product.specs];
                        next[i] = { ...s, value: e.target.value };
                        set('specs', next);
                      }} />
                    <button className="btn btn-sm btn-d" onClick={() => set('specs', product.specs.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'options' && (
            <div className="card">
              <div className="card-h">
                <h3>定制选项</h3>
                <span className="sub">会显示在前台产品页和询盘表单</span>
                <div className="r">
                  <button className="btn btn-sm" onClick={() => set('options', [...product.options, { label: '', priceDelta: 0 }])}>
                    + 添加
                  </button>
                </div>
              </div>
              <div className="card-b">
                <div className="note note-i">
                  这些字段直接驱动前端的定制选择器，勾选的项目买家在询盘时能勾选。
                </div>
                {product.options.map((o, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input className="inp" style={{ flex: 1 }} value={o.label} placeholder="选项名（LOGO 印刷）"
                      onChange={(e) => {
                        const next = [...product.options];
                        next[i] = { ...o, label: e.target.value };
                        set('options', next);
                      }} />
                    <input className="inp" style={{ width: 100 }} type="number" step="0.01" value={o.priceDelta}
                      placeholder="加价"
                      onChange={(e) => {
                        const next = [...product.options];
                        next[i] = { ...o, priceDelta: Number(e.target.value) };
                        set('options', next);
                      }} />
                    <button className="btn btn-sm btn-d" onClick={() => set('options', product.options.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
                {product.options.length === 0 && (
                  <p style={{ color: '#767f8c', fontSize: 13.5 }}>还没有定制选项</p>
                )}
              </div>
            </div>
          )}

          {tab === 'prices' && (
            <div className="card">
              <div className="card-h">
                <h3>价格与 MOQ</h3>
                <span className="sub">出厂价 EXW 口径</span>
              </div>
              <div className="card-b">
                <div className="note note-w">
                  所有价格以 <strong>Ex Works 出厂价</strong>录入，前台会明确标注。运费与关税另计。
                </div>

                <div className="fg3">
                  <div className="fg">
                    <label className="fl">最低价 (USD)</label>
                    <input className="inp" type="number" step="0.01" value={product.priceMin}
                      onChange={(e) => set('priceMin', Number(e.target.value))} />
                  </div>
                  <div className="fg">
                    <label className="fl">最高价 (USD)</label>
                    <input className="inp" type="number" step="0.01" value={product.priceMax}
                      onChange={(e) => set('priceMax', Number(e.target.value))} />
                  </div>
                  <div className="fg">
                    <label className="fl">MOQ（件）</label>
                    <input className="inp" type="number" value={product.moq}
                      onChange={(e) => set('moq', Number(e.target.value))} />
                  </div>
                </div>

                <div className="fg2">
                  <div className="fg">
                    <label className="fl">交期</label>
                    <input className="inp" value={product.leadTime} onChange={(e) => set('leadTime', e.target.value)} />
                  </div>
                  <div className="fg">
                    <label className="fl">机芯等级</label>
                    <select className="inp" value={product.moveLevel} onChange={(e) => set('moveLevel', e.target.value)}>
                      <option>China quartz</option>
                      <option>Taiwan quartz</option>
                      <option>Japan quartz</option>
                    </select>
                  </div>
                </div>

                <h4 style={{ fontSize: 13.5, fontWeight: 600, margin: '20px 0 10px' }}>阶梯价格</h4>
                <div className="note note-i" style={{ fontSize: 12 }}>
                  留空表示该阶梯不显示。前台只显示价格区间，明细在报价时才给。
                </div>

                <table style={{ marginTop: 10 }}>
                  <thead><tr><th>起始数量</th><th>结束数量</th><th>单价 (USD)</th><th style={{ width: 40 }}></th></tr></thead>
                  <tbody>
                    {product.prices.map((p, i) => (
                      <tr key={i}>
                        <td><input className="inp" type="number" value={p.minQty}
                          onChange={(e) => { const n = [...product.prices]; n[i] = { ...p, minQty: Number(e.target.value) }; set('prices', n); }} /></td>
                        <td><input className="inp" type="number" placeholder="不限" value={p.maxQty || ''}
                          onChange={(e) => { const n = [...product.prices]; n[i] = { ...p, maxQty: e.target.value ? Number(e.target.value) : null }; set('prices', n); }} /></td>
                        <td><input className="inp" type="number" step="0.01" value={p.unitPrice}
                          onChange={(e) => { const n = [...product.prices]; n[i] = { ...p, unitPrice: Number(e.target.value) }; set('prices', n); }} /></td>
                        <td><button className="btn btn-sm btn-d"
                          onClick={() => set('prices', product.prices.filter((_, j) => j !== i))}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="btn btn-sm" style={{ marginTop: 10 }}
                  onClick={() => set('prices', [...product.prices, { minQty: 500, maxQty: 2999, unitPrice: 0 }])}>
                  + 添加阶梯
                </button>
              </div>
            </div>
          )}

          {tab === 'content' && (
            <div className="card">
              <div className="card-h">
                <h3>详情文案</h3>
                <span className="sub">支持 HTML，第一段会被抓为摘要</span>
              </div>
              <div className="card-b">
                <div className="fg">
                  <textarea className="inp" style={{ minHeight: 320, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
                    value={product.content}
                    onChange={(e) => set('content', e.target.value)}
                    placeholder="<p>产品描述…</p><h3>使用场景</h3>…" />
                  <div className="help">
                    建议 600–900 词，覆盖使用场景、定制选项、竞品差异、包装信息。
                    内容越长越容易覆盖长尾搜索词。
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {tab === 'images' && (
          <div className="card">
            <div className="card-h">
              <h3>产品图片</h3>
              <span className="sub">第一张为主图</span>
              <div className="r">
                <Link href="/admin/media" className="btn btn-sm">去图片库</Link>
              </div>
            </div>
            <div className="card-b">
              {product.images.length === 0 && (
                <div className="note note-w">
                  还没有图片。缺图的产品在 Google 搜索里几乎拿不到曝光，建议至少加 1 张。
                </div>
              )}

              <div className="mgrid" style={{ marginBottom: 16 }}>
                {product.images.map((img, i) => (
                  <div key={i} className="mi on" onClick={() => {
                    const next = [...product.images];
                    next.splice(i, 1);
                    set('images', next);
                  }} title="点击移除">
                    {i === 0 && <span className="mi-badge">主图</span>}
                    <div className="mi-img"><img src={img.url} alt="" /></div>
                    <div className="mi-f"><b>移除此图</b></div>
                  </div>
                ))}
              </div>

              <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px' }}>从图片库选择</h4>
              {media.length === 0 ? (
                <p style={{ color: '#767f8c', fontSize: 13 }}>
                  图片库还是空的，先去<a href="/admin/media" style={{ color: '#0f5c4a' }}>图片库</a>上传。
                </p>
              ) : (
                <div className="mgrid" style={{ maxHeight: 460, overflowY: 'auto' }}>
                  {media.slice(0, 40).map((m) => (
                    <div key={m.id} className="mi"
                      onClick={() => set('images', [...product.images, { mediaId: m.id, url: m.url, alt: m.alt }])}>
                      <div className="mi-img"><img src={m.url} alt="" /></div>
                      <div className="mi-f"><b>{m.filename}</b></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Toast toast={toast} />
    </>
  );
}