/**
 * Context-Aware Study Helper - Gemini API 통합 모듈
 * Chrome의 Gemini Nano API를 사용하여 학습 도우미 기능을 제공
 */

class GeminiAPI {
    constructor() {
        this.session = null;
        this.isAvailable = false;
        this.status = 'unknown';
    }

    /**
     * API 상태 확인 및 초기화
     */
    async checkAvailability() {
        try {
            // LanguageModel API 존재 여부 확인
            if (!window.LanguageModel) {
                this.status = 'unavailable';
                this.isAvailable = false;
                return {
                    available: false,
                    status: 'unavailable',
                    message: 'Chrome의 Gemini Nano API를 찾을 수 없습니다. Chrome 127+ 버전이 필요합니다.'
                };
            }

            // API 가용성 상태 확인
            const availability = await window.LanguageModel.availability();
            this.status = availability;

            switch (availability) {
                case 'available':
                    this.isAvailable = true;
                    return {
                        available: true,
                        status: availability,
                        message: 'Gemini Nano API 사용 가능'
                    };

                case 'downloadable':
                    this.isAvailable = false;
                    return {
                        available: false,
                        status: availability,
                        message: '모델 다운로드가 필요합니다. 처음 사용 시 약 22GB 다운로드가 진행됩니다.'
                    };

                case 'downloading':
                    this.isAvailable = false;
                    return {
                        available: false,
                        status: availability,
                        message: '모델 다운로드 중입니다. 잠시 후 다시 시도해주세요.'
                    };

                default:
                    this.isAvailable = false;
                    return {
                        available: false,
                        status: availability,
                        message: 'API를 사용할 수 없습니다. chrome://flags에서 Gemini Nano 설정을 확인해주세요.'
                    };
            }
        } catch (error) {
            console.error('API 상태 확인 오류:', error);
            this.isAvailable = false;
            this.status = 'error';
            return {
                available: false,
                status: 'error',
                message: `API 상태 확인 중 오류가 발생했습니다: ${error.message}`
            };
        }
    }

    /**
     * AI 세션 생성
     */
    async createSession() {
        try {
            if (!this.isAvailable) {
                throw new Error('API가 사용 가능하지 않습니다. 먼저 상태를 확인해주세요.');
            }

            // 기존 세션이 있으면 정리
            if (this.session) {
                await this.destroySession();
            }

            this.session = await window.LanguageModel.create();
            console.log('Gemini 세션이 생성되었습니다.');
            return true;

        } catch (error) {
            console.error('세션 생성 오류:', error);
            throw new Error(`세션 생성에 실패했습니다: ${error.message}`);
        }
    }

    /**
     * 세션 정리
     */
    async destroySession() {
        if (this.session) {
            try {
                await this.session.destroy();
                this.session = null;
                console.log('Gemini 세션이 정리되었습니다.');
            } catch (error) {
                console.error('세션 정리 오류:', error);
                this.session = null;
            }
        }
    }

    /**
     * 웹페이지 콘텐츠를 분석하여 학습 도움말 제공
     */
    async analyzeContentForStudy(content, analysisType = 'general') {
        if (!this.session) {
            throw new Error('세션이 생성되지 않았습니다. 먼저 createSession()을 호출해주세요.');
        }

        let prompt = '';
        
        switch (analysisType) {
            case 'definitions':
                prompt = this.createDefinitionsPrompt(content);
                break;
            case 'references':
                prompt = this.createReferencesPrompt(content);
                break;
            case 'quiz':
                prompt = this.createQuizPrompt(content);
                break;
            case 'summary':
                prompt = this.createSummaryPrompt(content);
                break;
            case 'code_explanation':
                prompt = this.createCodeExplanationPrompt(content);
                break;
            default:
                prompt = this.createGeneralStudyPrompt(content);
        }

        try {
            const response = await this.session.prompt(prompt);
            console.log('학습 도움말 분석 응답:', response);
            return response;
        } catch (error) {
            console.error('학습 도움말 분석 오류:', error);
            throw new Error(`학습 도움말 분석에 실패했습니다: ${error.message}`);
        }
    }

    /**
     * 용어 정의 프롬프트 생성
     */
    createDefinitionsPrompt(content) {
        return `다음 텍스트에서 중요한 용어들을 찾아 정의해주세요. 응답은 반드시 JSON 형식으로 해주세요.

텍스트:
${content}

다음 형식으로 응답해주세요:
{
    "definitions": [
        {
            "term": "용어",
            "definition": "용어의 정의",
            "importance": 1-10,
            "category": "카테고리"
        }
    ],
    "suggestions": [
        "학습을 위한 추가 제안사항"
    ]
}

요구사항:
- 최대 10개의 핵심 용어만 선별
- 정의는 명확하고 이해하기 쉽게
- importance는 학습 중요도 (1=낮음, 10=매우 높음)
- category는 "기본개념", "전문용어", "방법론", "이론" 등으로 분류`;
    }

