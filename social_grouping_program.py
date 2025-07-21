import random
import itertools
from typing import List, Set, Tuple, Dict
from collections import defaultdict
import json
from datetime import datetime


class Person:
    """참가자 클래스"""
    def __init__(self, nickname: str, gender: str):
        self.nickname = nickname
        self.gender = gender
        self.id = nickname  # 간단히 닉네임을 ID로 사용
    
    def __repr__(self):
        return f"{self.nickname}({self.gender})"
    
    def __hash__(self):
        return hash(self.nickname)
    
    def __eq__(self, other):
        return self.nickname == other.nickname


class SocialGroupingProgram:
    """소셜 그룹핑 프로그램"""
    
    def __init__(self, people: List[Person], group_size: int):
        self.people = people
        self.group_size = group_size
        self.num_groups = len(people) // group_size
        
        # 이전에 만난 사람들 기록 (set of tuples)
        self.previous_meetings: Set[Tuple[str, str]] = set()
        
        # 라운드 히스토리
        self.round_history: List[List[List[Person]]] = []
        self.current_round = 0
        
        print(f"🎪 소셜 그룹핑 프로그램 시작!")
        print(f"👥 총 {len(people)}명, {group_size}명씩 {self.num_groups}그룹으로 진행")
        print()
    
    def generate_mock_people(num_people: int = 72) -> List[Person]:
        """Mock 데이터 생성"""
        
        # 한국식 닉네임 예시들
        male_nicknames = [
            "코딩왕", "개발자김", "파이썬맨", "자바킹", "리액트보이", "노드마스터",
            "알고리즘천재", "풀스택개발자", "백엔드고수", "프론트마법사", "데이터분석가", "ML엔지니어",
            "시스템관리자", "클라우드전문가", "사이버보안", "게임개발자", "모바일앱메이커", "웹디자이너",
            "데브옵스", "소프트웨어아키텍트", "테크리더", "스타트업CEO", "블록체인개발자", "AI연구원",
            "로봇공학자", "사물인터넷", "빅데이터전문가", "클린코더", "애자일코치", "스크럼마스터",
            "코드리뷰어", "버그헌터", "퍼포먼스튜너", "보안전문가", "인프라엔지니어", "솔루션아키텍트"
        ]
        
        female_nicknames = [
            "코딩퀸", "개발자박", "파이썬걸", "자바프린세스", "리액트걸", "노드여신",
            "알고리즘요정", "풀스택개발녀", "백엔드달인", "프론트엔젤", "데이터사이언티스트", "AI연구원",
            "UX디자이너", "UI전문가", "테크라이터", "품질관리", "테스트자동화", "모바일디자이너",
            "제품기획자", "프로젝트매니저", "애자일전문가", "사용자경험", "인터랙션디자이너", "비주얼디자이너",
            "콘텐츠전략가", "소셜미디어", "커뮤니티매니저", "테크에반젤리스트", "개발자관계", "오픈소스기여자",
            "코드멘토", "테크블로거", "컨퍼런스스피커", "워크샵진행자", "온라인교육자", "테크유튜버"
        ]
        
        people = []
        male_count = 0
        female_count = 0
        
        # 성비를 맞추기 위해 절반씩
        target_male = num_people // 2
        target_female = num_people - target_male
        
        # 닉네임 풀 확장 (부족한 경우 숫자 추가)
        extended_male = male_nicknames * 3 + [f"개발자{i}" for i in range(100)]
        extended_female = female_nicknames * 3 + [f"개발녀{i}" for i in range(100)]
        
        random.shuffle(extended_male)
        random.shuffle(extended_female)
        
        # 남성 추가
        for i in range(target_male):
            people.append(Person(extended_male[i], "남"))
            male_count += 1
        
        # 여성 추가
        for i in range(target_female):
            people.append(Person(extended_female[i], "여"))
            female_count += 1
        
        random.shuffle(people)
        
        print(f"📊 Mock 데이터 생성 완료: 총 {num_people}명 (남 {male_count}명, 여 {female_count}명)")
        return people
    
    def add_meetings(self, groups: List[List[Person]]):
        """그룹 내 모든 만남을 기록"""
        for group in groups:
            # 그룹 내 모든 쌍을 기록
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    person1, person2 = group[i].nickname, group[j].nickname
                    # 알파벳 순으로 정렬해서 저장 (중복 방지)
                    if person1 < person2:
                        self.previous_meetings.add((person1, person2))
                    else:
                        self.previous_meetings.add((person2, person1))
    
    def get_meeting_count(self, person1: Person, person2: Person) -> int:
        """두 사람이 만난 횟수 반환"""
        key = tuple(sorted([person1.nickname, person2.nickname]))
        return 1 if key in self.previous_meetings else 0
    
    def calculate_group_score(self, group: List[Person]) -> int:
        """그룹의 점수 계산 (낮을수록 좋음)"""
        score = 0
        
        # 이전에 만난 적 있는 쌍의 개수
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                score += self.get_meeting_count(group[i], group[j])
        
        return score
    
    def calculate_gender_balance_score(self, group: List[Person]) -> int:
        """성별 균형 점수 계산 (낮을수록 좋음)"""
        male_count = sum(1 for p in group if p.gender == "남")
        female_count = len(group) - male_count
        
        # 이상적인 비율에서 벗어난 정도
        ideal_male = self.group_size // 2
        ideal_female = self.group_size - ideal_male
        
        return abs(male_count - ideal_male) + abs(female_count - ideal_female)
    
    def generate_groups_genetic(self, max_iterations: int = 1000) -> List[List[Person]]:
        """유전 알고리즘으로 최적 그룹 생성"""
        best_groups = None
        best_score = float('inf')
        
        for iteration in range(max_iterations):
            # 사람들을 섞어서 그룹 생성
            shuffled_people = self.people.copy()
            random.shuffle(shuffled_people)
            
            groups = []
            for i in range(self.num_groups):
                start_idx = i * self.group_size
                end_idx = start_idx + self.group_size
                groups.append(shuffled_people[start_idx:end_idx])
            
            # 점수 계산
            total_score = 0
            for group in groups:
                total_score += self.calculate_group_score(group)
                total_score += self.calculate_gender_balance_score(group) * 2  # 성별 균형에 가중치
            
            if total_score < best_score:
                best_score = total_score
                best_groups = groups.copy()
                
                # 완벽한 해답을 찾으면 조기 종료
                if total_score == 0:
                    print(f"✨ 완벽한 그룹핑을 {iteration+1}번째 시도에서 찾았습니다!")
                    break
        
        print(f"🔍 {max_iterations}번 시도 중 최고 점수: {best_score}")
        return best_groups
    
    def print_groups(self, groups: List[List[Person]], round_num: int):
        """그룹 결과 출력"""
        print(f"\n🎯 라운드 {round_num} 그룹핑 결과:")
        print("=" * 80)
        
        total_previous_meetings = 0
        
        for i, group in enumerate(groups, 1):
            male_count = sum(1 for p in group if p.gender == "남")
            female_count = len(group) - male_count
            
            # 이 그룹에서 이전에 만난 적 있는 쌍의 수
            group_previous_meetings = self.calculate_group_score(group)
            total_previous_meetings += group_previous_meetings
            
            print(f"\n🔸 그룹 {i} (남 {male_count}명, 여 {female_count}명) "
                  f"- 기존 만남: {group_previous_meetings}쌍")
            
            # 그룹원 출력 (4명씩 한 줄)
            for j in range(0, len(group), 4):
                line_people = group[j:j+4]
                line_str = "   " + " | ".join([f"{p.nickname}({p.gender})" for p in line_people])
                print(line_str)
        
        print(f"\n📊 전체 통계:")
        print(f"   • 총 이전 만남 쌍의 수: {total_previous_meetings}")
        print(f"   • 새로운 만남 쌍의 수: {len(groups) * (self.group_size * (self.group_size - 1) // 2) - total_previous_meetings}")
        print("=" * 80)
    
    def create_new_round(self):
        """새로운 라운드 생성"""
        self.current_round += 1
        print(f"\n🚀 라운드 {self.current_round} 그룹핑을 시작합니다...")
        
        # 최적 그룹 생성
        groups = self.generate_groups_genetic()
        
        # 결과 출력
        self.print_groups(groups, self.current_round)
        
        # 만남 기록
        self.add_meetings(groups)
        
        # 히스토리에 저장
        self.round_history.append(groups)
        
        return groups
    
    def show_statistics(self):
        """현재 통계 출력"""
        print(f"\n📈 현재 통계 (라운드 {self.current_round}까지):")
        print(f"   • 총 기록된 만남: {len(self.previous_meetings)}쌍")
        print(f"   • 전체 가능한 만남: {len(self.people) * (len(self.people) - 1) // 2}쌍")
        print(f"   • 진행률: {len(self.previous_meetings) / (len(self.people) * (len(self.people) - 1) // 2) * 100:.1f}%")
        
        if self.current_round > 0:
            theoretical_max = (len(self.people) * (len(self.people) - 1) // 2) // (self.num_groups * (self.group_size * (self.group_size - 1) // 2))
            print(f"   • 이론적 최대 라운드: {theoretical_max}")
            print(f"   • 남은 가능 라운드: 약 {max(0, theoretical_max - self.current_round)}라운드")
    
    def save_history(self, filename: str = None):
        """히스토리를 파일로 저장"""
        if filename is None:
            filename = f"grouping_history_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        history_data = {
            "total_people": len(self.people),
            "group_size": self.group_size,
            "rounds": []
        }
        
        for round_num, groups in enumerate(self.round_history, 1):
            round_data = {
                "round": round_num,
                "groups": [[person.nickname for person in group] for group in groups]
            }
            history_data["rounds"].append(round_data)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(history_data, f, ensure_ascii=False, indent=2)
        
        print(f"💾 히스토리가 {filename}에 저장되었습니다.")


