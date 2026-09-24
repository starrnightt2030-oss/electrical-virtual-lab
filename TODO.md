# TODO

## Phase 2 — Electrical Core Engine
- [ ] Install dependencies and run the test/build pipeline.
- [ ] Add explicit graph/node abstraction rather than relying only on terminal traversal.
- [ ] Add multiple resistive loads and true series/parallel solving.
- [ ] Add open-circuit and short-circuit test fixtures.
- [ ] Add measurement probes.
- [ ] Add reusable fault model.
- [ ] Add solver result snapshots for deterministic tests.

## Phase 3 — Component System
- [ ] Component library metadata.
- [ ] Component visual states.
- [ ] Drag/drop component placement.
- [ ] Connection editing.

## Phase 2 next
- [ ] Generalize solver to multiple loads and branches in one graph.
- [ ] Add explicit node/branch abstraction.
- [ ] Add voltage/current measurement points.
- [ ] Add open-wire and short-circuit fault injection.
- [ ] Add MCB/overload behavior.

### Phase 2 — Next
- [ ] Add measurement probes per terminal/component
- [ ] Add explicit parallel-branch demo circuit
- [ ] Add fault injection API (open wire, short, loose terminal)
- [ ] Add MCB model
- [ ] Add capacitor transient solver
- [ ] Add inductor transient solver

## Phase 2 Next
- Add explicit measurement probes to arbitrary circuit terminals.
- Add current-path visualization from solver output.
- Add MCB model and trip curves.
- Add voltage-drop calculations and cable model.
- Add more component types before Phase 3.

## Phase 2 remaining
- Integrate MCB as a first-class circuit component into the graph solver.
- Add dynamic thermal trip timing.
- Add configurable electrical-code datasets instead of the current educational baseline table.
- Add earth/PE conductor modeling and fault-loop behavior.

- [x] Integrate MCB into Circuit Graph as a first-class protective component
- [x] Trip MCB from simulated current and disconnect its branch
- [ ] Complete Phase 2 regression/build verification in a fully provisioned Node environment

## Phase 3 Next
- [ ] Render connection wires visually on the 2D canvas.
- [ ] Drag components with pointer/touch.
- [ ] Add snap-to-grid.
- [ ] Add undo/redo for circuit editing.
- [ ] Persist workbench circuits in IndexedDB.

- [ ] Phase 3: node-aware wire branching (multi-drop junctions)
- [ ] Phase 3: live energized-wire visualization from solver results
- [ ] Phase 3: schematic symbol renderer generated from Circuit model

### Next after Node & Wiring
- [ ] Replace schematic preview placeholder symbols with a standards-oriented SVG symbol renderer.
- [ ] Add animated energized-wire states from SimulationResult.
- [ ] Add branch-current labels at Junctions.
- [ ] Add wire routing handles and editable multi-segment paths.


### Phase 3 Completed
- [x] Professional generated schematic renderer
- [x] SVG electrical symbols and L/N rails
- [x] Circuit Model driven schematic view
- [ ] Full schematic routing for arbitrary branch topology


### Phase 3 Completed
- [x] Professional generated schematic renderer
- [x] SVG electrical symbols and L/N rails
- [x] Circuit Model driven schematic view
- [ ] Full schematic routing for arbitrary branch topology

## Phase 4 — Fundamentals
- Add V-I-R relationship graph.
- Add guided simple circuit lesson with measurement probes.
- Add visual conductor length/area experiment.
- Add educational checkpoints without grades/exams.
- [x] Guided simple circuit lesson with live measurements and current-flow animation.
- [ ] Finish Phase 4 with validation/final educational polish, then begin Phase 5 Components Lab.

## Phase 5 — Components Lab
- [x] Resistor color-code decoder foundation
- [x] Alphanumeric resistor codes
- [x] Capacitor calculations
- [x] Inductor calculations
- [x] Interactive Components Lab
- [ ] Resistor reverse color-code challenge
- [ ] Capacitor charge/discharge waveform visualization
- [ ] Inductor transient visualization
- [ ] Add capacitor/inductor component types to Circuit Model
- [ ] Add component properties to Workbench

## Phase 7 Next
- Add protective-earth validation and dedicated E node semantics.
- Add bell + push button and fluorescent circuits.
- Add multi-location (three-way/intermediate) switching.
- Add residential panel / distribution board layout.
