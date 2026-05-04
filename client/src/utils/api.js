import axios from 'axios'
import { toastError } from './toast.js'

// Same-origin proxy uses '/api'. If VITE_API_URL already ends with '/api', don't double-append.
function apiBaseURL() {
  const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
  if (!raw) return '/api'
  const noDuplicate = raw.replace(/\/api$/i, '')
  return `${noDuplicate}/api`
}

export const api = axios.create({
  baseURL: apiBaseURL(),
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!window.location.pathname.startsWith('/login')) {
        toastError('Session expired — sign in again')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
