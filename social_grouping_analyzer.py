import math
from typing import Tuple, List
import itertools
import random


class SocialGroupingAnalyzer:
    """
    소셜 그룹핑 문제 분석기
    
    N명의 사람을 n명씩 그룹으로 나누어 여러 라운드 진행할 때,
    이전에 만난 적 없는 사람들끼리 매칭하는 문제를 분석합니다.
    """
    
    def __init__(self, total_people: int, group_size: int):
        """
        Args:
            total_people (int): 전체 참가자 수 (N)
            group_size (int): 그룹당 인원 수 (n)
        """
        self.N = total_people
        self.n = group_size
        
        # 기본 검증
        if self.N % self.n != 0:
            raise ValueError(f"전체 인원({self.N})이 그룹 크기({self.n})로 나누어떨어지지 않습니다!")
        
        self.num_groups = self.N // self.n
        self._calculate_theoretical_limits()
    
    def _calculate_theoretical_limits(self):
        """이론적 한계 계산"""
        # 전체 가능한 사람 쌍의 수
        self.total_pairs = self.N * (self.N - 1) // 2
        
        # 한 그룹에서 생성되는 쌍의 수
        self.pairs_per_group = self.n * (self.n - 1) // 2
        
        # 한 라운드에서 소모되는 쌍의 수
        self.pairs_per_round = self.num_groups * self.pairs_per_group
        
        # 이론적 최대 라운드 수
        self.max_theoretical_rounds = self.total_pairs / self.pairs_per_round
        
        # 실제 가능한 최대 라운드 수 (정수)
        self.max_practical_rounds = int(self.max_theoretical_rounds)
    
    def print_analysis(self):
        """분석 결과를 한글로 출력"""
        print("=" * 60)
        print("🎯 소셜 그룹핑 문제 분석 결과")
        print("=" * 60)
        print()
        
        print("📊 기본 정보:")
        print(f"   • 전체 참가자 수: {self.N}명")
        print(f"   • 그룹당 인원 수: {self.n}명")
        print(f"   • 라운드당 그룹 수: {self.num_groups}개")
        print()
        
        print("🔢 수학적 분석:")
        print(f"   • 전체 가능한 만남의 수: C({self.N}, 2) = {self.total_pairs:,}가지")
        print(f"     └─ {self.N}명 중 2명씩 짝을 만드는 경우의 수")
        print()
        print(f"   • 한 그룹에서 생성되는 만남: C({self.n}, 2) = {self.pairs_per_group}가지")
        print(f"     └─ {self.n}명이 모두 서로 만나는 조합")
        print()
        print(f"   • 한 라운드에서 소모되는 만남: {self.num_groups} × {self.pairs_per_group} = {self.pairs_per_round}가지")
        print(f"     └─ {self.num_groups}개 그룹에서 총 만남의 수")
        print()
        
        print("⏱️ 라운드 한계:")
        print(f"   • 이론적 최대 라운드: {self.total_pairs:,} ÷ {self.pairs_per_round} = {self.max_theoretical_rounds:.2f}라운드")
        print(f"   • 실제 가능한 최대 라운드: {self.max_practical_rounds}라운드")
        print()
        
        if self.max_practical_rounds >= 3:
            difficulty = "🟢 가능함 (충분한 라운드)"
        elif self.max_practical_rounds >= 1:
            difficulty = "🟡 제한적 가능 (적은 라운드)"
        else:
            difficulty = "🔴 불가능 (라운드 부족)"
        
        print(f"✅ 실현 가능성: {difficulty}")
        print()
        
        # 간단한 공식 설명
        theoretical_formula = (self.N - 1) / (self.n - 1)
        print("📐 간단한 공식:")
        print(f"   최대 라운드 ≈ (N-1) ÷ (n-1) = ({self.N}-1) ÷ ({self.n}-1) = {theoretical_formula:.2f}")
        print("   (이 공식은 수학적 근사치입니다)")
        print()
        
        print("💡 해석:")
        if self.max_practical_rounds <= 2:
            print("   ⚠️  라운드 수가 매우 적어서 실용성이 떨어집니다.")
            print("   💡 그룹 크기를 줄이거나 전체 인원을 늘리는 것을 고려해보세요.")
        elif self.max_practical_rounds <= 4:
            print("   ✅ 적당한 수의 라운드가 가능합니다.")
            print("   💡 실제 구현 시 완벽한 해답을 찾기는 어려울 수 있습니다.")
        else:
            print("   🎉 충분한 수의 라운드가 가능합니다!")
            print("   💡 실제 구현도 비교적 수월할 것으로 예상됩니다.")
        
        print("=" * 60)
    
    def compare_scenarios(self, scenarios: List[Tuple[int, int]]):
        """여러 시나리오 비교"""
        print("\n🔍 시나리오 비교:")
        print("-" * 80)
        print(f"{'총인원':>6} | {'그룹크기':>8} | {'그룹수':>6} | {'최대라운드':>10} | {'총만남수':>8} | {'평가':>12}")
        print("-" * 80)
        
        for total, group in scenarios:
            try:
                analyzer = SocialGroupingAnalyzer(total, group)
                if analyzer.max_practical_rounds >= 4:
                    rating = "🎉 훌륭"
                elif analyzer.max_practical_rounds >= 2:
                    rating = "✅ 양호"
                elif analyzer.max_practical_rounds >= 1:
                    rating = "⚠️  제한적"
                else:
                    rating = "❌ 불가능"
                
                print(f"{total:>6} | {group:>8} | {analyzer.num_groups:>6} | "
                      f"{analyzer.max_practical_rounds:>10} | {analyzer.total_pairs:>8,} | {rating:>12}")
            except ValueError:
                print(f"{total:>6} | {group:>8} | {'N/A':>6} | {'N/A':>10} | {'N/A':>8} | {'❌ 오류':>12}")
        
        print("-" * 80)


def main():
    """메인 실행 함수"""
    print("🎪 소셜 그룹핑 분석기")
    print()
    
    # 기본 예시 (사용자가 제시한 케이스)
    print("📝 예시 1: 사용자가 제시한 케이스")
    analyzer1 = SocialGroupingAnalyzer(50, 10)
    analyzer1.print_analysis()
    
    # 다양한 시나리오 비교
    scenarios = [
        (50, 10),   # 원래 케이스
        (30, 6),    # 좀 더 작은 규모
        (24, 4),    # 더 작은 그룹
        (40, 8),    # 중간 규모
        (60, 12),   # 큰 규모
        (20, 5),    # 작은 규모
        (15, 3),    # 매우 작은 그룹
    ]
    
    analyzer1.compare_scenarios(scenarios)
    
    print("\n💡 결론:")
    print("• 50명을 10명씩 5그룹으로 나누는 경우 최대 5라운드까지 가능합니다!")
    print("• 실제 구현 시에는 완벽한 해답을 찾기 어려울 수 있어 4라운드 정도가 현실적입니다.")
    print("• 그룹 크기가 작을수록 더 많은 라운드가 가능해집니다.")


if __name__ == "__main__":
    main() 