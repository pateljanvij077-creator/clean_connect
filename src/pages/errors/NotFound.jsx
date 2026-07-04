import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', textAlign: 'center', padding: '2rem'
    }}>
      <div style={{ fontSize: '8rem', marginBottom: '1rem' }}>🧹</div>
      <h1 style={{ fontSize: '6rem', fontWeight: 900, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>Oops! Page not found</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '400px' }}>
        Looks like this page went on a cleaning break. Let's get you back home!
      </p>
      <Link to="/" className="btn btn-primary">Go Home</Link>
    </div>
  )
}
