# 🔍 Socialing Seat Assigner - 리포지토리 분석 가이드

## 📋 목적
이 문서는 Socialing Seat Assigner 레포지토리를 체계적으로 이해하고 리팩토링을 진행하기 위한 순서와 구조를 정리한 가이드입니다.

## 🎯 프로젝트 개요
- **목적**: 모임에서 참가자들이 매 라운드마다 새로운 사람들과 만날 수 있는 최적화된 자리 배치 시스템
- **핵심 기능**: 유전 알고리즘 기반 그룹 최적화, 성별/MBTI 균형, 만남 히스토리 관리
- **기술 스택**: Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase

## 🗂️ 레포지토리 구조 분석

### 1. 프로젝트 루트 파일들
```
📁 /
├── 📄 package.json              # 의존성 및 스크립트 정의
├── 📄 next.config.ts           # Next.js 설정 (GitHub Pages 배포용)
├── 📄 tailwind.config.ts       # Tailwind CSS 설정
├── 📄 supabase-schema.sql      # 데이터베이스 스키마
├── 📄 migration-add-gender-settings.sql # 성별 설정 마이그레이션
└── 📄 README.md                # 프로젝트 문서
```

### 2. 소스 코드 구조 (`src/`)
```
📁 src/
├── 📁 app/                     # Next.js App Router
│   ├── 📄 layout.tsx          # 전역 레이아웃
│   ├── 📄 page.tsx            # 메인 페이지 (참가자 관리, 그룹 설정)
│   ├── 📄 globals.css         # 전역 스타일
│   ├── 📁 result/             # 결과 페이지
│   │   └── 📄 page.tsx        # 그룹 결과 표시, 드래그앤드롭
│   └── 📁 auth/               # 인증 관련 페이지
│       ├── 📁 callback/       # OAuth 콜백
│       └── 📁 auth-code-error/ # 인증 오류
├── 📁 components/              # React 컴포넌트
│   ├── 📄 Auth.tsx           # 사용자 인증 컴포넌트
│   ├── 📄 MeetingSelector.tsx # 모임 선택/관리 컴포넌트
│   └── 📄 SeatingChart.tsx   # 시각적 자리 배치 차트
├── 📁 utils/                  # 핵심 비즈니스 로직
│   ├── 📄 grouping.ts        # ⭐ 그룹 배치 알고리즘 (유전 알고리즘)
│   ├── 📄 database.ts        # ⭐ Supabase 데이터베이스 연동
│   └── 📄 backup.ts          # 백업/복원 시스템
├── 📁 lib/
│   └── 📄 supabase.ts        # Supabase 클라이언트 설정
└── 📁 styles/
    └── 📄 print.css          # 인쇄용 스타일
```

## 🎯 리포지토리 파악 순서

### Phase 1: 아키텍처 이해 (필수)
1. **📄 README.md** - 프로젝트 전체 개요와 기능 파악
2. **📄 package.json** - 의존성, 스크립트, 기술 스택 확인
3. **📄 supabase-schema.sql** - 데이터베이스 구조 이해

### Phase 2: 핵심 비즈니스 로직 (가장 중요)
4. **📄 src/utils/grouping.ts** ⭐
   - `Participant`, `Group`, `GroupingResult` 인터페이스
   - `createOptimalGroups()` - 유전 알고리즘 구현
   - `updateMeetingHistory()` - 만남 히스토리 업데이트
   - 점수 계산 및 최적화 로직

5. **📄 src/utils/database.ts** ⭐
   - Supabase 연동 함수들
   - 데이터 CRUD 작업
   - 로컬스토리지 폴백 로직

### Phase 3: UI 컴포넌트 이해
6. **📄 src/app/layout.tsx** - 전역 레이아웃과 인증 상태 관리
7. **📄 src/components/Auth.tsx** - 사용자 인증 시스템
8. **📄 src/components/MeetingSelector.tsx** - 모임 관리 UI

### Phase 4: 메인 페이지들
9. **📄 src/app/page.tsx** - 메인 페이지 (참가자 관리, 그룹 설정)
10. **📄 src/app/result/page.tsx** - 결과 페이지 (그룹 표시, 드래그앤드롭)

