/**
 * Context-Aware Study Helper - 콘텐츠 분석 모듈
 * 웹페이지의 콘텐츠를 추출하고 분석하여 학습 컨텍스트를 파악
 */

class ContentAnalyzer {
    constructor() {
        this.currentContent = '';
        this.contentType = 'unknown';
        this.analysisHistory = [];
        this.maxHistorySize = 10;
    }

    /**
     * 현재 페이지의 콘텐츠를 추출
     */
    extractPageContent() {
        try {
            // 기본 텍스트 콘텐츠 추출
            let content = document.body.innerText || document.body.textContent || '';
            
            // HTML 태그나 스크립트 제거를 위한 추가 정리
            content = content
                .replace(/\s+/g, ' ') // 여러 공백을 하나로
                .replace(/[\r\n]+/g, '\n') // 여러 줄바꿈을 하나로
                .trim();

            // 콘텐츠 길이 제한 (너무 긴 경우 앞부분만)
            if (content.length > 10000) {
                content = content.substring(0, 10000) + '...';
            }

            this.currentContent = content;
            this.contentType = this.detectContentType(content);
            
            return {
                content: content,
                contentType: this.contentType,
                length: content.length,
                wordCount: content.split(/\s+/).length
            };

        } catch (error) {
            console.error('콘텐츠 추출 오류:', error);
            return {
                content: '',
                contentType: 'error',
                length: 0,
                wordCount: 0,
                error: error.message
            };
        }
    }

    /**
     * 특정 선택자로 콘텐츠 추출
     */
    extractBySelector(selector) {
        try {
            const elements = document.querySelectorAll(selector);
            let content = '';
            
            elements.forEach(element => {
                content += element.innerText || element.textContent || '';
                content += '\n';
            });

            return content.trim();
        } catch (error) {
            console.error('선택자 기반 추출 오류:', error);
            return '';
        }
    }

