# Chrome AI API 테스트 앱 컬렉션

Chrome 브라우저의 혁신적인 AI API들을 테스트하고 활용할 수 있는 종합 웹 애플리케이션 모음입니다.

## 🎯 프로젝트 개요

이 프로젝트는 Chrome의 실험적 AI API들을 활용하여 다양한 학습 및 생산성 도구를 제공합니다. 모든 앱은 브라우저에서 직접 실행되며, 개인정보 보호를 위해 데이터는 로컬에서만 처리됩니다.

## 📱 포함된 애플리케이션

### 1. 🔍 AI 기반 웹페이지 검색 (`ai-search-test.html`)
현재 열린 웹페이지의 내용을 AI가 분석하여 자연어 질문에 답변하는 스마트 검색 도구입니다.

**주요 기능:**
- 페이지 내용 자동 스캔 및 분석
- 자연어 질문 처리 (예: "이 페이지의 주요 내용은 무엇인가요?")
- 실시간 검색 히스토리 관리
- 타이핑 효과와 함께 답변 표시
- 페이지 콘텐츠 통계 (문자 수, 단어 수, 문단 수)

**사용 예시:**
- "이 문서에서 가장 중요한 정보는 무엇인가요?"
- "설정 방법을 단계별로 설명해주세요"
- "이 페이지에 언급된 주요 기능들을 나열해주세요"

### 2. 🧠 Gemini Nano Prompt API 테스트 (`gemini-nano-test.html`)
Chrome의 Gemini Nano AI 모델을 직접 테스트할 수 있는 기본 인터페이스입니다.

**주요 기능:**
- Gemini Nano API 상태 모니터링
- 자유형식 프롬프트 입력 및 AI 응답 생성
- 세션 관리 (생성, 관리, 정리)
- API 가용성 실시간 확인

### 3. 🌐 Chrome Translator API 테스트 (`translator-test.html`)
Chrome의 AI 번역 기능을 테스트할 수 있는 다국어 번역 도구입니다.

**주요 기능:**
- 12개 언어 지원 (한국어, 영어, 중국어, 일본어 등)
- 실시간 AI 번역 (서버 없이 브라우저에서 직접 처리)
- 언어쌍 관리 및 교체 기능
- 예시 문장 제공으로 빠른 테스트 지원

### 4. 🏰 Memory Palace Creator (`memory-palace-creator/`)
Gemini Nano를 활용하여 기억술을 위한 생생한 스토리를 생성하는 AI 도구입니다.

**주요 기능:**
- 외우고 싶은 내용을 기억하기 쉬운 "기억의 궁전" 이야기로 변환
- 6가지 테마 (판타지 성, 우주선, 마법 학교 등)
- 다양한 카테고리 지원 (날짜, 공식, 어휘, 숫자 등)
- 스토리 저장 및 관리 기능
- 다크모드 지원

### 5. 🕸️ 개념 관계 시각화 도구 (`concept-relationship-visualizer/`)
학습 자료에서 개념 간의 연결고리를 발견하고 동적인 개념 맵을 생성하는 고급 학습 도구입니다.

**주요 기능:**
- AI 기반 자동 개념 추출 및 관계 분석
- D3.js 기반 인터랙티브 시각화 (드래그, 줌, 팬)
- 개념 간 관계 강도 시각화
- 누적 학습 시스템 (여러 세션에 걸친 지식 네트워크 구축)
- 실시간 검색 및 필터링 기능

## 🚀 빠른 시작 가이드

### 1. 시스템 준비
```bash
# 1. Chrome 버전 확인
chrome://version/ 에서 127+ 버전 확인

# 2. 필수 플래그 활성화
chrome://flags/#prompt-api-for-gemini-nano → "Enabled"
chrome://flags/#optimization-guide-on-device-model → "Enabled"

# 3. Chrome 재시작
```

### 2. 애플리케이션 실행
각 HTML 파일을 Chrome에서 바로 열거나, 로컬 서버로 실행:
```bash
# Python 사용시
python -m http.server 8000

# Node.js 사용시
npx http-server

# 브라우저에서 접속
http://localhost:8000
```

### 3. 첫 번째 테스트
1. **AI 웹페이지 검색**: `ai-search-test.html` 열기 → 자동 초기화 완료 대기 → 질문 입력
2. **기억의 궁전**: `memory-palace-creator/index.html` 열기 → 테마 선택 → 외울 내용 입력
3. **개념 시각화**: `concept-relationship-visualizer/index.html` 열기 → 학습 자료 입력 → 개념 맵 생성

## 📋 시스템 요구사항

### 필수 요구사항
| 구분 | 요구사항 |
|------|----------|
| **브라우저** | Chrome 127+ (Gemini Nano), Chrome 138+ (Translator) |
| **운영체제** | Windows 10/11, macOS 13+, Linux |
| **하드웨어** | 22GB+ 저장공간, 4GB+ VRAM |
| **네트워크** | 모델 다운로드용 안정적인 연결 |

### Chrome 설정 (중요!)
⚠️ **필수 설정**: 다음 플래그들을 반드시 활성화해야 합니다:
1. `chrome://flags/#prompt-api-for-gemini-nano` → **Enabled**
2. `chrome://flags/#optimization-guide-on-device-model` → **Enabled**
3. Chrome 재시작

