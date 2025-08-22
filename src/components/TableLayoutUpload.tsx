'use client'

import { useState } from 'react'

interface TableLayoutUploadProps {
  currentImageUrl?: string | null
  onImageUpload: (file: File) => Promise<boolean>
  onImageDelete?: () => Promise<boolean>
  disabled?: boolean
}

export default function TableLayoutUpload({
  currentImageUrl,
  onImageUpload,
  onImageDelete,
  disabled = false
}: TableLayoutUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || disabled) return

    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      setUploadError('이미지 파일만 업로드 가능합니다.')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const success = await onImageUpload(file)
      if (!success) {
        setUploadError('이미지 업로드에 실패했습니다.')
      }
    } catch (error) {
      console.error('이미지 업로드 중 오류:', error)
      setUploadError('이미지 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
    
    // 입력 초기화
    event.target.value = ''
  }

  const handleDelete = async () => {
    if (!onImageDelete || disabled) return
    
    if (!confirm('테이블 모식도를 삭제하시겠습니까?')) return

    setIsUploading(true)
    try {
      await onImageDelete()
    } catch (error) {
      console.error('이미지 삭제 중 오류:', error)
      setUploadError('이미지 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">테이블 배치도</h3>
        <p className="text-sm text-gray-600">
          테이블 배치 모식도를 업로드하면 참가자들이 자리를 쉽게 찾을 수 있습니다.
        </p>
      </div>

      {currentImageUrl ? (
        // 이미지가 이미 업로드된 경우
        <div className="space-y-4">
          <div className="relative border-2 border-gray-200 rounded-lg p-4">
            <img
              src={currentImageUrl}
              alt="테이블 배치도"
              className="w-full h-auto max-h-96 object-contain rounded"
              onError={() => setUploadError('이미지를 불러올 수 없습니다.')}
            />
            {onImageDelete && (
              <button
                onClick={handleDelete}
                disabled={disabled || isUploading}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="이미지 삭제"
              >
                🗑️
              </button>
            )}
          </div>
          
          {/* 교체용 업로드 영역 */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={disabled || isUploading}
              className="hidden"
              id="replace-upload"
            />
            <label
              htmlFor="replace-upload"
              className={`cursor-pointer text-gray-600 ${
                disabled || isUploading ? 'cursor-not-allowed opacity-50' : 'hover:text-blue-600'
              }`}
            >
              <p className="text-sm">
                {isUploading ? '업로드 중...' : '클릭하여 새로운 이미지로 교체'}
              </p>
            </label>
          </div>
        </div>
      ) : (
        // 이미지가 없는 경우
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={disabled || isUploading}
            className="hidden"
            id="initial-upload"
          />
          <label
            htmlFor="initial-upload"
            className={`cursor-pointer text-gray-600 ${
              disabled || isUploading ? 'cursor-not-allowed opacity-50' : 'hover:text-blue-600'
            }`}
          >
            <div className="text-4xl mb-4">📋</div>
            <p className="text-lg font-medium mb-2">
              {isUploading ? '업로드 중...' : '테이블 배치도를 업로드하세요'}
            </p>
            {!isUploading && (
              <p className="text-sm">
                PNG, JPG, JPEG, GIF, WebP, SVG 파일 지원<br />
                최대 5MB까지 업로드 가능
              </p>
            )}
          </label>
        </div>
      )}

      {uploadError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{uploadError}</p>
          <button
            onClick={() => setUploadError(null)}
            className="mt-1 text-xs text-red-500 hover:text-red-700"
          >
            오류 메시지 닫기
          </button>
        </div>
      )}
    </div>
  )
}