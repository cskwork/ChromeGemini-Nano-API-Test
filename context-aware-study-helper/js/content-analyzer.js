/**
 * Context-Aware Study Helper - 콘텐츠 분석 모듈 (Enhanced)
 * iframe에서 웹페이지의 콘텐츠를 추출하고 분석하여 학습 컨텍스트를 파악
 */

class ContentAnalyzer {
    constructor() {
        this.currentContent = '';
        this.contentType = 'unknown';
        this.analysisHistory = [];
        this.maxHistorySize = 10;
        this.crossFrameComm = null;
        this.iframeManager = null;
        this.browserlessFetcher = null;
        this.lastAnalyzedUrl = '';
        this.isIframeMode = true; // iframe 모드로 변경
        this.preferBrowserless = true; // 브라우저리스 방식 우선 사용
    }

    /**
     * iframe 모드 초기화
     */
    initializeIframeMode() {
        // 모든 모듈 참조 설정
        this.crossFrameComm = window.crossFrameComm;
        this.iframeManager = window.iframeManager;
        this.browserlessFetcher = window.browserlessFetcher;
        
        if (!this.crossFrameComm || !this.iframeManager) {
            console.warn('iframe 통신 모듈이 초기화되지 않았습니다.');
            this.isIframeMode = false;
        }
        
        if (!this.browserlessFetcher) {
            console.warn('브라우저리스 페처가 초기화되지 않았습니다.');
            this.preferBrowserless = false;
        }
    }

