const API = '/api'

function getAuthHeader() {
  try {
    const user = JSON.parse(localStorage.getItem('cloudcommercx_user') || 'null')
    if (user?.token) return { Authorization: `Bearer ${user.token}` }
  } catch {}
  return {}
}

export async function api(path, options = {}) {
  const { skipLogoutOn401, ...fetchOptions } = options
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader(), ...fetchOptions.headers }
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    headers,
    ...fetchOptions,
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(res.ok ? 'Invalid response' : `Error ${res.status}`)
  }
  if (!res.ok) {
    if (res.status === 401 && !skipLogoutOn401) {
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
