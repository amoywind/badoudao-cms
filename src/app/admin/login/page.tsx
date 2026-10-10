import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionUser, SESSION_COOKIE } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token && (await getSessionUser(token))) {
    redirect('/admin');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>
            BADOU<span style={{ color: '#0f5c4a' }}>DAO</span>
          </div>
          <p style={{ color: '#767f8c', fontSize: 13.5, marginTop: 6 }}>管理后台</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e6e8eb', borderRadius: 6, padding: 28 }}>
          <LoginForm />
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12.5, color: '#767f8c' }}>
          <a href="/" style={{ color: '#0f5c4a' }}>← 返回网站首页</a>
        </p>
      </div>
    </div>
  );
}