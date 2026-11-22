import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { APP_NAME, GOOGLE_CLIENT_ID } from '../config';

export default function AuthPage() {
  const { user, login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const dest = location.state?.from || '/home';
  useEffect(() => {
    if (user) navigate(dest, { replace: true });
  }, [user, dest, navigate]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const signup = mode === 'register';

  const onGoogle = async (response) => {
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle(response.credential);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (signup) await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth">
      <div className="auth-card">
        <h1>{signup ? `Create your ${APP_NAME} account` : 'Welcome back'}</h1>
        <p className="muted">{signup ? 'Hosts need an account. Guests can join any meeting with just a link.' : 'Sign in to start meetings and read your notes.'}</p>

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={!signup} className={!signup ? 'on' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
          <button role="tab" aria-selected={signup} className={signup ? 'on' : ''} onClick={() => { setMode('register'); setError(''); }}>Create account</button>
        </div>

        {GOOGLE_CLIENT_ID && (
          <>
            <div className="google-wrap">
              <GoogleLogin
                onSuccess={onGoogle}
                onError={() => setError('Google sign-in was cancelled or failed. Please try again.')}
                text={signup ? 'signup_with' : 'continue_with'}
                shape="rectangular"
                size="large"
              />
            </div>
            <div className="or-divider"><span>or use email</span></div>
          </>
        )}

        <form onSubmit={submit} noValidate>
          {signup && (
            <label className="field">
              <span>Full name</span>
              <input value={form.name} onChange={set('name')} autoComplete="name" required />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <div className="pw">
              <input
                type={show ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                autoComplete={signup ? 'new-password' : 'current-password'}
                minLength={signup ? 8 : undefined}
                required
              />
              <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {signup && <small className="muted">At least 8 characters.</small>}
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
            {busy ? 'Please wait' : signup ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
