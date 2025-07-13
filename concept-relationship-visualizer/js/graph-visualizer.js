/**
 * 그래프 시각화 엔진
 * D3.js를 사용한 인터랙티브 개념 관계 시각화
 */

class GraphVisualizer {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        this.svg = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        
        // 시각화 설정
        this.width = 800;
        this.height = 600;
        this.colors = {
            '기본개념': '#3B82F6',  // 파란색
            '주제': '#10B981',      // 초록색
            '방법론': '#F59E0B',    // 주황색
            '사례': '#EF4444',      // 빨간색
            '결과': '#8B5CF6',      // 보라색
            '일반': '#6B7280'       // 회색
        };
        
        this.isInitialized = false;
    }

    /**
     * 시각화 초기화
     */
    initialize() {
        // 기존 내용 정리
        this.container.selectAll('*').remove();
        
        // 컨테이너 크기 계산
        const containerNode = this.container.node();
        if (containerNode) {
            const rect = containerNode.getBoundingClientRect();
            this.width = rect.width || 800;
            this.height = rect.height || 600;
        }

        // SVG 생성
        this.svg = this.container
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .style('background-color', '#fafafa');

        // 줌 기능 설정
        const zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on('zoom', (event) => {
                this.zoomGroup.attr('transform', event.transform);
            });

        this.svg.call(zoom);

        // 메인 그룹 (줌/팬용)
        this.zoomGroup = this.svg.append('g').attr('class', 'zoom-group');

        // 링크 그룹
        this.linkGroup = this.zoomGroup.append('g').attr('class', 'links');

        // 노드 그룹
        this.nodeGroup = this.zoomGroup.append('g').attr('class', 'nodes');

        // 포스 시뮬레이션 설정
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(d => d.size + 5));

        this.isInitialized = true;
        console.log('그래프 시각화가 초기화되었습니다.');
    }

    /**
     * 그래프 데이터 렌더링
     */
    renderGraph(graphData) {
        if (!this.isInitialized) {
            this.initialize();
        }

        // Empty state 숨기기
        d3.select('#empty-state').style('display', 'none');

        this.nodes = [...graphData.nodes];
        this.links = [...graphData.links];

        console.log('그래프 렌더링:', { nodes: this.nodes.length, links: this.links.length });

        // 링크 렌더링
        this.renderLinks();

        // 노드 렌더링
        this.renderNodes();

        // 시뮬레이션 시작
        this.simulation
            .nodes(this.nodes)
            .on('tick', () => this.tick());

        this.simulation
            .force('link')
            .links(this.links);

        // 시뮬레이션 재시작
        this.simulation.alpha(1).restart();
    }

    /**
     * 링크 렌더링
     */
    renderLinks() {
        const link = this.linkGroup
            .selectAll('line')
            .data(this.links, d => `${d.source.id || d.source}-${d.target.id || d.target}`);

        link.exit().remove();

        const linkEnter = link
            .enter()
            .append('line')
            .attr('class', 'concept-link')
            .attr('stroke', '#999')
            .attr('stroke-width', d => d.width || 2)
            .attr('stroke-opacity', 0.6);

        // 링크 호버 효과
        linkEnter
            .on('mouseover', (event, d) => {
                this.showLinkTooltip(event, d);
                d3.select(event.target)
                    .attr('stroke', '#007acc')
                    .attr('stroke-width', (d.width || 2) + 1);
            })
            .on('mouseout', (event, d) => {
                this.hideTooltip();
                d3.select(event.target)
                    .attr('stroke', '#999')
                    .attr('stroke-width', d.width || 2);
            });

        this.linkElements = linkEnter.merge(link);
    }

    /**
     * 노드 렌더링
     */
    renderNodes() {
        const node = this.nodeGroup
            .selectAll('g')
            .data(this.nodes, d => d.id);

        node.exit().remove();

        const nodeEnter = node
            .enter()
            .append('g')
            .attr('class', 'concept-node')
            .call(this.createDragBehavior());

        // 노드 원
        nodeEnter
            .append('circle')
            .attr('r', d => d.size || 20)
            .attr('fill', d => this.colors[d.category] || this.colors['일반'])
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        // 노드 텍스트
        nodeEnter
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('font-size', d => Math.min(12, (d.size || 20) / 2))
            .attr('font-weight', 'bold')
            .attr('fill', 'white')
            .text(d => this.truncateText(d.name, d.size || 20));

        // 노드 호버 효과
        nodeEnter
            .on('mouseover', (event, d) => {
                this.showNodeTooltip(event, d);
                this.highlightConnectedNodes(d);
            })
            .on('mouseout', (event, d) => {
                this.hideTooltip();
                this.resetHighlight();
            })
            .on('click', (event, d) => {
                this.selectNode(d);
            });

        this.nodeElements = nodeEnter.merge(node);
    }

    /**
     * 드래그 동작 생성
     */
    createDragBehavior() {
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }

    /**
     * 시뮬레이션 틱 이벤트
     */
    tick() {
        if (this.linkElements) {
            this.linkElements
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
        }

        if (this.nodeElements) {
            this.nodeElements
                .attr('transform', d => `translate(${d.x},${d.y})`);
        }
    }

    /**
     * 연결된 노드 하이라이트
     */
    highlightConnectedNodes(selectedNode) {
        // 연결된 노드 ID 수집
        const connectedNodeIds = new Set();
        this.links.forEach(link => {
            if (link.source.id === selectedNode.id) {
                connectedNodeIds.add(link.target.id);
            }
            if (link.target.id === selectedNode.id) {
                connectedNodeIds.add(link.source.id);
            }
        });

        // 노드 하이라이트
        this.nodeElements.selectAll('circle')
            .attr('opacity', d => {
                return d.id === selectedNode.id || connectedNodeIds.has(d.id) ? 1 : 0.3;
            });

        // 링크 하이라이트
        this.linkElements
            .attr('opacity', d => {
                return d.source.id === selectedNode.id || d.target.id === selectedNode.id ? 1 : 0.1;
            });
    }

    /**
     * 하이라이트 리셋
     */
    resetHighlight() {
        this.nodeElements.selectAll('circle').attr('opacity', 1);
        this.linkElements.attr('opacity', 0.6);
    }

    /**
     * 노드 툴팁 표시
     */
    showNodeTooltip(event, d) {
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000');

        tooltip.html(`
            <strong>${d.name}</strong><br/>
            카테고리: ${d.category}<br/>
            중요도: ${d.importance}/10<br/>
            ${d.description ? d.description : ''}
        `);

        tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    /**
     * 링크 툴팁 표시
     */
    showLinkTooltip(event, d) {
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000');

        const sourceName = d.source.name || d.source.id;
        const targetName = d.target.name || d.target.id;

        tooltip.html(`
            <strong>${sourceName} → ${targetName}</strong><br/>
            관계: ${d.type}<br/>
            강도: ${d.strength}/10<br/>
            ${d.description ? d.description : ''}
        `);

        tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    /**
     * 툴팁 숨기기
     */
    hideTooltip() {
        d3.selectAll('.tooltip').remove();
    }

    /**
     * 노드 선택
     */
    selectNode(node) {
        console.log('선택된 노드:', node);
        // 추후 노드 상세 정보 패널 구현 시 사용
    }

    /**
     * 개념 검색 하이라이트
     */
    searchAndHighlight(query) {
        if (!query || query.trim() === '') {
            this.resetHighlight();
            return;
        }

        const searchTerm = query.toLowerCase();
        this.nodeElements.selectAll('circle')
            .attr('opacity', d => {
                const matches = d.name.toLowerCase().includes(searchTerm) ||
                              d.description.toLowerCase().includes(searchTerm) ||
                              d.category.toLowerCase().includes(searchTerm);
                return matches ? 1 : 0.3;
            });
    }

    /**
     * 관계 강도 필터
     */
    filterByStrength(minStrength) {
        this.linkElements
            .attr('opacity', d => d.strength >= minStrength ? 0.6 : 0.1);
    }

    /**
     * 뷰 리셋
     */
    resetView() {
        if (this.svg) {
            this.svg.transition()
                .duration(750)
                .call(
                    d3.zoom().transform,
                    d3.zoomIdentity
                );
        }
        this.resetHighlight();
    }

    /**
     * 텍스트 줄이기
     */
    truncateText(text, nodeSize) {
        const maxLength = Math.floor(nodeSize / 3);
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 1) + '…';
    }

    /**
     * 그래프 데이터 업데이트
     */
    updateGraph(newGraphData) {
        this.renderGraph(newGraphData);
    }

    /**
     * 그래프 지우기
     */
    clearGraph() {
        if (this.nodeElements) this.nodeElements.remove();
        if (this.linkElements) this.linkElements.remove();
        if (this.simulation) this.simulation.stop();
        
        this.nodes = [];
        this.links = [];
        
        // Empty state 표시
        d3.select('#empty-state').style('display', 'flex');
    }

    /**
     * 리사이즈 처리
     */
    resize() {
        if (!this.container.node()) return;
        
        const rect = this.container.node().getBoundingClientRect();
        this.width = rect.width || 800;
        this.height = rect.height || 600;

        if (this.svg) {
            this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        }

        if (this.simulation) {
            this.simulation
                .force('center', d3.forceCenter(this.width / 2, this.height / 2))
                .alpha(0.3)
                .restart();
        }
    }
}

// 전역 인스턴스 생성
window.graphVisualizer = new GraphVisualizer('visualization-container');