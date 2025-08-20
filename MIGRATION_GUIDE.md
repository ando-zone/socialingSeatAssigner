# 마이그레이션 가이드: localStorage → Supabase 전용

## 변경 사항 요약

### 1. 저장소 통일
- **이전**: localStorage + Supabase 하이브리드
- **이후**: Supabase 전용 (localStorage 완전 제거)

### 2. 새로운 파일 구조
- `data-service.ts`: 새로운 통합 데이터 서비스
- `meeting-storage.ts`: deprecated (호환성 래퍼 제공)
- `storage-strategy.ts`: 사용하지 않음 (단일 전략으로 단순화)

### 3. API 변경사항

#### 기존 코드 (동기식)
```typescript
import { meetingStorage } from '@/utils/meeting-storage'

// 동기식 호출
const participants = meetingStorage.getParticipants()
meetingStorage.setParticipants(newParticipants)
```

#### 새로운 코드 (비동기식)
```typescript
import { participantService } from '@/utils/data-service'

// 비동기식 호출
const participants = await participantService.get()
await participantService.save(newParticipants)
```

## 마이그레이션 단계

### 1. 환경 변수 설정 필수
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Import 변경
```typescript
// 기존
import { meetingStorage } from '@/utils/meeting-storage'

// 신규
import { 
  participantService,
  groupingResultService,
  roundService,
  exitedParticipantService,
  groupSettingsService,
  snapshotService,
  dataService
} from '@/utils/data-service'
```

### 3. 함수 호출 패턴 변경

#### 참가자 관리
```typescript
// 기존
const participants = meetingStorage.getParticipants()
meetingStorage.setParticipants(participants)

// 신규
const participants = await participantService.get()
await participantService.save(participants)
```

#### 그룹 결과
```typescript
// 기존
const result = meetingStorage.getGroupingResult()
meetingStorage.setGroupingResult(result)

// 신규
const result = await groupingResultService.get()
await groupingResultService.save(result)
```

#### 라운드 관리
```typescript
// 기존
const round = meetingStorage.getCurrentRound()
meetingStorage.setCurrentRound(round)

// 신규  
const round = await roundService.get()
await roundService.save(round)
```

### 4. 컴포넌트 수정 가이드

#### useEffect 패턴
```typescript
// 기존
useEffect(() => {
  const data = meetingStorage.getParticipants()
  setParticipants(data)
}, [])

// 신규
useEffect(() => {
  const loadData = async () => {
    try {
      const data = await participantService.get()
      setParticipants(data)
    } catch (error) {
      console.error('데이터 로딩 실패:', error)
    }
  }
  loadData()
}, [])
```

#### 이벤트 핸들러
```typescript
// 기존
const handleAddParticipant = () => {
  const newParticipants = [...participants, newParticipant]
  meetingStorage.setParticipants(newParticipants)
  setParticipants(newParticipants)
}

// 신규
const handleAddParticipant = async () => {
  try {
    const newParticipants = [...participants, newParticipant]
    await participantService.save(newParticipants)
    setParticipants(newParticipants)
  } catch (error) {
    console.error('참가자 추가 실패:', error)
  }
}
```

## 장점

1. **데이터 일관성**: 단일 저장소로 동기화 문제 해결
2. **실시간 협업**: 여러 사용자가 동시에 모임 관리 가능
3. **데이터 지속성**: 브라우저를 닫아도 데이터 유지
4. **백업/복원**: 자동 백업 및 히스토리 관리
5. **성능 향상**: 중복 저장 제거

## 주의사항

1. **네트워크 의존성**: 오프라인에서 사용 불가
2. **에러 처리**: 네트워크 오류에 대한 적절한 에러 처리 필요
3. **로딩 상태**: 비동기 호출에 따른 로딩 상태 관리 필요
4. **환경 설정**: Supabase 환경 변수 필수 설정

## 롤백 계획

문제 발생 시 `meeting-storage.ts`의 래퍼 함수를 통해 임시 호환성 유지 가능하지만, 장기적으로는 새로운 구조로 완전 마이그레이션 권장.