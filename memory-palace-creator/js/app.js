// Memory Palace Creator - Gemini Nano API 연동
class MemoryPalaceCreator {
    constructor() {
        this.session = null;
        this.memoryItems = [];
        this.currentStory = null;
        this.savedStories = JSON.parse(localStorage.getItem('memoryPalaces') || '[]');
        
        this.init();
    }

    async init() {
        // API 상태 확인
        await this.checkAPIStatus();
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 저장된 스토리 표시
        this.displaySavedStories();
        
        // 다크모드 초기화
        this.initDarkMode();
        
        // 첫 번째 메모리 아이템 추가
        this.addMemoryItem();
    }

    async checkAPIStatus() {
        const statusElement = document.getElementById('apiStatus');
        
        try {
            // Gemini Nano API 확인
            if (typeof LanguageModel === 'undefined') {
                this.updateAPIStatus('unavailable', 'Gemini Nano API를 사용할 수 없습니다. Chrome 127+ 버전과 플래그 설정을 확인해주세요.');
                return;
            }

            const availability = await LanguageModel.availability();
            console.log('API Availability:', availability);

            switch (availability) {
                case 'available':
                    this.updateAPIStatus('available', 'Gemini Nano API 사용 가능');
                    break;
                case 'downloadable':
                    this.updateAPIStatus('downloadable', 'Gemini Nano 모델(약 1.7GB) 다운로드를 시작합니다...');
                    // 즉시 다운로드 시작
                    await this.triggerModelDownload();
                    break;
                case 'downloading':
                    this.updateAPIStatus('downloading', 'Gemini Nano 모델을 다운로드하는 중입니다...');
                    this.checkDownloadProgress();
                    break;
                default:
                    this.updateAPIStatus('unavailable', 'Gemini Nano API를 사용할 수 없습니다.');
            }
        } catch (error) {
            console.error('API 상태 확인 오류:', error);
            this.updateAPIStatus('error', `오류 발생: ${error.message}`);
        }
    }

    updateAPIStatus(status, message) {
        const statusElement = document.getElementById('apiStatus');
        const statusClasses = {
            available: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
            downloadable: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
            downloading: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
            unavailable: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
            error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        };

        const iconClasses = {
            available: 'text-green-600 dark:text-green-500',
            downloadable: 'text-blue-600 dark:text-blue-500',
            downloading: 'text-yellow-600 dark:text-yellow-500',
            unavailable: 'text-red-600 dark:text-red-500',
            error: 'text-red-600 dark:text-red-500'
        };

        const textClasses = {
            available: 'text-green-800 dark:text-green-300',
            downloadable: 'text-blue-800 dark:text-blue-300',
            downloading: 'text-yellow-800 dark:text-yellow-300',
            unavailable: 'text-red-800 dark:text-red-300',
            error: 'text-red-800 dark:text-red-300'
        };

        statusElement.innerHTML = `
            <div class="${statusClasses[status]} border rounded-lg p-4">
                <div class="flex items-center space-x-2">
                    <svg class="w-5 h-5 ${iconClasses[status]}" fill="currentColor" viewBox="0 0 20 20">
                        ${status === 'available' ? 
                            '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>' :
                            '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>'
                        }
                    </svg>
                    <span class="${textClasses[status]}">${message}</span>
                </div>
            </div>
        `;

        // 버튼 활성화/비활성화
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.disabled = status !== 'available';
    }

    async triggerModelDownload() {
        try {
            // 사용자에게 다운로드 안내
            this.showDownloadNotice();
            
            // 세션 생성을 시도하여 다운로드 트리거
            console.log('모델 다운로드 시작 중...');
            const session = await LanguageModel.create();
            
            // 세션이 성공적으로 생성되면 다운로드가 시작됨
            if (session) {
                this.session = session;
                this.updateAPIStatus('downloading', 'Gemini Nano 모델 다운로드 중... (약 1.7GB)');
                this.checkDownloadProgress();
            }
        } catch (error) {
            console.log('다운로드 트리거 오류 (정상적일 수 있음):', error);
            // 다운로드가 시작된 경우 에러가 발생할 수 있으므로 진행 상황 확인
            this.checkDownloadProgress();
        }
    }

