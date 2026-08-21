class TimelinePanel {
    constructor(containerId, onJump) {
        this.container = document.getElementById(containerId);
        this.onJump = typeof onJump === 'function' ? onJump : null;
        this.steps = [];
        this.currentIndex = -1;
    }

    setSteps(steps) {
        this.steps = Array.isArray(steps) ? steps : [];
        this.currentIndex = -1;
        this._render();
    }

    setCurrentIndex(index) {
        this.currentIndex = index;
        this._render();
    }

    clear() {
        this.steps = [];
        this.currentIndex = -1;
        if (this.container) this.container.innerHTML = '';
    }

    _normalizeText(text) {
        const value = String(text || '');
        if (!value) return '';
        const replacementChar = '\uFFFD';

        const repairMap = {
            'Ã¡': 'á',
            'Ã¢': 'â',
            'Ã£': 'ã',
            'Ã§': 'ç',
            'Ã©': 'é',
            'Ãª': 'ê',
            'Ã­': 'í',
            'Ã³': 'ó',
            'Ã´': 'ô',
            'Ãµ': 'õ',
            'Ãº': 'ú',
            'Ã': 'Á',
            'Ã?': 'Â',
            'Ã?': 'Ã',
            'Ã?': 'Ç',
            'Ã?': 'É',
            'Ã?': 'Ê',
            'Ã': 'Í',
            'Ã?': 'Ó',
            'Ã?': 'Ô',
            'Ã?': 'Õ',
            'Ã?': 'Ú',
            'â??': '?',
            'â??': '?',
            'â?¦': '?',
            'â??': '"',
            'â?': '"',
            'â??': "'",
            'â??': "'",
            'ï¿½': '',
            [replacementChar]: '',
        };

        const repaired = value.replace(/Ã¡|Ã¢|Ã£|Ã§|Ã©|Ãª|Ã­|Ã³|Ã´|Ãµ|Ãº|Ã|Ã?|Ã?|Ã?|Ã?|Ã?|Ã|Ã?|Ã?|Ã?|Ã?|â??|â??|â?¦|â??|â?|â??|â??|ï¿½|\uFFFD/g, (match) => repairMap[match] || match);
        return repaired.replace(/\s{2,}/g, ' ').trim();
    }

    _detailFor(step) {
        if (!step) return 'Fim';
        return this._normalizeText(step.description || step.type || '')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim() || String(step.type || 'Passo');
    }

    _labelMap() {
        return {
            INFO: 'Resumo',
            ERROR: 'Erro',
            CREATE_NODE: 'Criar no',
            SET_NEXT: 'Definir next',
            SET_PREV: 'Definir prev',
            SET_HEAD: 'Mover head',
            SET_TAIL: 'Mover tail',
            UPDATE_SIZE: 'Atualizar size',
            COMPLEXITY: 'Finalizar',
            ISOLATE_NODE: 'Isolar no',
            ISOLATE_ALL: 'Limpar lista',
            TRAVERSE_START: 'Iniciar busca',
            TRAVERSE_STEP: 'Avancar',
            TRAVERSE_COMPARE: 'Comparar',
            TRAVERSE_END: 'Encontrado',
            REMOVE_PREV: 'Limpar prev',
            UNLINK_START: 'Desconectar',
            ARRAY_DIRECT_ACCESS: 'Acesso direto',
            ARRAY_INSERT: 'Inserir valor',
            ARRAY_SHIFT_RIGHT: 'Deslocar dir',
            ARRAY_REMOVE_START: 'Remover valor',
            ARRAY_SHIFT_LEFT: 'Deslocar esq',
            ARRAY_REMOVE_END: 'Fechar buraco',
            ARRAY_RESIZE_START: 'Iniciar resize',
            ARRAY_RESIZE_COPY: 'Copiar item',
            ARRAY_RESIZE_END: 'Finalizar resize',
            ARRAY_CLEAR: 'Limpar array',
            SEGMENT_CLEAR: 'Montar arvore',
            SEGMENT_SET: 'Atualizar no',
            SEGMENT_VISIT: 'Visitar intervalo',
            SEGMENT_RESULT: 'Somar resposta',
            FENWICK_CLEAR: 'Preparar BIT',
            FENWICK_VISIT: 'Visitar idx',
            FENWICK_SET: 'Atualizar idx',
            FENWICK_RESULT: 'Parcial/Resp',
            UF_INIT: 'Inicializar UF',
            UF_VISIT: 'Subir para raiz',
            UF_COMPRESS: 'Comprimir caminho',
            UF_UNION: 'Unir conjuntos',
            UF_RESULT: 'Resultado UF',
            GRAPH_INIT: 'Inicializar grafo',
            GRAPH_ADD_EDGE: 'Adicionar aresta',
            GRAPH_VISIT: 'Visitar vertice',
            GRAPH_ENQUEUE: 'Enfileirar/Empilhar',
            GRAPH_DEQUEUE: 'Processar vertice',
            GRAPH_BACKTRACK: 'Retornar DFS',
            GRAPH_PATH: 'Trecho da rota',
            GRAPH_RESULT: 'Resultado busca',
        };
    }

    _labelFor(step) {
        if (!step) return 'Fim';
        const labelMap = this._labelMap();

        if (step.type === 'INFO' && step.data?.algorithm === 'FENWICK') {
            const detail = this._detailFor(step);
            const match = detail.match(/Operacao iniciada:\s*([a-zA-Z]+)/);
            if (match) return `Iniciar ${match[1]}`;
        }

        if (step.type === 'FENWICK_VISIT' && Number.isInteger(step.data?.index)) {
            return `Visitar i=${step.data.index}`;
        }
        if (step.type === 'FENWICK_SET' && Number.isInteger(step.data?.index)) {
            return `Atualizar i=${step.data.index}`;
        }
        if (step.type === 'FENWICK_RESULT' && Number.isFinite(Number(step.data?.value))) {
            return `Parcial=${step.data.value}`;
        }
        if (step.type === 'UF_VISIT' && Number.isInteger(step.data?.index)) {
            return `Visitar no ${step.data.index}`;
        }
        if (step.type === 'UF_COMPRESS' && Number.isInteger(step.data?.index)) {
            return `Comprimir ${step.data.index}`;
        }
        if (step.type === 'UF_RESULT' && typeof step.data?.result === 'boolean') {
            return `Connected=${step.data.result}`;
        }
        if (step.type === 'GRAPH_VISIT' && Number.isInteger(step.data?.node)) {
            if (step.data?.traversal === 'BFS' && Number.isInteger(step.data?.level)) {
                return `Visitar v=${step.data.node} (L${step.data.level})`;
            }
            if (step.data?.traversal === 'DFS' && Number.isInteger(step.data?.depth)) {
                return `Visitar v=${step.data.node} (D${step.data.depth})`;
            }
            return `Visitar v=${step.data.node}`;
        }
        if (step.type === 'GRAPH_ADD_EDGE' && Number.isInteger(step.data?.u) && Number.isInteger(step.data?.v)) {
            return `Aresta ${step.data.u}-${step.data.v}`;
        }
        if (step.type === 'GRAPH_BACKTRACK' && Number.isInteger(step.data?.node)) {
            return `Voltar de v=${step.data.node}`;
        }
        if (step.type === 'GRAPH_PATH' && Number.isInteger(step.data?.from) && Number.isInteger(step.data?.to)) {
            return `Rota ${step.data.from}->${step.data.to}`;
        }
        if (step.type === 'GRAPH_RESULT' && Array.isArray(step.data?.path)) {
            return step.data.path.length ? `Dist=${step.data.distance}` : 'Sem rota';
        }

        if (labelMap[step.type]) return labelMap[step.type];

        const detail = this._detailFor(step);
        return detail.length > 18 ? detail.slice(0, 18) + '...' : detail;
    }

    _cloudFor(step) {
        if (!step || !step.data || typeof step.data.cloud !== 'string') return '';
        const cleaned = this._normalizeText(step.data.cloud)
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!cleaned) return '';
        if (step.data?.algorithm === 'SEGMENT' || String(step.type || '').startsWith('SEGMENT_')) return cleaned;
        return cleaned.length > 140 ? `${cleaned.slice(0, 137)}...` : cleaned;
    }

    _render() {
        if (!this.container) return;
        if (!this.steps.length) {
            this.container.innerHTML = '';
            return;
        }

        this.container.innerHTML = this.steps
            .map((step, index) => {
                const state = index < this.currentIndex ? 'done' : index === this.currentIndex ? 'current' : '';
                const badge = index + 1;
                const label = this._labelFor(step);
                const detail = this._detailFor(step).replace(/"/g, '&quot;');
                const cloud = this._cloudFor(step).replace(/"/g, '&quot;');
                const title = cloud ? `${detail} | Nuvem: ${cloud}` : detail;
                return `
                    <div class="timeline-step ${state}" data-index="${index}">
                        <div class="timeline-circle">${badge}</div>
                        <div class="timeline-step-label">${label}</div>
                        ${cloud ? `<div class="timeline-cloud">${cloud}</div>` : ''}
                    </div>
                `;
            })
            .join('');

        this.container.querySelectorAll('.timeline-step').forEach((el) => {
            el.addEventListener('mouseenter', () => el.classList.add('is-expanded'));
            el.addEventListener('mouseleave', () => el.classList.remove('is-expanded'));
            el.addEventListener('click', () => {
                const index = parseInt(el.getAttribute('data-index'), 10);
                if (this.onJump) this.onJump(index);
            });
        });
    }
}
