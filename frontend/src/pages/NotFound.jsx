import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="page narrow center-text">
      <h1 className="page-title">This page doesn’t exist</h1>
      <p className="muted">The link may be broken or the page may have moved.</p>
      <Link className="btn btn-primary" to="/">Go to the home page</Link>
    </main>
  );
}
