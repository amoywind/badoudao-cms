'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '登录失败');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('网络错误，请重试');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {error && (
        <div className="note" style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b' }}>
          {error}
        </div>
      )}

      <div className="fg">
        <label className="fl" htmlFor="email">邮箱</label>
        <input
          id="email"
          className="inp"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          autoFocus
          placeholder="admin@badoudao.com"
        />
      </div>

      <div className="fg">
        <label className="fl" htmlFor="password">密码</label>
        <input
          id="password"
          className="inp"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </div>

      <button className="btn btn-p btn-l" type="submit" disabled={busy} style={{ width: '100%' }}>
        {busy ? <span className="spin" /> : '登录'}
      </button>

      <p style={{ fontSize: 11.5, color: '#767f8c', marginTop: 16, lineHeight: 1.6 }}>
        首次登录使用环境变量 <code>ADMIN_EMAIL</code> 和 <code>ADMIN_PASSWORD</code>
        创建的账号，登录后请在系统设置中修改密码。
      </p>
    </form>
  );
}