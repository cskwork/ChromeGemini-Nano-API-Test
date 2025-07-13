/**
 * 개념 분석기 모듈
 * AI 응답을 파싱하고 구조화된 데이터로 변환
 */

class ConceptAnalyzer {
    constructor() {
        this.concepts = [];
        this.relationships = [];
        this.graphData = { nodes: [], links: [] };
    }

    /**
     * AI 응답에서 JSON 추출 및 파싱
     */
    parseJSONFromResponse(response) {
        try {
            // 응답에서 JSON 부분만 추출
            let jsonText = response.trim();
            
            // 마크다운 코드 블록이나 기타 텍스트 제거
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonText = jsonMatch[0];
            }

            // JSON 파싱
            const parsed = JSON.parse(jsonText);
            console.log('파싱된 JSON:', parsed);
            return parsed;

        } catch (error) {
            console.error('JSON 파싱 오류:', error);
            
            // 파싱 실패 시 텍스트에서 개념 추출 시도
            return this.extractConceptsFromText(response);
        }
    }

    /**
     * 텍스트에서 개념 추출 (JSON 파싱 실패 시 대안)
     */
    extractConceptsFromText(text) {
        const lines = text.split('\n');
        const concepts = [];
        
        // 간단한 텍스트 분석으로 개념 추출
        lines.forEach(line => {
            // 번호나 불릿으로 시작하는 줄에서 개념 추출
            const conceptMatch = line.match(/[-*•]\s*(.+?)[:：]?\s*(.*)/) || 
                               line.match(/\d+\.\s*(.+?)[:：]?\s*(.*)/);
            
            if (conceptMatch) {
                const name = conceptMatch[1].trim();
                const description = conceptMatch[2] ? conceptMatch[2].trim() : name;
                
                if (name.length > 1 && name.length < 50) {
                    concepts.push({
                        name: name,
                        description: description || name,
                        importance: 5, // 기본값
                        category: '일반'
                    });
                }
            }
        });

        return {
            concepts: concepts.slice(0, 15) // 최대 15개
        };
    }

    /**
     * 개념 데이터 검증 및 정제
     */
    validateAndCleanConcepts(concepts) {
        if (!Array.isArray(concepts)) {
            console.warn('개념 데이터가 배열이 아닙니다:', concepts);
            return [];
        }

        return concepts
            .filter(concept => {
                // 필수 필드 검증
                return concept && 
                       typeof concept.name === 'string' && 
                       concept.name.trim().length > 0;
            })
            .map(concept => {
                // 데이터 정제
                return {
                    id: this.generateConceptId(concept.name),
                    name: concept.name.trim(),
                    description: concept.description || concept.name,
                    importance: this.validateImportance(concept.importance),
                    category: concept.category || '일반',
                    size: this.calculateNodeSize(concept.importance || 5)
                };
            })
            .slice(0, 15); // 최대 15개 제한
    }

    /**
     * 관계 데이터 검증 및 정제
     */
    validateAndCleanRelationships(relationships, validConcepts) {
        if (!Array.isArray(relationships)) {
            console.warn('관계 데이터가 배열이 아닙니다:', relationships);
            return this.generateDefaultRelationships(validConcepts);
        }

        const conceptNames = validConcepts.map(c => c.name.toLowerCase());
        
        const validRelationships = relationships
            .filter(rel => {
                // 필수 필드 및 유효한 개념 검증
                return rel && 
                       typeof rel.source === 'string' && 
                       typeof rel.target === 'string' &&
                       conceptNames.includes(rel.source.toLowerCase()) &&
                       conceptNames.includes(rel.target.toLowerCase()) &&
                       rel.source.toLowerCase() !== rel.target.toLowerCase();
            })
            .map(rel => {
                return {
                    source: this.findConceptByName(validConcepts, rel.source).id,
                    target: this.findConceptByName(validConcepts, rel.target).id,
                    type: rel.type || '연관',
                    strength: this.validateStrength(rel.strength),
                    description: rel.description || '',
                    width: this.calculateLinkWidth(rel.strength || 5)
                };
            });

        // 관계가 없거나 부족한 경우 기본 관계 생성
        if (validRelationships.length === 0) {
            return this.generateDefaultRelationships(validConcepts);
        }

        return validRelationships;
    }

    /**
     * 기본 관계 생성 (AI가 관계를 생성하지 못한 경우)
     */
    generateDefaultRelationships(concepts) {
        const relationships = [];
        
        // 중요도가 높은 개념들을 중심으로 연결
        const sortedConcepts = [...concepts].sort((a, b) => b.importance - a.importance);
        
        for (let i = 0; i < Math.min(sortedConcepts.length - 1, 5); i++) {
            for (let j = i + 1; j < Math.min(i + 3, sortedConcepts.length); j++) {
                relationships.push({
                    source: sortedConcepts[i].id,
                    target: sortedConcepts[j].id,
                    type: '연관',
                    strength: 5,
                    description: '관련 개념',
                    width: this.calculateLinkWidth(5)
                });
            }
        }

        return relationships;
    }

    /**
     * 전체 분석 처리
     */
    async analyzeTextResponses(conceptResponse, relationshipResponse) {
        try {
            console.log('개념 응답 분석 중...');
            
            // 1. 개념 추출 및 정제
            const conceptData = this.parseJSONFromResponse(conceptResponse);
            const rawConcepts = conceptData.concepts || [];
            this.concepts = this.validateAndCleanConcepts(rawConcepts);

            console.log('정제된 개념들:', this.concepts);

            // 2. 관계 분석
            let relationships = [];
            if (relationshipResponse && relationshipResponse.trim()) {
                console.log('관계 응답 분석 중...');
                const relationshipData = this.parseJSONFromResponse(relationshipResponse);
                relationships = relationshipData.relationships || [];
            }

            // 3. 관계 정제
            this.relationships = this.validateAndCleanRelationships(relationships, this.concepts);

            console.log('정제된 관계들:', this.relationships);

            // 4. 그래프 데이터 생성
            this.generateGraphData();

            return {
                success: true,
                concepts: this.concepts,
                relationships: this.relationships,
                graphData: this.graphData,
                stats: {
                    conceptCount: this.concepts.length,
                    relationshipCount: this.relationships.length
                }
            };

        } catch (error) {
            console.error('분석 처리 오류:', error);
            return {
                success: false,
                error: error.message,
                concepts: [],
                relationships: [],
                graphData: { nodes: [], links: [] }
            };
        }
    }

    /**
     * D3.js 용 그래프 데이터 생성
     */
    generateGraphData() {
        this.graphData = {
            nodes: this.concepts.map(concept => ({
                ...concept,
                x: Math.random() * 800,
                y: Math.random() * 600
            })),
            links: this.relationships.map(rel => ({
                ...rel
            }))
        };
    }

    /**
     * 유틸리티 함수들
     */
    generateConceptId(name) {
        return name.toLowerCase()
                  .replace(/[^a-z0-9가-힣]/g, '_')
                  .replace(/_+/g, '_')
                  .replace(/^_|_$/g, '');
    }

    findConceptByName(concepts, name) {
        return concepts.find(c => 
            c.name.toLowerCase() === name.toLowerCase()
        ) || concepts[0]; // 찾지 못하면 첫 번째 개념 반환
    }

    validateImportance(importance) {
        const num = parseInt(importance);
        return isNaN(num) ? 5 : Math.max(1, Math.min(10, num));
    }

    validateStrength(strength) {
        const num = parseInt(strength);
        return isNaN(num) ? 5 : Math.max(1, Math.min(10, num));
    }

    calculateNodeSize(importance) {
        return Math.max(20, importance * 4); // 20-40px 범위
    }

    calculateLinkWidth(strength) {
        return Math.max(1, strength / 2); // 0.5-5px 범위
    }

    /**
     * 개념 검색
     */
    searchConcepts(query) {
        if (!query || query.trim() === '') return this.concepts;
        
        const searchTerm = query.toLowerCase();
        return this.concepts.filter(concept =>
            concept.name.toLowerCase().includes(searchTerm) ||
            concept.description.toLowerCase().includes(searchTerm) ||
            concept.category.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * 관계 필터링
     */
    filterRelationshipsByStrength(minStrength) {
        return this.relationships.filter(rel => rel.strength >= minStrength);
    }

    /**
     * 데이터 리셋
     */
    reset() {
        this.concepts = [];
        this.relationships = [];
        this.graphData = { nodes: [], links: [] };
    }

    /**
     * 현재 데이터 상태 반환
     */
    getStatus() {
        return {
            conceptCount: this.concepts.length,
            relationshipCount: this.relationships.length,
            hasData: this.concepts.length > 0
        };
    }
}

// 전역 인스턴스 생성
window.conceptAnalyzer = new ConceptAnalyzer();