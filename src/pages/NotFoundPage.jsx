import React from 'react'
import { Link } from 'react-router-dom'
import './NotFoundPage.css'

const NotFoundPage = () => {
  return (
    <div className="not-found-page">
      <h1>404</h1>
      <p>Página não encontrada</p>
      <p className="not-found-description">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link to="/" className="home-link">
        Voltar para a Página Inicial
      </Link>
    </div>
  )
}

export default NotFoundPage