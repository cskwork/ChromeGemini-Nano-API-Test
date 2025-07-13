/**
 * 지식 네트워크 관리 모듈
 * 개념 네트워크의 저장, 로드, 누적 학습 기능
 */

class KnowledgeNetwork {
    constructor() {
        this.currentNetwork = {
            concepts: [],
            relationships: [],
            metadata: {
                created: null,
                lastModified: null,
                sessionCount: 0,
                totalTextsAnalyzed: 0
            }
        };
        this.storageKey = 'conceptNetworkData';
        this.sessionKey = 'currentSession';
    }

    /**
     * 현재 세션 데이터 로드
     */
    loadCurrentSession() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.currentNetwork = JSON.parse(saved);
                console.log('기존 네트워크 로드됨:', this.getNetworkStats());
                return true;
            }
        } catch (error) {
            console.error('네트워크 로드 오류:', error);
            this.currentNetwork = this.createEmptyNetwork();
        }
        return false;
    }

    /**
     * 현재 세션 데이터 저장
     */
    saveCurrentSession() {
        try {
            this.currentNetwork.metadata.lastModified = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(this.currentNetwork));
            console.log('네트워크 저장됨:', this.getNetworkStats());
            return true;
        } catch (error) {
            console.error('네트워크 저장 오류:', error);
            return false;
        }
    }

    /**
     * 새로운 개념들을 기존 네트워크에 병합
     */
    mergeNewConcepts(newConcepts, newRelationships) {
        console.log('새로운 개념 병합 시작...');
        
        // 메타데이터 업데이트
        if (!this.currentNetwork.metadata.created) {
            this.currentNetwork.metadata.created = new Date().toISOString();
        }
        this.currentNetwork.metadata.sessionCount++;
        this.currentNetwork.metadata.totalTextsAnalyzed++;

        // 기존 개념과 새 개념 병합
        const mergedConcepts = this.mergeConcepts(this.currentNetwork.concepts, newConcepts);
        
        // 기존 관계와 새 관계 병합
        const mergedRelationships = this.mergeRelationships(
            this.currentNetwork.relationships, 
            newRelationships, 
            mergedConcepts
        );

        // 네트워크 업데이트
        this.currentNetwork.concepts = mergedConcepts;
        this.currentNetwork.relationships = mergedRelationships;

        // 자동 저장
        this.saveCurrentSession();

        console.log('병합 완료:', this.getNetworkStats());
        
        return {
            concepts: this.currentNetwork.concepts,
            relationships: this.currentNetwork.relationships
        };
    }

    /**
     * 개념 병합 로직
     */
    mergeConcepts(existingConcepts, newConcepts) {
        const conceptMap = new Map();
        
        // 기존 개념들을 맵에 추가
        existingConcepts.forEach(concept => {
            const key = this.normalizeConceptName(concept.name);
            conceptMap.set(key, { ...concept });
        });

        // 새 개념들 처리
        newConcepts.forEach(newConcept => {
            const key = this.normalizeConceptName(newConcept.name);
            
            if (conceptMap.has(key)) {
                // 기존 개념 업데이트 (중요도 증가, 설명 보강)
                const existing = conceptMap.get(key);
                existing.importance = Math.max(existing.importance, newConcept.importance);
                existing.size = this.calculateNodeSize(existing.importance);
                
                // 설명이 더 자세하면 업데이트
                if (newConcept.description && newConcept.description.length > existing.description.length) {
                    existing.description = newConcept.description;
                }
                
                // 카테고리 업데이트 (더 구체적인 것으로)
                if (newConcept.category !== '일반' && existing.category === '일반') {
                    existing.category = newConcept.category;
                }
            } else {
                // 새 개념 추가
                conceptMap.set(key, { ...newConcept });
            }
        });

        return Array.from(conceptMap.values());
    }

    /**
     * 관계 병합 로직
     */
    mergeRelationships(existingRelationships, newRelationships, allConcepts) {
        const relationshipMap = new Map();
        
        // 개념 이름 -> ID 매핑 생성
        const conceptIdMap = new Map();
        allConcepts.forEach(concept => {
            const key = this.normalizeConceptName(concept.name);
            conceptIdMap.set(key, concept.id);
        });

        // 기존 관계들을 맵에 추가
        existingRelationships.forEach(rel => {
            const key = `${rel.source}-${rel.target}`;
            relationshipMap.set(key, { ...rel });
        });

        // 새 관계들 처리
        newRelationships.forEach(newRel => {
            // 개념 ID 업데이트
            const sourceKey = this.normalizeConceptName(
                allConcepts.find(c => c.id === newRel.source)?.name || ''
            );
            const targetKey = this.normalizeConceptName(
                allConcepts.find(c => c.id === newRel.target)?.name || ''
            );
            
            const sourceId = conceptIdMap.get(sourceKey);
            const targetId = conceptIdMap.get(targetKey);
            
            if (!sourceId || !targetId) return;
            
            const key1 = `${sourceId}-${targetId}`;
            const key2 = `${targetId}-${sourceId}`;
            
            if (relationshipMap.has(key1)) {
                // 기존 관계 강화
                const existing = relationshipMap.get(key1);
                existing.strength = Math.max(existing.strength, newRel.strength);
                existing.width = this.calculateLinkWidth(existing.strength);
            } else if (relationshipMap.has(key2)) {
                // 역방향 관계 강화
                const existing = relationshipMap.get(key2);
                existing.strength = Math.max(existing.strength, newRel.strength);
                existing.width = this.calculateLinkWidth(existing.strength);
            } else {
                // 새 관계 추가
                relationshipMap.set(key1, {
                    ...newRel,
                    source: sourceId,
                    target: targetId
                });
            }
        });

        return Array.from(relationshipMap.values());
    }

    /**
     * 개념 이름 정규화
     */
    normalizeConceptName(name) {
        return name.toLowerCase()
                  .trim()
                  .replace(/[^a-z0-9가-힣]/g, '')
                  .replace(/\s+/g, '');
    }

    /**
     * 유틸리티 함수들
     */
    calculateNodeSize(importance) {
        return Math.max(20, importance * 4);
    }

    calculateLinkWidth(strength) {
        return Math.max(1, strength / 2);
    }

    /**
     * 네트워크 통계 조회
     */
    getNetworkStats() {
        return {
            conceptCount: this.currentNetwork.concepts.length,
            relationshipCount: this.currentNetwork.relationships.length,
            sessionCount: this.currentNetwork.metadata.sessionCount,
            totalTextsAnalyzed: this.currentNetwork.metadata.totalTextsAnalyzed,
            created: this.currentNetwork.metadata.created,
            lastModified: this.currentNetwork.metadata.lastModified
        };
    }

    /**
     * 현재 네트워크 조회
     */
    getCurrentNetwork() {
        return {
            concepts: [...this.currentNetwork.concepts],
            relationships: [...this.currentNetwork.relationships],
            metadata: { ...this.currentNetwork.metadata }
        };
    }

    /**
     * 네트워크 검색
     */
    searchNetwork(query) {
        if (!query || query.trim() === '') {
            return this.getCurrentNetwork();
        }

        const searchTerm = query.toLowerCase();
        const matchingConcepts = this.currentNetwork.concepts.filter(concept =>
            concept.name.toLowerCase().includes(searchTerm) ||
            concept.description.toLowerCase().includes(searchTerm) ||
            concept.category.toLowerCase().includes(searchTerm)
        );

        const matchingConceptIds = new Set(matchingConcepts.map(c => c.id));
        const relatedRelationships = this.currentNetwork.relationships.filter(rel =>
            matchingConceptIds.has(rel.source) || matchingConceptIds.has(rel.target)
        );

        return {
            concepts: matchingConcepts,
            relationships: relatedRelationships
        };
    }

    /**
     * 강도별 관계 필터링
     */
    filterByStrength(minStrength) {
        const filteredRelationships = this.currentNetwork.relationships.filter(
            rel => rel.strength >= minStrength
        );

        // 관련된 개념들만 포함
        const connectedConceptIds = new Set();
        filteredRelationships.forEach(rel => {
            connectedConceptIds.add(rel.source);
            connectedConceptIds.add(rel.target);
        });

        const filteredConcepts = this.currentNetwork.concepts.filter(
            concept => connectedConceptIds.has(concept.id)
        );

        return {
            concepts: filteredConcepts,
            relationships: filteredRelationships
        };
    }

    /**
     * 네트워크 내보내기
     */
    exportNetwork() {
        const exportData = {
            ...this.currentNetwork,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `concept-network-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('네트워크 내보내기 완료');
    }

    /**
     * 네트워크 가져오기
     */
    importNetwork(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    // 데이터 유효성 검증
                    if (!importedData.concepts || !importedData.relationships) {
                        throw new Error('잘못된 네트워크 파일 형식입니다.');
                    }

                    // 기존 네트워크와 병합
                    const mergedConcepts = this.mergeConcepts(
                        this.currentNetwork.concepts, 
                        importedData.concepts
                    );
                    const mergedRelationships = this.mergeRelationships(
                        this.currentNetwork.relationships,
                        importedData.relationships,
                        mergedConcepts
                    );

                    this.currentNetwork.concepts = mergedConcepts;
                    this.currentNetwork.relationships = mergedRelationships;
                    this.currentNetwork.metadata.lastModified = new Date().toISOString();

                    this.saveCurrentSession();
                    console.log('네트워크 가져오기 완료:', this.getNetworkStats());
                    
                    resolve(this.getCurrentNetwork());
                } catch (error) {
                    console.error('네트워크 가져오기 오류:', error);
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('파일 읽기 오류'));
            reader.readAsText(file);
        });
    }

    /**
     * 네트워크 초기화
     */
    clearNetwork() {
        this.currentNetwork = this.createEmptyNetwork();
        localStorage.removeItem(this.storageKey);
        console.log('네트워크가 초기화되었습니다.');
    }

    /**
     * 빈 네트워크 생성
     */
    createEmptyNetwork() {
        return {
            concepts: [],
            relationships: [],
            metadata: {
                created: null,
                lastModified: null,
                sessionCount: 0,
                totalTextsAnalyzed: 0
            }
        };
    }

    /**
     * 관련 개념 추천
     */
    getRelatedConcepts(conceptId, maxCount = 5) {
        const relatedIds = new Set();
        
        // 직접 연결된 개념들
        this.currentNetwork.relationships.forEach(rel => {
            if (rel.source === conceptId) {
                relatedIds.add(rel.target);
            } else if (rel.target === conceptId) {
                relatedIds.add(rel.source);
            }
        });

        // 관련 개념들을 중요도순으로 정렬
        const relatedConcepts = this.currentNetwork.concepts
            .filter(concept => relatedIds.has(concept.id))
            .sort((a, b) => b.importance - a.importance)
            .slice(0, maxCount);

        return relatedConcepts;
    }
}

// 전역 인스턴스 생성
window.knowledgeNetwork = new KnowledgeNetwork();