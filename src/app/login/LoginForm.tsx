'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/* The first account is created from ADMIN_EMAIL / ADMIN_PASSWORD by
   bootstrap() in page.tsx. That detail used to be printed on the public
   login screen; it now lives here in the source instead, where a developer
   can still find it without telling every visitor which variables to guess. */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
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
    <form onSubmit={submit} className="lg-form">
      {error && <div className="lg-err" role="alert">{error}</div>}

      <div className="lg-fg">
        <label className="lg-fl" htmlFor="email">邮箱</label>
        <div className="lg-inp">
          <svg className="lead" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 6l10 7 10-7"/></svg>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            autoFocus
            placeholder="name@company.com"
          />
        </div>
      </div>

      <div className="lg-fg">
        <label className="lg-fl" htmlFor="password">密码</label>
        <div className="lg-inp has-eye">
          <svg className="lead" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input
            id="password"
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
          <button
            className="lg-eye"
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? '隐藏密码' : '显示密码'}
            title={show ? '隐藏密码' : '显示密码'}
          >
            {show
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c6.4 0 10 7 10 7a17 17 0 0 1-2.2 3.1M6.6 6.6A17 17 0 0 0 2 11s3.6 7 10 7a10.4 10.4 0 0 0 4.3-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>}
          </button>
        </div>
      </div>

      <button className="lg-submit" type="submit" disabled={busy}>
        {busy ? <span className="lg-spin" /> : <>登录
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </>}
      </button>

      <p className="lg-help">账号由 <b>站点管理员</b> 分配，不开放自助注册</p>
    </form>
  );
}
