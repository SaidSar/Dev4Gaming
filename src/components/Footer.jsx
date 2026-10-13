// Pie de página global (incluye la atribución que exige la licencia de Flaticon)
import '../styles/footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p className="footer__brand">
          © {new Date().getFullYear()} Dev4<span className="text-blue">Gaming</span>
        </p>
        <p className="footer__credit">
          Íconos:{' '}
          <a href="https://www.flaticon.com/uicons" target="_blank" rel="noopener noreferrer">
            UIcons de Flaticon
          </a>
        </p>
      </div>
    </footer>
  )
}

export default Footer