    /**
     * Google Docs 콘텐츠 추출
     */
    extractGoogleDocsContent() {
        try {
            // Google Docs의 문서 콘텐츠 영역
            const docsContent = document.querySelector('.kix-appview-editor-container');
            if (docsContent) {
                return docsContent.innerText || docsContent.textContent || '';
            }

            // 대체 선택자들
            const alternativeSelectors = [
                '.docs-texteventtarget-iframe',
                '.kix-page',
                '.kix-pagesection'
            ];

            for (const selector of alternativeSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    return element.innerText || element.textContent || '';
                }
            }

            return '';
        } catch (error) {
            console.error('Google Docs 추출 오류:', error);
            return '';
        }
    }

    /**
     * 코딩 사이트 콘텐츠 추출
     */
    extractCodingContent() {
        try {
            // 코드 블록들 추출
            const codeBlocks = document.querySelectorAll('code, pre, .highlight, .code-block');
            let codeContent = '';
            
            codeBlocks.forEach(block => {
                codeContent += block.innerText || block.textContent || '';
                codeContent += '\n---\n';
            });

            // 튜토리얼 텍스트도 함께 추출
            const textContent = this.extractPageContent().content;
            
            return {
                code: codeContent,
                text: textContent,
                combined: textContent + '\n\n코드 예시:\n' + codeContent
            };
        } catch (error) {
            console.error('코딩 콘텐츠 추출 오류:', error);
            return { code: '', text: '', combined: '' };
        }
    }

    /**
     * 콘텐츠 유형 감지
     */
    detectContentType(content) {
        const url = window.location.href.toLowerCase();
        const title = document.title.toLowerCase();
        
        // URL 기반 감지
        if (url.includes('docs.google.com')) {
            return 'google_docs';
        }
        if (url.includes('github.com') || url.includes('stackoverflow.com') || 
            url.includes('codepen.io') || url.includes('jsfiddle.net')) {
            return 'coding';
        }
        if (url.includes('wikipedia.org') || url.includes('wiki')) {
            return 'encyclopedia';
        }
        if (url.includes('youtube.com') || url.includes('vimeo.com')) {
            return 'video';
        }
        if (url.includes('edu') || url.includes('coursera') || url.includes('edx') || 
            url.includes('khan')) {
            return 'education';
        }

        // 콘텐츠 내용 기반 감지
        const codeKeywords = /function|class|def|import|#include|console\.log|print\(/i;
        const mathKeywords = /∫|∑|∏|∂|∇|≤|≥|±|×|÷|∞|∀|∃|∈|∪|∩|⊂|⊃/;
        const researchKeywords = /abstract|introduction|methodology|conclusion|references|bibliography/i;

        if (codeKeywords.test(content)) {
            return 'coding';
        }
        if (mathKeywords.test(content)) {
            return 'mathematics';
        }
        if (researchKeywords.test(content)) {
            return 'research_paper';
        }

        // 제목 기반 추가 감지
        if (title.includes('tutorial') || title.includes('guide') || title.includes('how to')) {
            return 'tutorial';
        }

        return 'general';
    }

    /**
     * 컨텍스트에 맞는 콘텐츠 추출
     */
    extractContextualContent() {
        const baseContent = this.extractPageContent();
        
        switch (this.contentType) {
            case 'google_docs':
                const docsContent = this.extractGoogleDocsContent();
                return {
                    ...baseContent,
                    specialContent: docsContent,
                    suggestions: [
                        '논문 작성 중이신가요? 참고문헌 확인이나 용어 정의를 도와드릴 수 있습니다.',
                        '문서의 구조와 논리적 흐름을 검토해드릴게요.',
                        '핵심 내용을 요약하거나 기억하기 쉽게 정리해드릴 수 있습니다.'
                    ]
                };

            case 'coding':
                const codingContent = this.extractCodingContent();
                return {
                    ...baseContent,
                    specialContent: codingContent,
                    suggestions: [
                        '코드를 한 줄씩 설명해드릴게요.',
                        '이 개념을 테스트할 수 있는 퀴즈를 만들어드릴까요?',
                        '관련된 추가 학습 자료를 추천해드릴 수 있습니다.'
                    ]
                };

            case 'research_paper':
                return {
                    ...baseContent,
                    suggestions: [
                        '논문의 핵심 내용을 요약해드릴게요.',
                        '중요 용어들을 정의하고 설명해드릴 수 있습니다.',
                        '이 연구와 관련된 추가 참고문헌을 제안해드릴게요.'
                    ]
                };

            case 'tutorial':
                return {
                    ...baseContent,
                    suggestions: [
                        '학습한 내용을 확인할 퀴즈를 만들어드릴게요.',
                        '핵심 개념들을 정리해드릴 수 있습니다.',
                        '다음에 학습하면 좋을 내용을 추천해드릴게요.'
                    ]
                };

            default:
                return {
                    ...baseContent,
                    suggestions: [
                        '이 내용의 핵심 포인트를 정리해드릴게요.',
                        '중요한 용어들을 설명해드릴 수 있습니다.',
                        '학습에 도움이 되는 추가 정보를 제공해드릴게요.'
                    ]
                };
        }
    }

    /**
     * 분석 결과를 히스토리에 저장
     */
    saveToHistory(analysisResult) {
        const historyItem = {
            timestamp: new Date(),
            url: window.location.href,
            title: document.title,
            contentType: this.contentType,
            result: analysisResult
        };

        this.analysisHistory.unshift(historyItem);
        
        // 히스토리 크기 제한
        if (this.analysisHistory.length > this.maxHistorySize) {
            this.analysisHistory = this.analysisHistory.slice(0, this.maxHistorySize);
        }

        // 로컬 스토리지에 저장
        try {
            localStorage.setItem('contextAnalysisHistory', JSON.stringify(this.analysisHistory));
        } catch (error) {
            console.error('히스토리 저장 오류:', error);
        }
    }

    /**
     * 히스토리에서 불러오기
     */
    loadHistory() {
        try {
            const saved = localStorage.getItem('contextAnalysisHistory');
            if (saved) {
                this.analysisHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('히스토리 로드 오류:', error);
            this.analysisHistory = [];
        }
    }

    /**
     * 현재 상태 정보 반환
     */
    getStatus() {
        return {
            hasContent: this.currentContent.length > 0,
            contentType: this.contentType,
            contentLength: this.currentContent.length,
            historySize: this.analysisHistory.length,
            currentUrl: window.location.href
        };
    }

    /**
     * 페이지 변경 감지를 위한 URL 감시 시작
     */
    startPageMonitoring(callback) {
        let currentUrl = window.location.href;
        
        // URL 변경 감지
        const checkForUrlChange = () => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                if (callback) {
                    callback('url_changed', currentUrl);
                }
            }
        };

        // 주기적 체크
        this.urlCheckInterval = setInterval(checkForUrlChange, 1000);

        // DOM 변경 감지
        if (typeof MutationObserver !== 'undefined') {
            this.domObserver = new MutationObserver((mutations) => {
                if (callback) {
                    callback('content_changed', mutations);
                }
            });

            this.domObserver.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    }

    /**
     * 모니터링 중지
     */
    stopPageMonitoring() {
        if (this.urlCheckInterval) {
            clearInterval(this.urlCheckInterval);
        }
        if (this.domObserver) {
            this.domObserver.disconnect();
        }
    }
}

// 전역 인스턴스 생성
window.contentAnalyzer = new ContentAnalyzer();