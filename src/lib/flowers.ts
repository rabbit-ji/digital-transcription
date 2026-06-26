export type Season = "봄" | "여름" | "가을" | "겨울";

export interface FlowerData {
  name: string;
  meaning: string;
  season: Season;
  emoji: string;
}

export function getSeason(isoDate: string): Season {
  const month = new Date(isoDate).getMonth() + 1;
  if (month >= 3 && month <= 5) return "봄";
  if (month >= 6 && month <= 8) return "여름";
  if (month >= 9 && month <= 11) return "가을";
  return "겨울";
}

export function getFlowersBySeason(season: Season): FlowerData[] {
  return FLOWERS.filter((f) => f.season === season);
}

export const FLOWERS: FlowerData[] = [
  // 봄
  { name: "벚꽃", meaning: "삶의 아름다움, 덧없음", season: "봄", emoji: "🌸" },
  { name: "튤립", meaning: "사랑의 고백, 완벽한 사랑", season: "봄", emoji: "🌷" },
  { name: "민들레", meaning: "행복, 사랑의 신탁", season: "봄", emoji: "🌼" },
  { name: "라일락", meaning: "첫사랑, 순결한 사랑", season: "봄", emoji: "🪻" },
  { name: "수선화", meaning: "자아도취, 신비", season: "봄", emoji: "🌼" },
  { name: "히아신스", meaning: "겸손한 사랑, 슬픔의 극복", season: "봄", emoji: "🪻" },
  { name: "매화", meaning: "인내, 역경을 이기는 용기", season: "봄", emoji: "🌸" },
  { name: "목련", meaning: "고귀함, 자연 사랑", season: "봄", emoji: "🌷" },
  { name: "개나리", meaning: "희망, 기대", season: "봄", emoji: "🌼" },
  { name: "팬지", meaning: "그리움, 사색", season: "봄", emoji: "🪷" },
  { name: "봄맞이", meaning: "새 출발, 희망찬 시작", season: "봄", emoji: "🌸" },
  { name: "프리지아", meaning: "순결, 천진난만함", season: "봄", emoji: "🌼" },
  { name: "아네모네", meaning: "기대, 설렘", season: "봄", emoji: "🌺" },
  { name: "은방울꽃", meaning: "행복이 찾아온다", season: "봄", emoji: "🌷" },
  // 여름
  { name: "해바라기", meaning: "당신만 바라본다, 희망", season: "여름", emoji: "🌻" },
  { name: "장미", meaning: "열정적인 사랑, 아름다움", season: "여름", emoji: "🌹" },
  { name: "수국", meaning: "진심, 변덕스러운 마음", season: "여름", emoji: "🪷" },
  { name: "라벤더", meaning: "기다림, 침묵의 사랑", season: "여름", emoji: "🪻" },
  { name: "백합", meaning: "순수, 고귀함", season: "여름", emoji: "🌸" },
  { name: "나팔꽃", meaning: "덧없는 사랑, 하루의 소중함", season: "여름", emoji: "🌺" },
  { name: "능소화", meaning: "그리움, 기다림", season: "여름", emoji: "🌺" },
  { name: "패랭이꽃", meaning: "순수한 사랑, 재능", season: "여름", emoji: "🌷" },
  { name: "연꽃", meaning: "청결, 군자의 덕", season: "여름", emoji: "🪷" },
  { name: "클레마티스", meaning: "마음의 아름다움", season: "여름", emoji: "🪻" },
  { name: "제라늄", meaning: "진실한 우정", season: "여름", emoji: "🌹" },
  { name: "맨드라미", meaning: "시들지 않는 사랑, 불사", season: "여름", emoji: "🌺" },
  { name: "봉숭아", meaning: "나를 건드리지 마세요, 단념", season: "여름", emoji: "🌸" },
  // 가을
  { name: "코스모스", meaning: "순정, 소녀의 사랑", season: "가을", emoji: "🌸" },
  { name: "국화", meaning: "고결, 진실", season: "가을", emoji: "🌼" },
  { name: "금잔화", meaning: "이별의 슬픔, 기다림", season: "가을", emoji: "🌺" },
  { name: "달리아", meaning: "우아함, 화려함", season: "가을", emoji: "🌷" },
  { name: "과꽃", meaning: "추억, 신뢰", season: "가을", emoji: "🪷" },
  { name: "천일홍", meaning: "변치 않는 사랑, 영원", season: "가을", emoji: "🌺" },
  { name: "용담", meaning: "슬픈 그대가 좋아", season: "가을", emoji: "🪻" },
  { name: "쑥부쟁이", meaning: "기억, 아름다운 추억", season: "가을", emoji: "🌸" },
  { name: "억새", meaning: "활력, 생명력", season: "가을", emoji: "🌼" },
  { name: "제비꽃", meaning: "겸손, 성실함", season: "가을", emoji: "🪻" },
  { name: "구절초", meaning: "순수한 사랑, 그리움", season: "가을", emoji: "🌸" },
  { name: "메리골드", meaning: "긍정, 창의적인 삶", season: "가을", emoji: "🌻" },
  { name: "흑종초", meaning: "사랑의 당혹감, 독특함", season: "가을", emoji: "🪷" },
  // 겨울
  { name: "동백꽃", meaning: "고결한 이성, 완벽한 사랑", season: "겨울", emoji: "🌺" },
  { name: "크리스마스로즈", meaning: "추억, 위안", season: "겨울", emoji: "🌸" },
  { name: "설강화", meaning: "희망, 위로", season: "겨울", emoji: "🌷" },
  { name: "시클라멘", meaning: "내성적인 아름다움, 수줍음", season: "겨울", emoji: "🪷" },
  { name: "포인세티아", meaning: "나의 마음은 불타고 있다", season: "겨울", emoji: "🌺" },
  { name: "복수초", meaning: "영원한 행복, 새봄의 기쁨", season: "겨울", emoji: "🌼" },
  { name: "남천", meaning: "전화위복, 어려움 극복", season: "겨울", emoji: "🌹" },
];
