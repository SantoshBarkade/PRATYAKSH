import { ArrowRight } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useEffect, useState } from 'react';

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`landing-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="landing-container">
        <div className="landing-navbar-inner">
          {/* Logo with light theme for crisp charcoal text on white */}
          <a href="/" style={{ textDecoration: 'none' }}>
            <Logo theme="light" />
          </a>

          {/* Desktop Navigation Links */}
          <nav className="landing-nav-links" aria-label="Main Navigation">
            <a href="#how-it-works" className="landing-nav-link">
              Workflow
            </a>
            <a href="#differentiator" className="landing-nav-link">
              Dependency Trace
            </a>
            <a href="#evidence" className="landing-nav-link">
              Evidence Provenance
            </a>
            <a href="#forecast" className="landing-nav-link">
              Deterministic Forecast
            </a>
            <a href="#principles" className="landing-nav-link">
              Principles
            </a>
          </nav>

          {/* Action CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a href="/app" className="landing-btn landing-btn-nav">
              Open Command Center <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