    /**
     * 참고자료 제안 프롬프트 생성
     */
    createReferencesPrompt(content) {
        return `다음 텍스트 내용과 관련된 학습 참고자료를 제안해주세요. 응답은 반드시 JSON 형식으로 해주세요.

텍스트:
${content}

다음 형식으로 응답해주세요:
{
    "references": [
        {
            "type": "참고자료 유형",
            "title": "제목",
            "description": "설명",
            "relevance": 1-10
        }
    ],
    "missing_concepts": [
        "텍스트에서 언급되지 않은 중요한 개념들"
    ]
}

참고자료 유형:
- "논문": 관련 학술 논문
- "서적": 추천 도서
- "강의": 온라인 강의
- "문서": 공식 문서
- "튜토리얼": 실습 가이드

요구사항:
- 최대 8개의 참고자료 제안
- relevance는 관련성 점수 (1=낮음, 10=매우 높음)`;
    }

    /**
     * 퀴즈 생성 프롬프트 생성
     */
    createQuizPrompt(content) {
        return `다음 텍스트 내용을 바탕으로 학습용 퀴즈를 생성해주세요. 응답은 반드시 JSON 형식으로 해주세요.

텍스트:
${content}

다음 형식으로 응답해주세요:
{
    "quiz": [
        {
            "question": "질문",
            "type": "객관식|주관식|참/거짓",
            "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
            "correct_answer": "정답",
            "explanation": "해설",
            "difficulty": 1-5
        }
    ]
}

요구사항:
- 최대 5개의 퀴즈 문제
- 다양한 유형의 문제 포함
- difficulty는 난이도 (1=쉬움, 5=어려움)
- 객관식의 경우 4개 선택지 제공
- 해설은 왜 그것이 정답인지 명확히 설명`;
    }

    /**
     * 요약 프롬프트 생성
     */
    createSummaryPrompt(content) {
        return `다음 텍스트를 학습에 효과적인 방식으로 요약해주세요. 응답은 반드시 JSON 형식으로 해주세요.

텍스트:
${content}

다음 형식으로 응답해주세요:
{
    "summary": {
        "main_topic": "주제",
        "key_points": ["핵심 포인트들"],
        "detailed_summary": "상세 요약",
        "learning_objectives": ["학습 목표들"]
    },
    "memory_aids": [
        "기억하기 쉬운 팁들"
    ]
}

요구사항:
- 핵심 포인트는 3-7개로 제한
- 학습 목표는 구체적이고 측정 가능하게
- 기억 보조 도구 제안 (연상법, 약어 등)`;
    }

    /**
     * 코드 설명 프롬프트 생성
     */
    createCodeExplanationPrompt(content) {
        return `다음 코드를 분석하고 학습자를 위한 설명을 제공해주세요. 응답은 반드시 JSON 형식으로 해주세요.

코드:
${content}

다음 형식으로 응답해주세요:
{
    "code_analysis": {
        "language": "프로그래밍 언어",
        "purpose": "코드의 목적",
        "key_concepts": ["사용된 주요 개념들"],
        "line_by_line": [
            {
                "line": "코드 라인",
                "explanation": "설명"
            }
        ]
    },
    "practice_suggestions": [
        "연습을 위한 제안사항"
    ]
}

요구사항:
- 초보자도 이해할 수 있게 설명
- 핵심 개념은 명확히 정의
- 실습 제안은 구체적으로`;
    }

    /**
     * 일반 학습 도움말 프롬프트 생성
     */
    createGeneralStudyPrompt(content) {
        return `다음 내용을 분석하여 학습에 도움이 되는 정보를 제공해주세요. 응답은 반드시 JSON 형식으로 해주세요.

내용:
${content}

다음 형식으로 응답해주세요:
{
    "content_type": "내용 유형",
    "study_suggestions": [
        {
            "type": "제안 유형",
            "suggestion": "구체적 제안",
            "priority": 1-5
        }
    ],
    "key_takeaways": ["핵심 내용들"],
    "next_steps": ["다음 학습 단계"]
}

제안 유형:
- "정의": 용어나 개념 정의 필요
- "예시": 구체적 예시 필요
- "연결": 다른 개념과의 연결
- "실습": 실습이나 적용 필요
- "복습": 반복 학습 필요

요구사항:
- priority는 우선순위 (1=낮음, 5=높음)
- 실용적이고 실행 가능한 제안`;
    }

    /**
     * API 상태 확인
     */
    getStatus() {
        return {
            isAvailable: this.isAvailable,
            status: this.status,
            hasSession: !!this.session
        };
    }
}

// 전역 인스턴스 생성
window.geminiAPI = new GeminiAPI();