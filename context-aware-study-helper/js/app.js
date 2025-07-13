/**
 * Context-Aware Study Helper - 메인 애플리케이션 로직
 * 사용자 인터페이스와 AI 모듈들을 연결하는 중앙 컨트롤러
 */

class StudyHelperApp {
    constructor() {
        this.geminiAPI = window.geminiAPI;
        this.contentAnalyzer = window.contentAnalyzer;
        this.studyAssistant = window.studyAssistant;
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';
        this.isInitialized = false;
        
        this.initializeApp();
    }

    /**
     * 애플리케이션 초기화
     */
    async initializeApp() {
        try {
            // 다크모드 설정 적용
            this.applyDarkMode();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // API 상태 확인
            await this.checkAPIStatus();
            
            // 페이지 정보 업데이트
            this.updatePageInfo();
            
            // Study Assistant 초기화 (자동 분석 설정이 켜져있으면)
            const autoAnalysis = document.getElementById('autoAnalysis').checked;
            if (autoAnalysis) {
                await this.initializeStudyAssistant();
            }
            
            this.isInitialized = true;
            this.showToast('초기화 완료', 'Context-Aware Study Helper가 준비되었습니다.', 'success');
            
        } catch (error) {
            console.error('앱 초기화 오류:', error);
            this.showToast('초기화 실패', error.message, 'error');
        }
    }

