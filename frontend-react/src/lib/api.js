const API = '/api'

function getAuthHeader() {
  try {
    const user = JSON.parse(localStorage.getItem('cloudcommercx_user') || 'null')
    if (user?.token) return { Authorization: `Bearer ${user.token}` }
  } catch {}
  return {}
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader(), ...options.headers }
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    headers,
    ...options,
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(res.ok ? 'Invalid response' : `Error ${res.status}`)
  }
  if (!res.ok) {
    if (res.status === 401) {
      try {
        localStorage.removeItem('cloudcommercx_user')
        window.dispatchEvent(new CustomEvent('auth:logout'))
      } catch {}
    }
    if (data.error) throw new Error(data.error)
    throw new Error(`Error ${res.status}`)
  }
  return data
}
