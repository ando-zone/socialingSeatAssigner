/**
 * Authentication Code Error Page
 * 
 * OAuth 인증 과정에서 오류가 발생했을 때 표시되는 에러 페이지입니다.
 * 주로 다음과 같은 경우에 표시됩니다:
 * - 인증 코드가 유효하지 않거나 만료된 경우
 * - OAuth 프로바이더(Google 등)에서 에러가 발생한 경우
 * - 네트워크 오류로 인한 인증 실패
 * 
 * 사용자에게 친화적인 에러 메시지와 함께 홈으로 돌아갈 수 있는
 * 링크를 제공합니다.
 */

/**
 * 인증 오류 페이지 컴포넌트
 * OAuth 인증 실패 시 표시되는 에러 화면을 렌더링합니다.
 * 
 * @returns {JSX.Element} 인증 오류 안내 UI
 */
export default function AuthCodeError() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          {/* 오류 아이콘 */}
          <div className="text-red-500 text-6xl mb-4">❌</div>
          
          {/* 에러 제목 */}
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            인증 오류
          </h1>
          
          {/* 에러 설명 메시지 */}
          <p className="text-gray-600 mb-6">
            로그인 중 오류가 발생했습니다. 다시 시도해 주세요.
          </p>
          
          {/* 홈으로 이동 버튼 */}
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