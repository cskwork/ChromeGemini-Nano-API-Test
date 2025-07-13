/**
 * Browserless Content Fetcher
 * CORS 제약 없이 웹페이지 콘텐츠를 가져오는 모듈
 */

class BrowserlessFetcher {
    constructor() {
        // CORS 프록시 서비스들 (더 안정적인 서비스 목록)
        this.corsProxies = [
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://cors-proxy.htmldriven.com/?url=',
            'https://yacdn.org/proxy/',
            'https://api.allorigins.win/get?url='
        ];
        
        this.currentProxyIndex = 0;
        this.timeout = 10000; // 10초 타임아웃
        this.retryCount = 3;
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5분 캐시
    }

    /**
     * URL에서 콘텐츠 가져오기 (메인 함수)
     */
    async fetchContent(url) {
        try {
            console.log('브라우저리스 콘텐츠 페치 시작:', url);
            
            // URL 유효성 검사
            if (!this.isValidUrl(url)) {
                throw new Error('유효하지 않은 URL입니다.');
            }
            
            // 캐시 확인
            const cached = this.getFromCache(url);
            if (cached) {
                console.log('캐시에서 콘텐츠 반환:', url);
                return cached;
            }
            
            // 여러 방법으로 시도 (우선순위 순서 개선)
            let result = null;
            
            // 1. 특수 사이트 API 먼저 시도 (위키피디아, GitHub 등)
            result = await this.specialSiteFetch(url);
            if (result) {
                console.log('특수 API fetch 성공:', url);
                this.saveToCache(url, result);
                return result;
            }
            
            // 2. 직접 fetch 시도 (같은 도메인이거나 CORS 허용하는 경우)
            try {
                result = await this.directFetch(url);
                if (result) {
                    console.log('직접 fetch 성공:', url);
                    this.saveToCache(url, result);
                    return result;
                }
            } catch (error) {
                console.log('직접 fetch 실패, CORS 프록시 시도:', error.message);
            }
            
            // 3. CORS 프록시를 통한 fetch 시도
            result = await this.proxyFetch(url);
            if (result) {
                console.log('프록시 fetch 성공:', url);
                this.saveToCache(url, result);
                return result;
            }
            
            // 모든 방법 실패
            throw new Error('모든 콘텐츠 가져오기 방법이 실패했습니다.');
            
        } catch (error) {
            console.error('브라우저리스 콘텐츠 페치 오류:', error);
            return {
                success: false,
                error: error.message,
                url: url,
                fallbackMethods: [
                    '북마클릿 사용',
                    '새 탭에서 열어서 텍스트 복사',
                    '수동으로 텍스트 입력'
                ]
            };
        }
    }

