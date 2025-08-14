-- 📋 성비 설정 기능을 위한 데이터베이스 마이그레이션
-- 🔧 이 SQL을 Supabase 대시보드의 SQL Editor에서 실행하세요.
-- 
-- ⚠️  주의: 이 마이그레이션을 실행하기 전까지는 성비 설정이 저장되지 않습니다.
--     하지만 앱은 정상적으로 작동합니다 (기본 설정만 저장됨).

BEGIN;

-- 1. 🎯 custom_group_genders 컬럼 추가 (각 그룹별 남녀 비율 저장)
ALTER TABLE public.group_settings 
ADD COLUMN IF NOT EXISTS custom_group_genders jsonb DEFAULT '[]'::jsonb NOT NULL;

-- 2. ✅ enable_gender_ratio 컬럼 추가 (성비 설정 활성화 여부)
ALTER TABLE public.group_settings 
ADD COLUMN IF NOT EXISTS enable_gender_ratio boolean DEFAULT false NOT NULL;

-- 3. 🔄 기존 데이터가 있다면 기본 성비로 초기화
UPDATE public.group_settings 
SET custom_group_genders = '[
  {"maleCount": 7, "femaleCount": 5},
  {"maleCount": 7, "femaleCount": 5},
  {"maleCount": 7, "femaleCount": 5},
  {"maleCount": 7, "femaleCount": 5},
  {"maleCount": 7, "femaleCount": 5},
  {"maleCount": 7, "femaleCount": 5}
]'::jsonb
WHERE custom_group_genders = '[]'::jsonb OR custom_group_genders IS NULL;

COMMIT;

-- 4. ✅ 마이그레이션 성공 확인 쿼리
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'group_settings' 
  AND table_schema = 'public'
  AND column_name IN ('custom_group_genders', 'enable_gender_ratio')
ORDER BY ordinal_position;

-- 🎉 마이그레이션 완료!
-- 이제 성비 설정이 영구적으로 저장됩니다.