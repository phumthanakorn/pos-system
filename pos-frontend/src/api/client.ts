import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(undefined, (error) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('shop')
    localStorage.removeItem('user')
    if (window.location.pathname !== '/login') {
      window.location.assign('/login')
    }
  }
  return Promise.reject(error)
})