    /**
     * 직접 fetch 시도
     */
    async directFetch(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            return this.parseHtmlContent(html, url);
            
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('요청 시간 초과');
            }
            throw error;
        }
    }

    /**
     * CORS 프록시를 통한 fetch
     */
    async proxyFetch(url) {
        let lastError = null;
        
        // 모든 프록시 서비스 시도
        for (let attempt = 0; attempt < this.corsProxies.length; attempt++) {
            const proxy = this.corsProxies[(this.currentProxyIndex + attempt) % this.corsProxies.length];
            
            try {
                console.log(`프록시 시도 ${attempt + 1}/${this.corsProxies.length}:`, proxy);
                
                const result = await this.fetchViaProxy(proxy, url);
                if (result) {
                    // 성공한 프록시를 우선순위로 설정
                    this.currentProxyIndex = (this.currentProxyIndex + attempt) % this.corsProxies.length;
                    return result;
                }
                
            } catch (error) {
                console.log(`프록시 ${proxy} 실패:`, error.message);
                lastError = error;
                continue;
            }
        }
        
        throw lastError || new Error('모든 CORS 프록시 서비스가 실패했습니다.');
    }

    /**
     * 특정 프록시를 통한 fetch
     */
    async fetchViaProxy(proxy, url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            let proxyUrl;
            let requestOptions = {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json, text/html, */*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };
            
            // 프록시 서비스별 URL 구성 및 요청 옵션 설정
            if (proxy.includes('codetabs.com')) {
                proxyUrl = `${proxy}${encodeURIComponent(url)}`;
            } else if (proxy.includes('htmldriven.com')) {
                proxyUrl = `${proxy}${encodeURIComponent(url)}`;
            } else if (proxy.includes('yacdn.org')) {
                proxyUrl = `${proxy}${encodeURIComponent(url)}`;
            } else if (proxy.includes('allorigins.win')) {
                proxyUrl = `${proxy}${encodeURIComponent(url)}`;
            } else {
                // 기본 방식
                proxyUrl = proxy + encodeURIComponent(url);
            }
            
            console.log('프록시 URL 시도:', proxyUrl);
            
            const response = await fetch(proxyUrl, requestOptions);
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`프록시 응답 오류: ${response.status} ${response.statusText}`);
            }
            
            let html;
            const contentType = response.headers.get('content-type') || '';
            
            try {
                if (contentType.includes('application/json')) {
                    // JSON 응답 처리
                    const data = await response.json();
                    html = data.contents || data.content || data.data || data.response || '';
                } else {
                    // HTML 응답 처리
                    html = await response.text();
                }
            } catch (parseError) {
                // 파싱 실패 시 텍스트로 재시도
                html = await response.text();
            }
            
            if (!html || html.length < 50) {
                throw new Error(`콘텐츠가 너무 짧습니다 (${html.length}자). 프록시: ${proxy}`);
            }
            
            console.log(`프록시 콘텐츠 가져오기 성공: ${html.length}자`);
            return this.parseHtmlContent(html, url);
            
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('프록시 요청 시간 초과');
            }
            console.warn(`프록시 ${proxy} 실패:`, error.message);
            throw error;
        }
    }

    /**
     * 특수 사이트 API 사용 (위키피디아, GitHub 등)
     */
    async specialSiteFetch(url) {
        const urlLower = url.toLowerCase();
        
        try {
            // 위키피디아 API
            if (urlLower.includes('wikipedia.org')) {
                return await this.fetchWikipediaContent(url);
            }
            
            // GitHub API
            if (urlLower.includes('github.com')) {
                return await this.fetchGitHubContent(url);
            }
            
            // Reddit API
            if (urlLower.includes('reddit.com')) {
                return await this.fetchRedditContent(url);
            }
            
            return null;
            
        } catch (error) {
            console.log('특수 사이트 API 오류:', error.message);
            return null;
        }
    }

    /**
     * 위키피디아 콘텐츠 가져오기
     */
    async fetchWikipediaContent(url) {
        try {
            // 메인 페이지 처리
            const mainPageMatch = url.match(/https?:\/\/([a-z]{2,3})\.wikipedia\.org\/?$/);
            if (mainPageMatch) {
                const [, lang] = mainPageMatch;
                return await this.fetchWikipediaMainPage(lang);
            }
            
            // 일반 문서 처리
            const match = url.match(/https?:\/\/([a-z]{2,3})\.wikipedia\.org\/wiki\/(.+)/);
            if (!match) return null;
            
            const [, lang, title] = match;
            const apiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
            
            const response = await fetch(apiUrl);
            if (!response.ok) return null;
            
            const data = await response.json();
            
            return {
                success: true,
                title: data.title || '',
                content: data.extract || '',
                url: url,
                contentType: 'encyclopedia',
                wordCount: (data.extract || '').split(/\s+/).length,
                extractedAt: new Date().toISOString(),
                method: 'wikipedia_api'
            };
            
        } catch (error) {
            console.log('Wikipedia 콘텐츠 가져오기 실패:', error.message);
            return null;
        }
    }
    
    /**
     * Wikipedia 메인 페이지 처리
     */
    async fetchWikipediaMainPage(lang) {
        try {
            // 오늘의 추천 문서 가져오기
            const featuredApiUrl = `https://${lang}.wikipedia.org/api/rest_v1/feed/featured/${new Date().toISOString().split('T')[0]}`;
            
            const response = await fetch(featuredApiUrl);
            if (response.ok) {
                const data = await response.json();
                const featured = data.tfa; // Today's Featured Article
                
                if (featured) {
                    return {
                        success: true,
                        title: featured.title || `${lang.toUpperCase()} Wikipedia 메인 페이지`,
                        content: featured.extract || '위키피디아는 전 세계의 자원봉사자들이 함께 만들어가는 자유 백과사전입니다.',
                        url: featured.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/`,
                        contentType: 'encyclopedia',
                        wordCount: (featured.extract || '').split(/\s+/).length,
                        extractedAt: new Date().toISOString(),
                        method: 'wikipedia_featured'
                    };
                }
            }
            
            // 추천 문서 실패 시 기본 콘텐츠 제공
            return {
                success: true,
                title: `${lang.toUpperCase()} Wikipedia 메인 페이지`,
                content: `위키피디아는 전 세계의 자원봉사자들이 함께 만들어가는 자유 백과사전입니다. 
                
다양한 주제에 대한 신뢰할 수 있는 정보를 제공하며, 누구나 편집할 수 있습니다.

주요 특징:
- 300개 이상의 언어로 제공
- 600만 개 이상의 문서 (영어판 기준)
- 중립적 관점에서 작성
- 자유롭게 이용 가능

위키피디아에서 원하는 정보를 검색하거나, 특정 문서를 방문하여 더 자세한 내용을 확인할 수 있습니다.`,
                url: `https://${lang}.wikipedia.org/`,
                contentType: 'encyclopedia',
                wordCount: 80,
                extractedAt: new Date().toISOString(),
                method: 'wikipedia_default'
            };
            
        } catch (error) {
            console.log('Wikipedia 메인 페이지 처리 실패:', error.message);
            return null;
        }
    }

    /**
     * GitHub 콘텐츠 가져오기
     */
    async fetchGitHubContent(url) {
        try {
            // GitHub README나 파일 URL인지 확인
            const match = url.match(/https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
            if (!match) return null;
            
            const [, owner, repo] = match;
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
            
            const response = await fetch(apiUrl, {
                headers: {
                    'Accept': 'application/vnd.github.v3.raw'
                }
            });
            
            if (!response.ok) return null;
            
            const content = await response.text();
            
            return {
                success: true,
                title: `${owner}/${repo} - README`,
                content: content,
                url: url,
                contentType: 'coding',
                wordCount: content.split(/\s+/).length,
                extractedAt: new Date().toISOString(),
                method: 'github_api'
            };
            
        } catch (error) {
            return null;
        }
    }

    /**
     * Reddit 콘텐츠 가져오기
     */
    async fetchRedditContent(url) {
        try {
            // Reddit JSON API 사용
            const jsonUrl = url.replace(/\/$/, '') + '.json';
            
            const response = await fetch(jsonUrl);
            if (!response.ok) return null;
            
            const data = await response.json();
            const post = data[0]?.data?.children?.[0]?.data;
            
            if (!post) return null;
            
            let content = post.title || '';
            if (post.selftext) {
                content += '\n\n' + post.selftext;
            }
            
            return {
                success: true,
                title: post.title || '',
                content: content,
                url: url,
                contentType: 'general',
                wordCount: content.split(/\s+/).length,
                extractedAt: new Date().toISOString(),
                method: 'reddit_api'
            };
            
        } catch (error) {
            return null;
        }
    }

    /**
     * HTML 콘텐츠 파싱
     */
    parseHtmlContent(html, url) {
        try {
            // DOM 파서 생성
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // 제목 추출
            const title = doc.querySelector('title')?.textContent?.trim() || '';
            
            // 메인 콘텐츠 추출
            let content = this.extractMainContent(doc);
            
            // 콘텐츠 정리
            content = this.cleanContent(content);
            
            // 콘텐츠 타입 감지
            const contentType = this.detectContentType(url, title, content);
            
            return {
                success: true,
                title: title,
                content: content,
                url: url,
                contentType: contentType,
                wordCount: content.split(/\s+/).length,
                extractedAt: new Date().toISOString(),
                method: 'html_parsing'
            };
            
        } catch (error) {
            throw new Error('HTML 파싱 오류: ' + error.message);
        }
    }

    /**
     * 메인 콘텐츠 추출
     */
    extractMainContent(doc) {
        // 불필요한 요소 제거
        const unwantedSelectors = [
            'script', 'style', 'nav', 'header', 'footer',
            '.navigation', '.menu', '.sidebar', '.ads',
            '.advertisement', '.social-share', '.comments',
            '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]'
        ];
        
        unwantedSelectors.forEach(selector => {
            const elements = doc.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
        
        // 메인 콘텐츠 영역 찾기
        const contentSelectors = [
            'main',
            '[role="main"]',
            'article',
            '.content',
            '.main-content',
            '.post-content',
            '.entry-content',
            '.article-content',
            '#content',
            '#main'
        ];
        
        for (const selector of contentSelectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const text = element.innerText || element.textContent || '';
                if (text.length > 200) {
                    return text;
                }
            }
        }
        
        // 메인 콘텐츠를 찾지 못한 경우 body에서 추출
        return doc.body.innerText || doc.body.textContent || '';
    }

    /**
     * 콘텐츠 정리
     */
    cleanContent(content) {
        return content
            .replace(/\s+/g, ' ')  // 여러 공백을 하나로
            .replace(/\n\s*\n/g, '\n')  // 여러 줄바꿈을 하나로
            .trim()
            .substring(0, 15000);  // 길이 제한
    }

    /**
     * 콘텐츠 타입 감지
     */
    detectContentType(url, title, content) {
        const urlLower = url.toLowerCase();
        const titleLower = title.toLowerCase();
        
        // URL 기반 감지
        if (urlLower.includes('wikipedia.org')) return 'encyclopedia';
        if (urlLower.includes('github.com')) return 'coding';
        if (urlLower.includes('stackoverflow.com')) return 'coding';
        if (urlLower.includes('developer.mozilla.org')) return 'documentation';
        if (urlLower.includes('w3schools.com')) return 'tutorial';
        if (urlLower.includes('reddit.com')) return 'discussion';
        
        // 콘텐츠 기반 감지
        const codeKeywords = /function|class|def|import|console\.log|print\(/i;
        const mathKeywords = /∫|∑|∏|∂|∇|≤|≥|±|×|÷/;
        
        if (codeKeywords.test(content)) return 'coding';
        if (mathKeywords.test(content)) return 'mathematics';
        if (titleLower.includes('tutorial')) return 'tutorial';
        
        return 'general';
    }

    /**
     * URL 유효성 검사
     */
    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch (error) {
            return false;
        }
    }

    /**
     * 캐시에서 가져오기
     */
    getFromCache(url) {
        const cached = this.cache.get(url);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    /**
     * 캐시에 저장
     */
    saveToCache(url, data) {
        this.cache.set(url, {
            data: data,
            timestamp: Date.now()
        });
        
        // 캐시 크기 제한 (최대 50개)
        if (this.cache.size > 50) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    /**
     * 지원되는 사이트 목록
     */
    getSupportedSites() {
        return [
            { name: 'Wikipedia', example: 'https://ko.wikipedia.org/wiki/...', api: true },
            { name: 'GitHub', example: 'https://github.com/owner/repo', api: true },
            { name: 'Reddit', example: 'https://reddit.com/r/...', api: true },
            { name: 'Stack Overflow', example: 'https://stackoverflow.com/...', proxy: true },
            { name: 'MDN Web Docs', example: 'https://developer.mozilla.org/...', proxy: true },
            { name: '대부분의 웹사이트', example: '프록시를 통해 접근', proxy: true }
        ];
    }

    /**
     * 캐시 비우기
     */
    clearCache() {
        this.cache.clear();
        console.log('브라우저리스 페처 캐시가 비워졌습니다.');
    }
}

// 전역 인스턴스 생성
window.browserlessFetcher = new BrowserlessFetcher();