def main():
    """메인 프로그램"""
    print("🎪 소셜 그룹핑 프로그램")
    print("=" * 50)
    
    # Mock 데이터 생성
    people = SocialGroupingProgram.generate_mock_people(72)
    
    # 프로그램 초기화
    program = SocialGroupingProgram(people, 12)
    
    print("\n📋 명령어:")
    print("  • 'go' 또는 'g': 새로운 라운드 시작")
    print("  • 'stat' 또는 's': 현재 통계 보기")
    print("  • 'save': 히스토리 저장")
    print("  • 'quit' 또는 'q': 프로그램 종료")
    print("=" * 50)
    
    while True:
        try:
            command = input("\n🎯 명령어를 입력하세요: ").strip().lower()
            
            if command in ['go', 'g']:
                program.create_new_round()
                program.show_statistics()
                
            elif command in ['stat', 's']:
                program.show_statistics()
                
            elif command == 'save':
                program.save_history()
                
            elif command in ['quit', 'q']:
                print("👋 프로그램을 종료합니다. 즐거운 모임 되세요!")
                break
                
            else:
                print("❌ 알 수 없는 명령어입니다. 'go', 'stat', 'save', 'quit' 중 하나를 입력하세요.")
                
        except KeyboardInterrupt:
            print("\n\n👋 프로그램을 종료합니다.")
            break
        except Exception as e:
            print(f"❌ 오류가 발생했습니다: {e}")


if __name__ == "__main__":
    main() 