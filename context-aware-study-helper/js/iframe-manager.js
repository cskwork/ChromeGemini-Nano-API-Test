/**
 * Context-Aware Study Helper - iframe 관리 모듈
 * 웹 브라우저 기능을 제공하고 iframe 내 페이지 탐색을 관리
 */

class IframeManager {
    constructor() {
        this.iframe = null;
        this.urlInput = null;
        this.loadingOverlay = null;
        this.navigationHistory = [];
        this.currentHistoryIndex = -1;
        this.isLoading = false;
        this.currentUrl = '';
        this.homeUrl = 'https://ko.wikipedia.org';
        
        // 교육 사이트 목록 (iframe 허용 사이트들)
        this.educationalSites = [
            'https://ko.wikipedia.org',
            'https://www.khanacademy.org',
            'https://developer.mozilla.org',
            'https://www.w3schools.com',
            'https://stackoverflow.com',
            'https://github.com',
            'https://codepen.io',
            'https://jsfiddle.net'
        ];
        
        this.init();
    }

    /**
     * iframe 매니저 초기화
     */
    init() {
        try {
            // DOM 요소 참조 가져오기
            this.iframe = document.getElementById('browserIframe');
            this.urlInput = document.getElementById('urlInput');
            this.loadingOverlay = document.getElementById('iframeLoading');
            
            if (!this.iframe || !this.urlInput) {
                throw new Error('필수 DOM 요소를 찾을 수 없습니다.');
            }
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 초기 URL 설정
            this.currentUrl = this.iframe.src;
            this.addToHistory(this.currentUrl);
            
            console.log('IframeManager 초기화 완료');
            
        } catch (error) {
            console.error('IframeManager 초기화 오류:', error);
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 뒤로 가기 버튼
        document.getElementById('backBtn')?.addEventListener('click', () => {
            this.goBack();
        });

        // 앞으로 가기 버튼
        document.getElementById('forwardBtn')?.addEventListener('click', () => {
            this.goForward();
        });

        // 새로고침 버튼
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.refresh();
        });

        // 홈 버튼
        document.getElementById('homeBtn')?.addEventListener('click', () => {
            this.goHome();
        });

        // Go 버튼
        document.getElementById('goBtn')?.addEventListener('click', () => {
            this.navigateToUrl();
        });