    /**
     * 현재 페이지의 콘텐츠를 추출 (iframe 모드)
     */
    async extractPageContent() {
        try {
            if (this.isIframeMode && this.crossFrameComm) {
                // iframe에서 콘텐츠 추출
                return await this.extractIframeContent();
            } else {
                // 기존 방식으로 현재 페이지에서 추출
                return this.extractCurrentPageContent();
            }
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
     * iframe에서 콘텐츠 추출 (브라우저리스 방식 우선)
     */
    async extractIframeContent() {
        const currentUrl = this.iframeManager?.getCurrentUrl() || '';
        
        try {
            // 1. 브라우저리스 방식 먼저 시도 (더 안정적)
            if (this.preferBrowserless && this.browserlessFetcher && currentUrl) {
                console.log('브라우저리스 방식으로 콘텐츠 추출 시도:', currentUrl);
                
                const browserlessResult = await this.browserlessFetcher.fetchContent(currentUrl);
                
                if (browserlessResult.success) {
                    console.log('브라우저리스 추출 성공:', browserlessResult.method);
                    
                    this.currentContent = browserlessResult.content || '';
                    this.contentType = browserlessResult.contentType || this.detectContentType(this.currentContent);
                    this.lastAnalyzedUrl = browserlessResult.url || '';
                    
                    return {
                        content: this.currentContent,
                        contentType: this.contentType,
                        length: this.currentContent.length,
                        wordCount: browserlessResult.wordCount || this.currentContent.split(/\s+/).length,
                        title: browserlessResult.title || '',
                        url: browserlessResult.url || currentUrl,
                        extractionMethod: `browserless_${browserlessResult.method}`,
                        extractedAt: browserlessResult.extractedAt || new Date().toISOString()
                    };
                } else {
                    console.log('브라우저리스 추출 실패, iframe 방식으로 대체:', browserlessResult.error);
                }
            }
            
            // 2. 기존 iframe 방식으로 시도
            const result = await this.crossFrameComm.extractContentFromIframe();
            
            if (result.success) {
                // 성공적으로 추출된 경우
                this.currentContent = result.content || '';
                this.contentType = result.contentType || this.detectContentType(this.currentContent);
                this.lastAnalyzedUrl = result.url || '';
                
                return {
                    content: this.currentContent,
                    contentType: this.contentType,
                    length: this.currentContent.length,
                    wordCount: result.wordCount || this.currentContent.split(/\s+/).length,
                    title: result.title || '',
                    url: result.url || '',
                    extractionMethod: result.method || 'iframe',
                    extractedAt: result.extractedAt || new Date().toISOString()
                };
            } else {
                // 모든 방법 실패 시 최종 대안 제시
                return {
                    content: '',
                    contentType: 'blocked',
                    length: 0,
                    wordCount: 0,
                    error: 'all_methods_failed',
                    message: '모든 콘텐츠 추출 방법이 실패했습니다.',
                    fallbackMethods: [
                        '북마클릿 사용 (가장 안정적)',
                        '새 탭에서 열어서 텍스트 복사',
                        '콘텐츠를 직접 입력하여 맞춤 분석'
                    ],
                    url: currentUrl
                };
            }
            
        } catch (error) {
            console.error('콘텐츠 추출 오류:', error);
            return {
                content: '',
                contentType: 'error',
                length: 0,
                wordCount: 0,
                error: error.message,
                fallbackMethods: [
                    '북마클릿 사용',
                    '수동 텍스트 입력'
                ]
            };
        }
    }

    /**
     * 현재 페이지에서 콘텐츠 추출 (기존 방식)
     */
    extractCurrentPageContent() {
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
                wordCount: content.split(/\s+/).length,
                url: window.location.href,
                title: document.title
            };

        } catch (error) {
            console.error('현재 페이지 콘텐츠 추출 오류:', error);
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
     * 콘텐츠 유형 감지 (Enhanced for iframe)
     */
    detectContentType(content, url = null, title = null) {
        // iframe 모드인 경우 iframe URL 사용
        if (this.isIframeMode && this.iframeManager) {
            url = url || this.iframeManager.getCurrentUrl().toLowerCase();
            title = title || ''; // iframe에서 title 추출이 어려울 수 있음
        } else {
            url = url || window.location.href.toLowerCase();
            title = title || document.title.toLowerCase();
        }
        
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
     * 추출 오류 처리
     */
    handleExtractionError(baseContent) {
        // 안전한 기본값 설정
        const safeBaseContent = {
            content: '',
            contentType: 'error',
            length: 0,
            wordCount: 0,
            title: '',
            url: '',
            error: '콘텐츠 추출 실패',
            ...baseContent
        };
        
        return {
            ...safeBaseContent,
            suggestions: [
                '이 사이트는 iframe 분석이 제한되어 있습니다.',
                '새 탭에서 사이트를 열어 직접 분석해보세요.',
                '텍스트를 직접 복사하여 맞춤 분석을 이용해보세요.',
                ...(baseContent?.fallbackMethods || [])
            ],
            isBlocked: true
        };
    }

    /**
     * 컨텍스트에 맞는 콘텐츠 추출 (Enhanced for iframe)
     */
    async extractContextualContent() {
        const baseContent = await this.extractPageContent();
        
        // 추출 실패시 적절한 대응
        if (baseContent.error) {
            return this.handleExtractionError(baseContent);
        }
        
        switch (baseContent.contentType) {
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

    /**
     * URL 변경 감지 및 컨텍스트 업데이트 (iframe 모드용)
     */
    onIframeUrlChange(newUrl) {
        if (this.lastAnalyzedUrl !== newUrl) {
            this.lastAnalyzedUrl = newUrl;
            console.log('iframe URL 변경 감지:', newUrl);
            
            // Study Assistant에 알림 (자동 분석이 활성화된 경우)
            if (window.studyAssistant && document.getElementById('autoAnalysis')?.checked) {
                setTimeout(() => {
                    window.studyAssistant.analyzeCurrentPage();
                }, 2000); // 페이지 로드 대기
            }
        }
    }

    /**
     * 실시간 iframe 콘텐츠 모니터링
     */
    startIframeMonitoring() {
        if (!this.isIframeMode || !this.iframeManager) return;
        
        // URL 변경 감지
        let lastUrl = '';
        const checkUrlChange = () => {
            const currentUrl = this.iframeManager.getCurrentUrl();
            if (currentUrl !== lastUrl && currentUrl) {
                lastUrl = currentUrl;
                this.onIframeUrlChange(currentUrl);
            }
        };
        
        // 주기적으로 URL 체크
        setInterval(checkUrlChange, 2000);
    }

    /**
     * 북마클릿 스크립트 생성
     */
    generateBookmarkletScript() {
        return `
            javascript:(function(){
                // Study Helper 북마클릿
                if(window.studyHelperBookmarklet) return;
                window.studyHelperBookmarklet = true;
                
                const script = document.createElement('script');
                script.onload = function() {
                    if(window.StudyHelperBookmarklet) {
                        new StudyHelperBookmarklet().init();
                    }
                };
                script.src = '${window.location.origin}/js/bookmarklet.js';
                document.head.appendChild(script);
            })();
        `;
    }

    /**
     * iframe 접근성 확인
     */
    checkIframeAccessibility() {
        if (!this.isIframeMode || !this.iframeManager) return false;
        
        try {
            const iframe = this.iframeManager.getIframe();
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            return doc !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * 분석 가능 사이트 목록
     */
    getSupportedSites() {
        return [
            { name: 'Wikipedia', url: 'https://ko.wikipedia.org', description: '백과사전 - 용어 정의에 최적화' },
            { name: 'MDN Web Docs', url: 'https://developer.mozilla.org', description: '웹 개발 문서 - 코드 설명에 최적화' },
            { name: 'W3Schools', url: 'https://www.w3schools.com', description: '프로그래밍 튜토리얼 - 학습 퀴즈에 최적화' },
            { name: 'Khan Academy', url: 'https://www.khanacademy.org', description: '교육 콘텐츠 - 내용 요약에 최적화' },
            { name: 'Stack Overflow', url: 'https://stackoverflow.com', description: '프로그래밍 Q&A - 문제 해결에 최적화' }
        ];
    }

    /**
     * 정리 및 종료
     */
    destroy() {
        this.stopPageMonitoring();
        this.crossFrameComm = null;
        this.iframeManager = null;
        console.log('ContentAnalyzer (Enhanced) 정리 완료');
    }
}

// 전역 인스턴스 생성
window.contentAnalyzer = new ContentAnalyzer();

// iframe 모드 초기화는 다른 모듈들이 로드된 후에 실행
document.addEventListener('DOMContentLoaded', () => {
    // 다른 모듈들이 로드될 때까지 약간 대기
    setTimeout(() => {
        if (window.contentAnalyzer) {
            window.contentAnalyzer.initializeIframeMode();
            window.contentAnalyzer.startIframeMonitoring();
        }
    }, 1000);
});