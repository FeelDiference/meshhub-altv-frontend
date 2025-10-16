import { getAccessToken } from '@/services/auth'

const BACKEND_URL = 'https://hub.feeld.space'

function authHeaders() {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function findHandlingMetaPath(vehicleName: string): Promise<string | null> {
  const archivePath = `dlcpacks/vehicles/${vehicleName}/dlc.rpf`
  const url = `${BACKEND_URL}/api/rpf/files/find-by-name?name=handling.meta&archive_path=${encodeURIComponent(archivePath)}`
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...authHeaders() } })
  if (!res.ok) throw new Error(`find-by-name failed: ${res.status}`)
  const data = await res.json()
  const file = data?.files?.[0]
  return file?.path || null
}

export async function fetchHandlingMeta(vehicleName: string): Promise<string> {
  const archivePath = `dlcpacks/vehicles/${vehicleName}/dlc.rpf`
  let path = await findHandlingMetaPath(vehicleName)
  if (!path) path = 'common/data/levels/gta5/handling.meta'
  const params = new URLSearchParams({
    path,
    offset: '0',
    limit: '200000',
    encoding: 'utf-8',
    archive_path: archivePath,
  })
  const url = `${BACKEND_URL}/api/rpf/files/rpf-content?${params.toString()}`
  const res = await fetch(url, { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error(`rpf-content failed: ${res.status}`)
  const data = await res.json()
  return data?.content || ''
}
