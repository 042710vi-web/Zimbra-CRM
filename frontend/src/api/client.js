import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const http = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });

export async function api(path, { token, ...options } = {}) {
  const { body, ...requestOptions } = options;
  try {
    const response = await http.request({
      url: path,
      ...requestOptions,
      data: body,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...requestOptions.headers,
      },
    });
    return response.data;
  } catch (cause) {
    const message = cause.response?.data?.message || cause.message || 'No fue posible completar la solicitud.';
    throw Object.assign(new Error(message), { status: cause.response?.status });
  }
}
