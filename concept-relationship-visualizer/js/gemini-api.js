/**
 * Gemini API 통합 모듈
 * Chrome의 Gemini Nano API를 사용하여 텍스트 분석 및 개념 추출을 수행
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
     * 텍스트에서 주요 개념들을 추출
     */
    async extractConcepts(text) {
        if (!this.session) {
            throw new Error('세션이 생성되지 않았습니다. 먼저 createSession()을 호출해주세요.');
        }

        const prompt = `다음 텍스트에서 주요 개념들을 추출하고 분석해주세요. 응답은 반드시 JSON 형식으로 해주세요.

텍스트:
${text}

다음 형식으로 응답해주세요:
{
    "concepts": [
        {
            "name": "개념 이름",
            "description": "개념에 대한 간단한 설명",
            "importance": 1-10 점수,
            "category": "개념의 카테고리"
        }
    ]
}

요구사항:
- 최대 15개의 핵심 개념만 추출
- importance는 텍스트에서의 중요도 (1=낮음, 10=매우 높음)
- category는 "기본개념", "주제", "방법론", "사례", "결과" 등으로 분류
- JSON 형식을 정확히 지켜주세요`;

        try {
            const response = await this.session.prompt(prompt);
            console.log('개념 추출 응답:', response);
            return response;
        } catch (error) {
            console.error('개념 추출 오류:', error);
            throw new Error(`개념 추출에 실패했습니다: ${error.message}`);
        }
    }

    /**
     * 추출된 개념들 간의 관계 분석
     */
    async analyzeRelationships(concepts) {
        if (!this.session) {
            throw new Error('세션이 생성되지 않았습니다. 먼저 createSession()을 호출해주세요.');
        }

        const conceptNames = concepts.map(c => c.name).join(', ');
        
        const prompt = `다음 개념들 사이의 관계를 분석해주세요. 응답은 반드시 JSON 형식으로 해주세요.

개념들: ${conceptNames}

다음 형식으로 응답해주세요:
{
    "relationships": [
        {
            "source": "개념1",
            "target": "개념2",
            "type": "관계 유형",
            "strength": 1-10 점수,
            "description": "관계에 대한 설명"
        }
    ]
}

관계 유형:
- "포함": 하나의 개념이 다른 개념을 포함
- "원인": 인과관계
- "연관": 서로 관련성이 있음
- "대비": 서로 대조되는 관계
- "순서": 시간적/논리적 순서
- "유사": 비슷한 성격

요구사항:
- 의미 있는 관계만 포함 (strength 3 이상)
- strength는 관계의 강도 (1=약함, 10=매우 강함)
- 모든 개념이 최소 하나의 관계를 가지도록
- JSON 형식을 정확히 지켜주세요`;

        try {
            const response = await this.session.prompt(prompt);
            console.log('관계 분석 응답:', response);
            return response;
        } catch (error) {
            console.error('관계 분석 오류:', error);
            throw new Error(`관계 분석에 실패했습니다: ${error.message}`);
        }
    }

    /**
     * 텍스트 전체 분석 (개념 추출 + 관계 분석)
     */
    async analyzeText(text) {
        try {
            // 세션이 없으면 생성
            if (!this.session) {
                await this.createSession();
            }

            console.log('텍스트 분석 시작...');

            // 1단계: 개념 추출
            console.log('1단계: 개념 추출 중...');
            const conceptResponse = await this.extractConcepts(text);

            // 2단계: 관계 분석
            console.log('2단계: 관계 분석 중...');
            const relationshipResponse = await this.analyzeRelationships([]);

            return {
                conceptResponse,
                relationshipResponse
            };

        } catch (error) {
            console.error('텍스트 분석 오류:', error);
            throw error;
        }
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