### Phase 5: 특수 기능들
11. **📄 src/components/SeatingChart.tsx** - 시각적 자리 배치
12. **📄 src/utils/backup.ts** - 백업/복원 시스템
13. **📄 src/lib/supabase.ts** - Supabase 클라이언트 설정

## 🔍 주요 데이터 흐름

### 1. 사용자 인증 플로우
```
Auth.tsx → supabase.ts → MeetingSelector.tsx → 메인 페이지
```

### 2. 참가자 관리 플로우
```
page.tsx (메인) → database.ts → Supabase/LocalStorage
```

### 3. 그룹 배치 플로우
```
page.tsx → grouping.ts (유전 알고리즘) → database.ts → result/page.tsx
```

### 4. 백업/복원 플로우
```
backup.ts ↔ database.ts ↔ Supabase/LocalStorage
```

## 🧩 핵심 알고리즘

### 유전 알고리즘 (grouping.ts)
1. **초기 집단 생성**: 랜덤 그룹 조합들 생성
2. **적합도 평가**: 
   - 기존 만남 페널티
   - 성별 균형 점수
   - MBTI 균형 점수
3. **선택 및 교배**: 우수한 조합들로 새 세대 생성
4. **돌연변이**: 지역 최적해 탈출
5. **반복 최적화**: 최대 1,000세대까지 진화

### 데이터 저장 전략
- **Primary**: Supabase (PostgreSQL)
- **Fallback**: LocalStorage
- **백업**: JSON 파일 내보내기/가져오기
- **스냅샷**: 자동 백업 시스템

## 🎨 UI/UX 특징

### 반응형 디자인
- 모바일, 태블릿, 데스크톱 지원
- Tailwind CSS 기반 유틸리티 클래스

### 주요 기능별 UI
- **참가자 관리**: 개별/벌크 추가, 실시간 통계
- **그룹 설정**: 자동/수동 모드, 성비 제약
- **결과 표시**: 탭 기반 (그룹/통계/자리배치)
- **드래그앤드롭**: 그룹 간 참가자 이동

## 🔧 리팩토링 시 고려사항

### 1. 코드 품질 개선
- 긴 함수 분리 (특히 page.tsx의 1600+ 라인)
- 상태 관리 최적화 (Context API 도입 검토)
- 타입 안전성 강화

### 2. 성능 최적화
- 유전 알고리즘 최적화
- 불필요한 리렌더링 방지
- 메모이제이션 적용

### 3. 아키텍처 개선
- 비즈니스 로직과 UI 분리
- 커스텀 훅 도입
- 에러 핸들링 체계화

### 4. 테스트 가능성
- 순수 함수 분리
- 모킹 가능한 구조로 변경
- 단위 테스트 작성 준비

## 📚 학습 우선순위

### High Priority (핵심 이해 필수)
1. **grouping.ts** - 비즈니스 로직의 핵심
2. **database.ts** - 데이터 관리 계층
3. **page.tsx (메인)** - 전체 상태 관리

### Medium Priority (기능 이해)
4. **result/page.tsx** - 결과 표시 및 수정
5. **Auth.tsx & MeetingSelector.tsx** - 사용자 관리

### Low Priority (부가 기능)
6. **SeatingChart.tsx** - 시각화
7. **backup.ts** - 백업 시스템

## 🚀 리팩토링 제안 방향

### 1. 코드 분리
- 거대한 컴포넌트를 작은 단위로 분할
- 비즈니스 로직을 커스텀 훅으로 분리
- 공통 타입 정의 파일 생성

### 2. 상태 관리 개선
- React Context 또는 Zustand 도입 검토
- 로컬 상태와 서버 상태 분리
- 낙관적 업데이트 패턴 적용

### 3. 성능 최적화
- React.memo, useMemo, useCallback 적절히 활용
- 가상화 (react-window) 고려 (참가자 목록이 긴 경우)
- 지연 로딩 적용

이 가이드를 따라 순서대로 코드를 파악하시면 리팩토링에 필요한 전체적인 이해를 얻을 수 있습니다.