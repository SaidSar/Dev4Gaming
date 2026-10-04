// Barra de navegación global
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import '../styles/navbar.css'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, displayName, loading } = useAuth()

  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className="navbar">
      <div className="container navbar__inner">

        <Link to="/" className="navbar__logo" onClick={closeMenu}>
          Dev4<span className="text-blue">Gaming</span>
        </Link>

        <button
          className={`navbar__burger ${menuOpen ? 'navbar__burger--open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <ul className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
          <li>
            <NavLink to="/" end onClick={closeMenu}>
              Inicio
            </NavLink>
          </li>
          <li>
            <NavLink to="/games" onClick={closeMenu}>
              Catálogo
            </NavLink>
          </li>
          {!loading && (
            <li>
              <NavLink to={user ? '/profile' : '/login'} onClick={closeMenu}>
                <span className="navbar__user">
                  {user ? displayName : 'Iniciar sesión'}
                </span>
              </NavLink>
            </li>
          )}
        </ul>

      </div>
    </nav>
  )
}

export default Navbar