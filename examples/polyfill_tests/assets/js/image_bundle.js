(function() {
	//#region \0@oxc-project+runtime@0.124.0/helpers/typeof.js
	function _typeof(o) {
		"@babel/helpers - typeof";
		return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
			return typeof o;
		} : function(o) {
			return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
		}, _typeof(o);
	}
	//#endregion
	//#region \0@oxc-project+runtime@0.124.0/helpers/toPrimitive.js
	function toPrimitive(t, r) {
		if ("object" != _typeof(t) || !t) return t;
		var e = t[Symbol.toPrimitive];
		if (void 0 !== e) {
			var i = e.call(t, r || "default");
			if ("object" != _typeof(i)) return i;
			throw new TypeError("@@toPrimitive must return a primitive value.");
		}
		return ("string" === r ? String : Number)(t);
	}
	//#endregion
	//#region \0@oxc-project+runtime@0.124.0/helpers/toPropertyKey.js
	function toPropertyKey(t) {
		var i = toPrimitive(t, "string");
		return "symbol" == _typeof(i) ? i : i + "";
	}
	//#endregion
	//#region \0@oxc-project+runtime@0.124.0/helpers/defineProperty.js
	function _defineProperty(e, r, t) {
		return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
			value: t,
			enumerable: !0,
			configurable: !0,
			writable: !0
		}) : e[r] = t, e;
	}
	//#endregion
	//#region ../../node_modules/.bun/@solidjs+signals@2.0.0-beta.14/node_modules/@solidjs/signals/dist/prod.js
	var NotReadyError = class extends Error {
		constructor(e) {
			super();
			_defineProperty(this, "source", void 0);
			this.source = e;
		}
	};
	var StatusError = class extends Error {
		constructor(e, t) {
			super(t instanceof Error ? t.message : String(t), { cause: t });
			_defineProperty(this, "source", void 0);
			this.source = e;
		}
	};
	var NoOwnerError = class extends Error {
		constructor() {
			super("");
		}
	};
	var REACTIVE_NONE = 0;
	var REACTIVE_CHECK = 1;
	var REACTIVE_DIRTY = 2;
	var REACTIVE_RECOMPUTING_DEPS = 4;
	var REACTIVE_IN_HEAP = 8;
	var REACTIVE_IN_HEAP_HEIGHT = 16;
	var REACTIVE_ZOMBIE = 32;
	var REACTIVE_DISPOSED = 64;
	var REACTIVE_OPTIMISTIC_DIRTY = 128;
	var REACTIVE_SNAPSHOT_STALE = 256;
	var REACTIVE_LAZY = 512;
	var REACTIVE_MANUAL_WRITE = 1024;
	var CONFIG_OWNED_WRITE = 1;
	var CONFIG_NO_SNAPSHOT = 2;
	var CONFIG_TRANSPARENT = 4;
	var CONFIG_IN_SNAPSHOT_SCOPE = 8;
	var CONFIG_AUTO_DISPOSE = 32;
	var CONFIG_SYNC = 64;
	var STATUS_PENDING = 1;
	var STATUS_ERROR = 2;
	var STATUS_UNINITIALIZED = 4;
	var EFFECT_RENDER = 1;
	var EFFECT_USER = 2;
	var EFFECT_TRACKED = 3;
	var NOT_PENDING = {};
	var NO_SNAPSHOT = {};
	var SUPPORTS_PROXY = typeof Proxy === "function";
	var defaultContext = {};
	var $REFRESH = Symbol("refresh");
	function actualInsertIntoHeap(e, t) {
		const n = (e.i?.t ? e.i.u?.o : e.i?.o) ?? -1;
		if (n >= e.o) e.o = n + 1;
		const i = e.o;
		const r = t.l[i];
		if (r === void 0) t.l[i] = e;
		else {
			const t = r.S;
			t.T = e;
			e.S = t;
			r.S = e;
		}
		if (i > t._) t._ = i;
	}
	function insertIntoHeap(e, t) {
		let n = e.O;
		if (n & (REACTIVE_RECOMPUTING_DEPS | 1032)) return;
		if (n & REACTIVE_CHECK) e.O = n & -4 | 10;
		else e.O = n | REACTIVE_IN_HEAP;
		if (!(n & REACTIVE_IN_HEAP_HEIGHT)) actualInsertIntoHeap(e, t);
	}
	function insertIntoHeapHeight(e, t) {
		let n = e.O;
		if (n & 1052) return;
		e.O = n | REACTIVE_IN_HEAP_HEIGHT;
		actualInsertIntoHeap(e, t);
	}
	function deleteFromHeap(e, t) {
		const n = e.O;
		if (!(n & (REACTIVE_IN_HEAP | REACTIVE_IN_HEAP_HEIGHT))) return;
		e.O = n & -25;
		const i = e.o;
		if (e.S === e) t.l[i] = void 0;
		else {
			const n = e.T;
			const r = t.l[i];
			const o = n ?? r;
			if (e === r) t.l[i] = n;
			else e.S.T = n;
			o.S = e.S;
		}
		e.S = e;
		e.T = void 0;
	}
	function markHeap(e) {
		if (e.R) return;
		e.R = true;
		for (let t = 0; t <= e._; t++) for (let n = e.l[t]; n !== void 0; n = n.T) if (n.O & REACTIVE_IN_HEAP) markNode(n);
	}
	function markNode(e, t = REACTIVE_DIRTY) {
		const n = e.O;
		if ((n & (REACTIVE_CHECK | REACTIVE_DIRTY)) >= t) return;
		e.O = n & -4 | t;
		for (let t = e.I; t !== null; t = t.p) markNode(t.h, REACTIVE_CHECK);
		if (e.N !== null) for (let t = e.N; t !== null; t = t.A) for (let e = t.I; e !== null; e = e.p) markNode(e.h, REACTIVE_CHECK);
	}
	function runHeap(e, t) {
		e.R = false;
		for (e.C = 0; e.C <= e._; e.C++) {
			let n = e.l[e.C];
			while (n !== void 0) {
				if (n.O & REACTIVE_IN_HEAP) t(n);
				else adjustHeight(n, e);
				n = e.l[e.C];
			}
		}
		e._ = 0;
	}
	function adjustHeight(e, t) {
		deleteFromHeap(e, t);
		let n = e.o;
		for (let t = e.P; t; t = t.D) {
			const e = t.m;
			const i = e.V || e;
			if (i.L && i.o >= n) n = i.o + 1;
		}
		if (e.o !== n) {
			e.o = n;
			for (let n = e.I; n !== null; n = n.p) insertIntoHeapHeight(n.h, t);
		}
	}
	var signalLanes = /* @__PURE__ */ new WeakMap();
	var activeLanes = /* @__PURE__ */ new Set();
	function getOrCreateLane(e) {
		let t = signalLanes.get(e);
		if (t) return findLane(t);
		const n = e.U;
		const i = n?.G ? findLane(n.G) : null;
		t = {
			k: e,
			F: /* @__PURE__ */ new Set(),
			W: [[], []],
			H: null,
			M: activeTransition,
			j: i
		};
		signalLanes.set(e, t);
		activeLanes.add(t);
		e.$ = false;
		return t;
	}
	function findLane(e) {
		while (e.H) e = e.H;
		return e;
	}
	function mergeLanes(e, t) {
		e = findLane(e);
		t = findLane(t);
		if (e === t) return e;
		t.H = e;
		for (const n of t.F) e.F.add(n);
		e.W[0].push(...t.W[0]);
		e.W[1].push(...t.W[1]);
		return e;
	}
	function resolveLane(e) {
		const t = e.G;
		if (!t) return void 0;
		const n = findLane(t);
		if (activeLanes.has(n)) return n;
		e.G = void 0;
	}
	function resolveTransition(e) {
		return resolveLane(e)?.M ?? e.M;
	}
	function hasActiveOverride(e) {
		return !!(e.K !== void 0 && e.K !== NOT_PENDING);
	}
	function assignOrMergeLane(e, t) {
		const n = findLane(t);
		const i = e.G;
		if (i) {
			if (i.H) {
				e.G = t;
				return;
			}
			const r = findLane(i);
			if (activeLanes.has(r)) {
				if (r !== n && !hasActiveOverride(e)) if (n.j && findLane(n.j) === r) e.G = t;
				else if (r.j && findLane(r.j) === n);
				else mergeLanes(n, r);
				return;
			}
		}
		e.G = t;
	}
	var transitions = /* @__PURE__ */ new Set();
	var dirtyQueue = {
		l: new Array(2e3).fill(void 0),
		R: false,
		C: 0,
		_: 0
	};
	var zombieQueue = {
		l: new Array(2e3).fill(void 0),
		R: false,
		C: 0,
		_: 0
	};
	var clock = 0;
	var activeTransition = null;
	var scheduled = false;
	var syncDepth = 0;
	var projectionWriteActive = false;
	var stashedOptimisticReads = null;
	var transientStoreNodes = /* @__PURE__ */ new Set();
	function canUseSimpleSyncFlush(e) {
		return transitions.size === 0 && activeLanes.size === 0 && e.Y.length === 0 && e.Z.length === 0 && e.q.size === 0 && transientStoreNodes.size === 0;
	}
	function sweepTransientStoreNodes() {
		if (transientStoreNodes.size === 0) return;
		for (const e of transientStoreNodes) {
			if (e.I !== null) {
				transientStoreNodes.delete(e);
				continue;
			}
			if (e.B !== NOT_PENDING) continue;
			if (e.K !== void 0 && e.K !== NOT_PENDING) continue;
			transientStoreNodes.delete(e);
			e.X?.();
		}
	}
	function shouldReadStashedOptimisticValue(e) {
		return !!stashedOptimisticReads?.has(e);
	}
	function runLaneEffects(e) {
		for (const t of activeLanes) {
			if (t.H || t.F.size > 0) continue;
			const n = t.W[e - 1];
			if (n.length) {
				t.W[e - 1] = [];
				runQueue(n, e);
			}
		}
	}
	function queueStashedOptimisticEffects(e) {
		for (let t = e.I; t !== null; t = t.p) {
			const e = t.h;
			if (!e.J) continue;
			if (e.J === EFFECT_TRACKED) {
				if (!e.ee) {
					e.ee = true;
					e.te.enqueue(EFFECT_USER, e.ne);
				}
				continue;
			}
			const n = e.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue;
			if (n.C > e.o) n.C = e.o;
			insertIntoHeap(e, n);
		}
	}
	function mergeTransitionState(e, t) {
		t.ie = e;
		e.re.push(...t.re);
		for (const n of activeLanes) if (n.M === t) n.M = e;
		e.Z.push(...t.Z);
		for (const n of t.q) e.q.add(n);
		for (const [n, i] of t.oe) {
			let t = e.oe.get(n);
			if (!t) e.oe.set(n, t = /* @__PURE__ */ new Set());
			for (const e of i) t.add(e);
		}
		for (const n of t.se) e.se.add(n);
	}
	function resolveOptimisticNodes(e) {
		for (let t = 0; t < e.length; t++) {
			const n = e[t];
			n.G = void 0;
			if (n.B !== NOT_PENDING) {
				n.ue = n.B;
				n.B = NOT_PENDING;
			}
			const i = n.K;
			n.K = NOT_PENDING;
			if (i !== NOT_PENDING && n.ue !== i) insertSubs(n, true);
			n.M = null;
		}
		e.length = 0;
	}
	function cleanupCompletedLanes(e) {
		for (const t of activeLanes) {
			if (!(e ? t.M === e : !t.M)) continue;
			if (!t.H) {
				if (t.W[0].length) runQueue(t.W[0], EFFECT_RENDER);
				if (t.W[1].length) runQueue(t.W[1], EFFECT_USER);
			}
			if (t.k.G === t) t.k.G = void 0;
			t.F.clear();
			t.W[0].length = 0;
			t.W[1].length = 0;
			activeLanes.delete(t);
			signalLanes.delete(t.k);
		}
	}
	function schedule() {
		if (scheduled) return;
		scheduled = true;
		if (!syncDepth && !globalQueue.ce && !projectionWriteActive) queueMicrotask(flush);
	}
	var Queue = class {
		constructor() {
			_defineProperty(this, "i", null);
			_defineProperty(this, "le", [[], []]);
			_defineProperty(this, "Y", []);
			_defineProperty(this, "created", clock);
		}
		addChild(e) {
			this.Y.push(e);
			e.i = this;
		}
		removeChild(e) {
			const t = this.Y.indexOf(e);
			if (t >= 0) {
				this.Y.splice(t, 1);
				e.i = null;
			}
		}
		notify(e, t, n, i) {
			if (this.i) return this.i.notify(e, t, n, i);
			return false;
		}
		run(e) {
			if (this.le[e - 1].length) {
				const t = this.le[e - 1];
				this.le[e - 1] = [];
				runQueue(t, e);
			}
			for (let t = 0; t < this.Y.length; t++) this.Y[t].run?.(e);
		}
		enqueue(e, t) {
			if (e) if (currentOptimisticLane) findLane(currentOptimisticLane).W[e - 1].push(t);
			else this.le[e - 1].push(t);
			schedule();
		}
		stashQueues(e) {
			e.le[0].push(...this.le[0]);
			e.le[1].push(...this.le[1]);
			this.le = [[], []];
			for (let t = 0; t < this.Y.length; t++) {
				let n = this.Y[t];
				let i = e.Y[t];
				if (!i) {
					i = {
						le: [[], []],
						Y: []
					};
					e.Y[t] = i;
				}
				n.stashQueues(i);
			}
		}
		restoreQueues(e) {
			this.le[0].push(...e.le[0]);
			this.le[1].push(...e.le[1]);
			for (let t = 0; t < e.Y.length; t++) {
				const n = e.Y[t];
				let i = this.Y[t];
				if (i) i.restoreQueues(n);
			}
		}
	};
	var GlobalQueue = class GlobalQueue extends Queue {
		constructor(..._args) {
			super(..._args);
			_defineProperty(this, "ce", false);
			_defineProperty(this, "ae", null);
			_defineProperty(this, "fe", []);
			_defineProperty(this, "Z", []);
			_defineProperty(this, "q", /* @__PURE__ */ new Set());
		}
		flush() {
			if (this.ce) return;
			this.ce = true;
			try {
				runHeap(dirtyQueue, GlobalQueue.Ee);
				if (activeTransition) {
					if (!transitionComplete(activeTransition)) {
						const e = activeTransition;
						runHeap(zombieQueue, GlobalQueue.Ee);
						this.ae = null;
						this.fe = [];
						this.Z = [];
						this.q = /* @__PURE__ */ new Set();
						runLaneEffects(EFFECT_RENDER);
						runLaneEffects(EFFECT_USER);
						this.stashQueues(e._e);
						clock++;
						scheduled = dirtyQueue._ >= dirtyQueue.C;
						reassignPendingTransition(e.fe);
						activeTransition = null;
						if (!e.re.length && !e.oe.size && e.Z.length) {
							stashedOptimisticReads = /* @__PURE__ */ new Set();
							for (let t = 0; t < e.Z.length; t++) {
								const n = e.Z[t];
								if (n.L || n.Oe & CONFIG_OWNED_WRITE) continue;
								stashedOptimisticReads.add(n);
								queueStashedOptimisticEffects(n);
							}
						}
						try {
							finalizePureQueue(null, true);
						} finally {
							stashedOptimisticReads = null;
						}
						return;
					}
					this.fe !== activeTransition.fe && this.fe.push(...activeTransition.fe);
					this.restoreQueues(activeTransition._e);
					transitions.delete(activeTransition);
					const t = activeTransition;
					activeTransition = null;
					reassignPendingTransition(this.fe);
					finalizePureQueue(t);
				} else if (canUseSimpleSyncFlush(this)) {
					commitPendingNodes();
					if (dirtyQueue._ >= dirtyQueue.C) {
						runHeap(dirtyQueue, GlobalQueue.Ee);
						commitPendingNodes();
					}
				} else {
					if (transitions.size) runHeap(zombieQueue, GlobalQueue.Ee);
					finalizePureQueue();
				}
				clock++;
				scheduled = dirtyQueue._ >= dirtyQueue.C;
				activeLanes.size && runLaneEffects(EFFECT_RENDER);
				this.run(EFFECT_RENDER);
				activeLanes.size && runLaneEffects(EFFECT_USER);
				this.run(EFFECT_USER);
			} finally {
				this.ce = false;
			}
		}
		notify(e, t, n, i) {
			if (t & STATUS_PENDING) {
				if (n & STATUS_PENDING) {
					const t = i !== void 0 ? i : e.Re;
					if (activeTransition && t) {
						const n = t.source;
						let i = activeTransition.oe.get(n);
						if (!i) activeTransition.oe.set(n, i = /* @__PURE__ */ new Set());
						const r = i.size;
						i.add(e);
						if (i.size !== r) schedule();
					}
				}
				return true;
			}
			return false;
		}
		initTransition(e) {
			if (e) e = currentTransition(e);
			if (e && e === activeTransition) return;
			if (!e && activeTransition && activeTransition.Ie === clock) return;
			if (!activeTransition) activeTransition = e ?? {
				Ie: clock,
				fe: [],
				oe: /* @__PURE__ */ new Map(),
				Z: [],
				q: /* @__PURE__ */ new Set(),
				re: [],
				_e: {
					le: [[], []],
					Y: []
				},
				ie: false,
				se: /* @__PURE__ */ new Set()
			};
			else if (e) {
				const t = activeTransition;
				mergeTransitionState(e, t);
				transitions.delete(t);
				activeTransition = e;
			}
			transitions.add(activeTransition);
			activeTransition.Ie = clock;
			if (this.ae !== null) {
				this.ae.M = activeTransition;
				activeTransition.fe.push(this.ae);
				this.ae = null;
			}
			if (this.fe !== activeTransition.fe) {
				for (let e = 0; e < this.fe.length; e++) {
					const t = this.fe[e];
					t.M = activeTransition;
					activeTransition.fe.push(t);
				}
				this.fe = activeTransition.fe;
			}
			if (this.Z !== activeTransition.Z) {
				for (let e = 0; e < this.Z.length; e++) {
					const t = this.Z[e];
					t.M = activeTransition;
					activeTransition.Z.push(t);
				}
				this.Z = activeTransition.Z;
			}
			for (const e of activeLanes) if (!e.M) e.M = activeTransition;
			if (this.q !== activeTransition.q) {
				for (const e of this.q) activeTransition.q.add(e);
				this.q = activeTransition.q;
			}
		}
	};
	_defineProperty(GlobalQueue, "Ee", void 0);
	_defineProperty(GlobalQueue, "Se", void 0);
	_defineProperty(GlobalQueue, "Te", void 0);
	_defineProperty(GlobalQueue, "de", null);
	function queuePendingNode(e) {
		if (activeTransition) {
			globalQueue.fe.push(e);
			return;
		}
		if (globalQueue.ae === null && globalQueue.fe.length === 0) {
			globalQueue.ae = e;
			return;
		}
		if (globalQueue.ae !== null) {
			globalQueue.fe.push(globalQueue.ae);
			globalQueue.ae = null;
		}
		globalQueue.fe.push(e);
	}
	function insertSubs(e, t = false) {
		const n = e.G || currentOptimisticLane;
		const i = e.pe !== void 0;
		for (let r = e.I; r !== null; r = r.p) {
			if (i && r.h.Oe & CONFIG_IN_SNAPSHOT_SCOPE) {
				r.h.O |= REACTIVE_SNAPSHOT_STALE;
				continue;
			}
			if (t && n) {
				r.h.O |= REACTIVE_OPTIMISTIC_DIRTY;
				assignOrMergeLane(r.h, n);
			} else if (t) {
				r.h.O |= REACTIVE_OPTIMISTIC_DIRTY;
				r.h.G = void 0;
			}
			const e = r.h;
			if (e.J === EFFECT_TRACKED) {
				if (!e.ee) {
					e.ee = true;
					e.te.enqueue(EFFECT_USER, e.ne);
				}
				continue;
			}
			const o = r.h.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue;
			if (o.C > r.h.o) o.C = r.h.o;
			insertIntoHeap(r.h, o);
		}
	}
	function commitPendingNode(e) {
		const t = e;
		if (!t.L) {
			if (e.B !== NOT_PENDING) {
				e.ue = e.B;
				e.B = NOT_PENDING;
			}
			return;
		}
		if (e.B !== NOT_PENDING) {
			e.ue = e.B;
			e.B = NOT_PENDING;
			if (e.J && e.J !== EFFECT_TRACKED) e.ee = true;
		}
		t.O &= ~REACTIVE_MANUAL_WRITE;
		if (!(t.he & STATUS_PENDING)) t.he &= ~STATUS_UNINITIALIZED;
		if (t.Ne !== null || t.Ae !== null) GlobalQueue.Se(t, false, true);
	}
	function commitPendingNodes() {
		if (globalQueue.ae !== null) {
			commitPendingNode(globalQueue.ae);
			globalQueue.ae = null;
		}
		const e = globalQueue.fe;
		for (let t = 0; t < e.length; t++) commitPendingNode(e[t]);
		e.length = 0;
	}
	function finalizePureQueue(e = null, t = false) {
		const n = !t;
		if (n) commitPendingNodes();
		if (!t && globalQueue.Y.length) checkBoundaryChildren(globalQueue);
		const i = dirtyQueue._ >= dirtyQueue.C;
		if (i) runHeap(dirtyQueue, GlobalQueue.Ee);
		if (n) {
			if (i) commitPendingNodes();
			resolveOptimisticNodes(e ? e.Z : globalQueue.Z);
			if (e && e.se.size) {
				for (const t of e.se) {
					if (t.O & REACTIVE_DISPOSED) continue;
					if (t.J === EFFECT_TRACKED) {
						if (!t.ee) {
							t.ee = true;
							t.te.enqueue(EFFECT_USER, t.ne);
						}
						continue;
					}
					const e = t.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue;
					if (e.C > t.o) e.C = t.o;
					insertIntoHeap(t, e);
				}
				e.se.clear();
			}
			const t = e ? e.q : globalQueue.q;
			if (GlobalQueue.de && t.size) {
				for (const e of t) GlobalQueue.de(e);
				t.clear();
				schedule();
			}
			sweepTransientStoreNodes();
			cleanupCompletedLanes(e);
		}
	}
	function checkBoundaryChildren(e) {
		for (const t of e.Y) {
			t.checkSources?.();
			checkBoundaryChildren(t);
		}
	}
	function reassignPendingTransition(e) {
		for (let t = 0; t < e.length; t++) e[t].M = activeTransition;
	}
	var globalQueue = new GlobalQueue();
	function flush(e) {
		if (e) {
			syncDepth++;
			try {
				return e();
			} finally {
				flush();
				syncDepth--;
			}
		}
		if (globalQueue.ce) return;
		while (scheduled || activeTransition) globalQueue.flush();
	}
	function runQueue(e, t) {
		for (let n = 0; n < e.length; n++) e[n](t);
	}
	function reporterBlocksSource(e, t) {
		if (e.O & (REACTIVE_ZOMBIE | REACTIVE_DISPOSED)) return false;
		if (e.Ce === t || e.Pe?.has(t)) return true;
		for (let n = e.P; n; n = n.D) {
			let e = n.m;
			while (e) {
				if (e === t || e.V === t) return true;
				e = e.U;
			}
		}
		return !!(e.he & STATUS_PENDING && e.Re instanceof NotReadyError && e.Re.source === t);
	}
	function transitionComplete(e) {
		if (e.ie) return true;
		if (e.re.length) return false;
		let t = true;
		for (const [n, i] of e.oe) {
			let r = false;
			for (const e of i) {
				if (reporterBlocksSource(e, n)) {
					r = true;
					break;
				}
				i.delete(e);
			}
			if (!r) e.oe.delete(n);
			else if (n.he & STATUS_PENDING && n.Re?.source === n) {
				t = false;
				break;
			}
		}
		if (t) for (let n = 0; n < e.Z.length; n++) {
			const i = e.Z[n];
			if (hasActiveOverride(i) && "he" in i && i.he & STATUS_PENDING && i.Re instanceof NotReadyError && i.Re.source !== i) {
				t = false;
				break;
			}
		}
		t && (e.ie = true);
		return t;
	}
	function currentTransition(e) {
		while (e.ie && typeof e.ie === "object") e = e.ie;
		return e;
	}
	function runInTransition(e, t) {
		const n = activeTransition;
		try {
			activeTransition = currentTransition(e);
			return t();
		} finally {
			activeTransition = n;
		}
	}
	function markDisposal(e) {
		let t = e.ge;
		while (t) {
			t.O |= REACTIVE_ZOMBIE;
			if (t.O & REACTIVE_IN_HEAP) {
				deleteFromHeap(t, dirtyQueue);
				insertIntoHeap(t, zombieQueue);
			}
			markDisposal(t);
			t = t.De;
		}
	}
	function disposeChildren(e, t = false, n) {
		const i = e.O;
		if (i & REACTIVE_DISPOSED) return;
		if (t) e.O = i | REACTIVE_DISPOSED;
		if (t && e.L) e.ve = null;
		let r = n ? e.Ne : e.ge;
		while (r) {
			const e = r.De;
			if (r.P) {
				const e = r;
				deleteFromHeap(e, e.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue);
				let t = e.P;
				do
					t = unlinkSubs(t);
				while (t !== null);
				e.P = null;
				e.ye = null;
			}
			disposeChildren(r, true);
			r = e;
		}
		if (n) e.Ne = null;
		else {
			e.ge = null;
			e.me = 0;
		}
		if (t && !n && !(i & REACTIVE_ZOMBIE) && e.i !== null && !(e.i.O & REACTIVE_DISPOSED)) {
			const t = e.we;
			const n = e.De;
			if (t !== null) t.De = n;
			else e.i.ge = n;
			if (n !== null) n.we = t;
			e.we = null;
		}
		runDisposal(e, n);
	}
	function runDisposal(e, t) {
		let n = t ? e.Ae : e.be;
		if (!n) return;
		if (Array.isArray(n)) for (let e = 0; e < n.length; e++) {
			const t = n[e];
			t.call(t);
		}
		else n.call(n);
		t ? e.Ae = null : e.be = null;
	}
	function childId(e, t) {
		let n = e;
		while (n.Oe & CONFIG_TRANSPARENT && n.i) n = n.i;
		if (n.id != null) return formatId(n.id, t ? n.me++ : n.me);
		throw new Error("Cannot get child id from owner without an id");
	}
	function getNextChildId(e) {
		return childId(e, true);
	}
	function formatId(e, t) {
		const n = t.toString(36), i = n.length - 1;
		return e + (i ? String.fromCharCode(64 + i) : "") + n;
	}
	function getOwner() {
		return context;
	}
	function cleanup(e) {
		if (!context) return e;
		if (!context.be) context.be = e;
		else if (Array.isArray(context.be)) context.be.push(e);
		else context.be = [context.be, e];
		return e;
	}
	function disposeRootSelf(e = true) {
		disposeChildren(this, e);
	}
	function createOwner(e) {
		const t = context;
		const n = e?.transparent ?? false;
		const i = {
			id: e?.id ?? (n ? t?.id : t?.id != null ? getNextChildId(t) : void 0),
			Oe: n ? CONFIG_TRANSPARENT : 0,
			t: true,
			u: t?.t ? t.u : t,
			ge: null,
			De: null,
			we: null,
			be: null,
			te: t?.te ?? globalQueue,
			Ve: t?.Ve || defaultContext,
			me: 0,
			Ae: null,
			Ne: null,
			i: t,
			dispose: disposeRootSelf
		};
		if (t) {
			const e = t.ge;
			if (e === null) t.ge = i;
			else {
				i.De = e;
				e.we = i;
				t.ge = i;
			}
		}
		return i;
	}
	function createRoot(e, t) {
		const n = createOwner(t);
		return runWithOwner(n, () => e(() => n.dispose()));
	}
	function unlinkSubs(e) {
		const t = e.m;
		const n = e.D;
		const i = e.p;
		const r = e.Le;
		if (i !== null) i.Le = r;
		else t.Ue = r;
		if (r !== null) r.p = i;
		else {
			t.I = i;
			if (i === null) {
				t.X?.();
				const e = t;
				e.L && e.Oe & CONFIG_AUTO_DISPOSE && !(e.O & REACTIVE_ZOMBIE) && unobserved(e);
			}
		}
		return n;
	}
	function trimStaleDeps(e) {
		const t = e.ye;
		let n = t !== null ? t.D : e.P;
		if (n !== null) {
			do
				n = unlinkSubs(n);
			while (n !== null);
			if (t !== null) t.D = null;
			else e.P = null;
		}
	}
	function unobserved(e) {
		deleteFromHeap(e, e.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue);
		let t = e.P;
		while (t !== null) t = unlinkSubs(t);
		e.P = null;
		e.ye = null;
		disposeChildren(e, true);
	}
	function link(e, t) {
		const n = t.ye;
		if (n !== null && n.m === e) return;
		let i = null;
		const r = t.O & REACTIVE_RECOMPUTING_DEPS;
		if (r) {
			i = n !== null ? n.D : t.P;
			if (i !== null && i.m === e) {
				t.ye = i;
				return;
			}
		}
		const o = e.Ue;
		if (o !== null && o.h === t && (!r || isValidLink(o, t))) return;
		const s = t.ye = e.Ue = {
			m: e,
			h: t,
			D: i,
			Le: o,
			p: null
		};
		if (n !== null) n.D = s;
		else t.P = s;
		if (o !== null) o.p = s;
		else e.I = s;
	}
	function isValidLink(e, t) {
		const n = t.ye;
		if (n !== null) {
			let i = t.P;
			do {
				if (i === e) return true;
				if (i === n) break;
				i = i.D;
			} while (i !== null);
		}
		return false;
	}
	function addPendingSource(e, t) {
		if (e.Ce === t || e.Pe?.has(t)) return false;
		if (!e.Ce) {
			e.Ce = t;
			return true;
		}
		if (!e.Pe) e.Pe = new Set([e.Ce, t]);
		else e.Pe.add(t);
		e.Ce = void 0;
		return true;
	}
	function removePendingSource(e, t) {
		if (e.Ce) {
			if (e.Ce !== t) return false;
			e.Ce = void 0;
			return true;
		}
		if (!e.Pe?.delete(t)) return false;
		if (e.Pe.size === 1) {
			e.Ce = e.Pe.values().next().value;
			e.Pe = void 0;
		} else if (e.Pe.size === 0) e.Pe = void 0;
		return true;
	}
	function clearPendingSources(e) {
		e.Ce = void 0;
		e.Pe?.clear();
		e.Pe = void 0;
	}
	function setPendingError(e, t, n) {
		if (!t) {
			e.Re = null;
			return;
		}
		if (n instanceof NotReadyError && n.source === t) {
			e.Re = n;
			return;
		}
		const i = e.Re;
		if (!(i instanceof NotReadyError) || i.source !== t) e.Re = new NotReadyError(t);
	}
	function forEachDependent(e, t) {
		for (let n = e.I; n !== null; n = n.p) t(n.h);
		for (let n = e.N; n !== null; n = n.A) for (let e = n.I; e !== null; e = e.p) t(e.h);
	}
	function settlePendingSource(e) {
		let t = false;
		const n = /* @__PURE__ */ new Set();
		const settle = (i) => {
			if (n.has(i) || !removePendingSource(i, e)) return;
			n.add(i);
			i.Ie = clock;
			const r = i.Ce ?? i.Pe?.values().next().value;
			if (r) {
				setPendingError(i, r);
				updatePendingSignal(i);
			} else {
				i.he &= ~STATUS_PENDING;
				setPendingError(i);
				updatePendingSignal(i);
				if (i.Ge) {
					if (i.J === EFFECT_TRACKED) {
						const e = i;
						if (!e.ee) {
							e.ee = true;
							e.te.enqueue(EFFECT_USER, e.ne);
						}
					} else {
						const e = i.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue;
						if (e.C > i.o) e.C = i.o;
						insertIntoHeap(i, e);
					}
					t = true;
				}
				i.Ge = false;
			}
			forEachDependent(i, settle);
		};
		forEachDependent(e, settle);
		if (t) schedule();
	}
	function handleAsync(e, t, n) {
		let i = false;
		let r = false;
		if (typeof t === "object" && t !== null) untrack(() => {
			i = t[Symbol.asyncIterator];
			r = !i && typeof t.then === "function";
		});
		if (!r && !i) {
			e.ve = null;
			return t;
		}
		e.ve = t;
		let o;
		const handleError = (n) => {
			if (e.ve !== t) return;
			globalQueue.initTransition(resolveTransition(e));
			notifyStatus(e, n instanceof NotReadyError ? STATUS_PENDING : STATUS_ERROR, n);
			e.Ie = clock;
		};
		const asyncWrite = (i, r) => {
			if (e.ve !== t) return;
			if (e.O & (REACTIVE_DIRTY | REACTIVE_OPTIMISTIC_DIRTY)) return;
			globalQueue.initTransition(resolveTransition(e));
			const o = !!(e.he & STATUS_UNINITIALIZED);
			trimStaleDeps(e);
			clearStatus(e);
			const s = resolveLane(e);
			if (s) s.F.delete(e);
			if (n) n(i);
			else if (e.K !== void 0) {
				if (e.K !== void 0 && e.K !== NOT_PENDING) e.B = i;
				else {
					e.ue = i;
					insertSubs(e);
				}
				e.Ie = clock;
			} else if (s) {
				const t = e.J;
				const n = e.ue;
				const r = e.ke;
				if (!t && o || !r || !r(i, n)) {
					e.ue = i;
					e.Ie = clock;
					if (e.Fe) setSignal(e.Fe, i);
					insertSubs(e, true);
				}
			} else setSignal(e, () => i);
			settlePendingSource(e);
			schedule();
			flush();
			r?.();
		};
		if (r) {
			let n = false, i = true;
			t.then((e) => {
				if (i) {
					o = e;
					n = true;
				} else asyncWrite(e);
			}, (e) => {
				if (!i) handleError(e);
			});
			i = false;
			if (!n) {
				globalQueue.initTransition(resolveTransition(e));
				throw new NotReadyError(context);
			}
		}
		if (i) {
			const n = t[Symbol.asyncIterator]();
			let i = false;
			let r = false;
			cleanup(() => {
				if (r) return;
				r = true;
				try {
					const e = n.return?.();
					if (e && typeof e.then === "function") e.then(void 0, () => {});
				} catch {}
			});
			const iterate = () => {
				let s, u = false, c = true;
				n.next().then((n) => {
					if (c) {
						s = n;
						u = true;
						if (n.done) r = true;
					} else if (e.ve !== t) return;
					else if (!n.done) asyncWrite(n.value, iterate);
					else {
						r = true;
						schedule();
						flush();
					}
				}, (n) => {
					if (!c && e.ve === t) {
						r = true;
						handleError(n);
					}
				});
				c = false;
				if (u && !s.done) {
					o = s.value;
					i = true;
					return iterate();
				}
				return u && s.done;
			};
			const s = iterate();
			if (!i && !s) {
				globalQueue.initTransition(resolveTransition(e));
				throw new NotReadyError(context);
			}
		}
		return o;
	}
	function clearStatus(e, t = false) {
		if (e.Ce || e.Pe) clearPendingSources(e);
		if (e.Ge) e.Ge = false;
		e.he = t ? 0 : e.he & STATUS_UNINITIALIZED;
		if (e.Re) setPendingError(e);
		if (e.We) updatePendingSignal(e);
		if (e.xe) e.xe();
	}
	function notifyStatus(e, t, n, i, r) {
		if (t === STATUS_ERROR && !(n instanceof StatusError) && !(n instanceof NotReadyError)) n = new StatusError(e, n);
		const o = t === STATUS_PENDING && n instanceof NotReadyError ? n.source : void 0;
		const s = o === e;
		const u = t === STATUS_PENDING && e.K !== void 0 && !s;
		const c = u && hasActiveOverride(e);
		if (!i) {
			if (t === STATUS_PENDING && o) {
				addPendingSource(e, o);
				e.he = STATUS_PENDING | e.he & STATUS_UNINITIALIZED;
				setPendingError(e, o, n);
			} else {
				clearPendingSources(e);
				e.he = t | (t !== STATUS_ERROR ? e.he & STATUS_UNINITIALIZED : 0);
				e.Re = n;
			}
			updatePendingSignal(e);
		}
		if (r && !i) assignOrMergeLane(e, r);
		const l = i || c;
		const a = i || u ? void 0 : r;
		if (e.xe) {
			if (i && t === STATUS_PENDING) return;
			if (l) e.xe(t, n);
			else e.xe();
			return;
		}
		forEachDependent(e, (e) => {
			e.Ie = clock;
			if (t === STATUS_PENDING && o && e.Ce !== o && !e.Pe?.has(o) || t !== STATUS_PENDING && (e.Re !== n || e.Ce || e.Pe)) {
				if (!l && !e.M) queuePendingNode(e);
				notifyStatus(e, t, n, l, a);
			}
		});
	}
	var externalSourceConfig = null;
	GlobalQueue.Ee = recompute;
	GlobalQueue.Se = disposeChildren;
	var tracking = false;
	var stale = false;
	var pendingCheckActive = false;
	var latestReadActive = false;
	var context = null;
	var currentOptimisticLane = null;
	var pendingCheckSources = null;
	var snapshotCaptureActive = false;
	var snapshotSources = null;
	function ownerInSnapshotScope(e) {
		while (e) {
			if (e.He) return true;
			e = e.i;
		}
		return false;
	}
	function recompute(e, t = false) {
		const n = e.J;
		if (!t) {
			if (e.M && (!n || activeTransition) && activeTransition !== e.M) globalQueue.initTransition(e.M);
			deleteFromHeap(e, e.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue);
			e.ve = null;
			if (e.M || n === EFFECT_TRACKED) disposeChildren(e);
			else if (e.ge !== null || e.be !== null) {
				markDisposal(e);
				e.Ae = e.be;
				e.Ne = e.ge;
				e.be = null;
				e.ge = null;
				e.me = 0;
			}
		}
		let i = !!(e.O & REACTIVE_OPTIMISTIC_DIRTY);
		const r = e.K !== void 0 && e.K !== NOT_PENDING;
		const o = !!(e.he & STATUS_PENDING);
		const s = !!(e.he & STATUS_UNINITIALIZED);
		const u = context;
		context = e;
		e.ye = null;
		e.O = REACTIVE_RECOMPUTING_DEPS;
		e.Ie = clock;
		let c = e.B === NOT_PENDING ? e.ue : e.B;
		let l = e.o;
		let a = tracking;
		let f = currentOptimisticLane;
		tracking = true;
		if (i) {
			const t = resolveLane(e);
			if (t) currentOptimisticLane = t;
		} else if (activeTransition && !t && activeTransition.Z.length) for (let t = e.P; t; t = t.D) {
			const n = t.m;
			if (n.O & REACTIVE_OPTIMISTIC_DIRTY) {
				const t = resolveLane(n);
				if (t) {
					i = true;
					currentOptimisticLane = t;
					e.O |= REACTIVE_OPTIMISTIC_DIRTY;
					assignOrMergeLane(e, t);
					break;
				}
			}
		}
		const E = n && n !== EFFECT_USER;
		const S = stale;
		if (E) stale = true;
		try {
			if (e.Oe & CONFIG_SYNC) {
				c = e.L(c);
				e.ve = null;
			} else {
				const t = e.ve;
				const n = e.L(c);
				const i = typeof n === "object" && n !== null;
				const r = e.ve !== t;
				c = r || !i ? n : handleAsync(e, n);
				if (!r && !i) e.ve = null;
			}
			clearStatus(e, t);
			if (e.G) {
				const t = resolveLane(e);
				if (t) {
					t.F.delete(e);
					updatePendingSignal(t.k);
				}
			}
		} catch (t) {
			if (t instanceof NotReadyError && currentOptimisticLane) {
				const t = findLane(currentOptimisticLane);
				if (t.k !== e) {
					t.F.add(e);
					e.G = t;
					updatePendingSignal(t.k);
				}
			}
			if (t instanceof NotReadyError) e.Ge = true;
			notifyStatus(e, t instanceof NotReadyError ? STATUS_PENDING : STATUS_ERROR, t, void 0, t instanceof NotReadyError ? e.G : void 0);
		} finally {
			tracking = a;
			if (E) stale = S;
			e.O = REACTIVE_NONE | (t ? e.O & REACTIVE_SNAPSHOT_STALE : 0);
			context = u;
		}
		if (!e.Re) {
			trimStaleDeps(e);
			const u = r ? e.K : e.B === NOT_PENDING ? e.ue : e.B;
			const a = !n && s || !e.ke || !e.ke(u, c);
			if (n && a) {
				e.ee = !e.Re;
				if (!t) e.te.enqueue(n, GlobalQueue.Te.bind(null, e));
			}
			if (a) {
				const s = r ? e.K : void 0;
				if (t || n && activeTransition !== e.M || i) {
					e.ue = c;
					if (r && i) {
						e.K = c;
						e.B = c;
					}
				} else e.B = c;
				if (r && !i && o && !e.$) e.K = c;
				if (!r || i || e.K !== s) insertSubs(e, i || r);
			} else if (r) e.B = c;
			else if (e.o != l) for (let t = e.I; t !== null; t = t.p) insertIntoHeapHeight(t.h, t.h.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue);
		}
		currentOptimisticLane = f;
		(e.B !== NOT_PENDING || e.Ne !== null || e.Ae !== null || e.he & (STATUS_PENDING | STATUS_UNINITIALIZED)) && (!t || e.he & STATUS_PENDING) && !e.M && !(activeTransition && r) && queuePendingNode(e);
		e.M && n && activeTransition !== e.M && runInTransition(e.M, () => recompute(e));
	}
	function updateIfNecessary(e) {
		if (e.O & REACTIVE_CHECK) for (let t = e.P; t; t = t.D) {
			const n = t.m;
			const i = n.V || n;
			if (i.L) updateIfNecessary(i);
			if (e.O & REACTIVE_DIRTY) break;
		}
		if (e.O & (REACTIVE_DIRTY | REACTIVE_OPTIMISTIC_DIRTY) || e.Re && e.Ie < clock && !e.ve) recompute(e);
		e.O = e.O & (REACTIVE_IN_HEAP | 272);
	}
	function computed(e, t) {
		const n = t?.transparent ?? false;
		const i = {
			id: t?.id ?? (n ? context?.id : context?.id != null ? getNextChildId(context) : void 0),
			Oe: (n ? CONFIG_TRANSPARENT : 0) | (t?.ownedWrite ? CONFIG_OWNED_WRITE : 0) | (!context || t?.lazy ? CONFIG_AUTO_DISPOSE : 0) | (t?.sync ? CONFIG_SYNC : 0) | (snapshotCaptureActive && ownerInSnapshotScope(context) ? CONFIG_IN_SNAPSHOT_SCOPE : 0),
			ke: t?.equals != null ? t.equals : isEqual,
			X: t?.unobserved,
			be: null,
			te: context?.te ?? globalQueue,
			Ve: context?.Ve ?? defaultContext,
			me: 0,
			L: e,
			ue: void 0,
			o: 0,
			N: null,
			T: void 0,
			S: null,
			P: null,
			ye: null,
			I: null,
			Ue: null,
			i: context,
			De: null,
			we: null,
			ge: null,
			O: t?.lazy ? REACTIVE_LAZY : REACTIVE_NONE,
			he: STATUS_UNINITIALIZED,
			Ie: clock,
			B: NOT_PENDING,
			Ae: null,
			Ne: null,
			ve: null,
			M: null
		};
		setupComputedNode(i, t);
		return i;
	}
	function createEffectNode(e, t, n, i, r, o) {
		const s = o?.transparent ?? false;
		const u = {
			id: o?.id ?? (s ? context?.id : context?.id != null ? getNextChildId(context) : void 0),
			Oe: (s ? CONFIG_TRANSPARENT : 0) | (o?.ownedWrite ? CONFIG_OWNED_WRITE : 0) | (o?.sync ? CONFIG_SYNC : 0) | (snapshotCaptureActive && ownerInSnapshotScope(context) ? CONFIG_IN_SNAPSHOT_SCOPE : 0),
			ke: false,
			X: o?.unobserved,
			be: null,
			te: context?.te ?? globalQueue,
			Ve: context?.Ve ?? defaultContext,
			me: 0,
			L: e,
			ue: void 0,
			o: 0,
			N: null,
			T: void 0,
			S: null,
			P: null,
			ye: null,
			I: null,
			Ue: null,
			i: context,
			De: null,
			we: null,
			ge: null,
			O: REACTIVE_LAZY,
			he: STATUS_UNINITIALIZED,
			Ie: clock,
			B: NOT_PENDING,
			Ae: null,
			Ne: null,
			ve: null,
			M: null,
			ee: false,
			Me: void 0,
			Qe: t,
			je: n,
			$e: void 0,
			Ke: false,
			J: i,
			xe: r
		};
		setupComputedNode(u, lazyOptions);
		return u;
	}
	var lazyOptions = { lazy: true };
	function setupComputedNode(e, t) {
		e.S = e;
		const n = context?.t ? context.u : context;
		if (context) {
			const t = context.ge;
			if (t === null) context.ge = e;
			else {
				e.De = t;
				t.we = e;
				context.ge = e;
			}
		}
		if (n) e.o = n.o + 1;
		if (externalSourceConfig) {
			const t = signal(void 0, {
				equals: false,
				ownedWrite: true
			});
			const n = externalSourceConfig.factory(e.L, () => {
				setSignal(t, void 0);
			});
			cleanup(() => n.dispose());
			e.L = (e) => {
				read(t);
				return n.track(e);
			};
		}
		!t?.lazy && recompute(e, true);
		if (snapshotCaptureActive && !t?.lazy) {
			if (!(e.he & STATUS_PENDING)) {
				e.pe = e.ue === void 0 ? NO_SNAPSHOT : e.ue;
				snapshotSources.add(e);
			}
		}
	}
	function signal(e, t, n = null) {
		const i = {
			ke: t?.equals != null ? t.equals : isEqual,
			Oe: (t?.ownedWrite ? CONFIG_OWNED_WRITE : 0) | (t?.Ye ? CONFIG_NO_SNAPSHOT : 0),
			X: t?.unobserved,
			ue: e,
			I: null,
			Ue: null,
			Ie: clock,
			V: n,
			A: n?.N || null,
			B: NOT_PENDING
		};
		n && (n.N = i);
		if (snapshotCaptureActive && !(i.Oe & CONFIG_NO_SNAPSHOT) && !((n?.he ?? 0) & STATUS_PENDING)) {
			i.pe = e === void 0 ? NO_SNAPSHOT : e;
			snapshotSources.add(i);
		}
		return i;
	}
	function optimisticComputed(e, t) {
		const n = computed(e, t);
		n.K = NOT_PENDING;
		return n;
	}
	function isEqual(e, t) {
		return e === t;
	}
	function untrack(e, t) {
		if (!externalSourceConfig && !tracking && true) return e();
		const n = tracking;
		tracking = false;
		try {
			if (externalSourceConfig) return externalSourceConfig.untrack(e);
			return e();
		} finally {
			tracking = n;
		}
	}
	function read(e) {
		if (latestReadActive) {
			const t = getLatestValueComputed(e);
			const n = latestReadActive;
			latestReadActive = false;
			const i = e.K !== void 0 && e.K !== NOT_PENDING ? e.K : e.ue;
			let r;
			try {
				r = read(t);
			} catch (e) {
				if (!context && e instanceof NotReadyError) return i;
				throw e;
			} finally {
				latestReadActive = n;
			}
			if (t.he & STATUS_PENDING) return i;
			if (stale && currentOptimisticLane && t.G) {
				const e = findLane(t.G);
				if (e !== findLane(currentOptimisticLane) && e.F.size > 0) return i;
			}
			return r;
		}
		if (pendingCheckActive) {
			const t = e.V;
			const n = pendingCheckActive;
			pendingCheckActive = false;
			let i = context;
			if (i?.t) i = i.u;
			const r = t || e;
			if (typeof e.L === "function") {
				const t = e;
				if (t.O & REACTIVE_LAZY) {
					t.O &= ~REACTIVE_LAZY;
					recompute(t, true);
				} else if (t.O & REACTIVE_DISPOSED) recompute(t, true);
				else updateIfNecessary(t);
			}
			if (i && r.he & STATUS_PENDING && r.he & STATUS_UNINITIALIZED) {
				if (tracking && e !== i) link(e, i);
				pendingCheckActive = n;
				throw r.Re;
			}
			if (t && e.K !== void 0) {
				if (e.K !== NOT_PENDING && (t.ve || !!(t.he & STATUS_PENDING)));
				collectPendingSources(e);
				collectPendingSources(t);
				if (i && tracking) link(e, i);
			} else {
				collectPendingSources(e);
				if (t) collectPendingSources(t);
			}
			pendingCheckActive = n;
		}
		let t = context;
		if (t?.t) t = t.u;
		const n = e;
		if (typeof n.L === "function") {
			const t = e;
			if (t.O & REACTIVE_LAZY) {
				t.O &= ~REACTIVE_LAZY;
				recompute(t, true);
			} else if (t.O & REACTIVE_DISPOSED) recompute(t, true);
		}
		const i = e.V || e;
		if (!n.L && i === e && e.K === void 0 && e.pe === void 0 && activeTransition === null && currentOptimisticLane === null && !snapshotCaptureActive && true) {
			if (t && tracking) link(e, t);
			return !t || e.B === NOT_PENDING ? e.ue : e.B;
		}
		if (t && tracking) {
			link(e, t);
			if (i.L) {
				const n = e.O & REACTIVE_ZOMBIE;
				if (i.o >= (n ? zombieQueue.C : dirtyQueue.C)) {
					markNode(t);
					markHeap(n ? zombieQueue : dirtyQueue);
					updateIfNecessary(i);
				}
				const r = i.o;
				if (r >= t.o && e.i !== t) t.o = r + 1;
			}
		}
		if (i.he & STATUS_PENDING) {
			if (t && !(stale && i.M && activeTransition !== i.M)) if (currentOptimisticLane) {
				const n = i.G;
				const r = findLane(currentOptimisticLane);
				if (n && findLane(n) === r && !hasActiveOverride(i)) {
					if (!tracking && e !== t) link(e, t);
					throw i.Re;
				}
			} else {
				if (!tracking && e !== t) link(e, t);
				throw i.Re;
			}
			else if (t && i !== e && i.he & STATUS_UNINITIALIZED) {
				if (!tracking && e !== t) link(e, t);
				throw i.Re;
			} else if (!t && i.he & STATUS_UNINITIALIZED) throw i.Re;
		}
		if (e.L && e.he & STATUS_ERROR) if (e.Ie < clock) {
			recompute(e);
			return read(e);
		} else throw e.Re;
		if (snapshotCaptureActive && t && t.Oe & CONFIG_IN_SNAPSHOT_SCOPE) {
			const n = e.pe;
			if (n !== void 0) {
				const i = n === NO_SNAPSHOT ? void 0 : n;
				if ((e.B !== NOT_PENDING ? e.B : e.ue) !== i) t.O |= REACTIVE_SNAPSHOT_STALE;
				return i;
			}
		}
		if (e.K !== void 0 && e.K !== NOT_PENDING) {
			if (t && stale && shouldReadStashedOptimisticValue(e)) return e.ue;
			return e.K;
		}
		if (activeTransition !== null && currentOptimisticLane !== null && !latestReadActive && e.B !== NOT_PENDING && i === e && !e.L && t) {
			activeTransition.se.add(t);
			return e.ue;
		}
		const r = !t || currentOptimisticLane !== null && (e.K !== void 0 || e.G || i === e && stale || !!(i.he & STATUS_PENDING)) || e.B === NOT_PENDING || stale && e.M && activeTransition !== e.M ? e.ue : e.B;
		if (!t && i === e && typeof n.L === "function" && e.Oe & CONFIG_AUTO_DISPOSE && !(i.he & STATUS_PENDING) && !e.I) unobserved(e);
		return r;
	}
	function setSignal(e, t) {
		if (e.M && activeTransition !== e.M) globalQueue.initTransition(e.M);
		const n = e.K !== void 0 && !projectionWriteActive;
		const i = e.K !== void 0 && e.K !== NOT_PENDING;
		const r = n ? i ? e.K : e.ue : e.B === NOT_PENDING ? e.ue : e.B;
		if (typeof t === "function") t = t(r);
		if (!(!e.ke || !e.ke(r, t) || !!(e.he & STATUS_UNINITIALIZED))) {
			if (n && i && e.L) {
				insertSubs(e, true);
				schedule();
			}
			return t;
		}
		if (n) {
			const n = e.K === NOT_PENDING;
			if (!n) globalQueue.initTransition(resolveTransition(e));
			if (n) {
				e.B = e.ue;
				globalQueue.Z.push(e);
			}
			e.$ = true;
			e.G = getOrCreateLane(e);
			e.K = t;
		} else {
			if (e.B === NOT_PENDING) queuePendingNode(e);
			e.B = t;
		}
		if (e.We) updatePendingSignal(e);
		if (e.Fe) setSignal(e.Fe, t);
		e.Ie = clock;
		insertSubs(e, n);
		schedule();
		return t;
	}
	function suppressComputedRecompute(e) {
		deleteFromHeap(e, e.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue);
		if (!(e.O & REACTIVE_MANUAL_WRITE) && e.B === NOT_PENDING) queuePendingNode(e);
		e.O = e.O & -4 | REACTIVE_MANUAL_WRITE;
	}
	function setMemo(e, t) {
		const n = setSignal(e, t);
		suppressComputedRecompute(e);
		return n;
	}
	function runWithOwner(e, t) {
		const n = context;
		const i = tracking;
		context = e;
		tracking = false;
		try {
			return t();
		} finally {
			context = n;
			tracking = i;
		}
	}
	function collectPendingSources(e) {
		pendingCheckSources?.add(e);
		const t = e.V || e;
		if (t !== e) pendingCheckSources?.add(t);
	}
	function computePendingState(e) {
		const t = e;
		const n = e.V;
		if (e.U) {
			const n = e.U;
			if (n.he & STATUS_PENDING && !(n.he & STATUS_UNINITIALIZED)) return true;
			return e.B !== NOT_PENDING && !(t.he & STATUS_UNINITIALIZED);
		}
		if (n && e.B !== NOT_PENDING) return !n.ve && !(n.he & STATUS_PENDING);
		if (e.K !== void 0 && e.K !== NOT_PENDING) {
			if (t.he & STATUS_PENDING && !(t.he & STATUS_UNINITIALIZED)) return true;
			if (e.U) {
				const t = e.G ? findLane(e.G) : null;
				return !!(t && t.F.size > 0);
			}
			return true;
		}
		if (e.K !== void 0 && e.K === NOT_PENDING && !e.U) return false;
		if (e.B !== NOT_PENDING && !(t.he & STATUS_UNINITIALIZED)) return true;
		return !!(t.he & STATUS_PENDING && !(t.he & STATUS_UNINITIALIZED));
	}
	function updatePendingSignal(e) {
		if (e.We) {
			const t = computePendingState(e);
			const n = e.We;
			setSignal(n, t);
			if (!t && n.G) {
				const t = resolveLane(e);
				if (t && t.F.size > 0) {
					const e = findLane(n.G);
					if (e !== t) mergeLanes(t, e);
				}
				signalLanes.delete(n);
				n.G = void 0;
			}
		}
	}
	function getLatestValueComputed(e) {
		if (!e.Fe) {
			const t = latestReadActive;
			latestReadActive = false;
			const n = pendingCheckActive;
			pendingCheckActive = false;
			const i = context;
			context = null;
			e.Fe = optimisticComputed(() => read(e));
			e.Fe.U = e;
			context = i;
			pendingCheckActive = n;
			latestReadActive = t;
		}
		return e.Fe;
	}
	function createContext$1(e, t) {
		return {
			id: Symbol(t),
			defaultValue: e
		};
	}
	function setContext(e, t, n = getOwner()) {
		if (!n) throw new NoOwnerError();
		n.Ve = {
			...n.Ve,
			[e.id]: isUndefined(t) ? e.defaultValue : t
		};
	}
	function isUndefined(e) {
		return typeof e === "undefined";
	}
	function effect$1(e, t, n, i) {
		const o = createEffectNode(e, t, n, !!i?.user ? EFFECT_USER : EFFECT_RENDER, notifyEffectStatus, i);
		recompute(o, true);
		!i?.defer && (o.J === EFFECT_USER || i?.schedule ? o.te.enqueue(o.J, runEffect.bind(null, o)) : runEffect(o));
	}
	function notifyEffectStatus(e, t) {
		const n = e !== void 0 ? e : this.he;
		const i = t !== void 0 ? t : this.Re;
		if (n & STATUS_ERROR) {
			let e = i;
			this.te.notify(this, STATUS_PENDING, 0);
			if (this.J === EFFECT_USER) try {
				return this.je ? this.je(e, () => {
					this.$e?.();
					this.$e = void 0;
				}) : console.error(e);
			} catch (t) {
				e = t;
			}
			if (!this.te.notify(this, STATUS_ERROR, STATUS_ERROR)) throw e;
		} else if (this.J === EFFECT_RENDER) this.te.notify(this, STATUS_PENDING | STATUS_ERROR, n, i);
	}
	function runEffect(e) {
		if (!e.ee || e.O & REACTIVE_DISPOSED) return;
		e.$e?.();
		e.$e = void 0;
		try {
			e.$e = e.Qe(e.ue, e.Me);
			if (e.$e && !e.Ke) {
				e.Ke = true;
				runWithOwner(e.i, () => cleanup(() => e.$e?.()));
			}
		} catch (t) {
			e.Re = new StatusError(e, t);
			e.he |= STATUS_ERROR;
			if (!e.te.notify(e, STATUS_ERROR, STATUS_ERROR)) throw t;
		} finally {
			e.Me = e.ue;
			e.ee = false;
		}
	}
	GlobalQueue.Te = runEffect;
	function accessor(e) {
		const t = read.bind(null, e);
		t[$REFRESH] = e;
		return t;
	}
	function createSignal$1(e, t) {
		if (typeof e === "function") {
			const n = computed(e, t);
			n.Oe &= ~CONFIG_AUTO_DISPOSE;
			return [accessor(n), setMemo.bind(null, n)];
		}
		const n = signal(e, t);
		return [accessor(n), setSignal.bind(null, n)];
	}
	function createMemo$1(e, t) {
		return accessor(computed(e, t));
	}
	function createRenderEffect$1(e, t, n) {
		effect$1(e, t, void 0, n);
	}
	var $PROXY = Symbol(0);
	function isWrappable(e) {
		if (e == null || typeof e !== "object" || Object.isFrozen(e)) return false;
		return typeof Node === "undefined" || !(e instanceof Node);
	}
	var DELETE = Symbol(0);
	function isPrototypePollutionKey(e) {
		return e === "__proto__" || e === "constructor" || e === "prototype";
	}
	function updatePath(e, t, n = 0) {
		let i, r = e;
		if (n < t.length - 1) {
			i = t[n];
			const o = typeof i;
			const s = Array.isArray(e);
			if (o === "string" && isPrototypePollutionKey(i)) return;
			if (Array.isArray(i)) {
				for (let r = 0; r < i.length; r++) {
					t[n] = i[r];
					updatePath(e, t, n);
				}
				t[n] = i;
				return;
			} else if (s && o === "function") {
				for (let r = 0; r < e.length; r++) if (i(e[r], r)) {
					t[n] = r;
					updatePath(e, t, n);
				}
				t[n] = i;
				return;
			} else if (s && o === "object") {
				const { from: r = 0, to: o = e.length - 1, by: s = 1 } = i;
				for (let i = r; i <= o; i += s) {
					t[n] = i;
					updatePath(e, t, n);
				}
				t[n] = i;
				return;
			} else if (n < t.length - 2) {
				updatePath(e[i], t, n + 1);
				return;
			}
			r = e[i];
		}
		let o = t[t.length - 1];
		if (typeof o === "function") {
			o = o(r);
			if (o === r) return;
		}
		if (i === void 0 && o == void 0) return;
		if (o === DELETE) delete e[i];
		else if (i === void 0 || isWrappable(r) && isWrappable(o) && !Array.isArray(o)) {
			const t = i !== void 0 ? e[i] : e;
			const n = Object.keys(o);
			for (let e = 0; e < n.length; e++) {
				const i = n[e];
				if (isPrototypePollutionKey(i)) continue;
				const r = Object.getOwnPropertyDescriptor(o, i);
				if (r.get || r.set) Object.defineProperty(t, i, r);
				else t[i] = r.value;
			}
		} else e[i] = o;
	}
	Object.assign(function storePath(...e) {
		return (t) => {
			updatePath(t, e);
		};
	}, { DELETE });
	function trueFn() {
		return true;
	}
	var propTraps = {
		get(e, t, n) {
			if (t === $PROXY) return n;
			return e.get(t);
		},
		has(e, t) {
			if (t === $PROXY) return true;
			return e.has(t);
		},
		set: trueFn,
		deleteProperty: trueFn,
		getOwnPropertyDescriptor(e, t) {
			return {
				configurable: true,
				enumerable: true,
				get() {
					return e.get(t);
				},
				set: trueFn,
				deleteProperty: trueFn
			};
		},
		ownKeys(e) {
			return e.keys();
		}
	};
	function resolveSource(e) {
		return !(e = typeof e === "function" ? e() : e) ? {} : e;
	}
	var $SOURCES = Symbol(0);
	function merge(...e) {
		if (e.length === 1 && typeof e[0] !== "function") return e[0];
		let t = false;
		const n = [];
		for (let i = 0; i < e.length; i++) {
			const r = e[i];
			t = t || !!r && $PROXY in r;
			const o = !!r && r[$SOURCES];
			if (o) for (let e = 0; e < o.length; e++) n.push(o[e]);
			else n.push(typeof r === "function" ? (t = true, createMemo$1(r)) : r);
		}
		if (SUPPORTS_PROXY && t) return new Proxy({
			get(e) {
				if (e === $SOURCES) return n;
				for (let t = n.length - 1; t >= 0; t--) {
					const i = resolveSource(n[t]);
					if (e in i) return i[e];
				}
			},
			has(e) {
				for (let t = n.length - 1; t >= 0; t--) if (e in resolveSource(n[t])) return true;
				return false;
			},
			keys() {
				const e = /* @__PURE__ */ new Set();
				for (let t = 0; t < n.length; t++) {
					const i = Object.keys(resolveSource(n[t]));
					for (let t = 0; t < i.length; t++) e.add(i[t]);
				}
				return [...e];
			}
		}, propTraps);
		const i = Object.create(null);
		let r = false;
		let o = n.length - 1;
		for (let e = o; e >= 0; e--) {
			const t = n[e];
			if (!t) {
				e === o && o--;
				continue;
			}
			const s = Object.getOwnPropertyNames(t);
			for (let n = s.length - 1; n >= 0; n--) {
				const u = s[n];
				if (u === "__proto__" || u === "constructor") continue;
				if (!i[u]) {
					r = r || e !== o;
					const n = Object.getOwnPropertyDescriptor(t, u);
					i[u] = n.get ? {
						enumerable: true,
						configurable: true,
						get: n.get.bind(t)
					} : n;
				}
			}
		}
		if (!r) return n[o];
		const s = {};
		const u = Object.keys(i);
		for (let e = u.length - 1; e >= 0; e--) {
			const t = u[e], n = i[t];
			if (n.get) Object.defineProperty(s, t, n);
			else s[t] = n.value;
		}
		s[$SOURCES] = n;
		return s;
	}
	createContext$1(null);
	function flatten(e, t) {
		if (typeof e === "function" && !e.length) {
			if (t?.doNotUnwrap) return e;
			do
				e = e();
			while (typeof e === "function" && !e.length);
		}
		if (t?.skipNonRendered && (e == null || e === true || e === false || e === "")) return;
		if (Array.isArray(e)) {
			let n = [];
			if (flattenArray(e, n, t)) return () => {
				let e = [];
				flattenArray(n, e, {
					...t,
					doNotUnwrap: false
				});
				return e;
			};
			return n;
		}
		return e;
	}
	function flattenArray(e, t = [], n) {
		let i = null;
		let r = false;
		for (let o = 0; o < e.length; o++) try {
			let i = e[o];
			if (typeof i === "function" && !i.length) {
				if (n?.doNotUnwrap) {
					t.push(i);
					r = true;
					continue;
				}
				do
					i = i();
				while (typeof i === "function" && !i.length);
			}
			if (Array.isArray(i)) r = flattenArray(i, t, n);
			else if (n?.skipNonRendered && (i == null || i === true || i === false || i === "")) {} else t.push(i);
		} catch (e) {
			if (!(e instanceof NotReadyError)) throw e;
			i = e;
		}
		if (i) throw i;
		return r;
	}
	//#endregion
	//#region ../../node_modules/.bun/solid-js@2.0.0-beta.14/node_modules/solid-js/dist/solid.js
	var _MockPromise;
	function createContext(defaultValue, options) {
		const id = Symbol(options && options.name || "");
		function provider(props) {
			return createRoot(() => {
				setContext(provider, props.value);
				return children(() => props.children);
			});
		}
		provider.id = id;
		provider.defaultValue = defaultValue;
		return provider;
	}
	function children(fn) {
		const c = createMemo$1(fn, { lazy: true });
		const memo = createMemo$1(() => flatten(c()), {
			lazy: true,
			sync: true
		});
		memo.toArray = () => {
			const v = memo();
			return Array.isArray(v) ? v : v != null ? [v] : [];
		};
		return memo;
	}
	var _createMemo;
	var _createSignal;
	var _createRenderEffect;
	_MockPromise = class MockPromise {
		catch() {
			return new MockPromise();
		}
		then() {
			return new MockPromise();
		}
		finally() {
			return new MockPromise();
		}
	};
	(() => {
		for (const k of [
			"all",
			"allSettled",
			"any",
			"race",
			"reject",
			"resolve"
		]) _MockPromise[k] = () => new _MockPromise();
	})();
	var createMemo = (...args) => (_createMemo || createMemo$1)(...args);
	var createSignal = (...args) => (_createSignal || createSignal$1)(...args);
	var createRenderEffect = (...args) => (_createRenderEffect || createRenderEffect$1)(...args);
	function createComponent(Comp, props) {
		return untrack(() => Comp(props || {}));
	}
	//#endregion
	//#region ../../node_modules/.bun/@solidjs+universal@2.0.0-beta.14+4805d24c3c460789/node_modules/@solidjs/universal/dist/universal.js
	var transparentOptions = {
		transparent: true,
		sync: true
	};
	var syncOptions = { sync: true };
	var effect = (fn, effectFn, options) => createRenderEffect(fn, effectFn, options ? {
		transparent: true,
		sync: true,
		...options
	} : transparentOptions);
	var memo = (fn) => createMemo(() => fn(), syncOptions);
	var INNER_OWNED = {};
	function createRenderer$1({ createElement, createTextNode, createSentinel = () => createTextNode(""), isTextNode, replaceText, insertNode, removeNode, setProperty, getParentNode, getFirstChild, getNextSibling }) {
		function insert(parent, accessor, marker, initial, options) {
			const multi = marker !== void 0;
			if (multi && !initial) initial = [];
			if (typeof accessor !== "function") {
				accessor = normalize(accessor, multi, true);
				if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
			}
			if (multi && initial.length === 0) {
				const sentinel = createSentinel();
				insertNode(parent, sentinel, marker);
				initial = [sentinel];
			}
			let current = initial;
			effect((prev) => {
				const value = normalize(accessor(), multi, true);
				if (typeof value !== "function") return value;
				effect(() => normalize(value, multi), (inner) => {
					insertExpression(parent, inner, current, marker);
					current = inner;
				}, prev !== void 0 && !(options && options.schedule) ? {
					...options,
					schedule: true
				} : options);
				return INNER_OWNED;
			}, (value) => {
				if (value === INNER_OWNED) return;
				insertExpression(parent, value, current, marker);
				current = value;
			}, options);
		}
		function insertExpression(parent, value, current, marker) {
			if (value === current) return;
			const t = typeof value, multi = marker !== void 0;
			if (t === "string" || t === "number") {
				const tc = typeof current;
				if (tc === "string" || tc === "number") replaceText(getFirstChild(parent), value);
				else cleanChildren(parent, current, marker, createTextNode(value));
			} else if (value == null) cleanChildren(parent, current, marker);
			else if (Array.isArray(value)) if (value.length === 0) cleanChildren(parent, current, marker);
			else if (Array.isArray(current)) if (current.length === 0) appendNodes(parent, value, marker);
			else reconcileArrays(parent, current, value);
			else if (current == null) appendNodes(parent, value);
			else reconcileArrays(parent, multi && current || [getFirstChild(parent)], value);
			else if (Array.isArray(current)) cleanChildren(parent, current, multi ? marker : null, value);
			else if (current == null || !getFirstChild(parent)) insertNode(parent, value);
			else replaceNode(parent, value, getFirstChild(parent));
		}
		function normalize(value, multi, doNotUnwrap) {
			value = flatten(value, {
				skipNonRendered: true,
				doNotUnwrap
			});
			if (doNotUnwrap && typeof value === "function") return value;
			if (multi && !Array.isArray(value)) value = [value != null ? value : ""];
			if (Array.isArray(value)) for (let i = 0, len = value.length; i < len; i++) {
				const item = value[i], t = typeof item;
				if (t === "string" || t === "number") value[i] = createTextNode(item);
			}
			return value;
		}
		function reconcileArrays(parentNode, a, b) {
			let bLength = b.length, aEnd = a.length, bEnd = bLength, aStart = 0, bStart = 0, after = getNextSibling(a[aEnd - 1]), map = null;
			while (aStart < aEnd || bStart < bEnd) {
				if (a[aStart] === b[bStart]) {
					aStart++;
					bStart++;
					continue;
				}
				while (a[aEnd - 1] === b[bEnd - 1]) {
					aEnd--;
					bEnd--;
				}
				if (aEnd === aStart) {
					const node = bEnd < bLength ? bStart ? getNextSibling(b[bStart - 1]) : b[bEnd - bStart] : after;
					while (bStart < bEnd) insertNode(parentNode, b[bStart++], node);
				} else if (bEnd === bStart) while (aStart < aEnd) {
					if (!map || !map.has(a[aStart])) removeNode(parentNode, a[aStart]);
					aStart++;
				}
				else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
					const anchor = a[aStart];
					do {
						insertNode(parentNode, a[--aEnd], anchor);
						bStart++;
						if (aStart >= aEnd - 1 || bStart >= bEnd) break;
					} while (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]);
				} else {
					if (!map) {
						map = /* @__PURE__ */ new Map();
						let i = bStart;
						while (i < bEnd) map.set(b[i], i++);
					}
					const index = map.get(a[aStart]);
					if (index != null) if (bStart < index && index < bEnd) {
						let i = aStart, sequence = 1, t;
						while (++i < aEnd && i < bEnd) {
							if ((t = map.get(a[i])) == null || t !== index + sequence) break;
							sequence++;
						}
						if (sequence > index - bStart) {
							const node = a[aStart];
							while (bStart < index) insertNode(parentNode, b[bStart++], node);
						} else replaceNode(parentNode, b[bStart++], a[aStart++]);
					} else aStart++;
					else removeNode(parentNode, a[aStart++]);
				}
			}
		}
		function cleanChildren(parent, current, marker, replacement) {
			if (marker === void 0) {
				let removed;
				while (removed = getFirstChild(parent)) removeNode(parent, removed);
				replacement && insertNode(parent, replacement);
				return "";
			}
			if (current.length) {
				let inserted = false;
				for (let i = current.length - 1; i >= 0; i--) {
					const el = current[i];
					if (replacement !== el) {
						const isParent = getParentNode(el) === parent;
						if (replacement && !inserted && !i) isParent ? replaceNode(parent, replacement, el) : insertNode(parent, replacement, marker);
						else isParent && removeNode(parent, el);
					} else inserted = true;
				}
			} else if (replacement) insertNode(parent, replacement, marker);
		}
		function appendNodes(parent, array, marker) {
			for (let i = 0, len = array.length; i < len; i++) insertNode(parent, array[i], marker);
		}
		function replaceNode(parent, newNode, oldNode) {
			insertNode(parent, newNode, oldNode);
			removeNode(parent, oldNode);
		}
		function spread(node, props, skipChildren) {
			const prevProps = {};
			props || (props = {});
			if (!skipChildren) insert(node, () => props.children);
			effect(() => {
				const r = props.ref;
				(typeof r === "function" || Array.isArray(r)) && ref(() => r, node);
			}, () => {});
			effect(() => {
				const newProps = {};
				for (const prop in props) {
					if (prop === "children" || prop === "ref") continue;
					newProps[prop] = props[prop];
				}
				return newProps;
			}, (props) => {
				for (const prop in prevProps) if (!(prop in props)) {
					setProperty(node, prop, void 0, prevProps[prop]);
					delete prevProps[prop];
				}
				for (const prop in props) {
					const value = props[prop];
					if (value === prevProps[prop]) continue;
					setProperty(node, prop, value, prevProps[prop]);
					prevProps[prop] = value;
				}
			});
			return prevProps;
		}
		function applyRef(r, element) {
			Array.isArray(r) ? r.flat(Infinity).forEach((f) => f && f(element)) : r(element);
		}
		function ref(fn, element) {
			const resolved = untrack(fn);
			runWithOwner(null, () => applyRef(resolved, element));
		}
		return {
			render(code, element) {
				let disposer;
				try {
					createRoot((dispose) => {
						disposer = dispose;
						insert(element, code());
					});
				} catch (err) {
					if (disposer) disposer();
					throw err;
				}
				return disposer;
			},
			insert,
			spread,
			createElement,
			createTextNode,
			insertNode,
			setProp(node, name, value, prev) {
				setProperty(node, name, value, prev);
				return value;
			},
			mergeProps: merge,
			effect,
			memo,
			createComponent,
			applyRef,
			ref
		};
	}
	function createRenderer(options) {
		const base = createRenderer$1(options);
		const baseInsert = base.insert;
		return {
			...base,
			render(code, element) {
				let dispose;
				createRoot((d) => {
					dispose = d;
					const tree = code();
					baseInsert(element, () => tree, void 0, void 0, { schedule: true });
				});
				flush();
				return dispose;
			}
		};
	}
	//#endregion
	//#region dist/index.js
	function p(e) {
		let t = globalThis.__fuseDevServer;
		if (!t) {
			console.error(e);
			return;
		}
		try {
			let n = e instanceof Error ? e : Error(String(e)), r = oe(n), i = r !== n && typeof r.stack == "string" ? r.stack : void 0;
			fetch(`${t}/__fuse_error`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					message: n.message,
					stack: n.stack ?? "",
					causeStack: i
				})
			}).catch(() => console.error(e));
		} catch {
			console.error(e);
		}
	}
	function oe(e) {
		let t = new Set([e]), n = e;
		for (;;) {
			let e = n.cause;
			if (!(e instanceof Error) || t.has(e)) return n;
			t.add(e), n = e;
		}
	}
	var m = /* @__PURE__ */ new Map(), h;
	function g(e, t) {
		m.set(e, t);
	}
	function _(e, t = {}) {
		fjs.bridge_call({
			channel: e,
			...t
		});
	}
	function ce(e) {
		h = e;
	}
	function le(e) {}
	globalThis.__dispatch = async (e, t) => {
		let n = m.get(e);
		try {
			let e = n ? await n(t) : void 0;
			return h?.(), e;
		} catch (e) {
			h?.(), p(e);
		}
	};
	function b(e) {
		"@babel/helpers - typeof";
		return b = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
			return typeof e;
		} : function(e) {
			return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
		}, b(e);
	}
	function ue(e, t) {
		if (b(e) != "object" || !e) return e;
		var n = e[Symbol.toPrimitive];
		if (n !== void 0) {
			var r = n.call(e, t || "default");
			if (b(r) != "object") return r;
			throw TypeError("@@toPrimitive must return a primitive value.");
		}
		return (t === "string" ? String : Number)(e);
	}
	function de(e) {
		var t = ue(e, "string");
		return b(t) == "symbol" ? t : t + "";
	}
	function x(e, t, n) {
		return (t = de(t)) in e ? Object.defineProperty(e, t, {
			value: n,
			enumerable: !0,
			configurable: !0,
			writable: !0
		}) : e[t] = n, e;
	}
	if (globalThis.structuredClone === void 0 && (globalThis.structuredClone = (e) => JSON.parse(JSON.stringify(e))), globalThis.URL !== void 0) {
		let e = globalThis.URL;
		globalThis.URL = function(t, n) {
			if (n !== void 0) {
				let r = typeof n == "string" ? n : n.href, i = typeof t == "string" ? t : t.href;
				return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(i) ? new e(i) : new e((r.endsWith("/") ? r : r + "/") + i);
			}
			return new e(typeof t == "string" ? t : t.href);
		}, Object.setPrototypeOf(globalThis.URL, e), globalThis.URL.prototype = e.prototype;
	}
	if (globalThis.WebSocket === void 0) {
		let e = /* @__PURE__ */ new Map(), t = 0;
		class n {
			constructor(n, r) {
				x(this, "_id", void 0), x(this, "url", void 0), x(this, "readyState", 0), x(this, "protocol", ""), x(this, "binaryType", "blob"), x(this, "bufferedAmount", 0), x(this, "extensions", ""), x(this, "onopen", null), x(this, "onmessage", null), x(this, "onclose", null), x(this, "onerror", null), this._id = t++, this.url = n, e.set(this._id, this), _("_ws", {
					op: "open",
					id: this._id,
					url: n,
					protocols: Array.isArray(r) ? r : r ? [r] : []
				});
			}
			send(e) {
				if (this.readyState !== 1) throw Error("WebSocket is not open");
				_("_ws", {
					op: "send",
					id: this._id,
					data: e
				});
			}
			close(e, t) {
				this.readyState === 2 || this.readyState === 3 || (this.readyState = 2, _("_ws", {
					op: "close",
					id: this._id,
					code: e ?? 1e3,
					reason: t ?? ""
				}));
			}
			addEventListener() {}
			removeEventListener() {}
			dispatchEvent() {
				return !0;
			}
		}
		x(n, "CONNECTING", 0), x(n, "OPEN", 1), x(n, "CLOSING", 2), x(n, "CLOSED", 3), g("_wsEvent", (t) => {
			let n = e.get(t.id);
			if (n) switch (t.type) {
				case "open":
					n.readyState = 1, n.protocol = t.protocol || "", n.onopen?.({ type: "open" });
					break;
				case "message":
					n.onmessage?.({
						type: "message",
						data: t.data
					});
					break;
				case "close":
					n.readyState = 3, n.onclose?.({
						type: "close",
						code: t.code ?? 1e3,
						reason: t.reason ?? "",
						wasClean: t.wasClean ?? !0
					}), e.delete(t.id);
					break;
				case "error":
					n.onerror?.({
						type: "error",
						message: t.message
					});
					break;
			}
		}), globalThis.WebSocket = n;
	}
	{
		let e = (e) => {
			if (typeof e == "string") return e;
			if (e instanceof Error) return e.stack ?? `${e.name}: ${e.message}`;
			if (typeof e == "object" && e) try {
				return JSON.stringify(e);
			} catch {
				return String(e);
			}
			return String(e);
		}, t = (t) => {
			if (t.length === 0) return "";
			let n = t[0];
			if (typeof n != "string" || !n.includes("%")) return t.map(e).join(" ");
			let r = 1, i = n.replace(/%[sdifoOc%]/g, (n) => {
				if (n === "%%") return "%";
				if (r >= t.length) return n;
				let i = t[r++];
				switch (n) {
					case "%c": return "";
					case "%s": return String(i);
					case "%d":
					case "%i": return String(parseInt(i, 10));
					case "%f": return String(parseFloat(i));
					default: return e(i);
				}
			});
			for (; r < t.length; r++) i += " " + e(t[r]);
			return i;
		}, n = (e, n) => _("_log", { message: e + t(n) }), r = () => {};
		globalThis.console = {
			log: (...e) => n("", e),
			info: (...e) => n("", e),
			debug: (...e) => n("", e),
			dir: (...e) => n("", e),
			trace: (...e) => n("[TRACE] ", [...e, (/* @__PURE__ */ Error()).stack]),
			warn: (...e) => n("[WARN] ", e),
			error: (...e) => n("[ERROR] ", e),
			group: (...e) => n("", e),
			groupCollapsed: (...e) => n("", e),
			groupEnd: r,
			table: (...e) => n("", e),
			assert: (e, ...t) => {
				e || n("[ASSERT] ", t);
			},
			count: r,
			countReset: r,
			time: r,
			timeEnd: r,
			timeLog: r
		};
	}
	var S = globalThis.__fuseHost;
	if (!S) throw Error("[solid-fuse] `host` is unavailable — it only exists inside a running solid-fuse app.");
	var [C, fe] = createSignal(S.brightness);
	g("_brightness", (e) => fe(e.value));
	var w = {
		brightness: C,
		platform: S.platform,
		mode: S.mode
	}, pe = 0, T, E = class {
		constructor(e) {
			x(this, "id", pe++), x(this, "props", {}), x(this, "children", []), x(this, "parent", void 0), this.type = e;
		}
	}, D = /* @__PURE__ */ new Map();
	g("_functionCall", (e) => {
		let t = `${e.nodeId}:${e.name}`;
		D.get(t)?.(e.value);
	}), g("_functionCallAsync", (e) => D.get(`${e.nodeId}:${e.name}`)?.(e.value));
	var O = [], k = new E("root"), A = !1, j = !1;
	function M() {
		flush(), A = !1, O.length !== 0 && (_("_ops", { ops: O.slice() }), O.length = 0);
	}
	function N() {
		A || j || (A = !0, Promise.resolve().then(M));
	}
	ce(M), le(M);
	var { render: P, effect: F, memo: I, createComponent: L, createElement: R, createTextNode: z, insertNode: B, insert: V, spread: H, setProp: U, mergeProps: W, ...me } = createRenderer({
		createElement(e) {
			let t = new E(e), n = {};
			return w.mode !== "release" && T && (n._component = T), O.push({
				op: "create",
				id: t.id,
				type: e,
				props: n
			}), t;
		},
		createTextNode(e) {
			let t = new E("__text__");
			return t.props.text = e, O.push({
				op: "create",
				id: t.id,
				type: "__text__",
				props: { text: e }
			}), t;
		},
		replaceText(e, t) {
			e.props.text = t, O.push({
				op: "setText",
				id: e.id,
				text: t
			}), N();
		},
		isTextNode(e) {
			return e.type === "__text__";
		},
		setProperty(e, t, n) {
			if (typeof n == "function") D.set(`${e.id}:${t}`, n), e.props[t] = !0, O.push({
				op: "setProp",
				id: e.id,
				name: t,
				value: !0
			});
			else if (Array.isArray(n)) {
				e.props[t] = n;
				let r = n.map((e) => {
					let t = e instanceof E ? e : e?.node instanceof E ? e.node : null;
					return t ? { _node: t.id } : e;
				});
				O.push({
					op: "setProp",
					id: e.id,
					name: t,
					value: r
				});
			} else {
				let r = n instanceof E ? n : n?.node instanceof E ? n.node : null;
				e.props[t] = n, O.push(r ? {
					op: "setProp",
					id: e.id,
					name: t,
					value: { _node: r.id }
				} : {
					op: "setProp",
					id: e.id,
					name: t,
					value: n
				});
			}
			N();
		},
		insertNode(e, t, n) {
			t.parent = e;
			let r;
			if (n) {
				let i = e.children.indexOf(n);
				i >= 0 ? (e.children.splice(i, 0, t), r = i) : (e.children.push(t), r = e.children.length - 1);
			} else e.children.push(t), r = e.children.length - 1;
			O.push({
				op: "insert",
				parentId: e.id,
				childId: t.id,
				index: r
			}), N();
		},
		removeNode(e, t) {
			let n = e.children.indexOf(t);
			n >= 0 && e.children.splice(n, 1), t.parent = void 0, O.push({
				op: "remove",
				parentId: e.id,
				childId: t.id
			}), N();
		},
		getParentNode(e) {
			return e.parent;
		},
		getFirstChild(e) {
			return e.children[0];
		},
		getNextSibling(e) {
			let t = e.parent;
			if (!t) return;
			let n = t.children.indexOf(e);
			return t.children[n + 1];
		}
	});
	function G(e, t) {
		if (w.mode === "release") return L(e, t);
		let n = T;
		T = (e.name || "").replace(/^\[.*?\]/, "") || void 0;
		try {
			return L(e, t);
		} finally {
			T = n;
		}
	}
	function he(e) {
		j = !0;
		let t;
		try {
			t = P(e, k);
		} catch (e) {
			return j = !1, p(e), () => {};
		}
		return j = !1, M(), () => {
			typeof t == "function" && t();
			for (let e of k.children) O.push({
				op: "remove",
				parentId: k.id,
				childId: e.id
			});
			k.children = [], D.clear();
		};
	}
	me.ref;
	createContext();
	function ye(e) {
		return (() => {
			var t = R("view");
			return H(t, e, !1), t;
		})();
	}
	function be(e) {
		return (() => {
			var t = R("text");
			return H(t, e, !1), t;
		})();
	}
	function Se(e) {
		return (() => {
			var t = R("image");
			return H(t, e, !1), t;
		})();
	}
	//#endregion
	//#region ../../examples/demo/src/image-test-entry.tsx
	var PNG_1X1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
	var fallback = () => G(be, { children: "broken" });
	var App = () => G(ye, {
		flex: { direction: "vertical" },
		get children() {
			return [
				G(Se, {
					src: "https://example.com/n.png",
					width: 10,
					height: 10,
					get errorWidget() {
						return fallback();
					}
				}),
				G(Se, {
					src: "cdn.example.com/o.png",
					type: "network",
					width: 10,
					height: 10,
					get errorWidget() {
						return fallback();
					}
				}),
				G(Se, {
					src: "assets/img/a.png",
					width: 10,
					height: 10,
					get errorWidget() {
						return fallback();
					}
				}),
				G(Se, {
					src: "/tmp/f.png",
					width: 10,
					height: 10,
					get errorWidget() {
						return fallback();
					}
				}),
				G(Se, {
					src: PNG_1X1,
					width: 10,
					height: 10,
					fit: "cover",
					borderRadius: 4
				}),
				G(Se, {
					src: PNG_1X1,
					width: 10,
					height: 10,
					color: "red"
				})
			];
		}
	});
	he(App);
	_("test:ready", {});
	//#endregion
})();