    showDownloadNotice() {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md';
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <svg class="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <div>
                    <p class="font-medium">Gemini Nano 모델 다운로드</p>
                    <p class="text-sm opacity-90">약 1.7GB 크기 • 시간이 오래 걸릴 수 있습니다</p>
                </div>
            </div>
        `;
        document.body.appendChild(notification);
        
        // 10초 후 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }

    async checkDownloadProgress() {
        let retryCount = 0;
        const maxRetries = 3;
        const checkInterval = 2000; // 2초마다 확인
        let noProgressCount = 0;
        const maxNoProgress = 30; // 60초 동안 진행이 없으면 재시도
        
        const progressChecker = setInterval(async () => {
            try {
                const availability = await LanguageModel.availability();
                console.log(`다운로드 상태 확인: ${availability}`);
                
                if (availability === 'available') {
                    clearInterval(progressChecker);
                    this.updateAPIStatus('available', 'Gemini Nano API 사용 가능! 🎉');
                    this.showSuccessNotification();
                } else if (availability === 'downloading') {
                    this.updateAPIStatus('downloading', `Gemini Nano 모델 다운로드 중... (약 1.7GB)`);
                    noProgressCount = 0; // 진행 중이므로 카운터 리셋
                } else if (availability === 'downloadable') {
                    noProgressCount++;
                    if (noProgressCount >= maxNoProgress && retryCount < maxRetries) {
                        console.log(`다운로드 재시도 ${retryCount + 1}/${maxRetries}`);
                        retryCount++;
                        noProgressCount = 0;
                        await this.triggerModelDownload();
                    } else if (retryCount >= maxRetries) {
                        clearInterval(progressChecker);
                        this.updateAPIStatus('error', '다운로드가 시작되지 않습니다. 페이지를 새로고침해 주세요.');
                    }
                } else {
                    // 예상치 못한 상태
                    noProgressCount++;
                    if (noProgressCount >= maxNoProgress) {
                        clearInterval(progressChecker);
                        this.updateAPIStatus('error', `예상치 못한 상태: ${availability}`);
                    }
                }
            } catch (error) {
                console.error('다운로드 진행 상황 확인 오류:', error);
                retryCount++;
                if (retryCount >= maxRetries) {
                    clearInterval(progressChecker);
                    this.updateAPIStatus('error', '다운로드 상태 확인 중 오류가 발생했습니다.');
                }
            }
        }, checkInterval);
        
        // 타임아웃 설정 (30분)
        setTimeout(() => {
            clearInterval(progressChecker);
            if (document.getElementById('apiStatus').textContent.includes('다운로드')) {
                this.updateAPIStatus('error', '다운로드 시간이 초과되었습니다. 네트워크 연결을 확인하고 새로고침해 주세요.');
            }
        }, 30 * 60 * 1000);
    }
    
    showSuccessNotification() {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg z-50';
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <p class="font-medium">Gemini Nano 모델 다운로드 완료!</p>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    setupEventListeners() {
        // 항목 추가 버튼
        document.getElementById('addItemBtn').addEventListener('click', () => this.addMemoryItem());
        
        // 예시 버튼들
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                const content = e.target.dataset.content;
                this.addMemoryItem(category, content);
            });
        });
        
        // 생성 버튼
        document.getElementById('generateBtn').addEventListener('click', () => this.generateStory());
        
        // 재생성 버튼
        document.getElementById('regenerateBtn').addEventListener('click', () => this.regenerateStory());
        
        // 저장 버튼
        document.getElementById('saveBtn').addEventListener('click', () => this.saveStory());
        
        // 다크모드 토글
        document.getElementById('darkModeToggle').addEventListener('click', () => this.toggleDarkMode());
    }

    addMemoryItem(category = 'other', content = '') {
        const itemId = Date.now();
        const memoryItemsContainer = document.getElementById('memoryItems');
        
        const itemHTML = `
            <div class="memory-item flex gap-3 animate-slide-up" data-id="${itemId}">
                <select class="item-category px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                    <option value="date" ${category === 'date' ? 'selected' : ''}>📅 날짜</option>
                    <option value="formula" ${category === 'formula' ? 'selected' : ''}>🔬 공식</option>
                    <option value="vocab" ${category === 'vocab' ? 'selected' : ''}>📚 어휘</option>
                    <option value="number" ${category === 'number' ? 'selected' : ''}>🔢 숫자</option>
                    <option value="other" ${category === 'other' ? 'selected' : ''}>🎯 기타</option>
                </select>
                <input type="text" class="item-content flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                    placeholder="기억할 내용을 입력하세요" value="${content}">
                <button class="remove-item p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        `;
        
        memoryItemsContainer.insertAdjacentHTML('beforeend', itemHTML);
        
        // 삭제 버튼 이벤트
        const newItem = memoryItemsContainer.querySelector(`[data-id="${itemId}"]`);
        newItem.querySelector('.remove-item').addEventListener('click', () => {
            newItem.remove();
            // 항목이 하나도 없으면 자동으로 추가
            if (memoryItemsContainer.children.length === 0) {
                this.addMemoryItem();
            }
        });
        
        // 새로 추가된 항목에 포커스
        if (!content) {
            newItem.querySelector('.item-content').focus();
        }
    }

