const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options)
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const detail = Array.isArray(body.detail)
      ? body.detail.map((item) => item.msg).join(', ')
      : body.detail
    throw new Error(detail || '요청을 처리하지 못했습니다.')
  }
  return response.json()
}

export function generateMaterial(form) {
  const data = new FormData()
  Object.entries(form).forEach(([key, value]) => {
    if (key === 'file' && !value) return
    if (key === 'supports') data.set(key, value.join(','))
    else data.set(key, value)
  })
  return request('/api/materials/generate', { method: 'POST', body: data })
}

export function updateMaterialStatus(id, status) {
  return request(`/api/materials/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

export function listMaterials() {
  return request('/api/materials')
}

