/**
 * Context-Aware Study Helper - 학습 도우미 모듈
 * 사용자의 학습 상황에 맞는 맞춤형 도움말과 제안을 제공
 */

class StudyAssistant {
    constructor() {
        this.geminiAPI = window.geminiAPI;
        this.contentAnalyzer = window.contentAnalyzer;
        this.currentSession = null;
        this.assistanceHistory = [];
        this.preferences = {
            language: 'ko',
            difficulty: 'medium',
            assistanceType: 'proactive'
        };
        
        this.loadPreferences();
    }

    /**
     * 초기화 및 자동 분석 시작
     */
    async initialize() {
        try {
            // Gemini API 상태 확인
            const apiStatus = await this.geminiAPI.checkAvailability();
            if (!apiStatus.available) {
                this.showStatus('API 사용 불가', apiStatus.message, 'warning');
                return false;
            }

            // 세션 생성
            await this.geminiAPI.createSession();
            
            // 콘텐츠 분석기 초기화
            this.contentAnalyzer.loadHistory();
            
            // 페이지 모니터링 시작
            this.startContextMonitoring();

            this.showStatus('초기화 완료', 'Context-Aware Study Helper가 활성화되었습니다.', 'success');
            return true;

        } catch (error) {
            console.error('초기화 오류:', error);
            this.showStatus('초기화 실패', error.message, 'error');
            return false;
        }
    }

    /**
     * 컨텍스트 모니터링 시작
     */
    startContextMonitoring() {
        // 페이지 변경 감지
        this.contentAnalyzer.startPageMonitoring((eventType, data) => {
            if (eventType === 'url_changed') {
                this.onPageChanged(data);
            } else if (eventType === 'content_changed') {
                this.onContentChanged(data);
            }
        });

        // 초기 페이지 분석
        this.analyzeCurrentPage();
    }

    /**
     * 현재 페이지 분석 및 도움말 제공
     */
    async analyzeCurrentPage() {
        try {
            // 콘텐츠 추출 및 분석 (await 추가)
            const contentData = await this.contentAnalyzer.extractContextualContent();
            
            // 콘텐츠 존재 여부 및 유효성 검증
            if (!contentData || !contentData.content || typeof contentData.content !== 'string') {
                console.warn('콘텐츠 데이터가 유효하지 않음:', contentData);
                return;
            }
            
            if (contentData.content.length < 50) {
                console.log('콘텐츠가 너무 적음 (< 50자):', contentData.content.length);
                return; // 콘텐츠가 너무 적으면 분석하지 않음
            }

            // 컨텍스트에 맞는 분석 타입 결정
            const analysisType = this.determineAnalysisType(contentData.contentType);
            
            // AI 분석 수행
            const assistance = await this.geminiAPI.analyzeContentForStudy(
                contentData.content, 
                analysisType
            );

            // 결과 파싱 및 표시
            const parsedAssistance = this.parseAssistanceResponse(assistance);
            this.showContextualHelp(parsedAssistance, contentData);

            // 히스토리에 저장
            this.saveAssistanceToHistory(contentData, parsedAssistance);

        } catch (error) {
            console.error('페이지 분석 오류:', error);
            // 사용자에게는 에러를 표시하지 않고 조용히 실패
        }
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
     * AI 응답 파싱
     */
    parseAssistanceResponse(response) {
        try {
            // JSON 응답 파싱 시도
            let parsed;
            if (typeof response === 'string') {
                // JSON 블록 추출 (```json...``` 형태)
                const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                                 response.match(/\{[\s\S]*\}/);
                
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                } else {
                    // JSON이 아닌 경우 일반 텍스트로 처리
                    parsed = { general_response: response };
                }
            } else {
                parsed = response;
            }

            return parsed;

        } catch (error) {
            console.error('응답 파싱 오류:', error);
            return { 
                error: true, 
                message: '응답을 처리하는 중 오류가 발생했습니다.',
                raw_response: response 
            };
        }
    }

    /**
     * 컨텍스트별 도움말 표시
     */
    showContextualHelp(assistance, contentData) {
        // 기존 도움말 패널 제거
        this.removeExistingHelp();

        // 새 도움말 패널 생성
        const helpPanel = this.createHelpPanel(assistance, contentData);
        document.body.appendChild(helpPanel);

        // 자동 숨김 타이머 (30초 후)
        setTimeout(() => {
            if (helpPanel.parentNode) {
                this.hideHelpPanel(helpPanel);
            }
        }, 30000);
    }