    collectMemoryItems() {
        const items = [];
        document.querySelectorAll('.memory-item').forEach(item => {
            const category = item.querySelector('.item-category').value;
            const content = item.querySelector('.item-content').value.trim();
            if (content) {
                items.push({ category, content });
            }
        });
        return items;
    }

    async generateStory() {
        const items = this.collectMemoryItems();
        if (items.length === 0) {
            alert('기억할 항목을 최소 하나 이상 입력해주세요.');
            return;
        }

        const theme = document.getElementById('themeSelect').value;
        
        // UI 상태 변경
        this.showLoading(true);
        document.getElementById('generateBtn').disabled = true;

        try {
            // 세션 생성
            if (!this.session) {
                this.session = await LanguageModel.create();
            }

            // 프롬프트 생성
            const prompt = this.createPrompt(items, theme);
            console.log('프롬프트:', prompt);

            // AI 응답 생성
            const response = await this.session.prompt(prompt);
            console.log('AI 응답:', response);

            // 스토리 표시
            this.displayStory(response, items, theme);
            
            // 현재 스토리 저장
            this.currentStory = {
                id: Date.now(),
                items: items,
                theme: theme,
                story: response,
                createdAt: new Date().toISOString()
            };

            // 버튼 활성화
            document.getElementById('regenerateBtn').disabled = false;
            document.getElementById('saveBtn').disabled = false;

        } catch (error) {
            console.error('스토리 생성 오류:', error);
            alert(`스토리 생성 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            this.showLoading(false);
            document.getElementById('generateBtn').disabled = false;
        }
    }

    createPrompt(items, theme) {
        const themeDescriptions = {
            'fantasy-castle': '웅장한 판타지 성',
            'spaceship': '미래적인 우주선',
            'magic-school': '신비로운 마법 학교',
            'strange-house': '기묘하고 이상한 집',
            'underwater-palace': '환상적인 해저 궁전',
            'time-machine': '놀라운 시간여행 기계'
        };

        const itemsList = items.map((item, index) => 
            `${index + 1}. [${this.getCategoryName(item.category)}] ${item.content}`
        ).join('\n');

        return `당신은 기억술 전문가입니다. 아래 항목들을 기억하기 쉽도록 "${themeDescriptions[theme]}"를 배경으로 한 생생하고 재미있는 기억의 궁전 이야기를 만들어주세요.

기억할 항목들:
${itemsList}

요구사항:
1. 각 항목을 ${themeDescriptions[theme]}의 특정 장소나 방에 배치하세요
2. 각 항목마다 시각적이고 감각적인 이미지를 만들어주세요
3. 항목들 사이에 논리적이고 기억하기 쉬운 연결고리를 만들어주세요
4. 유머러스하거나 과장된 요소를 추가해 더 기억에 남도록 하세요
5. 이야기는 한국어로, 생동감 있게 작성해주세요
6. 각 항목이 등장할 때 **굵은 글씨**로 강조해주세요

이야기를 시작하세요:`;
    }

    getCategoryName(category) {
        const names = {
            date: '날짜',
            formula: '공식',
            vocab: '어휘',
            number: '숫자',
            other: '기타'
        };
        return names[category] || '기타';
    }

    displayStory(story, items, theme) {
        const container = document.getElementById('storyContainer');
        
        // 마크다운 스타일로 변환 (간단한 변환)
        let formattedStory = story
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-600 dark:text-purple-400">$1</strong>')
            .replace(/\n\n/g, '</p><p class="mb-4">')
            .replace(/\n/g, '<br>');
        
        formattedStory = `<p class="mb-4">${formattedStory}</p>`;
        
        // 테마 정보 추가
        const themeEmojis = {
            'fantasy-castle': '🏰',
            'spaceship': '🚀',
            'magic-school': '🎓',
            'strange-house': '🏚️',
            'underwater-palace': '🏊',
            'time-machine': '⏰'
        };
        
        container.innerHTML = `
            <div class="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p class="text-sm text-purple-700 dark:text-purple-300 mb-2">
                    ${themeEmojis[theme]} 테마: ${document.querySelector(`#themeSelect option[value="${theme}"]`).textContent}
                </p>
                <p class="text-sm text-purple-600 dark:text-purple-400">
                    기억할 항목 ${items.length}개
                </p>
            </div>
            <div class="prose prose-gray dark:prose-invert max-w-none">
                ${formattedStory}
            </div>
        `;
    }

    async regenerateStory() {
        if (this.currentStory) {
            await this.generateStory();
        }
    }

    saveStory() {
        if (!this.currentStory) return;
        
        // 제목 입력받기
        const title = prompt('이 기억의 궁전에 제목을 지어주세요:', 
            `${new Date().toLocaleDateString()} 기억의 궁전`);
        
        if (title) {
            this.currentStory.title = title;
            this.savedStories.unshift(this.currentStory);
            
            // 최대 20개까지만 저장
            if (this.savedStories.length > 20) {
                this.savedStories = this.savedStories.slice(0, 20);
            }
            
            // 로컬 스토리지에 저장
            localStorage.setItem('memoryPalaces', JSON.stringify(this.savedStories));
            
            // UI 업데이트
            this.displaySavedStories();
            
            // 알림
            this.showNotification('저장되었습니다!');
        }
    }

    displaySavedStories() {
        const container = document.getElementById('savedStories');
        
        if (this.savedStories.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>아직 저장된 기억의 궁전이 없습니다.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.savedStories.map(story => {
            const date = new Date(story.createdAt).toLocaleDateString();
            const themeEmojis = {
                'fantasy-castle': '🏰',
                'spaceship': '🚀',
                'magic-school': '🎓',
                'strange-house': '🏚️',
                'underwater-palace': '🏊',
                'time-machine': '⏰'
            };
            
            return `
                <div class="saved-story p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                     data-story-id="${story.id}">
                    <div class="flex items-start justify-between mb-2">
                        <h3 class="font-medium text-gray-900 dark:text-white">
                            ${themeEmojis[story.theme] || '📝'} ${story.title || '제목 없음'}
                        </h3>
                        <button class="delete-story text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        ${story.items.length}개 항목 • ${date}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-500 line-clamp-2">
                        ${story.items.map(item => item.content).join(', ')}
                    </p>
                </div>
            `;
        }).join('');
        
        // 이벤트 리스너 추가
        container.querySelectorAll('.saved-story').forEach(el => {
            el.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-story')) {
                    const storyId = parseInt(el.dataset.storyId);
                    this.loadStory(storyId);
                }
            });
        });
        
        container.querySelectorAll('.delete-story').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const storyEl = e.target.closest('.saved-story');
                const storyId = parseInt(storyEl.dataset.storyId);
                this.deleteStory(storyId);
            });
        });
    }

    loadStory(storyId) {
        const story = this.savedStories.find(s => s.id === storyId);
        if (story) {
            // 테마 설정
            document.getElementById('themeSelect').value = story.theme;
            
            // 항목들 설정
            const container = document.getElementById('memoryItems');
            container.innerHTML = '';
            story.items.forEach(item => {
                this.addMemoryItem(item.category, item.content);
            });
            
            // 스토리 표시
            this.displayStory(story.story, story.items, story.theme);
            
            // 현재 스토리 설정
            this.currentStory = story;
            
            // 버튼 활성화
            document.getElementById('regenerateBtn').disabled = false;
            document.getElementById('saveBtn').disabled = false;
            
            // 스크롤
            document.getElementById('storyContainer').scrollIntoView({ behavior: 'smooth' });
        }
    }

    deleteStory(storyId) {
        if (confirm('이 기억의 궁전을 삭제하시겠습니까?')) {
            this.savedStories = this.savedStories.filter(s => s.id !== storyId);
            localStorage.setItem('memoryPalaces', JSON.stringify(this.savedStories));
            this.displaySavedStories();
            this.showNotification('삭제되었습니다.');
        }
    }

    showLoading(show) {
        const container = document.getElementById('storyContainer');
        const spinner = document.getElementById('loadingSpinner');
        
        if (show) {
            container.classList.add('hidden');
            spinner.classList.remove('hidden');
        } else {
            container.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-up';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    initDarkMode() {
        // 저장된 설정 확인
        if (localStorage.getItem('darkMode') === 'true' || 
            (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        }
    }

    toggleDarkMode() {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
    }
}

// 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', () => {
    new MemoryPalaceCreator();
}); 