    /**
     * Study Assistant 초기화
     */
    async initializeStudyAssistant() {
        try {
            const success = await this.studyAssistant.initialize();
            if (success) {
                this.showToast('자동 분석 활성화', '페이지 내용을 자동으로 분석합니다.', 'success');
            }
        } catch (error) {
            console.error('Study Assistant 초기화 오류:', error);
            this.showToast('자동 분석 실패', '수동 분석은 여전히 가능합니다.', 'warning');
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 다크모드 토글
        document.getElementById('darkModeToggle').addEventListener('click', () => {
            this.toggleDarkMode();
        });

        // 페이지 분석 버튼
        document.getElementById('analyzePageBtn').addEventListener('click', () => {
            this.analyzeCurrentPage();
        });

        // 맞춤 분석 버튼
        document.getElementById('customAnalyzeBtn').addEventListener('click', () => {
            this.performCustomAnalysis();
        });

        // 자동 분석 체크박스
        document.getElementById('autoAnalysis').addEventListener('change', (e) => {
            this.toggleAutoAnalysis(e.target.checked);
        });

        // 설정 변경 이벤트
        document.getElementById('difficultyLevel').addEventListener('change', () => {
            this.savePreferences();
        });

        document.getElementById('notificationDuration').addEventListener('change', () => {
            this.savePreferences();
        });

        // 키보드 단축키
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+A: 페이지 분석
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                this.analyzeCurrentPage();
            }
            
            // Ctrl+Shift+H: 도움말 패널 토글
            if (e.ctrlKey && e.shiftKey && e.key === 'H') {
                e.preventDefault();
                this.toggleHelpPanel();
            }
        });
    }

    /**
     * API 상태 확인 및 표시
     */
    async checkAPIStatus() {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        try {
            const status = await this.geminiAPI.checkAvailability();
            
            // 상태 표시 업데이트
            statusIndicator.className = `status-indicator status-${status.status}`;
            statusText.textContent = status.message;
            
            // 버튼 상태 업데이트
            const buttons = document.querySelectorAll('#analyzePageBtn, #customAnalyzeBtn');
            buttons.forEach(btn => {
                btn.disabled = !status.available;
                if (!status.available) {
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    btn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            });
            
            return status.available;
            
        } catch (error) {
            console.error('API 상태 확인 오류:', error);
            statusIndicator.className = 'status-indicator status-unknown';
            statusText.textContent = 'API 상태를 확인할 수 없습니다.';
            return false;
        }
    }

    /**
     * 현재 페이지 정보 업데이트
     */
    updatePageInfo() {
        const pageInfo = document.getElementById('pageInfo');
        const contentType = document.getElementById('contentType');
        
        try {
            // 페이지 기본 정보
            const url = window.location.href;
            const title = document.title;
            
            pageInfo.innerHTML = `
                <div class="mb-1"><strong>제목:</strong> ${title || '제목 없음'}</div>
                <div class="text-xs text-blue-500 truncate">${url}</div>
            `;
            
            // 콘텐츠 분석
            const content = this.contentAnalyzer.extractPageContent();
            const typeLabel = this.getContentTypeLabel(content.contentType);
            
            contentType.innerHTML = `
                <div class="mb-1"><strong>타입:</strong> ${typeLabel}</div>
                <div class="text-xs">단어 수: ${content.wordCount.toLocaleString()}개</div>
            `;
            
        } catch (error) {
            console.error('페이지 정보 업데이트 오류:', error);
            pageInfo.textContent = '페이지 정보를 불러올 수 없습니다.';
            contentType.textContent = '분석 실패';
        }
    }

    /**
     * 현재 페이지 분석
     */
    async analyzeCurrentPage() {
        if (!await this.checkAPIStatus()) {
            this.showToast('분석 불가', 'Gemini API를 사용할 수 없습니다.', 'error');
            return;
        }

        this.showLoading(true);
        
        try {
            // 세션이 없으면 생성
            if (!this.geminiAPI.session) {
                await this.geminiAPI.createSession();
            }

            // 콘텐츠 추출
            const contentData = this.contentAnalyzer.extractContextualContent();
            
            if (contentData.content.length < 50) {
                this.showToast('분석 불가', '분석할 수 있는 콘텐츠가 충분하지 않습니다.', 'warning');
                this.showLoading(false);
                return;
            }

            // 분석 타입 결정
            const analysisType = this.determineAnalysisType(contentData.contentType);
            
            // AI 분석 수행
            const result = await this.geminiAPI.analyzeContentForStudy(contentData.content, analysisType);
            
            // 결과 표시
            this.displayAnalysisResult(result, contentData);
            
            this.showToast('분석 완료', '페이지 분석이 완료되었습니다.', 'success');
            
        } catch (error) {
            console.error('페이지 분석 오류:', error);
            this.showToast('분석 실패', error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 맞춤 분석 수행
     */
    async performCustomAnalysis() {
        if (!await this.checkAPIStatus()) {
            this.showToast('분석 불가', 'Gemini API를 사용할 수 없습니다.', 'error');
            return;
        }

        const analysisType = document.getElementById('analysisType').value;
        const customText = document.getElementById('customText').value.trim();
        
        this.showLoading(true);
        
        try {
            // 세션이 없으면 생성
            if (!this.geminiAPI.session) {
                await this.geminiAPI.createSession();
            }

            // 분석할 텍스트 결정
            let textToAnalyze;
            if (customText) {
                textToAnalyze = customText;
            } else {
                const contentData = this.contentAnalyzer.extractPageContent();
                textToAnalyze = contentData.content;
            }
            
            if (textToAnalyze.length < 10) {
                this.showToast('분석 불가', '분석할 텍스트를 입력하거나 더 많은 콘텐츠가 있는 페이지로 이동해주세요.', 'warning');
                this.showLoading(false);
                return;
            }

            // AI 분석 수행
            const result = await this.geminiAPI.analyzeContentForStudy(textToAnalyze, analysisType);
            
            // 결과 표시
            this.displayAnalysisResult(result, { contentType: analysisType, isCustom: true });
            
            this.showToast('분석 완료', '맞춤 분석이 완료되었습니다.', 'success');
            
        } catch (error) {
            console.error('맞춤 분석 오류:', error);
            this.showToast('분석 실패', error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 분석 결과 표시
     */
    displayAnalysisResult(result, contentData) {
        const resultsContainer = document.getElementById('analysisResults');
        const resultsContent = document.getElementById('resultsContent');
        
        try {
            const parsedResult = this.parseAnalysisResult(result);
            const html = this.generateResultHTML(parsedResult, contentData);
            
            resultsContent.innerHTML = html;
            resultsContainer.classList.remove('hidden');
            
            // 결과 영역으로 스크롤
            resultsContainer.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('결과 표시 오류:', error);
            resultsContent.innerHTML = `
                <div class="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
                    <h3 class="text-red-800 dark:text-red-200 font-medium mb-2">결과 처리 오류</h3>
                    <p class="text-red-600 dark:text-red-300 text-sm">${error.message}</p>
                    <details class="mt-2">
                        <summary class="text-xs text-red-500 cursor-pointer">원본 응답 보기</summary>
                        <pre class="text-xs text-red-400 mt-2 overflow-auto">${JSON.stringify(result, null, 2)}</pre>
                    </details>
                </div>
            `;
            resultsContainer.classList.remove('hidden');
        }
    }

    /**
     * 분석 결과 파싱
     */
    parseAnalysisResult(result) {
        try {
            if (typeof result === 'string') {
                // JSON 블록 추출
                const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/) || 
                                 result.match(/\{[\s\S]*\}/);
                
                if (jsonMatch) {
                    let jsonStr = jsonMatch[1] || jsonMatch[0];
                    
                    // JSON 정화: 일반적인 구문 오류 수정
                    jsonStr = this.sanitizeJsonString(jsonStr);
                    
                    try {
                        return JSON.parse(jsonStr);
                    } catch (parseError) {
                        // Fallback 파싱 시도
                        console.warn('기본 JSON 파싱 실패, fallback 시도:', parseError);
                        return this.fallbackJsonParse(jsonStr);
                    }
                } else {
                    return { general_response: result };
                }
            }
            return result;
        } catch (error) {
            console.error('결과 파싱 오류:', error);
            return { error: true, message: '결과를 파싱할 수 없습니다.', raw: result };
        }
    }

    /**
     * JSON 문자열 정화
     */
    sanitizeJsonString(jsonStr) {
        // 배열 내 문자열에서 잘못된 따옴표 패턴 수정
        // 예: "- "텍스트"" -> "- 텍스트"
        jsonStr = jsonStr.replace(/"- "([^"]*?)"/g, '"- $1"');
        
        // 배열 내에서 중첩된 따옴표 문제 해결
        jsonStr = jsonStr.replace(/"([^"]*)"([^",\]\}]*?)"/g, '"$1$2"');
        
        // 불필요한 공백 제거
        jsonStr = jsonStr.trim();
        
        return jsonStr;
    }

    /**
     * Fallback JSON 파싱
     */
    fallbackJsonParse(jsonStr) {
        try {
            // 더 적극적인 정화 시도
            let cleanJson = jsonStr;
            
            // 배열 내 문자열의 따옴표 문제를 더 적극적으로 해결
            cleanJson = cleanJson.replace(/"([^"]*?)"([^",\]\}]*?)"([^",\]\}]*?)"/g, '"$1$2$3"');
            
            // 마지막 시도
            const parsed = JSON.parse(cleanJson);
            console.log('Fallback 파싱 성공');
            return parsed;
            
        } catch (fallbackError) {
            console.error('Fallback 파싱도 실패:', fallbackError);
            
            // 완전 실패 시 기본 구조 반환
            return {
                content_type: "파싱 오류",
                study_suggestions: [],
                key_takeaways: ["결과를 파싱할 수 없어 원본 텍스트를 표시합니다."],
                next_steps: [],
                raw_response: jsonStr
            };
        }
    }

    /**
     * 결과 HTML 생성
     */
    generateResultHTML(result, contentData) {
        let html = '';
        
        // 헤더
        html += `<div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <h3 class="text-blue-800 dark:text-blue-200 font-medium">
                📊 ${this.getContentTypeLabel(contentData.contentType)} 분석 결과
            </h3>
            <p class="text-blue-600 dark:text-blue-300 text-sm mt-1">
                ${contentData.isCustom ? '맞춤 분석' : '페이지 자동 분석'}
            </p>
        </div>`;

        // 에러 처리
        if (result.error) {
            html += `<div class="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <p class="text-red-600 dark:text-red-300">${result.message}</p>
            </div>`;
            return html;
        }

        // 타입별 결과 표시
        if (result.definitions) {
            html += this.generateDefinitionsHTML(result.definitions);
        }
        
        if (result.references) {
            html += this.generateReferencesHTML(result.references);
        }
        
        if (result.quiz) {
            html += this.generateQuizHTML(result.quiz);
        }
        
        if (result.code_analysis) {
            html += this.generateCodeAnalysisHTML(result.code_analysis);
        }
        
        if (result.summary) {
            html += this.generateSummaryHTML(result.summary);
        }

        if (result.study_suggestions) {
            html += this.generateStudySuggestionsHTML(result.study_suggestions);
        }

        if (result.general_response) {
            html += `<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 class="font-medium text-gray-800 dark:text-white mb-2">💬 AI 응답</h4>
                <div class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">${result.general_response}</div>
            </div>`;
        }

        return html || '<div class="text-gray-500 dark:text-gray-400">분석 결과가 없습니다.</div>';
    }

    /**
     * 용어 정의 HTML 생성
     */
    generateDefinitionsHTML(definitions) {
        let html = '<div class="mb-6"><h4 class="text-lg font-medium text-gray-800 dark:text-white mb-3">📖 주요 용어</h4>';
        definitions.forEach(def => {
            const importanceColor = def.importance > 7 ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700' :
                                   def.importance > 5 ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700' :
                                   'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700';
            
            html += `<div class="mb-3 p-4 ${importanceColor} border rounded-lg">
                <div class="flex justify-between items-start mb-2">
                    <h5 class="font-medium text-gray-800 dark:text-white">${def.term}</h5>
                    <span class="text-xs px-2 py-1 bg-white dark:bg-gray-700 rounded">중요도: ${def.importance}/10</span>
                </div>
                <p class="text-gray-700 dark:text-gray-300 text-sm">${def.definition}</p>
                ${def.category ? `<span class="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded">${def.category}</span>` : ''}
            </div>`;
        });
        html += '</div>';
        return html;
    }

    /**
     * 참고자료 HTML 생성
     */
    generateReferencesHTML(references) {
        let html = '<div class="mb-6"><h4 class="text-lg font-medium text-gray-800 dark:text-white mb-3">📚 추천 참고자료</h4>';
        references.forEach(ref => {
            html += `<div class="mb-3 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded">${ref.type}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">관련성: ${ref.relevance}/10</span>
                </div>
                <h5 class="font-medium text-gray-800 dark:text-white mb-1">${ref.title}</h5>
                <p class="text-gray-700 dark:text-gray-300 text-sm">${ref.description}</p>
            </div>`;
        });
        html += '</div>';
        return html;
    }

    /**
     * 퀴즈 HTML 생성
     */
    generateQuizHTML(quiz) {
        let html = '<div class="mb-6"><h4 class="text-lg font-medium text-gray-800 dark:text-white mb-3">🧠 학습 퀴즈</h4>';
        quiz.forEach((q, index) => {
            html += `<div class="mb-4 p-4 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg">
                <div class="flex justify-between items-start mb-3">
                    <h5 class="font-medium text-gray-800 dark:text-white">문제 ${index + 1}</h5>
                    <span class="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded">난이도: ${q.difficulty}/5</span>
                </div>
                <p class="text-gray-700 dark:text-gray-300 mb-3">${q.question}</p>`;
            
            if (q.options && q.type === '객관식') {
                html += '<div class="mb-3">';
                q.options.forEach((option, i) => {
                    html += `<div class="mb-1 text-sm text-gray-600 dark:text-gray-400">${i + 1}. ${option}</div>`;
                });
                html += '</div>';
            }
            
            html += `<details class="text-sm">
                <summary class="cursor-pointer text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200">정답 및 해설 보기</summary>
                <div class="mt-2 p-3 bg-white dark:bg-gray-700 rounded">
                    <p class="font-medium text-green-600 dark:text-green-400 mb-1">정답: ${q.correct_answer}</p>
                    <p class="text-gray-600 dark:text-gray-400">${q.explanation}</p>
                </div>
            </details></div>`;
        });
        html += '</div>';
        return html;
    }

    /**
     * 코드 분석 HTML 생성
     */
    generateCodeAnalysisHTML(analysis) {
        let html = '<div class="mb-6"><h4 class="text-lg font-medium text-gray-800 dark:text-white mb-3">💻 코드 분석</h4>';
        html += `<div class="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div class="mb-3">
                <span class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded">${analysis.language || '언어 미확인'}</span>
            </div>
            <h5 class="font-medium text-gray-800 dark:text-white mb-2">목적</h5>
            <p class="text-gray-700 dark:text-gray-300 text-sm mb-3">${analysis.purpose}</p>`;
        
        if (analysis.key_concepts) {
            html += `<h5 class="font-medium text-gray-800 dark:text-white mb-2">핵심 개념</h5>
                <div class="flex flex-wrap gap-2 mb-3">`;
            analysis.key_concepts.forEach(concept => {
                html += `<span class="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded">${concept}</span>`;
            });
            html += '</div>';
        }
        
        html += '</div></div>';
        return html;
    }

    /**
     * 요약 HTML 생성
     */
    generateSummaryHTML(summary) {
        let html = '<div class="mb-6"><h4 class="text-lg font-medium text-gray-800 dark:text-white mb-3">📝 내용 요약</h4>';
        html += `<div class="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
            <h5 class="font-medium text-gray-800 dark:text-white mb-2">${summary.main_topic}</h5>
            <p class="text-gray-700 dark:text-gray-300 text-sm mb-3">${summary.detailed_summary}</p>`;
        
        if (summary.key_points) {
            html += '<h6 class="font-medium text-gray-800 dark:text-white mb-2">핵심 포인트</h6><ul class="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-3">';
            summary.key_points.forEach(point => {
                html += `<li>${point}</li>`;
            });
            html += '</ul>';
        }
        
        if (summary.learning_objectives) {
            html += '<h6 class="font-medium text-gray-800 dark:text-white mb-2">학습 목표</h6><ul class="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">';
            summary.learning_objectives.forEach(objective => {
                html += `<li>${objective}</li>`;
            });
            html += '</ul>';
        }
        
        html += '</div></div>';
        return html;
    }

    /**
     * 학습 제안 HTML 생성
     */
    generateStudySuggestionsHTML(suggestions) {
        let html = '<div class="mb-6"><h4 class="text-lg font-medium text-gray-800 dark:text-white mb-3">🎯 학습 제안</h4>';
        suggestions.forEach(suggestion => {
            const priorityColor = suggestion.priority > 3 ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30' :
                                 suggestion.priority > 2 ? 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30' :
                                 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/30';
            
            html += `<div class="mb-3 p-3 ${priorityColor} border rounded-lg">
                <div class="flex justify-between items-start mb-1">
                    <span class="text-xs px-2 py-1 bg-white dark:bg-gray-700 rounded">${suggestion.type}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">우선순위: ${suggestion.priority}/5</span>
                </div>
                <p class="text-gray-700 dark:text-gray-300 text-sm">${suggestion.suggestion}</p>
            </div>`;
        });
        html += '</div>';
        return html;
    }

    /**
     * 분석 타입 결정
     */
    determineAnalysisType(contentType) {
        const typeMapping = {
            'google_docs': 'references',
            'coding': 'code_explanation',
            'research_paper': 'definitions',
            'tutorial': 'quiz',
            'mathematics': 'definitions',
            'education': 'summary',
            'general': 'general'
        };
        return typeMapping[contentType] || 'general';
    }

    /**
     * 콘텐츠 타입 라벨 반환
     */
    getContentTypeLabel(contentType) {
        const labels = {
            'google_docs': 'Google 문서',
            'coding': '코딩 자료',
            'research_paper': '연구 논문',
            'tutorial': '튜토리얼',
            'mathematics': '수학 자료',
            'education': '교육 콘텐츠',
            'encyclopedia': '백과사전',
            'video': '동영상',
            'general': '일반 문서',
            'definitions': '용어 정의',
            'references': '참고자료',
            'quiz': '퀴즈',
            'summary': '요약',
            'code_explanation': '코드 설명'
        };
        return labels[contentType] || '알 수 없음';
    }

    /**
     * 자동 분석 토글
     */
    async toggleAutoAnalysis(enabled) {
        if (enabled && !this.studyAssistant.getStatus) {
            await this.initializeStudyAssistant();
        } else if (!enabled && this.studyAssistant.destroy) {
            this.studyAssistant.destroy();
        }
        
        this.savePreferences();
        this.showToast(
            enabled ? '자동 분석 활성화' : '자동 분석 비활성화',
            enabled ? '페이지 변경 시 자동으로 분석합니다.' : '수동으로만 분석합니다.',
            'info'
        );
    }

    /**
     * 다크모드 토글
     */
    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        this.applyDarkMode();
        localStorage.setItem('darkMode', this.isDarkMode.toString());
    }

    /**
     * 다크모드 적용
     */
    applyDarkMode() {
        if (this.isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    /**
     * 설정 저장
     */
    savePreferences() {
        const preferences = {
            autoAnalysis: document.getElementById('autoAnalysis').checked,
            difficulty: document.getElementById('difficultyLevel').value,
            notificationDuration: document.getElementById('notificationDuration').value,
            darkMode: this.isDarkMode
        };
        
        localStorage.setItem('studyHelperPreferences', JSON.stringify(preferences));
    }

    /**
     * 로딩 상태 표시/숨김
     */
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    /**
     * 토스트 메시지 표시
     */
    showToast(title, message, type = 'info') {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 ${colors[type]} text-white p-4 rounded-lg shadow-lg z-50 max-w-sm`;
        toast.innerHTML = `
            <div class="font-medium">${title}</div>
            <div class="text-sm opacity-90">${message}</div>
        `;

        document.body.appendChild(toast);
        
        // 자동 제거
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 4000);
    }

    /**
     * 도움말 패널 토글
     */
    toggleHelpPanel() {
        const helpPanel = document.querySelector('.study-helper-panel');
        if (helpPanel) {
            helpPanel.remove();
        } else {
            this.showToast('단축키', 'Ctrl+Shift+A: 페이지 분석, Ctrl+Shift+H: 이 도움말', 'info');
        }
    }
}

// DOM이 로드되면 앱 시작
document.addEventListener('DOMContentLoaded', () => {
    window.studyHelperApp = new StudyHelperApp();
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (window.studyHelperApp && window.studyHelperApp.studyAssistant) {
        window.studyHelperApp.studyAssistant.destroy();
    }
});