/**
 * 메인 애플리케이션 컨트롤러
 * 모든 컴포넌트를 조율하고 UI 이벤트를 처리
 */

class ConceptVisualizationApp {
    constructor() {
        this.isProcessing = false;
        this.currentData = null;
        this.elements = {};
        this.debounceTimers = {};
    }

    /**
     * 애플리케이션 초기화
     */
    async initialize() {
        console.log('개념 시각화 앱 초기화 중...');

        // DOM 요소 참조 수집
        this.collectElementReferences();

        // 이벤트 리스너 설정
        this.setupEventListeners();

        // 지식 네트워크 로드
        this.loadKnowledgeNetwork();

        // API 상태 확인
        await this.checkAPIStatus();

        // 윈도우 리사이즈 핸들러
        window.addEventListener('resize', () => {
            if (window.graphVisualizer) {
                window.graphVisualizer.resize();
            }
        });

        console.log('앱 초기화 완료');
    }

    /**
     * DOM 요소 참조 수집
     */
    collectElementReferences() {
        this.elements = {
            // 상태 표시
            statusIndicator: document.getElementById('status-indicator'),
            statusText: document.getElementById('status-text'),
            
            // 입력 및 제어
            studyMaterial: document.getElementById('study-material'),
            analyzeBtn: document.getElementById('analyze-btn'),
            analyzeText: document.getElementById('analyze-text'),
            analyzeSpinner: document.getElementById('analyze-spinner'),
            clearBtn: document.getElementById('clear-btn'),
            analysisStatus: document.getElementById('analysis-status'),
            
            // 필터 및 검색
            conceptFilter: document.getElementById('concept-filter'),
            relationshipStrength: document.getElementById('relationship-strength'),
            resetViewBtn: document.getElementById('reset-view-btn'),
            saveNetworkBtn: document.getElementById('save-network-btn'),
            
            // 통계
            conceptNumber: document.getElementById('concept-number'),
            connectionNumber: document.getElementById('connection-number'),
            
            // 오류 모달
            errorModal: document.getElementById('error-modal'),
            errorMessage: document.getElementById('error-message'),
            closeErrorBtn: document.getElementById('close-error-btn')
        };
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 분석 버튼
        this.elements.analyzeBtn.addEventListener('click', () => {
            this.analyzeText();
        });

        // 지우기 버튼
        this.elements.clearBtn.addEventListener('click', () => {
            this.clearInput();
        });

        // 검색 필터 (디바운스 적용)
        this.elements.conceptFilter.addEventListener('input', (e) => {
            this.debounce('search', () => {
                this.searchConcepts(e.target.value);
            }, 300);
        });

        // 관계 강도 필터
        this.elements.relationshipStrength.addEventListener('input', (e) => {
            this.filterByStrength(parseInt(e.target.value));
        });

        // 뷰 리셋 버튼
        this.elements.resetViewBtn.addEventListener('click', () => {
            this.resetView();
        });

        // 네트워크 저장 버튼
        this.elements.saveNetworkBtn.addEventListener('click', () => {
            this.saveNetwork();
        });

        // 오류 모달 닫기
        this.elements.closeErrorBtn.addEventListener('click', () => {
            this.hideErrorModal();
        });

        // 모달 배경 클릭으로 닫기
        this.elements.errorModal.addEventListener('click', (e) => {
            if (e.target === this.elements.errorModal) {
                this.hideErrorModal();
            }
        });

        // Enter 키로 분석 실행
        this.elements.studyMaterial.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey && !this.isProcessing) {
                this.analyzeText();
            }
        });
    }

    /**
     * API 상태 확인
     */
    async checkAPIStatus() {
        try {
            const status = await window.geminiAPI.checkAvailability();
            this.updateStatusUI(status);
            return status.available;
        } catch (error) {
            console.error('API 상태 확인 오류:', error);
            this.updateStatusUI({
                available: false,
                status: 'error',
                message: 'API 상태 확인 중 오류가 발생했습니다.'
            });
            return false;
        }
    }

    /**
     * 상태 UI 업데이트
     */
    updateStatusUI(status) {
        const indicator = this.elements.statusIndicator;
        const text = this.elements.statusText;

        if (status.available) {
            indicator.className = 'w-3 h-3 rounded-full bg-green-500';
            text.textContent = status.message;
            this.elements.analyzeBtn.disabled = false;
        } else {
            indicator.className = 'w-3 h-3 rounded-full bg-red-500';
            text.textContent = status.message;
            this.elements.analyzeBtn.disabled = true;
        }
    }

    /**
     * 지식 네트워크 로드
     */
    loadKnowledgeNetwork() {
        const hasExistingNetwork = window.knowledgeNetwork.loadCurrentSession();
        
        if (hasExistingNetwork) {
            const network = window.knowledgeNetwork.getCurrentNetwork();
            if (network.concepts.length > 0) {
                this.displayNetwork(network);
                this.updateStatsUI(network);
                console.log('기존 지식 네트워크 로드됨');
            }
        }
    }

    /**
     * 텍스트 분석 실행
     */
    async analyzeText() {
        const text = this.elements.studyMaterial.value.trim();
        
        if (!text) {
            this.showError('분석할 텍스트를 입력해주세요.');
            return;
        }

        if (this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.setAnalysisLoading(true);

            console.log('텍스트 분석 시작...');

            // Gemini API로 텍스트 분석
            const analysisResult = await window.geminiAPI.analyzeText(text);

            // 개념 분석기로 결과 처리
            const analyzerResult = await window.conceptAnalyzer.analyzeTextResponses(
                analysisResult.conceptResponse,
                analysisResult.relationshipResponse
            );

            if (!analyzerResult.success) {
                throw new Error(analyzerResult.error || '분석 결과 처리에 실패했습니다.');
            }

            console.log('분석 완료:', analyzerResult.stats);

            // 지식 네트워크에 병합
            const mergedNetwork = window.knowledgeNetwork.mergeNewConcepts(
                analyzerResult.concepts,
                analyzerResult.relationships
            );

            // 시각화 업데이트
            this.displayNetwork(mergedNetwork);
            this.updateStatsUI(mergedNetwork);

            // 성공 메시지
            this.showSuccessMessage(analyzerResult.stats);

        } catch (error) {
            console.error('텍스트 분석 오류:', error);
            this.showError(error.message);
        } finally {
            this.isProcessing = false;
            this.setAnalysisLoading(false);
        }
    }

    /**
     * 네트워크 시각화 표시
     */
    displayNetwork(network) {
        const graphData = {
            nodes: network.concepts,
            links: network.relationships
        };

        window.graphVisualizer.renderGraph(graphData);
        this.currentData = network;
    }

    /**
     * 통계 UI 업데이트
     */
    updateStatsUI(network) {
        this.elements.conceptNumber.textContent = network.concepts.length;
        this.elements.connectionNumber.textContent = network.relationships.length;
    }

    /**
     * 로딩 상태 설정
     */
    setAnalysisLoading(loading) {
        const btn = this.elements.analyzeBtn;
        const text = this.elements.analyzeText;
        const spinner = this.elements.analyzeSpinner;
        const status = this.elements.analysisStatus;

        if (loading) {
            btn.disabled = true;
            text.textContent = '분석 중...';
            spinner.classList.remove('hidden');
            status.classList.remove('hidden');
        } else {
            btn.disabled = false;
            text.textContent = '개념 분석하기';
            spinner.classList.add('hidden');
            status.classList.add('hidden');
        }
    }

    /**
     * 입력 내용 지우기
     */
    clearInput() {
        this.elements.studyMaterial.value = '';
        this.elements.studyMaterial.focus();
    }

    /**
     * 개념 검색
     */
    searchConcepts(query) {
        if (!this.currentData) return;

        if (!query || query.trim() === '') {
            // 전체 네트워크 표시
            this.displayNetwork(this.currentData);
            window.graphVisualizer.resetHighlight();
        } else {
            // 검색 결과만 표시
            const searchResult = window.knowledgeNetwork.searchNetwork(query);
            this.displayNetwork(searchResult);
            window.graphVisualizer.searchAndHighlight(query);
        }
    }

    /**
     * 관계 강도별 필터링
     */
    filterByStrength(minStrength) {
        if (!this.currentData) return;

        const filteredNetwork = window.knowledgeNetwork.filterByStrength(minStrength);
        this.displayNetwork(filteredNetwork);
        window.graphVisualizer.filterByStrength(minStrength);
    }

    /**
     * 뷰 리셋
     */
    resetView() {
        if (window.graphVisualizer) {
            window.graphVisualizer.resetView();
        }

        // 필터 리셋
        this.elements.conceptFilter.value = '';
        this.elements.relationshipStrength.value = 0;

        // 전체 네트워크 다시 표시
        if (this.currentData) {
            this.displayNetwork(this.currentData);
        }
    }

    /**
     * 네트워크 저장
     */
    saveNetwork() {
        try {
            window.knowledgeNetwork.exportNetwork();
            this.showSuccessMessage({
                message: '지식 네트워크가 성공적으로 내보내졌습니다.'
            });
        } catch (error) {
            console.error('네트워크 저장 오류:', error);
            this.showError('네트워크 저장에 실패했습니다.');
        }
    }

    /**
     * 성공 메시지 표시
     */
    showSuccessMessage(stats) {
        // 간단한 성공 표시 (추후 토스트 메시지로 개선 가능)
        console.log('분석 성공:', stats);
        
        // 버튼에 임시 성공 표시
        const originalText = this.elements.analyzeText.textContent;
        this.elements.analyzeText.textContent = '분석 완료!';
        this.elements.analyzeBtn.classList.add('bg-green-600');
        
        setTimeout(() => {
            this.elements.analyzeText.textContent = originalText;
            this.elements.analyzeBtn.classList.remove('bg-green-600');
        }, 2000);
    }

    /**
     * 오류 표시
     */
    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorModal.classList.remove('hidden');
    }

    /**
     * 오류 모달 숨기기
     */
    hideErrorModal() {
        this.elements.errorModal.classList.add('hidden');
    }

    /**
     * 디바운스 유틸리티
     */
    debounce(key, func, delay) {
        if (this.debounceTimers[key]) {
            clearTimeout(this.debounceTimers[key]);
        }
        this.debounceTimers[key] = setTimeout(func, delay);
    }

    /**
     * 네트워크 지우기
     */
    clearNetwork() {
        if (confirm('현재 지식 네트워크를 모두 지우시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            window.knowledgeNetwork.clearNetwork();
            window.graphVisualizer.clearGraph();
            this.currentData = null;
            this.updateStatsUI({ concepts: [], relationships: [] });
            console.log('네트워크가 지워졌습니다.');
        }
    }
}

// DOM 로드 완료 후 앱 초기화
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.app = new ConceptVisualizationApp();
        await window.app.initialize();
        console.log('개념 시각화 도구가 준비되었습니다.');
    } catch (error) {
        console.error('앱 초기화 오류:', error);
        alert('애플리케이션 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
    }
});