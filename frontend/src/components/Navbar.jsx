import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { THEME_KEY } from '../config';
import Logo from './Logo';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    setTheme(next);
  };

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to={user ? '/home' : '/'} aria-label="Home">
          <Logo />
        </Link>
        <nav className="nav-links" aria-label="Main">
          {user && (
            <>
              <NavLink to="/home">Meet</NavLink>
              <NavLink to="/history">Past meetings</NavLink>
            </>
          )}
        </nav>
        <div className="nav-actions">
          <button className="icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user ? (
            <>
              <span className="nav-user" title={user.email}>{user.name}</span>
              <button
                className="icon-btn"
                aria-label="Sign out"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link className="btn btn-ghost" to="/auth">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
