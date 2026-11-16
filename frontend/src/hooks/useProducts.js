import { useEffect, useState } from 'react';
import { useAuth } from './useAuth.js';
import { listProducts } from '../services/productos.service.js';

export function useProducts() {
  const { session, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.token) return;
    let active = true;
    listProducts(session.token)
      .then((result) => {
        if (!active) return;
        const rows = Array.isArray(result) ? result : result?.data;
        if (!Array.isArray(rows)) {
          setError('El servidor devolvió un catálogo de productos con formato inesperado.');
          setProducts([]);
          return;
        }
        setProducts(rows);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause.message);
        if (cause.status === 401) logout();
      });
    return () => { active = false; };
  }, [session?.token, logout]);

  return { products, error };
}
