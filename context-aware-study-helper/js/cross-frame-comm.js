/**
 * Context-Aware Study Helper - 크로스 프레임 통신 모듈
 * iframe과 부모 페이지 간의 안전한 콘텐츠 추출 및 통신을 관리
 */

class CrossFrameComm {
    constructor() {
        this.iframe = null;
        this.messageHandlers = new Map();
        this.contentExtractionAttempts = 0;
        this.maxExtractionAttempts = 3;
        this.communicationTimeout = 5000; // 5초
        this.isListening = false;
        
        // 콘텐츠 추출 스크립트 (iframe에 주입할 스크립트)
        this.contentScript = this.generateContentScript();
        
        this.init();
    }

    /**
     * 초기화
     */
    init() {
        try {
            this.iframe = document.getElementById('browserIframe');
            if (!this.iframe) {
                throw new Error('iframe 요소를 찾을 수 없습니다.');
            }
            
            this.setupMessageListener();
            console.log('CrossFrameComm 초기화 완료');
            
        } catch (error) {
            console.error('CrossFrameComm 초기화 오류:', error);
        }
    }

    /**
     * 메시지 리스너 설정
     */
    setupMessageListener() {
        if (this.isListening) return;
        
        window.addEventListener('message', (event) => {
            this.handleMessage(event);
        });
        
        this.isListening = true;
    }

    /**
     * 메시지 처리
     */
    handleMessage(event) {
        try {
            // iframe에서 온 메시지인지 확인
            if (event.source !== this.iframe.contentWindow) {
                return;
            }
            
            const { type, data, messageId } = event.data;
            
            switch (type) {
                case 'content_extracted':
                    this.handleContentExtracted(data, messageId);
                    break;
                    
                case 'page_changed':
                    this.handlePageChanged(data);
                    break;
                    
                case 'extraction_error':
                    this.handleExtractionError(data, messageId);
                    break;
                    
                case 'script_injected':
                    this.handleScriptInjected(data);
                    break;
                    
                default:
                    console.log('알 수 없는 메시지 타입:', type);
            }
            
        } catch (error) {
            console.error('메시지 처리 오류:', error);
        }
    }

    /**
     * iframe에서 콘텐츠 추출 요청
     */
    async extractContentFromIframe() {
        try {
            // 먼저 직접 접근 시도 (Same-origin인 경우)
            const directContent = this.extractDirectContent();
            if (directContent) {
                return directContent;
            }
            
            // PostMessage를 통한 콘텐츠 추출 시도
            const messageContent = await this.requestContentViaMessage();
            if (messageContent) {
                return messageContent;
            }
            
            // 스크립트 주입을 통한 추출 시도
            const injectedContent = await this.extractViaScriptInjection();
            if (injectedContent) {
                return injectedContent;
            }
            
            // 모든 방법이 실패한 경우
            return {
                success: false,
                error: 'cross_origin_blocked',
                message: '콘텐츠 추출이 차단되었습니다. 사이트의 보안 정책으로 인해 접근할 수 없습니다.',
                fallbackMethods: [
                    '새 탭에서 사이트를 직접 열어 분석',
                    '북마클릿 사용',
                    '텍스트 직접 입력'
                ]
            };
            
        } catch (error) {
            console.error('콘텐츠 추출 오류:', error);
            return {
                success: false,
                error: 'extraction_failed',
                message: error.message
            };
        }
    }

    /**
     * 직접 콘텐츠 추출 (Same-origin인 경우)
     */
    extractDirectContent() {
        try {
            const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow.document;
            if (!iframeDoc) {
                return null;
            }
            
            // 콘텐츠 추출
            const content = this.extractContentFromDocument(iframeDoc);
            
            return {
                success: true,
                method: 'direct_access',
                ...content
            };
            
        } catch (error) {
            // Cross-origin 제한으로 인한 오류는 정상적임
            console.log('직접 접근 불가 (cross-origin)');
            return null;
        }
    }

    /**
     * PostMessage를 통한 콘텐츠 요청
     */
    async requestContentViaMessage() {
        return new Promise((resolve) => {
            const messageId = 'extract_' + Date.now();
            const timeout = setTimeout(() => {
                resolve(null);
            }, this.communicationTimeout);
            
            // 응답 핸들러 등록
            this.messageHandlers.set(messageId, (data) => {
                clearTimeout(timeout);
                this.messageHandlers.delete(messageId);
                resolve({
                    success: true,
                    method: 'postmessage',
                    ...data
                });
            });
            
            // iframe에 콘텐츠 추출 요청
            try {
                this.iframe.contentWindow.postMessage({
                    type: 'extract_content',
                    messageId: messageId
                }, '*');
            } catch (error) {
                clearTimeout(timeout);
                this.messageHandlers.delete(messageId);
                resolve(null);
            }
        });
    }