    /**
     * 도움말 패널 생성
     */
    createHelpPanel(assistance, contentData) {
        const panel = document.createElement('div');
        panel.className = 'study-helper-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 350px;
            max-height: 500px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
            overflow: hidden;
            animation: slideIn 0.5s ease;
        `;

        // 애니메이션 CSS 추가
        if (!document.getElementById('study-helper-styles')) {
            const styles = document.createElement('style');
            styles.id = 'study-helper-styles';
            styles.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }

        // 헤더
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 15px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <h3 style="margin: 0; font-size: 16px;">📚 학습 도우미</h3>
            <button onclick="this.closest('.study-helper-panel').remove()" 
                style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
        `;

        // 콘텐츠
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 20px;
            max-height: 400px;
            overflow-y: auto;
        `;

        content.innerHTML = this.generateHelpContent(assistance, contentData);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * 도움말 콘텐츠 생성
     */
    generateHelpContent(assistance, contentData) {
        let html = '';

        // 콘텐츠 타입 표시
        html += `<div style="margin-bottom: 15px; font-size: 12px; opacity: 0.8;">
            📄 ${this.getContentTypeLabel(contentData.contentType)} 감지됨
        </div>`;

        // 에러 처리
        if (assistance.error) {
            return html + `<div style="color: #ffeb3b;">⚠️ ${assistance.message}</div>`;
        }

        // 타입별 콘텐츠 생성
        if (assistance.definitions) {
            html += this.generateDefinitionsContent(assistance.definitions);
        }
        
        if (assistance.references) {
            html += this.generateReferencesContent(assistance.references);
        }
        
        if (assistance.quiz) {
            html += this.generateQuizContent(assistance.quiz);
        }
        
        if (assistance.code_analysis) {
            html += this.generateCodeAnalysisContent(assistance.code_analysis);
        }
        
        if (assistance.summary) {
            html += this.generateSummaryContent(assistance.summary);
        }

        if (assistance.study_suggestions) {
            html += this.generateStudySuggestionsContent(assistance.study_suggestions);
        }

        // 기본 제안사항
        if (contentData.suggestions) {
            html += `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
                <h4 style="margin: 0 0 10px 0; font-size: 14px;">💡 추가 도움말</h4>`;
            contentData.suggestions.forEach(suggestion => {
                html += `<div style="margin: 5px 0; font-size: 12px; opacity: 0.9;">• ${suggestion}</div>`;
            });
            html += '</div>';
        }

        return html || '<div style="opacity: 0.8;">현재 페이지에서 제공할 수 있는 학습 도움말이 없습니다.</div>';
    }

    /**
     * 용어 정의 콘텐츠 생성
     */
    generateDefinitionsContent(definitions) {
        let html = '<h4 style="margin: 0 0 10px 0; font-size: 14px;">📖 주요 용어</h4>';
        definitions.slice(0, 5).forEach(def => {
            html += `<div style="margin: 10px 0; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <strong style="color: #ffeb3b;">${def.term}</strong><br>
                <span style="font-size: 12px; opacity: 0.9;">${def.definition}</span>
            </div>`;
        });
        return html;
    }

    /**
     * 참고자료 콘텐츠 생성
     */
    generateReferencesContent(references) {
        let html = '<h4 style="margin: 0 0 10px 0; font-size: 14px;">📚 추천 자료</h4>';
        references.slice(0, 3).forEach(ref => {
            html += `<div style="margin: 8px 0; padding: 6px; border-left: 3px solid #ffeb3b;">
                <strong style="font-size: 12px;">${ref.title}</strong><br>
                <span style="font-size: 11px; opacity: 0.8;">${ref.description}</span>
            </div>`;
        });
        return html;
    }

    /**
     * 퀴즈 콘텐츠 생성
     */
    generateQuizContent(quiz) {
        if (quiz.length === 0) return '';
        
        const firstQuiz = quiz[0];
        let html = '<h4 style="margin: 0 0 10px 0; font-size: 14px;">🧠 빠른 퀴즈</h4>';
        html += `<div style="margin: 10px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
            <div style="font-size: 13px; margin-bottom: 8px;">${firstQuiz.question}</div>`;
        
        if (firstQuiz.options) {
            firstQuiz.options.forEach((option, index) => {
                html += `<div style="font-size: 11px; margin: 3px 0; opacity: 0.8;">${index + 1}. ${option}</div>`;
            });
        }
        
        html += `<button onclick="this.nextSibling.style.display='block'; this.style.display='none';" 
            style="margin-top: 8px; padding: 4px 8px; background: #ffeb3b; color: #333; border: none; border-radius: 4px; font-size: 11px; cursor: pointer;">
            정답 확인
        </button>
        <div style="display: none; margin-top: 8px; font-size: 11px; color: #4caf50;">
            정답: ${firstQuiz.correct_answer}<br>
            <span style="opacity: 0.8;">${firstQuiz.explanation}</span>
        </div></div>`;
        
        return html;
    }

    /**
     * 코드 분석 콘텐츠 생성
     */
    generateCodeAnalysisContent(analysis) {
        let html = '<h4 style="margin: 0 0 10px 0; font-size: 14px;">💻 코드 분석</h4>';
        html += `<div style="margin: 10px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
            <div style="font-size: 12px; margin-bottom: 8px;"><strong>목적:</strong> ${analysis.purpose}</div>`;
        
        if (analysis.key_concepts) {
            html += '<div style="font-size: 11px; margin: 5px 0;"><strong>핵심 개념:</strong> ';
            html += analysis.key_concepts.slice(0, 3).join(', ');
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    /**
     * 요약 콘텐츠 생성
     */
    generateSummaryContent(summary) {
        let html = '<h4 style="margin: 0 0 10px 0; font-size: 14px;">📝 핵심 요약</h4>';
        html += `<div style="margin: 10px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
            <div style="font-size: 13px; margin-bottom: 8px;"><strong>${summary.main_topic}</strong></div>`;
        
        if (summary.key_points) {
            summary.key_points.slice(0, 3).forEach(point => {
                html += `<div style="font-size: 11px; margin: 3px 0; opacity: 0.9;">• ${point}</div>`;
            });
        }
        
        html += '</div>';
        return html;
    }

    /**
     * 학습 제안 콘텐츠 생성
     */
    generateStudySuggestionsContent(suggestions) {
        let html = '<h4 style="margin: 0 0 10px 0; font-size: 14px;">🎯 학습 제안</h4>';
        suggestions.slice(0, 3).forEach(suggestion => {
            const priorityColor = suggestion.priority > 3 ? '#ff5722' : '#4caf50';
            html += `<div style="margin: 6px 0; padding: 6px; border-left: 3px solid ${priorityColor};">
                <span style="font-size: 11px; color: ${priorityColor};">[${suggestion.type}]</span>
                <div style="font-size: 12px; margin-top: 2px;">${suggestion.suggestion}</div>
            </div>`;
        });
        return html;
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
            'general': '일반 문서'
        };
        return labels[contentType] || '알 수 없음';
    }

    /**
     * 기존 도움말 패널 제거
     */
    removeExistingHelp() {
        const existing = document.querySelector('.study-helper-panel');
        if (existing) {
            existing.remove();
        }
    }

    /**
     * 도움말 패널 숨기기
     */
    hideHelpPanel(panel) {
        panel.style.animation = 'slideOut 0.5s ease';
        setTimeout(() => {
            if (panel.parentNode) {
                panel.remove();
            }
        }, 500);
    }

    /**
     * 상태 메시지 표시
     */
    showStatus(title, message, type = 'info') {
        const colors = {
            success: '#4caf50',
            warning: '#ff9800',
            error: '#f44336',
            info: '#2196f3'
        };

        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            padding: 12px 16px;
            background: ${colors[type]};
            color: white;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        toast.innerHTML = `<strong>${title}</strong><br><span style="font-size: 12px;">${message}</span>`;

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    /**
     * 페이지 변경 이벤트 처리
     */
    onPageChanged(newUrl) {
        console.log('페이지 변경 감지:', newUrl);
        
        // 잠시 대기 후 새 페이지 분석
        setTimeout(() => {
            this.analyzeCurrentPage();
        }, 2000);
    }

    /**
     * 콘텐츠 변경 이벤트 처리
     */
    onContentChanged(mutations) {
        // 의미있는 변경인지 확인 (너무 빈번한 호출 방지)
        const significantChanges = mutations.some(mutation => {
            return mutation.type === 'childList' && mutation.addedNodes.length > 0;
        });

        if (significantChanges) {
            // 디바운싱: 마지막 변경 후 3초 대기
            clearTimeout(this.contentChangeTimeout);
            this.contentChangeTimeout = setTimeout(() => {
                this.analyzeCurrentPage();
            }, 3000);
        }
    }

    /**
     * 도움말 히스토리에 저장
     */
    saveAssistanceToHistory(contentData, assistance) {
        const historyItem = {
            timestamp: new Date(),
            url: window.location.href,
            title: document.title,
            contentType: contentData.contentType,
            assistance: assistance
        };

        this.assistanceHistory.unshift(historyItem);
        
        // 히스토리 크기 제한 (최대 20개)
        if (this.assistanceHistory.length > 20) {
            this.assistanceHistory = this.assistanceHistory.slice(0, 20);
        }

        // 로컬 스토리지에 저장
        try {
            localStorage.setItem('studyAssistanceHistory', JSON.stringify(this.assistanceHistory));
        } catch (error) {
            console.error('히스토리 저장 오류:', error);
        }
    }

    /**
     * 사용자 설정 저장
     */
    savePreferences() {
        try {
            localStorage.setItem('studyHelperPreferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.error('설정 저장 오류:', error);
        }
    }

    /**
     * 사용자 설정 불러오기
     */
    loadPreferences() {
        try {
            const saved = localStorage.getItem('studyHelperPreferences');
            if (saved) {
                this.preferences = { ...this.preferences, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('설정 로드 오류:', error);
        }
    }

    /**
     * 정리 및 종료
     */
    destroy() {
        // 모니터링 중지
        this.contentAnalyzer.stopPageMonitoring();
        
        // 세션 정리
        if (this.geminiAPI) {
            this.geminiAPI.destroySession();
        }
        
        // 타이머 정리
        if (this.contentChangeTimeout) {
            clearTimeout(this.contentChangeTimeout);
        }
        
        // 기존 패널 제거
        this.removeExistingHelp();
    }
}

// 전역 인스턴스 생성
window.studyAssistant = new StudyAssistant();