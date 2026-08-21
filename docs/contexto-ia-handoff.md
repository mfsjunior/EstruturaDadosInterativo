# Contexto de Evolucao do Projeto (Handoff para outras IAs)

## 1. Objetivo do produto

ED Lab e um laboratorio visual de Estruturas de Dados em JavaScript puro (sem bundler), com:

- visualizacao normal da estrutura (modo principal)
- visualizacao de memoria e split view
- modo Visual Debug (Algorithm Debugger) para execucao passo a passo de algoritmos

Regra obrigatoria:

- nunca substituir/remover a visualizacao normal
- o modo debug e adicional

## 2. Estado atual (2026-08-20)

Implementado e estabilizado:

- Modo Visual Debug funcional para BST (contains, insert, bfs, dfs)
- Modo Visual Debug funcional para Array (get, add/insert, addLast/append, remove)
- Sincronizacao codigo <-> evento <-> preview ativa
- Timeline deterministica e playback (play, next, finish, reset)
- Provas inline no codigo (ex.: comparacoes e validacoes)
- Layout sem sidebar direita fixa; controles movidos para a area esquerda
- Em Array Debug: operacoes rapidas dentro do proprio card de debug

## 3. Arquitetura tecnica (mapa rapido)

### 3.1 App shell e orquestracao

- index.html: estrutura geral da UI e includes de scripts
- src/core/AppManager.js: troca de modulo, troca de abas de view, visibilidade do card debug

### 3.2 Modelos

- src/model/*
- Cada estrutura gera steps (objeto Step) durante operacoes

### 3.3 Animacao e debug

- src/animation/Step.js: unidade de passo
- src/animation/AlgorithmEvent.js: evento semantico para modo debug
- src/animation/AlgorithmExecutionEngine.js: engine de playback de eventos
- src/animation/AnimationController.js: playback legado por steps

### 3.4 Modulos

- src/modules/BSTModule.js: integra modelo BST, steps e debug events
- src/modules/ArrayModule.js: integra modelo Array, steps e debug events
- cada modulo controla playback normal + debug

### 3.5 Painel debug

- src/ui/AlgorithmDebugPanel.js
- responsavel por:
  - sessao debug
  - render de codigo + linha ativa
  - evento e WHY
  - timeline
  - prova inline
  - preview de arvore e array
  - operacoes rapidas para Array no proprio card

### 3.6 Renderers

- src/visualization/BSTRenderer.js
- src/visualization/ArrayRenderer.js

## 4. Padrao que deve ser seguido em novas estruturas

1. Modelo deve emitir steps granulares com:
- activeLine
- debugVars
- descricao didatica
- snapshot/estado quando necessario

2. Modulo deve converter steps em AlgorithmEvent com:
- tipo semantico
- linha de codigo
- variaveis
- estado before/after

3. Nao iniciar timeline com passo sintetico que esconda a primeira execucao real
- filtrar INFO quando apropriado no build de eventos

4. Painel debug deve sempre mostrar:
- preview consistente
- linha ativa
- texto de evento
- WHY explicativo
- timeline clicavel

5. Provas inline devem mostrar booleanos/decisoes
- exemplo: teste 0 <= idx < size => true/false
- exemplo BST: teste 25 == 50 => false

## 5. Estado de UX relevante

- Em Array debug, a coluna esquerda do card de debug fica visivel em modo array (classe array-debug-mode)
- Operacoes rapidas de Array estao no proprio card:
  - valor, indice
  - Insert, Append, Get, Remove
- Mensagens de estado inicial da sessao debug:
  - EVENTO: Sessao carregada. Nenhum evento aplicado ainda.
  - WHY: Sessao pronta. Clique em Proximo Passo ou Play para iniciar.

## 6. Cache/versionamento front-end

index.html usa query string de versao nos scripts, exemplo:

- ?v=20260820-1

Se mudanca nao aparecer no navegador, atualizar essa versao no index.html e recarregar.

## 7. Arquivos mais importantes para evolucao imediata

- src/ui/AlgorithmDebugPanel.js
- src/modules/ArrayModule.js
- src/modules/BSTModule.js
- src/model/SequentialArray.js
- src/model/BinarySearchTree.js
- src/core/AppManager.js
- css/style.css
- docs/visual-debug-rollout.md

## 8. Backlog recomendado (proxima IA)

Prioridade alta:

1. Replicar modo debug em Lista Encadeada (search, insert, remove)
2. Replicar em Pilha (push/pop/peek)
3. Replicar em Fila Circular (enqueue/dequeue/peek)

Para cada operacao nova:

- validar primeiro passo real
- validar linha ativa correta
- validar preview sincronizado
- validar provas inline
- validar play/next com auto-pause ligado e desligado

## 9. Checklist de regressao obrigatorio

- Modo normal continua intacto
- Visualizacao memoria/split sem regressao
- Botao VISUALIZAR ALGORITMO alterna corretamente
- Controles do topo funcionam no modo debug da estrutura alvo
- Timeline e reset estaveis

## 10. Observacoes de implementacao

- Projeto em JS puro, sem build pipeline
- Edicoes em arquivos fonte sao refletidas diretamente pelo browser
- Cuidado com alteracoes globais de layout: podem impactar todos os modulos
- Ao ajustar debug de uma estrutura, preservar comportamento das ja prontas
