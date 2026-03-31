import axios from 'axios'
import { toastError } from './toast.js'

const baseURL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: baseURL ? `${baseURL.replace(/\/$/, '')}/api` : '/api',
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
