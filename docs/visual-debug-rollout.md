# Visual Debug Rollout Map (Reusable for all structures)

## 1) Goal and non-negotiables

- Keep NORMAL visualization intact.
- Add a second mode: Visual Debug (Algorithm Debugger).
- Code <-> Event <-> Structure synchronization is priority #1.
- Debug session must start from real execution steps (no synthetic preface step before first real action).
- Playback must be predictable (auto-pause configurable, default off).

## 2) Canonical architecture (already proven in BST)

Use these same building blocks across every structure:

1. Model emits rich steps
- Include activeLine and debugVars in each relevant step.
- Keep one code snippet per operation (Java pseudo-real code that matches behavior).

2. Module converts steps -> AlgorithmEvent
- Filter out non-execution noise in debug timeline.
- Map each step type to semantic event type.
- Run session via AlgorithmExecutionEngine.

3. Debug panel renders deterministic state
- Code view from event payload.
- Active line highlighting with strong visual signal.
- Inline proof probe (e.g. test x == y => false/true).
- WHY section from step message.

4. Renderer shows current structure state
- Every event must include snapshot/state needed for accurate preview.

## 3) Contract to replicate in each structure

For each new structure operation, emit step objects with this minimum contract:

- type: semantic action (COMPARE, INSERT, MOVE, PUSH, POP, etc.)
- message: human-readable explanation of what happened
- activeLine: line number in code snippet
- code: operation snippet (if not global)
- debugVars: variables needed for inline proof
- snapshot: structure state after/before step (as needed)

Recommended shape:

{
  type,
  message,
  activeLine,
  code,
  debugVars: {
    target,
    current,
    index,
    top,
    front,
    rear,
    parent,
    left,
    right,
    hash,
    bucket,
    ...
  },
  snapshot
}

## 4) Event type mapping template

Create a local map in each module:

- COMPARE -> NODE_COMPARED (or INDEX_COMPARED in linear structures)
- INSERT/PUSH/ENQUEUE -> NODE_INSERTED / VALUE_WRITTEN
- REMOVE/POP/DEQUEUE -> NODE_REMOVED / VALUE_REMOVED
- MOVE/TRAVERSE -> POINTER_MOVED / CURSOR_MOVED
- VISIT -> NODE_VISITED
- FOUND -> SEARCH_FOUND
- NOT_FOUND -> SEARCH_NOT_FOUND

Rule:
- Do not inject timeline-leading INFO event that hides the first real operation.

## 5) Inline proof patterns (reuse in all structures)

Build one probe helper per structure, based on message + debugVars:

- Equality check: test a == b => true/false
- Ordering check: test a < b => true/false
- Boundary check: test index < size => true/false
- Empty check: test size == 0 => true/false
- Root/init check (trees): test root == null => true; root = value
- Hash route: test hash(k)=h, bucket=h

This is what removes the "it appeared out of nowhere" feeling.

## 6) UI checklist per structure

- Add operation panel actions for debug-enabled operations.
- Keep normal operation controls unchanged.
- Ensure debug mode has:
  - timeline
  - play/pause/next/finish/reset
  - speed
  - auto-pause checkbox (default unchecked)
  - WHY panel
  - code pane + active line marker

## 7) Rollout sequence by structure

Apply the same progression used in BST: read/search first, then write, then traversals.

### Array Sequencial
1. SEARCH (contains/get)
2. INSERT (insert/append)
3. REMOVE
4. Optional traversal/scan visualization

### Lista Encadeada
1. SEARCH
2. INSERT (head/tail/position)
3. REMOVE
4. TRAVERSAL

### Pilha
1. PEEK/SEARCH (if exists)
2. PUSH
3. POP

### Fila Circular
1. PEEK/SEARCH (if exists)
2. ENQUEUE
3. DEQUEUE

### Heap
1. SEARCH/INSPECT root
2. INSERT + up-heap steps
3. REMOVE root + down-heap steps
4. Optional level-order traversal

### Hash Table
1. SEARCH (hash + bucket walk)
2. INSERT
3. REMOVE
4. Rehash (if applicable)

### AVL / Red-Black
1. SEARCH
2. INSERT
3. ROTATIONS / recolor steps as first-class debug events
4. REMOVE

### Trie
1. SEARCH char-by-char
2. INSERT char-by-char
3. REMOVE/prune
4. PREFIX walk

### Segment Tree / Fenwick
1. QUERY path walk
2. UPDATE propagation
3. Build steps (optional)

### Graph / Union-Find
1. FIND/connected check
2. UNION (for DSU)
3. BFS
4. DFS

## 8) Regression checklist (must pass before moving to next structure)

1. First debug step is real execution, not synthetic info.
2. Code active line always matches event.
3. Preview state matches event and timeline index.
4. Probe text explains the exact boolean/decision.
5. Play mode advances with auto-pause off.
6. With auto-pause on, stops at each event deterministically.
7. Normal view still works exactly as before.

## 9) Definition of done per operation

An operation is "done" only if all are true:

- deterministic step stream
- accurate code line mapping
- event narration understandable by beginner
- inline validation probe present on key decisions
- timeline controls stable (next/prev/play/finish/reset)
- no regressions in normal visualization

## 10) Minimal implementation recipe (copy process)

For each new operation in any structure:

1. Write/adjust operation code snippet (teaching code) and line map.
2. Emit granular steps from model with activeLine + debugVars.
3. Convert steps to AlgorithmEvent in module (filter non-execution noise).
4. Add probe rules for operation-specific decisions.
5. Verify in browser: first step, mid decision, terminal condition.
6. Run error check and keep normal mode untouched.

---

If you follow this map, every structure gets the same teaching quality and debugging consistency already achieved in BST.
