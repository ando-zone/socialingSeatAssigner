export default function AuthCodeError() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            인증 오류
          </h1>
          <p className="text-gray-600 mb-6">
            로그인 중 오류가 발생했습니다. 다시 시도해 주세요.
          </p>
          <a
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors"
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  )
} 