## 🔧 API 사용법 및 예시

### Gemini Nano API
```javascript
// 1. API 가용성 확인
const availability = await LanguageModel.availability();
console.log('API 상태:', availability); // 'available', 'downloadable', 'downloading', 'unavailable'

// 2. 세션 생성
const session = await LanguageModel.create();

// 3. 프롬프트 전송
const result = await session.prompt('질문을 입력하세요');
console.log('AI 답변:', result);

// 4. 세션 정리 (메모리 관리)
await session.destroy();
```

### Translator API
```javascript
// 1. 번역기 생성
const translator = await Translator.create({
  sourceLanguage: 'en',    // 출발어
  targetLanguage: 'ko'     // 도착어
});

// 2. 텍스트 번역
const result = await translator.translate('Hello, world!');
console.log('번역 결과:', result); // "안녕하세요, 세계!"

// 3. 번역기 정리
await translator.destroy();
```

### 지원 언어 코드 (BCP 47)
```javascript
const supportedLanguages = {
  'ko': '한국어',      'en': '영어',
  'zh': '중국어(간체)', 'zh-TW': '중국어(번체)',
  'ja': '일본어',      'es': '스페인어',
  'fr': '프랑스어',    'de': '독일어',
  'ru': '러시아어',    'pt': '포르투갈어',
  'it': '이탈리아어',  'ar': '아랍어'
};
```

## 🎯 활용 예시

### 학습 시나리오
1. **논문 읽기**: AI 웹페이지 검색으로 핵심 내용 파악
2. **개념 정리**: 개념 관계 시각화로 지식 구조화
3. **암기 학습**: 기억의 궁전으로 중요 정보 기억술 생성

### 업무 시나리오
1. **문서 분석**: 긴 문서의 주요 내용 빠른 파악
2. **다국어 소통**: 실시간 번역으로 언어 장벽 해결
3. **지식 관리**: 누적 학습으로 전문 지식 네트워크 구축

## 🐛 문제 해결 가이드

### 자주 발생하는 오류

#### 1. "API 객체를 찾을 수 없습니다"
**원인**: Chrome 버전 또는 플래그 설정 문제
**해결방법**:
- Chrome 버전 확인 (127+ 필요)
- `chrome://flags` 에서 관련 플래그 활성화
- Chrome 재시작
- Chrome Canary 사용 권장

#### 2. "모델 다운로드가 필요합니다"
**원인**: AI 모델이 로컬에 다운로드되지 않음
**해결방법**:
- 충분한 저장공간 확보 (22GB+)
- 안정적인 인터넷 연결 확인
- 다운로드 완료까지 대기 (최대 30분)

#### 3. "세션 생성에 실패했습니다"
**원인**: 하드웨어 리소스 부족
**해결방법**:
- 4GB+ VRAM 확인
- 다른 AI 세션들 종료
- 브라우저 재시작 후 재시도

### 성능 최적화 팁
- 한 번에 하나의 AI 세션만 사용
- 사용 완료 후 세션 정리 (destroy() 호출)
- 대용량 텍스트는 2000자 이하로 분할
- 주기적으로 브라우저 캐시 정리

## 📊 기술 스택

### 프론트엔드
- **HTML5**: 시맨틱 마크업
- **CSS3**: 모던 스타일링 (Flexbox, Grid, Animations)
- **JavaScript ES6+**: 모듈 시스템, async/await, 클래스

### AI 통합
- **Gemini Nano Prompt API**: 자연어 처리
- **Chrome Translator API**: 다국어 번역
- **세션 관리**: 메모리 최적화 및 리소스 관리

### 시각화 및 UI
- **D3.js v7**: 데이터 시각화 및 인터랙티브 그래프
- **Tailwind CSS**: 유틸리티 기반 스타일링
- **반응형 디자인**: 모바일 및 데스크톱 지원

### 데이터 관리
- **LocalStorage**: 브라우저 로컬 저장
- **JSON**: 구조화된 데이터 형식
- **IndexedDB**: 대용량 데이터 처리 (향후 지원)

## 🔐 개인정보 보호

모든 AI 처리는 브라우저 내에서 로컬로 수행되며, 사용자 데이터는 외부 서버로 전송되지 않습니다:

- ✅ **오프라인 AI 처리**: 모든 AI 연산은 로컬에서 수행
- ✅ **데이터 로컬 저장**: 사용자 데이터는 브라우저에만 저장
- ✅ **네트워크 격리**: 인터넷 연결 없이도 대부분 기능 사용 가능
- ✅ **개인정보 미수집**: 사용자 식별 정보 수집 없음

## 📈 로드맵

### 진행 중 (2024년 4분기)
- [x] AI 웹페이지 검색 고도화
- [x] 개념 관계 시각화 도구 개발
- [x] 기억의 궁전 테마 확장

### 계획 중 (2025년 1분기)
- [ ] 모바일 앱 반응형 개선
- [ ] 다국어 UI 지원
- [ ] 클라우드 동기화 기능

### 장기 비전
- [ ] 협업 학습 플랫폼
- [ ] 개인화 추천 시스템
- [ ] 플러그인 생태계 구축


**개발**: AI 지원 개발 🤖  
**버전**: 2.0.0  
**마지막 업데이트**: 2024년 12월  
**라이선스**: MIT License