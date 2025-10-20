/**
 * Компонент для отображения статуса загрузки
 */

import React from 'react'
import { Clock, CheckCircle, XCircle, AlertCircle, Loader2, HourglassIcon } from 'lucide-react'
import type { UploadStatus as UploadStatusType } from '@/services/uploadService'

interface UploadStatusProps {
  upload: UploadStatusType
  onRefresh?: () => void
}

const UploadStatus: React.FC<UploadStatusProps> = ({ upload, onRefresh }) => {
  const getStatusConfig = (status: UploadStatusType['status']) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-4 h-4" />,
          label: 'Ожидает обработки',
          color: 'text-yellow-400',
          bg: 'bg-yellow-900/20',
          border: 'border-yellow-500/30'
        }
      case 'processing':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          label: 'Обрабатывается',
          color: 'text-blue-400',
          bg: 'bg-blue-900/20',
          border: 'border-blue-500/30'
        }
      case 'analyzed':
        return {
          icon: <HourglassIcon className="w-4 h-4" />,
          label: 'На модерации',
          color: 'text-purple-400',
          bg: 'bg-purple-900/20',
          border: 'border-purple-500/30'
        }
      case 'approved':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Одобрено',
          color: 'text-green-400',
          bg: 'bg-green-900/20',
          border: 'border-green-500/30'
        }
      case 'rejected':
        return {
          icon: <XCircle className="w-4 h-4" />,
          label: 'Отклонено',
          color: 'text-red-400',
          bg: 'bg-red-900/20',
          border: 'border-red-500/30'
        }
      case 'completed':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Завершено',
          color: 'text-green-400',
          bg: 'bg-green-900/20',
          border: 'border-green-500/30'
        }
      case 'failed':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          label: 'Ошибка',
          color: 'text-red-400',
          bg: 'bg-red-900/20',
          border: 'border-red-500/30'
        }
      case 'expired':
        return {
          icon: <Clock className="w-4 h-4" />,
          label: 'Истекло',
          color: 'text-gray-400',
          bg: 'bg-gray-900/20',
          border: 'border-gray-500/30'
        }
      default:
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          label: status,
          color: 'text-gray-400',
          bg: 'bg-gray-900/20',
          border: 'border-gray-500/30'
        }
    }
  }

  const config = getStatusConfig(upload.status)

  return (
    <div className={`p-3 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className={config.color}>
            {config.icon}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${config.color}`}>
                {config.label}
              </span>
              {upload.resource_name && (
                <span className="text-xs text-gray-400">
                  • {upload.resource_name}
                </span>
              )}
            </div>
            
            <div className="text-xs text-gray-400">
              Файл: {upload.original_file_name}
            </div>
            
            {upload.rejection_reason && (
              <div className="text-xs text-red-300 mt-1">
                Причина: {upload.rejection_reason}
              </div>
            )}
            
            {upload.approved_by && (
              <div className="text-xs text-green-300 mt-1">
                Одобрено администратором
              </div>
            )}
          </div>
        </div>
        
        {onRefresh && upload.status !== 'approved' && upload.status !== 'completed' && upload.status !== 'rejected' && (
          <button
            onClick={onRefresh}
            className="px-2 py-1 text-xs rounded bg-base-800 hover:bg-base-700 text-gray-300 transition-all"
          >
            Обновить
          </button>
        )}
      </div>
    </div>
  )
}

export default UploadStatus

