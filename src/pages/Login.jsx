import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, provider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleEmailAuth = async () => {
    setError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/profile');
    } catch (err) {
      switch (err.code) {
        case 'auth/email-already-in-use': setError('An account with this email already exists.'); break;
        case 'auth/invalid-email': setError('Invalid email address.'); break;
        case 'auth/weak-password': setError('Password must be at least 6 characters.'); break;
        case 'auth/invalid-credential': setError('Incorrect email or password.'); break;
        default: setError('Something went wrong. Please try again.');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate('/profile');
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    }
  };

  return (
    <div className="login-bg">
      <div className="grain" />

      {/* Big background vinyl records */}
      <div className="vinyl vinyl-1"><div className="vinyl-inner"><div className="vinyl-hole" /></div></div>
      <div className="vinyl vinyl-2"><div className="vinyl-inner"><div className="vinyl-hole" /></div></div>
      <div className="vinyl vinyl-3"><div className="vinyl-inner"><div className="vinyl-hole" /></div></div>

      {/* Artistic silhouette */}
      <div className="figure-wrap">
        <svg className="figure-svg" viewBox="0 0 280 580" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gold1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f7e07a"/>
              <stop offset="45%" stopColor="#c9a84c"/>
              <stop offset="100%" stopColor="#6b4c10"/>
            </linearGradient>
            <linearGradient id="silver1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0f0f0"/>
              <stop offset="50%" stopColor="#b0b0b0"/>
              <stop offset="100%" stopColor="#606060"/>
            </linearGradient>
            <radialGradient id="headGrad" cx="40%" cy="35%">
              <stop offset="0%" stopColor="#f7e07a"/>
              <stop offset="100%" stopColor="#8a6010"/>
            </radialGradient>
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="softglow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Spotlight beam from top */}
          <path d="M140 0 L60 580 L220 580 Z" fill="url(#gold1)" opacity="0.04"/>

          {/* Head */}
          <ellipse cx="140" cy="68" rx="36" ry="42" fill="url(#headGrad)" filter="url(#glow)"/>

          {/* Cap */}
          <rect x="104" y="30" width="72" height="22" rx="11" fill="url(#gold1)" opacity="0.85"/>
          <ellipse cx="140" cy="30" rx="52" ry="9" fill="url(#gold1)" opacity="0.9"/>
          <path d="M106 30 Q140 8 174 30" fill="url(#gold1)" opacity="0.75"/>

          {/* Headphones */}
          <path d="M105 65 Q95 48 106 38" stroke="url(#silver1)" strokeWidth="5" fill="none" strokeLinecap="round"/>
          <path d="M175 65 Q185 48 174 38" stroke="url(#silver1)" strokeWidth="5" fill="none" strokeLinecap="round"/>
          <path d="M106 38 Q140 18 174 38" stroke="url(#silver1)" strokeWidth="3.5" fill="none"/>
          <rect x="97" y="62" width="16" height="20" rx="8" fill="url(#silver1)" opacity="0.9" filter="url(#softglow)"/>
          <rect x="167" y="62" width="16" height="20" rx="8" fill="url(#silver1)" opacity="0.9" filter="url(#softglow)"/>

          {/* Neck */}
          <rect x="128" y="106" width="24" height="24" rx="7" fill="url(#headGrad)"/>

          {/* Big puffer jacket body */}
          <path d="M45 155 Q52 128 140 134 Q228 128 235 155 L250 305 Q246 328 218 332 L195 336 L195 415 L85 415 L85 336 L62 332 Q34 328 30 305 Z"
            fill="url(#gold1)" filter="url(#softglow)"/>

          {/* Puffer quilting lines */}
          <path d="M75 165 Q140 158 205 165" stroke="#c9a84c" strokeWidth="1" fill="none" opacity="0.5"/>
          <path d="M68 195 Q140 186 212 195" stroke="#c9a84c" strokeWidth="1" fill="none" opacity="0.5"/>
          <path d="M62 225 Q140 215 218 225" stroke="#c9a84c" strokeWidth="1" fill="none" opacity="0.5"/>
          <path d="M58 255 Q140 244 222 255" stroke="#c9a84c" strokeWidth="1" fill="none" opacity="0.5"/>
          <path d="M56 285 Q140 273 224 285" stroke="#c9a84c" strokeWidth="1" fill="none" opacity="0.5"/>

          {/* Lapels */}
          <path d="M140 140 L112 205 L140 190 L168 205 Z" fill="url(#silver1)" opacity="0.35"/>

          {/* Left arm */}
          <path d="M45 158 Q16 196 18 272 Q22 304 50 310 L72 315 L78 234 L60 168 Z" fill="url(#gold1)" filter="url(#softglow)"/>
          {/* Right arm */}
          <path d="M235 158 Q264 192 262 268 Q258 302 230 308 L208 313 L202 232 L220 165 Z" fill="url(#gold1)" filter="url(#softglow)"/>

          {/* Hands */}
          <ellipse cx="32" cy="314" rx="20" ry="13" fill="url(#headGrad)" filter="url(#softglow)"/>
          <ellipse cx="248" cy="312" rx="20" ry="13" fill="url(#headGrad)" filter="url(#softglow)"/>

          {/* Gold chain */}
          <path d="M114 148 Q140 178 166 148" stroke="#f7e07a" strokeWidth="2.5" fill="none" strokeDasharray="5 3" opacity="0.95" filter="url(#glow)"/>
          <circle cx="140" cy="186" r="7" fill="#f7e07a" opacity="0.95" filter="url(#glow)"/>
          <circle cx="140" cy="186" r="3" fill="#fff" opacity="0.6"/>

          {/* Watch on left wrist */}
          <rect x="22" y="306" width="20" height="14" rx="4" fill="url(#silver1)" opacity="0.9"/>
          <rect x="25" y="309" width="14" height="8" rx="2" fill="#111" opacity="0.8"/>
          <rect x="26" y="310" width="5" height="1" rx="1" fill="#f7e07a" opacity="0.9"/>

          {/* Pants */}
          <path d="M85 415 L68 570 L128 572 L140 482 L152 572 L212 570 L195 415 Z"
            fill="#0f0c04" stroke="url(#gold1)" strokeWidth="1.5"/>
          {/* Pants crease */}
          <line x1="106" y1="420" x2="98" y2="568" stroke="#c9a84c" strokeWidth="0.8" opacity="0.4"/>
          <line x1="174" y1="420" x2="182" y2="568" stroke="#c9a84c" strokeWidth="0.8" opacity="0.4"/>

          {/* Shoes */}
          <path d="M68 572 Q56 576 52 580 L138 580 L128 572 Z" fill="url(#silver1)" opacity="0.9"/>
          <path d="M212 572 Q224 576 228 580 L142 580 L152 572 Z" fill="url(#silver1)" opacity="0.9"/>
        </svg>
        <div className="figure-spotlight" />
      </div>

      {/* Floating notes */}
      {[['♩',0],['♪',1],['♫',2],['♬',3],['♩',4],['♪',5]].map(([n,i]) => (
        <div key={i} className={`fnote fnote-${i}`}>{n}</div>
      ))}

      {/* Login Card */}
      <div className="login-card">
        <div className="card-top-accent" />

        {/* Mini vinyl decoration on card */}
        <div className="mini-vinyl">
          <div className="mini-vinyl-hole" />
        </div>

        <div className="login-header">
          <div className="brand-line">SONIC BREADCRUMBS</div>
          <h1>{isSignUp ? 'Join the Stage' : 'Welcome Back'}</h1>
          <p>{isSignUp ? 'Create your account' : 'Drop music. Discover the world.'}</p>
        </div>

        <div className="input-group">
          <input
            className="login-input"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div className="input-group">
          <input
            className="login-input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="btn-primary" onClick={handleEmailAuth}>
          <span>{isSignUp ? 'Sign Up' : 'Login'}</span>
        </button>

        <div className="divider"><span>or</span></div>

        <button className="btn-google" onClick={handleGoogleSignIn}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 13.814 17.64 11.506 17.64 9.2z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="signup-text">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <a href="#" onClick={e => { e.preventDefault(); setIsSignUp(!isSignUp); setError(''); }}>
            {isSignUp ? 'Log in' : 'Sign up'}
          </a>
        </p>
      </div>
    </div>
  );
}

export default Login;