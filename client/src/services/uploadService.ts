/**
 * Сервис для загрузки файлов на сервер (Upload System)
 */

import { apiClient as api } from './auth'

export interface UploadStatus {
  id: string
  upload_type: string
  status: 'pending' | 'processing' | 'analyzed' | 'approved' | 'rejected' | 'expired' | 'completed' | 'failed'
  uploader_id: string
  uploader_name?: string
  uploader_surname?: string
  original_file_name: string
  file_size: number
  resource_name?: string
  requires_approval: boolean
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  expires_at: string
}

export interface UploadResponse {
  success: boolean
  upload: UploadStatus
  message?: string
}

export interface UserUpload {
  uploads: UploadStatus[]
  total: number
  page: number
  page_size: number
}

/**
 * Загрузить модификацию handling.meta на сервер
 */
export async function uploadHandlingModification(data: {
  archiveId: string
  resourceName: string
  modifiedContent: string
  vehicleName: string
}): Promise<UploadResponse> {
  console.log('[uploadService] Starting upload...', {
    archiveId: data.archiveId,
    resourceName: data.resourceName,
    vehicleName: data.vehicleName,
    contentLength: data.modifiedContent.length
  })
  
  const formData = new FormData()
  
  // Создаем Blob из XML контента
  const blob = new Blob([data.modifiedContent], { type: 'text/xml' })
  formData.append('file', blob, 'handling.meta')
  
  // Добавляем метаданные
  formData.append('upload_type', 'handling_modification')
  formData.append('resource_name', data.resourceName)
  formData.append('archive_id', data.archiveId)
  formData.append('modified_content', data.modifiedContent)
  
  console.log('[uploadService] FormData prepared, sending POST /upload...')
  
  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    console.log('[uploadService] Upload successful:', response.data)
    return response.data
  } catch (error: any) {
    console.error('[uploadService] Upload failed:', {
      message: error?.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data
    })
    throw error
  }
}

/**
 * Получить статус загрузки по ID
 */
export async function getUploadStatus(uploadId: string): Promise<UploadStatus> {
  const response = await api.get(`/rpf/uploads/${uploadId}`)
  return response.data
}

/**
 * Получить все загрузки текущего пользователя
 */
export async function getUserUploads(userId: string, page = 1, pageSize = 20): Promise<UserUpload> {
  const response = await api.get(`/rpf/uploads/user/${userId}`, {
    params: { page, page_size: pageSize }
  })
  return response.data
}

/**
 * Одобрить загрузку (только для администраторов)
 */
export async function approveUpload(uploadId: string, targetPath: string, createBackup = true): Promise<void> {
  await api.post(`/rpf/uploads/${uploadId}/approve`, {
    approved: true,
    target_path: targetPath,
    create_backup: createBackup
  })
}

/**
 * Отклонить загрузку (только для администраторов)
 */
export async function rejectUpload(uploadId: string, reason: string): Promise<void> {
  await api.post(`/rpf/uploads/${uploadId}/reject`, {
    reason
  })
}

