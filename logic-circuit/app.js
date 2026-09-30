
        // Simulator State
        const state = {
            nodes: [],       // List of logic nodes (Creation Order Maintained Here)
            wires: [],       // List of active wires
            nextId: 1,
            selectedNodeId: null,
            selectedWireId: null,
            connecting: null, // { fromNodeId, fromPinIndex, startPos, mousePos }
            draggingNode: null,
            dragOffset: { x: 0, y: 0 },
            
            // Constant Truth Table State
            truthTable: {
                inputs: [],    // Array of Input node objects
                outputs: [],   // Array of Output node objects
                rows: [],      // Array of { inputPattern: [0,1], outputValues: [0,1]|null, tested: boolean }
                panelCollapsed: false,
                fontSizeClass: 'text-sm' // Default font size (Standard)
            }
        };

        // DOM Elements
        const canvasContainer = document.getElementById('canvas-container');
        const svgWires = document.getElementById('svg-wires');
        const nodesContainer = document.getElementById('nodes-container');
        const emptyHint = document.getElementById('empty-hint');
        const helpModal = document.getElementById('help-modal');
        const ttContainer = document.getElementById('tt-container');
        const ttPanel = document.getElementById('truth-table-panel');
        const ttStatusBadge = document.getElementById('tt-status-badge');

        // Node Type Specifications
        function escapeHtml(value) {
            return String(value).replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
        }
        const NODE_TYPES = {
            input: { name: '入力 (Input)', width: 110, height: 60, inputs: 0, outputs: 1, defaultState: { value: 0 } },
            output: { name: '出力 (Output)', width: 110, height: 60, inputs: 1, outputs: 0, defaultState: { value: 0 } },
            and: { name: 'AND ゲート', width: 130, height: 80, inputs: 2, outputs: 1, defaultState: {} },
            or:  { name: 'OR ゲート',  width: 130, height: 80, inputs: 2, outputs: 1, defaultState: {} },
            not: { name: 'NOT ゲート', width: 120, height: 70, inputs: 1, outputs: 1, defaultState: {} }
        };

        function init() {
            setupEventListeners();
            setupPaletteDrag();
            initResizer();
            setupFontSizeControls();
            renderWires();
            rebuildTruthTableSchema(); // Initial empty schema setup
        }

        function setupPaletteDrag() {
            const items = document.querySelectorAll('.palette-item');
            items.forEach(item => {
                item.setAttribute('role', 'button');
                item.tabIndex = 0;
                item.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); item.click(); }
                });
                item.addEventListener('dragstart', (e) => {
                    const type = item.dataset.type;
                    e.dataTransfer.setData('text/plain', type);
                    e.dataTransfer.effectAllowed = 'copy';
                });
                
                item.addEventListener('click', () => {
                    const rect = canvasContainer.getBoundingClientRect();
                    const x = canvasContainer.scrollLeft + Math.max(20, (canvasContainer.clientWidth / 2 - 50) + (Math.random() * 40 - 20));
                    const y = canvasContainer.scrollTop + Math.max(20, (canvasContainer.clientHeight / 2 - 30) + (Math.random() * 40 - 20));
                    createNode(item.dataset.type, x, y);
                });
            });

            canvasContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });

            canvasContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                const type = e.dataTransfer.getData('text/plain');
                if (type && NODE_TYPES[type]) {
                    const rect = canvasContainer.getBoundingClientRect();
                    const x = e.clientX - rect.left + canvasContainer.scrollLeft - 50;
                    const y = e.clientY - rect.top + canvasContainer.scrollTop - 30;
                    createNode(type, Math.max(10, x), Math.max(10, y));
                }
            });
        }

        function initResizer() {
            const resizer = document.getElementById('resizer');
            let isResizing = false;
            let startY = 0;
            let startHeight = 0;

            resizer.addEventListener('keydown', event => {
                if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    ttPanel.style.height = Math.max(80, Math.min(window.innerHeight * .7, ttPanel.getBoundingClientRect().height + (event.key === 'ArrowUp' ? 20 : -20))) + 'px';
                }
            });
            resizer.addEventListener('pointercancel', () => { isResizing = false; document.body.style.cursor = ''; });
            resizer.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                isResizing = true;
                startY = e.clientY;
                startHeight = ttPanel.getBoundingClientRect().height;
                document.body.style.cursor = 'row-resize';
                document.body.style.userSelect = 'none';
            });

            window.addEventListener('pointermove', (e) => {
                if (!isResizing) return;
                const dy = startY - e.clientY;
                const newHeight = Math.max(80, Math.min(window.innerHeight * .7, startHeight + dy));
                ttPanel.style.height = `${newHeight}px`;
            });

            window.addEventListener('pointerup', () => {
                if (isResizing) {
                    isResizing = false;
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                }
            });
        }

        function setupFontSizeControls() {
            const fontSizes = [
                { id: 'btn-fs-sm', key: 'text-xs' },
                { id: 'btn-fs-md', key: 'text-sm' },
                { id: 'btn-fs-lg', key: 'text-base' },
                { id: 'btn-fs-xl', key: 'text-xl' }
            ];

            fontSizes.forEach(s => {
                const btn = document.getElementById(s.id);
                if (btn) {
                    btn.addEventListener('click', () => {
                        state.truthTable.fontSizeClass = s.key;
                        
                        // Active status button toggle
                        fontSizes.forEach(item => {
                            const b = document.getElementById(item.id);
                            if (b) {
                                if (item.id === s.id) {
                                    b.className = 'font-size-btn px-1.5 py-0.5 rounded text-white bg-cyan-600 font-bold transition';
                                } else {
                                    b.className = 'font-size-btn px-1.5 py-0.5 rounded text-slate-300 hover:bg-slate-700 transition';
                                }
                            }
                        });

                        // Dynamic font size change for table element
                        const tableEl = document.getElementById('tt-table-el');
                        if (tableEl) {
                            tableEl.className = `w-auto min-w-[280px] text-center ${state.truthTable.fontSizeClass} font-mono border-collapse select-text`;
                        }
                    });
                }
            });
        }

        function createNode(type, x, y, customLabel = null) {
            if (!Object.hasOwn(NODE_TYPES, type)) return;
            const def = NODE_TYPES[type];
            let label = customLabel;

            if (!label) {
                if (type === 'input') {
                    const inputCount = state.nodes.filter(n => n.type === 'input').length;
                    label = String.fromCharCode(65 + (inputCount % 26)); // Names A, B, C, etc.
                } else if (type === 'output') {
                    const outputCount = state.nodes.filter(n => n.type === 'output').length;
                    label = `OUT ${outputCount + 1}`;
                } else {
                    label = type.toUpperCase();
                }
            }

            const node = {
                id: `node_${state.nextId++}`,
                type: type,
                x: x,
                y: y,
                label: label,
                inputs: Array(def.inputs).fill(0),
                outputs: Array(def.outputs).fill(0),
                state: { ...def.defaultState }
            };

            state.nodes.push(node);
            evaluateCircuit();
            renderNodes();
            renderWires();
            updateEmptyHint();
            
            // RULE: Circuit structure changed -> Reset & Rebuild Truth Table Schema
            rebuildTruthTableSchema();
            return node;
        }

        function deleteNode(nodeId) {
            state.nodes = state.nodes.filter(n => n.id !== nodeId);
            state.wires = state.wires.filter(w => w.fromNodeId !== nodeId && w.toNodeId !== nodeId);
            if (state.selectedNodeId === nodeId) state.selectedNodeId = null;
            evaluateCircuit();
            renderNodes();
            renderWires();
            updateEmptyHint();

            // RULE: Circuit structure changed -> Reset & Rebuild Truth Table Schema
            rebuildTruthTableSchema();
        }

        function deleteWire(wireId) {
            state.wires = state.wires.filter(w => w.id !== wireId);
            if (state.selectedWireId === wireId) state.selectedWireId = null;
            evaluateCircuit();
            renderNodes();
            renderWires();

            // RULE: Circuit structure changed -> Reset & Rebuild Truth Table Schema
            rebuildTruthTableSchema();
        }

        function updateEmptyHint() {
            emptyHint.style.display = state.nodes.length === 0 ? 'flex' : 'none';
        }

        function renderNodes() {
            nodesContainer.innerHTML = '';

            state.nodes.forEach(node => {
                const def = NODE_TYPES[node.type];
                const el = document.createElement('div');
                
                el.className = `node-element absolute rounded-xl bg-slate-900 border ${
                    state.selectedNodeId === node.id ? 'border-cyan-400 ring-2 ring-cyan-400/30' : 'border-slate-700/80'
                } shadow-xl flex flex-col pointer-events-auto transition-shadow hover:border-slate-500`;
                
                el.style.left = `${node.x}px`;
                el.style.top = `${node.y}px`;
                el.style.width = `${def.width}px`;
                el.style.height = `${def.height}px`;
                el.dataset.id = node.id;

                let innerContent = '';

                if (node.type === 'input') {
                    const isOn = node.state.value === 1;
                    innerContent = `
                        <div class="flex-1 flex items-center justify-between px-3">
                            <span class="node-label text-xs font-bold text-cyan-400 font-mono cursor-pointer hover:underline" title="ダブルクリックで名称変更">${escapeHtml(node.label)}</span>
                            <button class="btn-toggle text-xs font-mono font-black w-10 py-1 rounded-md transition-all ${
                                isOn ? 'bg-cyan-500 text-slate-950 switch-on' : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }" title="クリックで 0 / 1 切替">
                                ${isOn ? '1' : '0'}
                            </button>
                        </div>
                    `;
                } 
                else if (node.type === 'output') {
                    const isOn = node.inputs[0] === 1;
                    innerContent = `
                        <div class="flex-1 flex items-center justify-between px-3">
                            <div class="w-6 h-6 rounded-full ${isOn ? 'led-on' : 'led-off'} transition-all flex items-center justify-center font-mono text-xs select-none">
                                ${isOn ? '1' : '0'}
                            </div>
                            <span class="node-label text-xs font-bold text-emerald-400 font-mono cursor-pointer hover:underline" title="ダブルクリックで名称変更">${escapeHtml(node.label)}</span>
                        </div>
                    `;
                } else {
                    innerContent = `
                        <div class="flex-1 flex flex-col items-center justify-center relative p-1">
                            ${getGateSvg(node.type)}
                            <span class="node-label text-[10px] font-semibold text-slate-400 cursor-pointer hover:underline mt-0.5" title="ダブルクリックで名称変更">${escapeHtml(node.label)}</span>
                        </div>
                    `;
                }

                el.innerHTML = `
                    <div class="node-header h-4 bg-slate-800/80 rounded-t-xl flex items-center justify-end px-1.5 cursor-move border-b border-slate-800">
                        <button class="btn-delete text-slate-500 hover:text-rose-400 transition p-0.5" title="削除">
                            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>

                    ${innerContent}

                    <!-- Input Pins -->
                    <div class="absolute left-0 top-0 bottom-0 flex flex-col justify-around py-3 -translate-x-1/2">
                        ${Array.from({ length: def.inputs }).map((_, idx) => `
                            <div class="pin-node input-pin w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                                node.inputs[idx] ? 'bg-cyan-400' : 'bg-slate-600'
                            } cursor-pointer transition-all" 
                            role="button" tabindex="0" aria-label="${escapeHtml(node.label)} 入力ピン ${idx + 1}" data-node-id="${node.id}" data-pin-type="input" data-pin-index="${idx}" title="入力ピン ${idx + 1}"></div>
                        `).join('')}
                    </div>

                    <!-- Output Pins -->
                    <div class="absolute right-0 top-0 bottom-0 flex flex-col justify-around py-3 translate-x-1/2">
                        ${Array.from({ length: def.outputs }).map((_, idx) => `
                            <div class="pin-node output-pin w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                                node.outputs[idx] ? 'bg-cyan-400' : 'bg-slate-600'
                            } cursor-pointer transition-all" 
                            role="button" tabindex="0" aria-label="${escapeHtml(node.label)} 出力ピン" data-node-id="${node.id}" data-pin-type="output" data-pin-index="${idx}" title="出力ピン"></div>
                        `).join('')}
                    </div>
                `;

                setupNodeEvents(el, node);
                nodesContainer.appendChild(el);
            });
        }

        // Standard MIL/JIS SVG Logic Gate Graphic
        function getGateSvg(type) {
            const fill = "#0f172a";
            if (type === 'and') {
                return `
                    <svg class="w-12 h-8 text-cyan-400 drop-shadow" viewBox="0 0 40 30" fill="none">
                        <path d="M 6,5 L 18,5 C 28,5 28,25 18,25 L 6,25 Z" fill="${fill}" stroke="currentColor" stroke-width="2"/>
                    </svg>
                `;
            } else if (type === 'or') {
                return `
                    <svg class="w-12 h-8 text-indigo-400 drop-shadow" viewBox="0 0 40 30" fill="none">
                        <path d="M 6,5 C 13,11 13,19 6,25 C 18,25 28,20 34,15 C 28,10 18,5 6,5 Z" fill="${fill}" stroke="currentColor" stroke-width="2"/>
                    </svg>
                `;
            } else if (type === 'not') {
                return `
                    <svg class="w-12 h-8 text-purple-400 drop-shadow" viewBox="0 0 40 30" fill="none">
                        <path d="M 6,5 L 24,15 L 6,25 Z" fill="${fill}" stroke="currentColor" stroke-width="2"/>
                        <circle cx="28" cy="15" r="2.5" fill="${fill}" stroke="currentColor" stroke-width="2"/>
                    </svg>
                `;
            }
            return '';
        }

        function setupNodeEvents(el, node) {
            el.addEventListener('pointerdown', (e) => {
                if (e.target.closest('.pin-node') || e.target.closest('.btn-toggle') || e.target.closest('.btn-delete') || e.target.closest('.node-label') || e.target.closest('.node-header')) return;
                state.selectedNodeId = node.id;
                state.selectedWireId = null;
                nodesContainer.querySelectorAll('.node-element').forEach(item => item.style.outline = item.dataset.id === node.id ? '2px solid #22d3ee' : '');
                renderWires();
            });

            const header = el.querySelector('.node-header');
            header.addEventListener('pointerdown', (e) => {
                if (e.target.closest('.btn-delete') || e.button > 0) return;
                e.preventDefault();
                e.stopPropagation();
                state.selectedNodeId = node.id;
                state.draggingNode = node;
                state.dragOffset = {
                    x: e.clientX + canvasContainer.scrollLeft - node.x,
                    y: e.clientY + canvasContainer.scrollTop - node.y
                };
            });

            const btnDelete = el.querySelector('.btn-delete');
            btnDelete.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteNode(node.id);
            });

            // Double Click to Rename Label
            const labelEl = el.querySelector('.node-label');
            if (labelEl) {
                labelEl.tabIndex = 0;
                labelEl.setAttribute('role', 'button');
                labelEl.addEventListener('keydown', event => {
                    if (event.key === 'Enter') { event.preventDefault(); labelEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); }
                });
            }
            if (labelEl) {
                labelEl.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    const newLabel = prompt('ノードの名称（ラベル）を変更してください:', node.label);
                    if (newLabel !== null && newLabel.trim() !== '') {
                        node.label = newLabel.trim().slice(0, 80);
                        renderNodes();
                        recordAndHighlightTruthTableRow();
                    }
                });
            }

            if (node.type === 'input') {
                const btnToggle = el.querySelector('.btn-toggle');
                btnToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    node.state.value = node.state.value === 1 ? 0 : 1;
                    evaluateCircuit();
                    renderNodes();

                    // Switch clicked -> Record & Highlight Truth Table Row
                    recordAndHighlightTruthTableRow();
                });
            }
        }

        function getPinCoordinates(nodeId, pinType, pinIndex) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (!node) return { x: 0, y: 0 };

            const def = NODE_TYPES[node.type];
            const pinCount = pinType === 'input' ? def.inputs : def.outputs;
            
            const pin = nodesContainer.querySelector('[data-node-id="' + nodeId + '"][data-pin-type="' + pinType + '"][data-pin-index="' + pinIndex + '"]');
            if (pin) {
                const pinRect = pin.getBoundingClientRect(), canvasRect = canvasContainer.getBoundingClientRect();
                return { x: pinRect.left + pinRect.width / 2 - canvasRect.left + canvasContainer.scrollLeft,
                         y: pinRect.top + pinRect.height / 2 - canvasRect.top + canvasContainer.scrollTop };
            }
            const sectionHeight = def.height / (pinCount + 1);
            const py = node.y + sectionHeight * (pinIndex + 1);
            const px = pinType === 'input' ? node.x : node.x + def.width;

            return { x: px, y: py };
        }

        function renderWires() {
            let svgHtml = '';

            state.wires.forEach(wire => {
                const fromPos = getPinCoordinates(wire.fromNodeId, 'output', wire.fromPinIndex);
                const toPos = getPinCoordinates(wire.toNodeId, 'input', wire.toPinIndex);

                const d = calculateBeziers(fromPos.x, fromPos.y, toPos.x, toPos.y);
                const isSignalHigh = wire.signal === 1;
                const isSelected = state.selectedWireId === wire.id;

                svgHtml += `
                    <g class="wire-group pointer-events-auto" data-wire-id="${wire.id}">
                        <path d="${d}" fill="none" stroke="transparent" stroke-width="12" class="wire-hit-area"/>
                        <path d="${d}" 
                              fill="none" 
                              class="wire-path ${isSignalHigh ? 'wire-active' : 'wire-inactive'}"
                              stroke-width="${isSelected ? 4 : 3}"
                              ${isSelected ? 'stroke="#a855f7"' : ''}/>
                    </g>
                `;
            });

            if (state.connecting) {
                const fromPos = getPinCoordinates(state.connecting.fromNodeId, 'output', state.connecting.fromPinIndex);
                const toPos = state.connecting.mousePos;
                const d = calculateBeziers(fromPos.x, fromPos.y, toPos.x, toPos.y);

                svgHtml += `
                    <path d="${d}" fill="none" class="wire-drawing" stroke-width="3"/>
                `;
            }

            svgWires.innerHTML = svgHtml;

            svgWires.querySelectorAll('.wire-group').forEach(group => {
                group.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteWire(group.dataset.wireId);
                });
            });
        }

        function calculateBeziers(x1, y1, x2, y2) {
            const dx = Math.abs(x2 - x1) * 0.5;
            const cx1 = x1 + Math.max(dx, 40);
            const cx2 = x2 - Math.max(dx, 40);
            return `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
        }

        function evaluateCircuit() {
            state.simulationError = null;
            const nodes = new Map(state.nodes.map(node => [node.id, node]));
            const incoming = new Map(state.nodes.map(node => [node.id, 0]));
            const outgoing = new Map(state.nodes.map(node => [node.id, []]));
            for (const node of state.nodes) { node.inputs.fill(0); node.outputs.fill(0); }
            for (const wire of state.wires) {
                incoming.set(wire.toNodeId, incoming.get(wire.toNodeId) + 1);
                outgoing.get(wire.fromNodeId).push(wire);
            }
            const queue = state.nodes.filter(node => incoming.get(node.id) === 0);
            let processed = 0;
            for (let index = 0; index < queue.length; index++) {
                const node = queue[index]; processed++;
                if (node.type === 'input') node.outputs[0] = node.state.value;
                else if (node.type === 'and') node.outputs[0] = Number(node.inputs[0] === 1 && node.inputs[1] === 1);
                else if (node.type === 'or') node.outputs[0] = Number(node.inputs[0] === 1 || node.inputs[1] === 1);
                else if (node.type === 'not') node.outputs[0] = Number(node.inputs[0] !== 1);
                else if (node.type === 'output') node.state.value = node.inputs[0];
                for (const wire of outgoing.get(node.id)) {
                    wire.signal = node.outputs[wire.fromPinIndex];
                    const target = nodes.get(wire.toNodeId);
                    target.inputs[wire.toPinIndex] = wire.signal;
                    incoming.set(target.id, incoming.get(target.id) - 1);
                    if (incoming.get(target.id) === 0) queue.push(target);
                }
            }
            if (processed !== state.nodes.length) {
                state.simulationError = '回路に循環があります。配線を見直してください。真理値表は検証できません。';
                state.truthTable.rows.forEach(row => { row.tested = false; row.outputValues = null; });
                state.nodes.filter(node => node.type === 'output').forEach(node => { node.state.value = 0; });
            }
            return !state.simulationError;
        }

        /**
         * Rebuild Truth Table Schema strictly maintaining CREATION ORDER of nodes
         */
        function rebuildTruthTableSchema() {
            const inputNodes = state.nodes.filter(n => n.type === 'input');
            const outputNodes = state.nodes.filter(n => n.type === 'output');

            state.truthTable.inputs = inputNodes;
            state.truthTable.outputs = outputNodes;

            if (inputNodes.length === 0 || outputNodes.length === 0) {
                state.truthTable.rows = [];
                renderTruthTableUI();
                return;
            }

            if (inputNodes.length > 8) {
                state.truthTable.rows = [];
                renderTruthTableUI("入力ノード数が多すぎます（最大 8 個）");
                return;
            }

            const numRows = Math.pow(2, inputNodes.length);
            const rows = [];

            for (let i = 0; i < numRows; i++) {
                const pattern = [];
                for (let j = 0; j < inputNodes.length; j++) {
                    const bit = (i >> (inputNodes.length - 1 - j)) & 1;
                    pattern.push(bit);
                }
                rows.push({
                    inputPattern: pattern,
                    outputValues: null,
                    tested: false
                });
            }

            state.truthTable.rows = rows;
            recordAndHighlightTruthTableRow();
        }

        /**
         * Record and Highlight current state in Truth Table
         */
        function recordAndHighlightTruthTableRow() {
            renderWires();
            const { inputs, outputs, rows } = state.truthTable;
            if (state.simulationError) { renderTruthTableUI(state.simulationError); return; }
            if (inputs.length > 8) { renderTruthTableUI("入力ノード数が多すぎます（最大 8 個）"); return; }
            if (inputs.length === 0 || outputs.length === 0 || rows.length === 0) return;

            const currentInputs = inputs.map(n => n.state.value);
            const targetIndex = rows.findIndex(row => 
                row.inputPattern.every((val, idx) => val === currentInputs[idx])
            );

            if (targetIndex !== -1) {
                const currentOutputs = outputs.map(n => n.state.value);
                rows[targetIndex].outputValues = currentOutputs;
                rows[targetIndex].tested = true;
            }

            renderTruthTableUI(null, targetIndex);
        }

        /**
         * Action: Automated full circuit testing
         */
        function runAllTruthTablePatterns() {
            const { inputs, outputs, rows } = state.truthTable;
            if (state.simulationError || inputs.length > 8 || rows.length === 0) return;

            const savedInputs = inputs.map(n => n.state.value);

            rows.forEach(row => {
                inputs.forEach((node, idx) => {
                    node.state.value = row.inputPattern[idx];
                });

                evaluateCircuit();

                row.outputValues = outputs.map(n => n.state.value);
                row.tested = true;
            });

            inputs.forEach((node, idx) => {
                node.state.value = savedInputs[idx];
            });
            evaluateCircuit();
            renderNodes();

            recordAndHighlightTruthTableRow();
        }

        /**
         * Save Circuit State to JSON File
         */
        function saveCircuit() {
            const saveData = {
                version: "1.0",
                timestamp: new Date().toISOString(),
                nextId: state.nextId,
                nodes: state.nodes,
                wires: state.wires
            };

            const jsonStr = JSON.stringify(saveData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const dateStr = new Date().toISOString().slice(0, 10);
            const a = document.createElement('a');
            a.href = url;
            a.download = `logic_circuit_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        /**
         * Load Circuit State from JSON File
         */
        function validateCircuit(data) {
            if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.wires) || data.nodes.length === 0 || data.nodes.length > 500 || data.wires.length > 2000) {
                throw Error('空の回路や無効なファイルは読み込めません。現在の回路はそのままです。');
            }
            const ids = new Set(), destinations = new Set();
            const nodes = data.nodes.map(node => {
                if (!node || !Object.hasOwn(NODE_TYPES, node.type) || typeof node.id !== 'string' || !/^node_[1-9][0-9]{0,8}$/.test(node.id) || ids.has(node.id) || typeof node.label !== 'string' || node.label.length > 80 || !Number.isFinite(node.x) || !Number.isFinite(node.y) || node.x < 0 || node.y < 0 || node.x > 20000 || node.y > 20000) throw Error('パーツの形式が正しくありません。');
                ids.add(node.id);
                const def = NODE_TYPES[node.type];
                if (node.type === 'input' && node.state?.value !== 0 && node.state?.value !== 1) throw Error('入力値は0または1です。');
                return { id: node.id, type: node.type, x: node.x, y: node.y, label: node.label,
                    inputs: Array(def.inputs).fill(0), outputs: Array(def.outputs).fill(0), state: { value: node.type === 'input' ? node.state.value : 0 } };
            });
            const byId = new Map(nodes.map(node => [node.id, node]));
            const wires = data.wires.map(wire => {
                if (!wire || typeof wire.id !== 'string' || !/^wire_[1-9][0-9]{0,8}$/.test(wire.id) || ids.has(wire.id)) throw Error('配線の形式が正しくありません。');
                const from = byId.get(wire.fromNodeId), to = byId.get(wire.toNodeId);
                const destination = wire.toNodeId + ':' + wire.toPinIndex;
                if (!from || !to || !Number.isInteger(wire.fromPinIndex) || !Number.isInteger(wire.toPinIndex) || wire.fromPinIndex < 0 || wire.fromPinIndex >= from.outputs.length || wire.toPinIndex < 0 || wire.toPinIndex >= to.inputs.length || destinations.has(destination)) throw Error('配線の接続先が正しくありません。');
                ids.add(wire.id); destinations.add(destination);
                return { id: wire.id, fromNodeId: from.id, fromPinIndex: wire.fromPinIndex, toNodeId: to.id, toPinIndex: wire.toPinIndex, signal: 0 };
            });
            const nextId = Math.max(0, ...[...ids].map(id => Number(id.split('_')[1]))) + 1;
            return { nodes, wires, nextId };
        }

        function loadCircuit(event) {
            const file = event.target.files[0];
            if (!file) return;
            event.target.value = '';
            if (file.size > 2 * 1024 * 1024) { alert('回路ファイルは2MB以下にしてください。'); return; }
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const restored = validateCircuit(JSON.parse(event.target.result));
                    Object.assign(state, restored, { selectedNodeId: null, selectedWireId: null, connecting: null, draggingNode: null });
                    evaluateCircuit(); renderNodes(); renderWires(); updateEmptyHint(); rebuildTruthTableSchema();
                } catch (error) { alert('読み込めませんでした。現在の回路はそのままです。\n' + error.message); }
            };
            reader.onerror = () => alert('ファイルを読み込めませんでした。現在の回路はそのままです。');
            reader.readAsText(file);
        }

        /**
         * Render Bottom Truth Table UI
         */
        function renderTruthTableUI(errorMsg = null, activeRowIndex = -1) {
            errorMsg ||= state.simulationError;
            if (!errorMsg && state.truthTable.inputs.length > 8) errorMsg = '入力ノード数が多すぎます（最大 8 個）';
            const { inputs, outputs, rows } = state.truthTable;

            if (errorMsg) {
                ttContainer.innerHTML = `<div class="text-center py-6 text-amber-400 text-xs font-semibold">${errorMsg}</div>`;
                ttStatusBadge.innerText = "エラー";
                return;
            }

            if (inputs.length === 0 || outputs.length === 0) {
                ttContainer.innerHTML = `
                    <div class="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-1 py-4">
                        <svg class="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        <span>キャンバスに入力 (Switch) と出力 (LED) を配置すると真理値表が自動生成されます</span>
                    </div>
                `;
                ttStatusBadge.innerText = "未接続";
                return;
            }

            const testedCount = rows.filter(r => r.tested).length;
            const progressPercent = Math.round((testedCount / rows.length) * 100);
            ttStatusBadge.innerText = `検証済み: ${testedCount} / ${rows.length} 行 (${progressPercent}%)`;

            let html = `
                <table id="tt-table-el" class="w-auto min-w-[280px] text-center ${state.truthTable.fontSizeClass} font-mono border-collapse select-text">
                    <thead>
                        <tr class="bg-slate-900 sticky top-0 text-slate-300 border-b border-slate-800">
                            <th class="py-1.5 px-2 text-slate-500 font-normal border-r border-slate-800/80 w-10">#</th>
                            ${inputs.map(n => `<th class="py-1.5 px-3 text-cyan-400 font-bold border-r border-slate-800/80" title="作成順に固定されています">${escapeHtml(n.label)}</th>`).join('')}
                            ${outputs.map(n => `<th class="py-1.5 px-3 text-emerald-400 font-bold border-r border-slate-800/80 last:border-r-0" title="作成順に固定されています">${escapeHtml(n.label)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800/60">
            `;

            rows.forEach((row, rIdx) => {
                const isActive = rIdx === activeRowIndex;
                const rowClass = isActive ? 'active-tt-row' : 'hover:bg-slate-800/30';

                html += `<tr id="tt-row-${rIdx}" class="transition-colors ${rowClass}">`;
                html += `<td class="py-1 px-2 text-slate-600 border-r border-slate-800/60">${rIdx + 1}</td>`;

                // Inputs
                row.inputPattern.forEach(val => {
                    html += `<td class="py-1 px-3 border-r border-slate-800/60 ${val === 1 ? 'text-cyan-400 font-bold' : 'text-slate-500'}">${val}</td>`;
                });

                // Outputs
                outputs.forEach((_, oIdx) => {
                    if (row.outputValues !== null) {
                        const outVal = row.outputValues[oIdx];
                        html += `<td class="py-1 px-3 border-r border-slate-800/60 last:border-r-0 ${outVal === 1 ? 'text-emerald-400 font-bold bg-emerald-950/20' : 'text-slate-400'}">${outVal}</td>`;
                    } else {
                        html += `<td class="py-1 px-3 border-r border-slate-800/60 last:border-r-0 text-slate-600 font-bold">-</td>`;
                    }
                });

                html += `</tr>`;
            });

            html += `</tbody></table>`;
            ttContainer.innerHTML = html;

            if (activeRowIndex !== -1) {
                const activeEl = document.getElementById(`tt-row-${activeRowIndex}`);
                if (activeEl) {
                    activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            }
        }

        function setupEventListeners() {
            window.addEventListener('resize', renderWires);
            window.addEventListener('pointercancel', () => { state.draggingNode = null; state.connecting = null; renderWires(); });
            canvasContainer.addEventListener('keydown', event => {
                if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('.pin-node')) {
                    event.preventDefault();
                    event.target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'keyboard' }));
                }
            });
            window.addEventListener('pointermove', (e) => {
                const rect = canvasContainer.getBoundingClientRect();
                const mouseX = e.clientX - rect.left + canvasContainer.scrollLeft;
                const mouseY = e.clientY - rect.top + canvasContainer.scrollTop;

                if (state.draggingNode) {
                    const canvasInner = document.getElementById('canvas-inner');
                    const maxX = Math.max(rect.width, canvasInner.scrollWidth) - 100;
                    const maxY = Math.max(rect.height, canvasInner.scrollHeight) - 60;

                    state.draggingNode.x = Math.max(0, Math.min(maxX, e.clientX + canvasContainer.scrollLeft - state.dragOffset.x));
                    state.draggingNode.y = Math.max(0, Math.min(maxY, e.clientY + canvasContainer.scrollTop - state.dragOffset.y));
                    const element = nodesContainer.querySelector('[data-id="' + state.draggingNode.id + '"]');
                    if (element) { element.style.left = state.draggingNode.x + 'px'; element.style.top = state.draggingNode.y + 'px'; }
                }

                if (state.connecting) {
                    state.connecting.mousePos = { x: mouseX, y: mouseY };
                }
                if (state.draggingNode || state.connecting) renderWires();
            });

            window.addEventListener('pointerup', (e) => {
                if (state.draggingNode) {
                    state.draggingNode = null;
                }

                if (state.connecting) {
                    const rect = canvasContainer.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left + canvasContainer.scrollLeft;
                    const mouseY = e.clientY - rect.top + canvasContainer.scrollTop;

                    const elemUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
                    const targetPin = elemUnderCursor ? elemUnderCursor.closest('.input-pin') : null;

                    if (targetPin) {
                        const toNodeId = targetPin.dataset.nodeId;
                        const toPinIndex = parseInt(targetPin.dataset.pinIndex, 10);

                        if (state.connecting.fromNodeId !== toNodeId) {
                            state.wires = state.wires.filter(w => !(w.toNodeId === toNodeId && w.toPinIndex === toPinIndex));

                            state.wires.push({
                                id: `wire_${state.nextId++}`,
                                fromNodeId: state.connecting.fromNodeId,
                                fromPinIndex: state.connecting.fromPinIndex,
                                toNodeId: toNodeId,
                                toPinIndex: toPinIndex,
                                signal: 0
                            });

                            evaluateCircuit();
                            renderNodes();
                            rebuildTruthTableSchema();
                        }
                        state.connecting = null;
                        renderWires();
                    } else {
                        const dragDist = Math.hypot(mouseX - state.connecting.startPos.x, mouseY - state.connecting.startPos.y);
                        if (dragDist > 8) {
                            state.connecting = null;
                            evaluateCircuit();
                            renderNodes();
                            rebuildTruthTableSchema();
                            renderWires();
                        }
                    }
                }
            });

            canvasContainer.addEventListener('pointerdown', (e) => {
                if (e.button > 0) return;
                const pin = e.target.closest('.pin-node');
                if (!pin) {
                    if (!e.target.closest('.node-element') && !e.target.closest('.wire-group')) {
                        state.selectedNodeId = null;
                        state.selectedWireId = null;
                        renderNodes();
                    }
                    return;
                }

                e.preventDefault();
                e.stopPropagation();
                const nodeId = pin.dataset.nodeId;
                const pinType = pin.dataset.pinType;
                const pinIndex = parseInt(pin.dataset.pinIndex, 10);
                const rect = canvasContainer.getBoundingClientRect();
                const mouseX = e.clientX - rect.left + canvasContainer.scrollLeft;
                const mouseY = e.clientY - rect.top + canvasContainer.scrollTop;

                if (pinType === 'output') {
                    state.connecting = {
                        fromNodeId: nodeId,
                        fromPinIndex: pinIndex,
                        startPos: { x: mouseX, y: mouseY },
                        mousePos: { x: mouseX, y: mouseY }
                    };
                } else if (pinType === 'input') {
                    if (state.connecting) {
                        if (state.connecting.fromNodeId !== nodeId) {
                            state.wires = state.wires.filter(w => !(w.toNodeId === nodeId && w.toPinIndex === pinIndex));

                            state.wires.push({
                                id: `wire_${state.nextId++}`,
                                fromNodeId: state.connecting.fromNodeId,
                                fromPinIndex: state.connecting.fromPinIndex,
                                toNodeId: nodeId,
                                toPinIndex: pinIndex,
                                signal: 0
                            });

                            evaluateCircuit();
                            renderNodes();
                            rebuildTruthTableSchema();
                        }
                        state.connecting = null;
                        renderWires();
                    } else {
                        const existingWire = state.wires.find(w => w.toNodeId === nodeId && w.toPinIndex === pinIndex);
                        if (existingWire) {
                            state.wires = state.wires.filter(w => w.id !== existingWire.id);
                            
                            state.connecting = {
                                fromNodeId: existingWire.fromNodeId,
                                fromPinIndex: existingWire.fromPinIndex,
                                startPos: { x: mouseX, y: mouseY },
                                mousePos: { x: mouseX, y: mouseY }
                            };

                            evaluateCircuit();
                            renderNodes();
                            rebuildTruthTableSchema();
                        }
                    }
                }
                renderWires();
            });

            window.addEventListener('keydown', (e) => {
                if (e.target.closest('input, textarea, [contenteditable]')) return;
                if (!helpModal.classList.contains('hidden')) {
                    if (e.key === 'Escape') closeHelp();
                    else if (e.key === 'Tab') { e.preventDefault(); document.getElementById('close-help').focus(); }
                    return;
                }
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    if (state.selectedNodeId) {
                        deleteNode(state.selectedNodeId);
                    } else if (state.selectedWireId) {
                        deleteWire(state.selectedWireId);
                    }
                } else if (e.key === 'Escape') {
                    state.connecting = null;
                    renderWires();
                }
            });

            // Action Buttons
            document.getElementById('btn-clear').addEventListener('click', () => {
                state.nodes = [];
                state.wires = [];
                state.simulationError = null;
                state.draggingNode = null;
                state.selectedNodeId = null;
                state.selectedWireId = null;
                state.connecting = null;
                renderNodes();
                renderWires();
                updateEmptyHint();
                rebuildTruthTableSchema();
            });

            // Save / Load Handlers
            document.getElementById('btn-save').addEventListener('click', saveCircuit);
            document.getElementById('btn-load').addEventListener('click', () => {
                document.getElementById('file-input').click();
            });
            document.getElementById('file-input').addEventListener('change', loadCircuit);

            document.getElementById('btn-run-all-tt').addEventListener('click', runAllTruthTablePatterns);
            function closeHelp() { helpModal.classList.add('hidden'); document.getElementById('btn-help').focus(); }
            document.getElementById('btn-help').addEventListener('click', () => { helpModal.classList.remove('hidden'); document.getElementById('close-help').focus(); });
            document.getElementById('close-help').addEventListener('click', closeHelp);
            helpModal.addEventListener('click', event => { if (event.target === helpModal) closeHelp(); });

            // Toggle Panel Collapse
            const btnTogglePanel = document.getElementById('btn-toggle-tt-panel');
            btnTogglePanel.setAttribute('aria-expanded', 'true');
            const iconTogglePanel = document.getElementById('icon-toggle-panel');
            btnTogglePanel.addEventListener('click', () => {
                state.truthTable.panelCollapsed = !state.truthTable.panelCollapsed;
                if (state.truthTable.panelCollapsed) {
                    state.truthTable.expandedHeight = ttPanel.getBoundingClientRect().height;
                    ttPanel.style.height = 'auto';
                    document.getElementById('tt-container').hidden = true;
                    document.getElementById('resizer').hidden = true;
                    btnTogglePanel.setAttribute('aria-expanded', 'false');
                    ttPanel.classList.remove('h-56');
                    ttPanel.classList.add('h-9');
                    iconTogglePanel.style.transform = 'rotate(180deg)';
                } else {
                    ttPanel.style.height = (state.truthTable.expandedHeight || 224) + 'px';
                    document.getElementById('tt-container').hidden = false;
                    document.getElementById('resizer').hidden = false;
                    btnTogglePanel.setAttribute('aria-expanded', 'true');
                    ttPanel.classList.remove('h-9');
                    ttPanel.classList.add('h-56');
                    iconTogglePanel.style.transform = 'rotate(0deg)';
                }
            });

            document.getElementById('btn-copy-csv').addEventListener('click', copyTruthTableCsv);
        }

        function copyTruthTableCsv() {
            const csvCell = value => {
                value = String(value);
                if (/^[=+@-]/.test(value) && value !== '-') value = "'" + value;
                return /[",\r\n]/.test(value) ? '"' + value.replaceAll('"', '""') + '"' : value;
            };
            const table = document.getElementById('tt-table-el');
            if (!table) return;

            let csv = [];
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                const cols = row.querySelectorAll('th, td');
                const rowData = [];
                cols.forEach((col, idx) => {
                    if (idx > 0) rowData.push(csvCell(col.innerText.trim()));
                });
                csv.push(rowData.join(','));
            });

            const csvString = csv.join('\n');
            const textarea = document.createElement('textarea');
            textarea.value = csvString;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                if (!document.execCommand('copy')) throw Error('Clipboard unavailable');
                const orig = ttStatusBadge.innerText;
                ttStatusBadge.innerText = '✓ CSVコピー完了！';
                setTimeout(() => ttStatusBadge.innerText = orig, 1800);
            } catch (err) {
                alert('コピーできませんでした。表を選択してコピーしてください。');
            }
            document.body.removeChild(textarea);
        }

        init();
    