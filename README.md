# 🎪 소셜링 자리 배치 프로그램 (Socialing Seat Assigner)

모임에서 참가자들이 매 라운드마다 새로운 사람들과 만날 수 있도록 최적화된 자리 배치를 제공하는 웹 애플리케이션입니다.

## 🎯 프로젝트 목표

- **새로운 만남 극대화**: 매 라운드마다 이전에 만나지 않았던 사람들끼리 그룹을 구성
- **성별 균형 고려**: 각 그룹의 성별 비율을 균형있게 배치
- **MBTI 균형 고려**: 외향형/내향형 비율을 고려한 그룹 구성
- **최적화 알고리즘**: 유전 알고리즘을 사용하여 최적의 그룹 조합 찾기
- **실시간 관리**: 직관적인 웹 인터페이스로 실시간 모임 관리

## 🌐 라이브 데모

**배포된 서비스**: [https://dohyeonan.github.io/socialingSeatAssigner/](https://dohyeonan.github.io/socialingSeatAssigner/)

## 📁 프로젝트 구조

```
socialingSeatAssigner/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── auth/               # 인증 관련 페이지
│   │   ├── result/             # 그룹 배치 결과 페이지
│   │   ├── layout.tsx          # 레이아웃 컴포넌트
│   │   └── page.tsx            # 메인 페이지
│   ├── components/             # React 컴포넌트
│   │   ├── Auth.tsx           # 인증 컴포넌트
│   │   ├── MeetingSelector.tsx # 모임 선택 컴포넌트
│   │   └── SeatingChart.tsx   # 자리 배치 차트
│   ├── utils/                  # 유틸리티 함수들
│   │   ├── backup.ts          # 백업/복원 기능
│   │   ├── database.ts        # Supabase 데이터베이스 연동
│   │   └── grouping.ts        # 그룹 배치 알고리즘
│   └── lib/                   # 라이브러리 설정
├── supabase-schema.sql        # 데이터베이스 스키마
├── next.config.ts             # Next.js 설정
└── package.json               # 의존성 관리
```

## ✨ 주요 기능

### 🎨 직관적인 웹 인터페이스
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 모든 디바이스 지원
- **실시간 UI**: 참가자 추가/제거, 그룹 배치 결과를 실시간으로 확인
- **드래그 앤 드롭**: 그룹 간 참가자 이동 및 자리 변경 지원
- **탭 기반 네비게이션**: 그룹 관리, 통계, 자리 배치 차트 분리

### 👥 참가자 관리
- **개별 추가**: 이름, 성별, MBTI(외향형/내향형) 정보 관리
- **벌크 추가**: 여러 명을 한 번에 추가 (CSV, 공백 구분 등 다양한 형식 지원)
- **실시간 통계**: 성별 비율, MBTI 비율 실시간 표시
- **만남 기록**: 참가자별 이전 만남 기록 자동 추적

### 🤖 지능형 그룹 배치
- **자동 모드**: 동일한 크기로 자동 그룹 생성
- **수동 모드**: 각 그룹별 개별 인원 수 설정 가능
- **유전 알고리즘**: 최적의 그룹 조합을 찾는 고도화된 알고리즘
- **균형 최적화**: 성별, MBTI, 이전 만남을 종합적으로 고려

### 📊 시각적 자리 배치
- **자리 배치 차트**: 실제 테이블 배치를 시각적으로 표현
- **다양한 테이블 형태**: 그룹 크기에 따른 최적 테이블 배치
- **인쇄 지원**: 실제 모임에서 사용할 수 있는 인쇄 친화적 레이아웃
- **좌석 번호**: 각 참가자의 구체적인 좌석 위치 표시

### 💾 백업 및 복원
- **자동 스냅샷**: 주요 작업 시점마다 자동 백업 생성
- **JSON 내보내기/가져오기**: 모임 데이터의 완전한 백업 및 복원
- **버전 관리**: 여러 시점으로의 복원 지원
- **데이터 마이그레이션**: 이전 버전 데이터 자동 호환

### 🔐 사용자 인증 및 모임 관리
- **Supabase 인증**: 이메일 기반 사용자 인증
- **다중 모임 관리**: 사용자별 여러 모임 독립 관리
- **로컬스토리지 대체**: Supabase 미설정 시 로컬 저장소 사용
- **데이터 동기화**: 클라우드와 로컬 데이터의 하이브리드 관리

## 🛠️ 기술 스택

### Frontend
- **Next.js 15**: React 기반 풀스택 프레임워크
- **React 19**: 최신 React 기능 활용
- **TypeScript**: 타입 안전성 보장
- **Tailwind CSS**: 유틸리티 퍼스트 CSS 프레임워크

### Backend & Database
- **Supabase**: PostgreSQL 기반 Backend-as-a-Service
- **Row Level Security**: 사용자별 데이터 보안
- **실시간 동기화**: 실시간 데이터 업데이트

### 배포 & 개발
- **Vercel/GitHub Pages**: 정적 사이트 배포
- **ESLint**: 코드 품질 관리
- **PostCSS**: CSS 후처리

## 🚀 시작하기

### 환경 요구사항
- Node.js 20 이상 (권장)
- npm 또는 yarn

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/dohyeonan/socialingSeatAssigner.git
cd socialingSeatAssigner

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하세요.

### Supabase 설정 (선택사항)

클라우드 동기화를 원하는 경우:

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. `supabase-schema.sql` 파일의 스키마를 Supabase에 적용
3. 환경 변수 설정:
   ```bash
   # .env.local 파일 생성
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

> 💡 **참고**: Supabase 설정 없이도 로컬스토리지를 사용하여 완전히 작동합니다.

## 🚀 배포 가이드

### GitHub Pages 배포

이 프로젝트는 GitHub Actions를 통해 자동으로 배포됩니다.

#### 환경변수 설정 (Supabase 사용 시)

1. **GitHub Repository Settings**로 이동
2. **Secrets and variables** → **Actions** 클릭
3. **Repository secrets**에 다음 변수 추가:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

#### 배포 과정

1. `main` 브랜치에 코드 푸시
2. GitHub Actions가 자동으로 빌드 및 배포 실행
3. https://yourusername.github.io/socialingSeatAssigner 에서 확인

#### 사용자 정의 도메인 설정 (선택사항)

사용자 정의 도메인을 사용하는 경우:

1. GitHub Repository Settings에서 **Pages** 설정
2. **Custom domain**에 도메인 입력
3. DNS 설정에서 CNAME 레코드 추가
4. 환경변수에 `NEXT_PUBLIC_CUSTOM_DOMAIN=true` 추가

### 다른 호스팅 플랫폼

- **Vercel**: Vercel 대시보드에서 환경변수 설정 후 배포
- **Netlify**: netlify.toml 설정 파일 생성 후 환경변수 설정

## 🎲 알고리즘 동작 원리

### 점수 계산 시스템
1. **기존 만남 페널티**: 이전에 만난 적 있는 쌍마다 가중치 적용
2. **성별 불균형 페널티**: 이상적인 성비에서 벗어날 때마다 점수 차감
3. **MBTI 불균형 페널티**: 외향형/내향형 비율 불균형 시 점수 차감
4. **목표**: 총 점수를 최대화 (완벽한 해답일수록 높은 점수)

### 유전 알고리즘
1. **초기 집단 생성**: 참가자들을 랜덤하게 섞어서 여러 그룹 조합 생성
2. **적합도 평가**: 각 조합의 점수 계산
3. **선택 및 교배**: 우수한 조합들을 선택하여 새로운 조합 생성
4. **돌연변이**: 지역 최적해 탈출을 위한 랜덤 변이
5. **반복 최적화**: 최대 1,000세대까지 진화하며 최적해 탐색

## 📊 사용 예시

### 1. 기본 사용법
1. **참가자 추가**: 개별 또는 벌크로 참가자 정보 입력
2. **그룹 설정**: 자동/수동 모드 선택 및 그룹 크기 설정
3. **그룹 배치**: "그룹 배치하기" 버튼으로 최적 배치 실행
4. **결과 확인**: 그룹 구성, 통계, 자리 배치 차트 확인

### 2. 고급 기능
- **드래그 앤 드롭**: 그룹 간 참가자 이동으로 수동 조정
- **스냅샷 복원**: 이전 시점으로 되돌리기
- **데이터 백업**: JSON 파일로 모임 데이터 저장
- **인쇄**: 실제 모임에서 사용할 자리 배치표 출력

## 🎯 실제 활용 사례

- **회사 워크샵**: 부서간 교류 활성화 및 팀 빌딩
- **네트워킹 이벤트**: 참가자간 새로운 인맥 형성 최적화
- **교육 프로그램**: 스터디 그룹 및 프로젝트 팀 구성
- **사교 모임**: 파티나 모임에서의 효율적인 자리 배치
- **컨퍼런스**: 라운드테이블 토론 그룹 구성
- **동창회/동호회**: 새로운 만남과 재회의 균형 조정

## 🔢 수학적 근거

N명을 n명씩 그룹으로 나눌 때:
- **전체 가능한 만남**: C(N, 2) = N×(N-1)÷2
- **라운드당 소모되는 만남**: (N÷n) × C(n, 2)
- **이론적 최대 라운드**: (N-1) ÷ (n-1) (근사치)

예: 72명을 12명씩 → 약 71÷11 = 6.45라운드 → 실제로는 6라운드 가능

## 📝 개발 로드맵

### ✅ 완료된 기능
- [x] Next.js 기반 웹 애플리케이션 구축
- [x] 유전 알고리즘 기반 그룹 최적화
- [x] Supabase 인증 및 데이터베이스 연동
- [x] 시각적 자리 배치 차트
- [x] 백업 및 복원 시스템
- [x] 반응형 웹 디자인
- [x] 다중 모임 관리
- [x] 실시간 데이터 동기화
- [x] GitHub Pages 배포

## 🤝 기여 방법

1. 이 저장소를 Fork 합니다
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push 합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

### 개발 가이드라인
- TypeScript 사용 필수
- ESLint 규칙 준수
- 컴포넌트별 책임 분리
- 테스트 코드 작성 권장

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

**⚠️ 중요**: 이 프로젝트를 사용하거나 수정하여 배포할 때는 반드시 다음과 같이 출처를 표기해야 합니다:
```
원본 프로젝트: Socialing Seat Assigner
작성자: dohyeonan
저장소: https://github.com/dohyeonan/socialingSeatAssigner
```

## 📞 연락처

- **GitHub**: [@dohyeonan](https://github.com/dohyeonan)
- **이슈 보고**: [GitHub Issues](https://github.com/dohyeonan/socialingSeatAssigner/issues)
- **기능 제안**: [GitHub Discussions](https://github.com/dohyeonan/socialingSeatAssigner/discussions)

프로젝트에 대한 질문이나 제안이 있으시면 언제든 연락주세요!

---

🎉 **모든 사람이 새로운 만남을 경험할 수 있는 세상을 만들어갑시다!** 