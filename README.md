# Chrome AI API 테스트 앱

Chrome 브라우저에서 AI API들을 테스트할 수 있는 웹 애플리케이션 모음입니다.

## 📱 포함된 앱

### 1. Gemini Nano Prompt API 테스트 (`gemini-nano-test.html`)
Chrome 브라우저에서 Gemini Nano Prompt API를 테스트할 수 있는 웹 애플리케이션입니다.

### 2. Chrome Translator API 테스트 (`translator-test.html`)
Chrome 브라우저에서 AI 번역 기능을 테스트할 수 있는 웹 애플리케이션입니다.

## 🚀 빠른 시작

### Gemini Nano Prompt API
1. `gemini-nano-test.html` 파일을 Chrome 127+에서 열기
2. API 상태 확인 후 "세션 초기화" 버튼 클릭
3. 프롬프트 입력 후 "프롬프트 전송" 버튼 클릭

### Chrome Translator API
1. `translator-test.html` 파일을 Chrome 138+에서 열기
2. 출발어/도착어 선택 (한국어, 영어, 중국어 등)
3. "번역기 생성" 후 텍스트 입력하여 "번역하기" 클릭

## 📋 시스템 요구사항

### 공통 요구사항
- **운영체제**: Windows 10/11, macOS 13+ (Ventura), Linux
- **하드웨어**: 22GB+ 저장공간, 4GB+ VRAM
- **네트워크**: 모델/언어팩 다운로드용 안정적인 연결

### API별 브라우저 요구사항
- **Gemini Nano**: Chrome 127+ (Chrome Canary 권장)
- **Translator**: Chrome 138+ (Chrome Canary 권장)

### Chrome 설정
일부 환경에서는 다음 플래그 활성화가 필요할 수 있습니다:
1. `chrome://flags` 접속
2. "Prompt API for Gemini Nano" 검색 후 활성화
3. Chrome 재시작

## ⚡ 주요 기능

### Gemini Nano (Prompt API)
- **API 상태 모니터링**: `LanguageModel` 객체 및 가용성 확인
- **프롬프트 처리**: 자유형식 텍스트 입력 및 AI 응답 생성
- **세션 관리**: AI 세션 생성, 관리, 정리

### Chrome Translator
- **다국어 지원**: 한국어, 영어, 중국어 등 12개 언어
- **실시간 번역**: 브라우저에서 직접 실행되는 AI 번역
- **언어쌍 관리**: 출발어/도착어 선택 및 교체 기능
- **예시 문장**: 빠른 테스트를 위한 샘플 텍스트 제공

## 🔧 API 사용법

### Gemini Nano API
```javascript
// 1. API 가용성 확인
const availability = await LanguageModel.availability();

// 2. 세션 생성
const session = await LanguageModel.create();

// 3. 프롬프트 전송
const result = await session.prompt('질문을 입력하세요');

// 4. 세션 정리
await session.destroy();
```

### Translator API
```javascript
// 1. 번역기 생성
const translator = await Translator.create({
  sourceLanguage: 'en',
  targetLanguage: 'ko'
});

// 2. 텍스트 번역
const result = await translator.translate('Hello, world!');

// 3. 번역기 정리
await translator.destroy();
```

### 지원되는 상태값
**Gemini Nano**:
- `available`: 즉시 사용 가능
- `downloadable`: 모델 다운로드 후 사용 가능
- `downloading`: 다운로드 중
- `unavailable`: 사용 불가능

**Translator**:
- 언어쌍별 지원 여부 자동 확인
- 필요시 언어팩 자동 다운로드

## 🐛 문제 해결

### 공통 오류
1. **API 객체를 찾을 수 없음**
   - Chrome 버전 확인 (Gemini: 127+, Translator: 138+)
   - chrome://flags에서 관련 플래그 활성화
   - Chrome Canary 사용 권장

2. **모델/언어팩 다운로드 필요**
   - 충분한 저장공간 확보 (22GB+)
   - 안정적인 인터넷 연결 확인
   - 다운로드 완료까지 대기

3. **세션/번역기 생성 실패**
   - 하드웨어 요구사항 확인 (4GB+ VRAM)
   - 다른 AI 세션들 종료 후 재시도
   - 언어쌍 호환성 확인 (Translator)

### Chrome 플래그 설정
Gemini Nano의 경우:
- `chrome://flags/#prompt-api-for-gemini-nano` → Enabled
- `chrome://flags/#optimization-guide-on-device-model` → Enabled

### 로그 확인
브라우저 개발자 도구의 콘솔에서 상세한 로그를 확인할 수 있습니다.

## 🎯 사용 예시

### Gemini Nano 프롬프트
```
안녕하세요! 간단한 자기소개를 해주세요.
봄을 주제로 한 짧은 시를 써주세요.
JavaScript의 async/await와 Promise의 차이점을 설명해주세요.
```

### Translator 번역 예시
```
Hello, how are you today? → 안녕하세요, 오늘 어떻게 지내세요?
Where is the nearest restaurant? → 가장 가까운 식당이 어디에 있나요?
Thank you very much for your help. → 도움을 주셔서 정말 감사합니다.
```

### 지원 언어 (BCP 47 코드)
- 한국어 (ko), 영어 (en)
- 중국어 간체 (zh), 중국어 번체 (zh-TW)
- 일본어 (ja), 스페인어 (es), 프랑스어 (fr)
- 독일어 (de), 러시아어 (ru), 포르투갈어 (pt)
- 이탈리아어 (it), 아랍어 (ar)

## 📝 용어 설명

### AI 모델
- **Gemini Nano**: Google이 개발한 경량화된 AI 언어 모델
- **Chrome Translator**: 브라우저 내장 AI 번역 엔진

### API 개념
- **Prompt API**: 브라우저에서 직접 AI 모델과 상호작용할 수 있는 웹 API
- **Translator API**: 브라우저에서 직접 번역을 수행할 수 있는 웹 API
- **세션(Session)**: AI 모델과의 대화를 관리하는 연결 단위
- **언어쌍(Language Pair)**: 번역의 출발어와 도착어 조합

### 기술 용어
- **VRAM**: 그래픽 카드의 비디오 메모리, AI 모델 실행에 필요
- **BCP 47**: 언어 태그 표준 (예: ko, en, zh-CN)
- **Origin Trial**: 실험적 웹 API를 테스트하기 위한 Chrome 프로그램
- **언어팩**: 특정 언어 번역을 위한 AI 모델 데이터