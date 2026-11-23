import { useModuleQuery } from './useModuleQuery.js';

export function useProducts() {
  const query = useModuleQuery('/products', { estado: true }, { all: true });
  return { products: query.data || [], error: query.error, loading: query.loading, reload: query.reload };
}
