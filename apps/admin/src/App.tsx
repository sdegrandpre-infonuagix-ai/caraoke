import React, { createContext, useContext, useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { decodePayload, isAdminToken, isTokenValid } from './auth/adminGuard.js';
import type { CognitoTokenPayload } from './auth/adminGuard.js';

// ─── Auth context ─────────────────────────────────────────────────────────────

interface AuthState {
  idToken: string | null;
  payload: CognitoTokenPayload | null;
  signIn: (token: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState>({
  idToken: null,
  payload: null,
  signIn: () => {},
  signOut: () => {},
});

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [idToken, setIdToken] = useState<string | null>(
    () => sessionStorage.getItem('caraoke_admin_token'),
  );
  const payload = idToken ? decodePayload(idToken) : null;

  function signIn(token: string) {
    sessionStorage.setItem('caraoke_admin_token', token);
    setIdToken(token);
  }

  function signOut() {
    sessionStorage.removeItem('caraoke_admin_token');
    setIdToken(null);
  }

  // Auto sign-out when token expires
  useEffect(() => {
    if (!payload) return;
    const ttlMs = (payload.exp - Math.floor(Date.now() / 1000)) * 1000;
    if (ttlMs <= 0) { signOut(); return; }
    const t = setTimeout(signOut, ttlMs);
    return () => clearTimeout(t);
  }, [payload?.exp]);

  return (
    <AuthContext.Provider value={{ idToken, payload, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

// ─── Guard ────────────────────────────────────────────────────────────────────

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { payload, idToken } = useAuth();
  if (!idToken || !isAdminToken(payload) || !isTokenValid(payload, Math.floor(Date.now() / 1000))) {
    return <Navigate to="/sign-in" replace />;
  }
  return <>{children}</>;
}

// ─── Sign-in screen ───────────────────────────────────────────────────────────

function SignIn() {
  const { signIn, payload } = useAuth();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  if (payload && isAdminToken(payload)) return <Navigate to="/" replace />;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = decodePayload(token.trim());
    if (!isAdminToken(p)) {
      setError('This account is not in the admin group.');
      return;
    }
    signIn(token.trim());
  }

  return (
    <div style={{ maxWidth: 400, margin: '10vh auto', fontFamily: 'sans-serif' }}>
      <h1>Caraoke Admin</h1>
      <p>Paste your Cognito ID token below. Access requires the <code>admin</code> group.</p>
      <form onSubmit={handleSubmit}>
        <textarea
          rows={6}
          style={{ width: '100%' }}
          placeholder="Cognito ID token…"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ marginTop: 8 }}>Sign in</button>
      </form>
    </div>
  );
}

// ─── Shell layout ─────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  const { payload, signOut } = useAuth();
  const navStyle = { marginRight: 16, textDecoration: 'none' };
  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#1a1a2e', color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <strong style={{ marginRight: 24 }}>Caraoke Admin</strong>
        <NavLink to="/dashboards" style={navStyle}>Dashboards</NavLink>
        <NavLink to="/billing" style={navStyle}>Billing</NavLink>
        <NavLink to="/accounts" style={navStyle}>Accounts</NavLink>
        <NavLink to="/moderation" style={navStyle}>Moderation</NavLink>
        <span style={{ marginLeft: 'auto', fontSize: 12 }}>{payload?.email}</span>
        <button onClick={signOut} style={{ marginLeft: 8 }}>Sign out</button>
      </nav>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}

// ─── Placeholder pages ────────────────────────────────────────────────────────

function DashboardsPage() {
  return <h2>Metrics Dashboards</h2>;
}

function BillingPage() {
  return <h2>Billing Administration</h2>;
}

function AccountsPage() {
  return <h2>User Account Administration</h2>;
}

function ModerationPage() {
  return <h2>Moderation Queue</h2>;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route
          path="/*"
          element={
            <RequireAdmin>
              <Shell>
                <Routes>
                  <Route index element={<Navigate to="/dashboards" replace />} />
                  <Route path="dashboards" element={<DashboardsPage />} />
                  <Route path="billing" element={<BillingPage />} />
                  <Route path="accounts" element={<AccountsPage />} />
                  <Route path="moderation" element={<ModerationPage />} />
                </Routes>
              </Shell>
            </RequireAdmin>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