        // URL 입력 필드 엔터 키
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.navigateToUrl();
            }
        });

        // 사이드바 토글
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            this.toggleSidebar();
        });

        // iframe 로드 이벤트
        this.iframe.addEventListener('load', () => {
            this.onIframeLoad();
        });

        // iframe 로드 오류 이벤트
        this.iframe.addEventListener('error', () => {
            this.onIframeError();
        });
    }

    /**
     * URL로 이동
     */
    navigateToUrl() {
        const url = this.urlInput.value.trim();
        if (!url) {
            this.showMessage('URL을 입력해주세요.', 'warning');
            return;
        }

        // URL 형식 검증 및 정규화
        const normalizedUrl = this.normalizeUrl(url);
        if (!normalizedUrl) {
            this.showMessage('올바른 URL 형식이 아닙니다.', 'error');
            return;
        }

        this.loadUrl(normalizedUrl);
    }

    /**
     * URL 정규화
     */
    normalizeUrl(url) {
        try {
            // 프로토콜이 없으면 https 추가
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            // URL 유효성 검사
            const urlObj = new URL(url);
            return urlObj.href;
            
        } catch (error) {
            console.error('URL 정규화 오류:', error);
            return null;
        }
    }

    /**
     * URL 로드
     */
    loadUrl(url) {
        try {
            if (this.isLoading) {
                this.showMessage('페이지가 이미 로딩 중입니다.', 'info');
                return;
            }

            this.showLoading(true);
            this.currentUrl = url;
            this.urlInput.value = url;
            
            // iframe에 URL 설정
            this.iframe.src = url;
            
            // 히스토리에 추가
            this.addToHistory(url);
            
            // 네비게이션 버튼 상태 업데이트
            this.updateNavigationButtons();
            
            console.log('URL 로드 시작:', url);
            
        } catch (error) {
            console.error('URL 로드 오류:', error);
            this.showLoading(false);
            this.showMessage('페이지 로드 중 오류가 발생했습니다.', 'error');
        }
    }

    /**
     * iframe 로드 완료 처리
     */
    onIframeLoad() {
        this.showLoading(false);
        this.isLoading = false;
        
        let actualUrl;
        
        try {
            // iframe의 현재 URL 가져오기 시도 (Same-origin policy 제한으로 실패할 수 있음)
            actualUrl = this.iframe.contentWindow.location.href;

            if (actualUrl && actualUrl !== 'about:blank') {
                this.currentUrl = actualUrl;
                this.urlInput.value = actualUrl;
                this.urlInput.placeholder = 'https://...'; // placeholder 초기화

                // 히스토리에 추가 (중복 방지)
                if (actualUrl !== this.navigationHistory[this.currentHistoryIndex]) {
                    this.addToHistory(actualUrl);
                }
                
                this.showMessage('페이지 로드 완료', 'success');
                console.log('iframe 로드 완료 (Same-origin):', actualUrl);

            } else {
                // about:blank or other empty states, do nothing special
                actualUrl = this.currentUrl;
            }

        } catch (error) {
            // Cross-origin 제한으로 인한 오류
            actualUrl = this.currentUrl; // 이전 URL을 유지
            console.warn('Cross-origin navigation detected. Cannot access iframe URL directly.');
            
            this.urlInput.value = ''; // 입력창 비우기
            this.urlInput.placeholder = '다른 도메인으로 이동했습니다. URL을 직접 입력해주세요.';
            
            this.showMessage(
                '다른 도메인으로 이동하여 URL 동기화가 끊겼습니다. 콘텐츠를 분석하려면 현재 페이지의 URL을 위 주소창에 입력하고 "Go"를 누르세요.',
                'warning'
            );
            
            // 다른 컴포넌트에는 분석할 URL이 없음을 알림
            actualUrl = ''; 
        } finally {
            // 네비게이션 버튼 상태는 항상 업데이트
            this.updateNavigationButtons();

            // 다른 모듈에 페이지 변경 알림
            if (window.studyHelperApp && window.studyHelperApp.onIframePageChange) {
                window.studyHelperApp.onIframePageChange(actualUrl);
            }
            if (window.contentAnalyzer && window.contentAnalyzer.onIframeUrlChange) {
                window.contentAnalyzer.onIframeUrlChange(actualUrl);
            }
        }
    }

    /**
     * iframe 로드 오류 처리
     */
    onIframeError() {
        this.showLoading(false);
        this.isLoading = false;
        
        const errorMessage = '이 사이트는 보안상의 이유로 iframe 내에서의 콘텐츠 분석을 차단했습니다.';
        this.showMessage(errorMessage, 'error');
        
        // 차단된 사이트 오류 페이지 표시
        this.showBlockedSiteError();
        
        console.error('iframe 로드 차단:', this.currentUrl);
    }

    /**
     * 차단된 사이트 오류 페이지 표시
     */
    showBlockedSiteError() {
        const errorHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <div style="text-align: center; max-width: 600px; padding: 40px; background: rgba(255,255,255,0.1); border-radius: 20px; backdrop-filter: blur(10px);">
                    <h1 style="font-size: 48px; margin-bottom: 20px;">🛡️</h1>
                    <h2 style="margin-bottom: 20px; font-size: 24px;">사이트에서 iframe 분석을 차단했습니다</h2>
                    <p style="margin-bottom: 30px; line-height: 1.6; opacity: 0.9;">
                        <strong>${this.currentUrl}</strong><br><br>
                        이 웹사이트는 보안상의 이유로 iframe 내에서의 표시를 차단했습니다.<br>
                        하지만 걱정하지 마세요! 다른 방법으로 콘텐츠를 분석할 수 있습니다.
                    </p>
                    
                    <div style="background: rgba(255,255,255,0.2); padding: 25px; border-radius: 15px; margin-bottom: 25px; text-align: left;">
                        <h3 style="margin-bottom: 15px; color: #fff; font-size: 18px;">🚀 해결 방법</h3>
                        <div style="display: grid; gap: 15px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="background: #2196F3; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">권장</span>
                                <span><strong>새 탭에서 열기</strong> - 사이트를 직접 방문하여 콘텐츠 확인</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="background: #FF9800; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">수동</span>
                                <span><strong>텍스트 복사하여 맞춤 분석</strong> - 콘텐츠를 직접 입력</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="background: #4CAF50; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">자동</span>
                                <span><strong>브라우저리스 페치 사용</strong> - URL 입력으로 자동 콘텐츠 추출</span>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="window.open('${this.currentUrl}', '_blank')" 
                                style="background: #2196F3; color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-size: 14px; font-weight: bold; transition: all 0.3s;">
                            🔗 새 탭에서 열기
                        </button>
                        <button onclick="window.parent.iframeManager.goHome()" 
                                style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 12px 24px; border-radius: 25px; cursor: pointer; font-size: 14px; font-weight: bold; transition: all 0.3s;">
                            🏠 홈으로 가기
                        </button>
                    </div>
                    
                    <div style="margin-top: 30px; font-size: 12px; opacity: 0.7;">
                        <p><strong>브라우저리스 페치란?</strong> CORS 제약 없이 웹페이지 콘텐츠를 자동으로 가져오는 기술입니다. URL만 입력하면 대부분의 사이트에서 콘텐츠를 추출할 수 있습니다.</p>
                    </div>
                </div>
            </div>
        `;
        
        const blob = new Blob([errorHtml], { type: 'text/html' });
        const errorUrl = URL.createObjectURL(blob);
        this.iframe.src = errorUrl;
    }

    /**
     * 기존 오류 페이지 표시 (호환성용)
     */
    showErrorPage() {
        this.showBlockedSiteError();
    }

    /**
     * 뒤로 가기
     */
    goBack() {
        if (this.currentHistoryIndex > 0) {
            this.currentHistoryIndex--;
            const url = this.navigationHistory[this.currentHistoryIndex];
            this.loadUrl(url);
        }
    }

    /**
     * 앞으로 가기
     */
    goForward() {
        if (this.currentHistoryIndex < this.navigationHistory.length - 1) {
            this.currentHistoryIndex++;
            const url = this.navigationHistory[this.currentHistoryIndex];
            this.loadUrl(url);
        }
    }

    /**
     * 새로고침
     */
    refresh() {
        if (this.currentUrl) {
            this.iframe.src = this.iframe.src; // 강제 새로고침
        }
    }

    /**
     * 홈으로 가기
     */
    goHome() {
        this.loadUrl(this.homeUrl);
    }

    /**
     * 히스토리에 URL 추가
     */
    addToHistory(url) {
        // 현재 위치 이후의 히스토리 제거
        this.navigationHistory = this.navigationHistory.slice(0, this.currentHistoryIndex + 1);
        
        // 새 URL 추가
        this.navigationHistory.push(url);
        this.currentHistoryIndex = this.navigationHistory.length - 1;
        
        // 히스토리 크기 제한 (최대 50개)
        if (this.navigationHistory.length > 50) {
            this.navigationHistory.shift();
            this.currentHistoryIndex--;
        }
    }

    /**
     * 네비게이션 버튼 상태 업데이트
     */
    updateNavigationButtons() {
        const backBtn = document.getElementById('backBtn');
        const forwardBtn = document.getElementById('forwardBtn');
        
        if (backBtn) {
            backBtn.disabled = this.currentHistoryIndex <= 0;
            backBtn.style.opacity = backBtn.disabled ? '0.5' : '1';
        }
        
        if (forwardBtn) {
            forwardBtn.disabled = this.currentHistoryIndex >= this.navigationHistory.length - 1;
            forwardBtn.style.opacity = forwardBtn.disabled ? '0.5' : '1';
        }
    }

    /**
     * 사이드바 토글
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleIcon = document.getElementById('toggleIcon');
        
        if (sidebar && toggleIcon) {
            sidebar.classList.toggle('collapsed');
            toggleIcon.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
        }
    }

    /**
     * 로딩 상태 표시/숨김
     */
    showLoading(show) {
        if (this.loadingOverlay) {
            if (show) {
                this.loadingOverlay.classList.remove('hidden');
                this.isLoading = true;
            } else {
                this.loadingOverlay.classList.add('hidden');
                this.isLoading = false;
            }
        }
    }

    /**
     * 메시지 표시
     */
    showMessage(message, type = 'info') {
        // 기존 StudyHelperApp의 토스트 시스템 사용
        if (window.studyHelperApp && window.studyHelperApp.showToast) {
            window.studyHelperApp.showToast('브라우저', message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * 교육 사이트 추천 목록 가져오기
     */
    getEducationalSites() {
        return this.educationalSites;
    }

    /**
     * 현재 URL 가져오기
     */
    getCurrentUrl() {
        return this.currentUrl;
    }
    
    /**
     * 현재 URL 업데이트 (외부에서 호출)
     */
    updateCurrentUrl(newUrl) {
        if (newUrl && newUrl !== this.currentUrl) {
            console.log('iframe-manager URL 업데이트:', this.currentUrl, '→', newUrl);
            this.currentUrl = newUrl;
            this.urlInput.value = newUrl;
            
            // 히스토리에 추가 (중복 방지)
            if (newUrl !== this.navigationHistory[this.navigationHistory.length - 1]) {
                this.addToHistory(newUrl);
            }
            
            this.updateNavigationButtons();
        }
    }

    /**
     * iframe 엘리먼트 가져오기
     */
    getIframe() {
        return this.iframe;
    }

    /**
     * 히스토리 가져오기
     */
    getHistory() {
        return {
            history: this.navigationHistory,
            currentIndex: this.currentHistoryIndex
        };
    }

    /**
     * iframe 콘텐츠 접근 가능 여부 확인
     */
    isIframeAccessible() {
        try {
            const doc = this.iframe.contentDocument || this.iframe.contentWindow.document;
            return doc !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * iframe 문서 가져오기 (Same-origin인 경우에만)
     */
    getIframeDocument() {
        try {
            return this.iframe.contentDocument || this.iframe.contentWindow.document;
        } catch (error) {
            console.log('iframe 문서 접근 불가 (cross-origin):', error.message);
            return null;
        }
    }

    /**
     * 정리 및 종료
     */
    destroy() {
        // 이벤트 리스너 제거는 브라우저가 자동으로 처리
        this.iframe = null;
        this.urlInput = null;
        this.loadingOverlay = null;
        this.navigationHistory = [];
        console.log('IframeManager 정리 완료');
    }
}

// 전역 인스턴스 생성
window.iframeManager = new IframeManager();