    /**
     * 스크립트 주입을 통한 콘텐츠 추출
     */
    async extractViaScriptInjection() {
        try {
            // 지원되는 사이트인지 확인
            const currentUrl = window.iframeManager?.getCurrentUrl() || '';
            if (!this.isSupportedSite(currentUrl)) {
                return null;
            }
            
            // 스크립트 주입 시도
            const script = document.createElement('script');
            script.textContent = this.contentScript;
            
            // iframe에 스크립트 주입 (Same-origin인 경우에만 가능)
            const iframeDoc = this.iframe.contentDocument;
            if (iframeDoc) {
                iframeDoc.head.appendChild(script);
                
                // 스크립트 실행 결과 대기
                return await this.waitForScriptResponse();
            }
            
            return null;
            
        } catch (error) {
            console.error('스크립트 주입 오류:', error);
            return null;
        }
    }

    /**
     * 문서에서 콘텐츠 추출
     */
    extractContentFromDocument(doc) {
        try {
            // 기본 정보 추출
            const title = doc.title || '';
            const url = doc.location?.href || '';
            
            // 텍스트 콘텐츠 추출
            let content = '';
            
            // 주요 콘텐츠 영역 찾기
            const contentSelectors = [
                'main',
                '[role="main"]',
                'article',
                '.content',
                '.main-content',
                '#content',
                '#main',
                'body'
            ];
            
            for (const selector of contentSelectors) {
                const element = doc.querySelector(selector);
                if (element) {
                    content = this.extractTextFromElement(element);
                    if (content.length > 100) {
                        break;
                    }
                }
            }
            
            // 콘텐츠 정리
            content = this.cleanContent(content);
            
            // 콘텐츠 타입 감지
            const contentType = this.detectContentType(url, title, content);
            
            return {
                title,
                url,
                content,
                contentType,
                wordCount: content.split(/\s+/).length,
                extractedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('문서 콘텐츠 추출 오류:', error);
            return {
                title: '',
                url: '',
                content: '',
                contentType: 'unknown',
                wordCount: 0,
                error: error.message
            };
        }
    }

    /**
     * 요소에서 텍스트 추출
     */
    extractTextFromElement(element) {
        // 불필요한 요소 제거
        const excludeSelectors = [
            'script', 'style', 'nav', 'header', 'footer',
            '.advertisement', '.ads', '.sidebar', '.navigation'
        ];
        
        const clonedElement = element.cloneNode(true);
        
        excludeSelectors.forEach(selector => {
            const elements = clonedElement.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
        
        return clonedElement.innerText || clonedElement.textContent || '';
    }

    /**
     * 콘텐츠 정리
     */
    cleanContent(content) {
        return content
            .replace(/\s+/g, ' ')  // 여러 공백을 하나로
            .replace(/\n\s*\n/g, '\n')  // 여러 줄바꿈을 하나로
            .trim()
            .substring(0, 10000);  // 길이 제한
    }

    /**
     * 콘텐츠 타입 감지
     */
    detectContentType(url, title, content) {
        const urlLower = url.toLowerCase();
        const titleLower = title.toLowerCase();
        const contentLower = content.toLowerCase();
        
        // URL 기반 감지
        if (urlLower.includes('wikipedia.org')) return 'encyclopedia';
        if (urlLower.includes('github.com')) return 'coding';
        if (urlLower.includes('stackoverflow.com')) return 'coding';
        if (urlLower.includes('developer.mozilla.org')) return 'documentation';
        if (urlLower.includes('w3schools.com')) return 'tutorial';
        if (urlLower.includes('khanacademy.org')) return 'education';
        
        // 콘텐츠 기반 감지
        const codeKeywords = /function|class|def|import|console\.log|print\(/i;
        const mathKeywords = /∫|∑|∏|∂|∇|≤|≥|±|×|÷/;
        
        if (codeKeywords.test(content)) return 'coding';
        if (mathKeywords.test(content)) return 'mathematics';
        if (titleLower.includes('tutorial')) return 'tutorial';
        
        return 'general';
    }

    /**
     * 지원되는 사이트인지 확인
     */
    isSupportedSite(url) {
        const supportedDomains = [
            'wikipedia.org',
            'developer.mozilla.org',
            'w3schools.com',
            'github.com',
            'stackoverflow.com'
        ];
        
        return supportedDomains.some(domain => url.includes(domain));
    }

    /**
     * 콘텐츠 추출 스크립트 생성
     */
    generateContentScript() {
        return `
            (function() {
                // Study Helper 콘텐츠 추출 스크립트
                function extractContent() {
                    try {
                        const title = document.title;
                        const url = window.location.href;
                        
                        // 메인 콘텐츠 추출
                        const contentSelectors = ['main', '[role="main"]', 'article', '.content', 'body'];
                        let content = '';
                        
                        for (const selector of contentSelectors) {
                            const element = document.querySelector(selector);
                            if (element) {
                                content = element.innerText || element.textContent;
                                if (content.length > 100) break;
                            }
                        }
                        
                        // 부모 페이지에 결과 전송
                        window.parent.postMessage({
                            type: 'content_extracted',
                            data: {
                                title,
                                url,
                                content: content.substring(0, 10000),
                                wordCount: content.split(/\\s+/).length
                            },
                            messageId: 'script_injection'
                        }, '*');
                        
                    } catch (error) {
                        window.parent.postMessage({
                            type: 'extraction_error',
                            data: { error: error.message },
                            messageId: 'script_injection'
                        }, '*');
                    }
                }
                
                // 페이지 로드 완료 후 실행
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', extractContent);
                } else {
                    extractContent();
                }
                
                // Study Helper 스크립트 주입 완료 알림
                window.parent.postMessage({
                    type: 'script_injected',
                    data: { success: true }
                }, '*');
            })();
        `;
    }

    /**
     * 스크립트 응답 대기
     */
    async waitForScriptResponse() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve(null);
            }, this.communicationTimeout);
            
            const messageId = 'script_injection';
            this.messageHandlers.set(messageId, (data) => {
                clearTimeout(timeout);
                this.messageHandlers.delete(messageId);
                resolve({
                    success: true,
                    method: 'script_injection',
                    ...data
                });
            });
        });
    }

    /**
     * 콘텐츠 추출 완료 처리
     */
    handleContentExtracted(data, messageId) {
        const handler = this.messageHandlers.get(messageId);
        if (handler) {
            handler(data);
        }
        
        // Study Helper에 알림
        if (window.studyHelperApp) {
            window.studyHelperApp.onContentExtracted(data);
        }
    }

    /**
     * 페이지 변경 처리
     */
    handlePageChanged(data) {
        console.log('iframe 페이지 변경 감지:', data);
        
        // Study Helper에 알림
        if (window.studyHelperApp) {
            window.studyHelperApp.onIframePageChange(data.url);
        }
    }

    /**
     * 추출 오류 처리
     */
    handleExtractionError(data, messageId) {
        console.error('콘텐츠 추출 오류:', data);
        
        const handler = this.messageHandlers.get(messageId);
        if (handler) {
            handler({ error: data.error });
        }
    }

    /**
     * 스크립트 주입 완료 처리
     */
    handleScriptInjected(data) {
        console.log('스크립트 주입 완료:', data);
    }

    /**
     * 북마클릿 코드 생성
     */
    generateBookmarklet() {
        const bookmarkletCode = `
            javascript:(function(){
                const studyHelperScript = document.createElement('script');
                studyHelperScript.src = '${window.location.origin}/js/bookmarklet.js';
                document.head.appendChild(studyHelperScript);
            })();
        `;
        
        return bookmarkletCode;
    }

    /**
     * iframe URL 변경 감지
     */
    startUrlMonitoring() {
        let lastUrl = '';
        
        const checkUrl = () => {
            try {
                const currentUrl = this.iframe.contentWindow.location.href;
                if (currentUrl !== lastUrl && currentUrl !== 'about:blank') {
                    lastUrl = currentUrl;
                    this.handlePageChanged({ url: currentUrl });
                }
            } catch (error) {
                // Cross-origin 제한으로 인한 오류는 무시
            }
        };
        
        // 주기적으로 URL 체크
        setInterval(checkUrl, 2000);
    }

    /**
     * 정리 및 종료
     */
    destroy() {
        this.messageHandlers.clear();
        this.iframe = null;
        console.log('CrossFrameComm 정리 완료');
    }
}

// 전역 인스턴스 생성
window.crossFrameComm = new CrossFrameComm();