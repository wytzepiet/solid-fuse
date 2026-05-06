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
	//#region ../../node_modules/.bun/@solidjs+signals@2.0.0-beta.7/node_modules/@solidjs/signals/dist/prod.js
	var NotReadyError$1 = class extends Error {
		constructor(e) {
			super();
			_defineProperty(this, "source", void 0);
			this.source = e;
		}
	};
	var StatusError$1 = class extends Error {
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
	var ContextNotFoundError = class extends Error {
		constructor() {
			super("");
		}
	};
	var REACTIVE_NONE$1 = 0;
	var REACTIVE_CHECK$1 = 1;
	var REACTIVE_DIRTY$1 = 2;
	var REACTIVE_RECOMPUTING_DEPS$1 = 4;
	var REACTIVE_IN_HEAP$1 = 8;
	var REACTIVE_IN_HEAP_HEIGHT$1 = 16;
	var REACTIVE_ZOMBIE$1 = 32;
	var REACTIVE_DISPOSED$1 = 64;
	var REACTIVE_OPTIMISTIC_DIRTY$1 = 128;
	var REACTIVE_SNAPSHOT_STALE$1 = 256;
	var REACTIVE_LAZY$1 = 512;
	var STATUS_PENDING$1 = 1;
	var STATUS_ERROR$1 = 2;
	var STATUS_UNINITIALIZED$1 = 4;
	var EFFECT_RENDER$1 = 1;
	var EFFECT_USER$1 = 2;
	var EFFECT_TRACKED$1 = 3;
	var NOT_PENDING$1 = {};
	var NO_SNAPSHOT = {};
	var SUPPORTS_PROXY = typeof Proxy === "function";
	var defaultContext$1 = {};
	function actualInsertIntoHeap$1(e, t) {
		const n = (e.i?.t ? e.i.u?.o : e.i?.o) ?? -1;
		if (n >= e.o) e.o = n + 1;
		const i = e.o;
		const r = t.l[i];
		if (r === void 0) t.l[i] = e;
		else {
			const t = r.T;
			t.S = e;
			e.T = t;
			r.T = e;
		}
		if (i > t.R) t.R = i;
	}
	function insertIntoHeap$1(e, t) {
		let n = e.O;
		if (n & (REACTIVE_IN_HEAP$1 | REACTIVE_RECOMPUTING_DEPS$1)) return;
		if (n & REACTIVE_CHECK$1) e.O = n & -4 | 10;
		else e.O = n | REACTIVE_IN_HEAP$1;
		if (!(n & REACTIVE_IN_HEAP_HEIGHT$1)) actualInsertIntoHeap$1(e, t);
	}
	function insertIntoHeapHeight$1(e, t) {
		let n = e.O;
		if (n & (REACTIVE_RECOMPUTING_DEPS$1 | 24)) return;
		e.O = n | REACTIVE_IN_HEAP_HEIGHT$1;
		actualInsertIntoHeap$1(e, t);
	}
	function deleteFromHeap$1(e, t) {
		const n = e.O;
		if (!(n & (REACTIVE_IN_HEAP$1 | REACTIVE_IN_HEAP_HEIGHT$1))) return;
		e.O = n & -25;
		const i = e.o;
		if (e.T === e) t.l[i] = void 0;
		else {
			const n = e.S;
			const r = t.l[i];
			const s = n ?? r;
			if (e === r) t.l[i] = n;
			else e.T.S = n;
			s.T = e.T;
		}
		e.T = e;
		e.S = void 0;
	}
	function markHeap$1(e) {
		if (e._) return;
		e._ = true;
		for (let t = 0; t <= e.R; t++) for (let n = e.l[t]; n !== void 0; n = n.S) if (n.O & REACTIVE_IN_HEAP$1) markNode$1(n);
	}
	function markNode$1(e, t = REACTIVE_DIRTY$1) {
		const n = e.O;
		if ((n & (REACTIVE_CHECK$1 | REACTIVE_DIRTY$1)) >= t) return;
		e.O = n & -4 | t;
		for (let t = e.I; t !== null; t = t.h) markNode$1(t.p, REACTIVE_CHECK$1);
		if (e.A !== null) for (let t = e.A; t !== null; t = t.N) for (let e = t.I; e !== null; e = e.h) markNode$1(e.p, REACTIVE_CHECK$1);
	}
	function runHeap$1(e, t) {
		e._ = false;
		for (e.P = 0; e.P <= e.R; e.P++) {
			let n = e.l[e.P];
			while (n !== void 0) {
				if (n.O & REACTIVE_IN_HEAP$1) t(n);
				else adjustHeight$1(n, e);
				n = e.l[e.P];
			}
		}
		e.R = 0;
	}
	function adjustHeight$1(e, t) {
		deleteFromHeap$1(e, t);
		let n = e.o;
		for (let t = e.C; t; t = t.D) {
			const e = t.m;
			const i = e.V || e;
			if (i.L && i.o >= n) n = i.o + 1;
		}
		if (e.o !== n) {
			e.o = n;
			for (let n = e.I; n !== null; n = n.h) insertIntoHeapHeight$1(n.p, t);
		}
	}
	var transitions$1 = /* @__PURE__ */ new Set();
	var dirtyQueue$1 = {
		l: new Array(2e3).fill(void 0),
		_: false,
		P: 0,
		R: 0
	};
	var zombieQueue$1 = {
		l: new Array(2e3).fill(void 0),
		_: false,
		P: 0,
		R: 0
	};
	var clock$1 = 0;
	var activeTransition$1 = null;
	var scheduled$1 = false;
	var projectionWriteActive = false;
	var stashedOptimisticReads$1 = null;
	function shouldReadStashedOptimisticValue(e) {
		return !!stashedOptimisticReads$1?.has(e);
	}
	function runLaneEffects$1(e) {
		for (const t of activeLanes$1) {
			if (t.U || t.k.size > 0) continue;
			const n = t.G[e - 1];
			if (n.length) {
				t.G[e - 1] = [];
				runQueue$1(n, e);
			}
		}
	}
	function queueStashedOptimisticEffects$1(e) {
		for (let t = e.I; t !== null; t = t.h) {
			const e = t.p;
			if (!e.W) continue;
			if (e.W === EFFECT_TRACKED$1) {
				if (!e.H) {
					e.H = true;
					e.F.enqueue(EFFECT_USER$1, e.M);
				}
				continue;
			}
			const n = e.O & REACTIVE_ZOMBIE$1 ? zombieQueue$1 : dirtyQueue$1;
			if (n.P > e.o) n.P = e.o;
			insertIntoHeap$1(e, n);
		}
	}
	function mergeTransitionState$1(e, t) {
		t.j = e;
		e.$.push(...t.$);
		for (const n of activeLanes$1) if (n.K === t) n.K = e;
		e.Y.push(...t.Y);
		for (const n of t.Z) e.Z.add(n);
		for (const [n, i] of t.B) {
			let t = e.B.get(n);
			if (!t) e.B.set(n, t = /* @__PURE__ */ new Set());
			for (const e of i) t.add(e);
		}
	}
	function resolveOptimisticNodes$1(e) {
		for (let t = 0; t < e.length; t++) {
			const n = e[t];
			n.q = void 0;
			if (n.X !== NOT_PENDING$1) {
				n.J = n.X;
				n.X = NOT_PENDING$1;
			}
			const i = n.ee;
			n.ee = NOT_PENDING$1;
			if (i !== NOT_PENDING$1 && n.J !== i) insertSubs$1(n, true);
			n.K = null;
		}
		e.length = 0;
	}
	function cleanupCompletedLanes$1(e) {
		for (const t of activeLanes$1) {
			if (!(e ? t.K === e : !t.K)) continue;
			if (!t.U) {
				if (t.G[0].length) runQueue$1(t.G[0], EFFECT_RENDER$1);
				if (t.G[1].length) runQueue$1(t.G[1], EFFECT_USER$1);
			}
			if (t.te.q === t) t.te.q = void 0;
			t.k.clear();
			t.G[0].length = 0;
			t.G[1].length = 0;
			activeLanes$1.delete(t);
			signalLanes$1.delete(t.te);
		}
	}
	function schedule$1() {
		if (scheduled$1) return;
		scheduled$1 = true;
		if (!globalQueue$1.ne && !projectionWriteActive) queueMicrotask(flush$1);
	}
	var Queue$1 = class {
		constructor() {
			_defineProperty(this, "i", null);
			_defineProperty(this, "ie", [[], []]);
			_defineProperty(this, "re", []);
			_defineProperty(this, "created", clock$1);
		}
		addChild(e) {
			this.re.push(e);
			e.i = this;
		}
		removeChild(e) {
			const t = this.re.indexOf(e);
			if (t >= 0) {
				this.re.splice(t, 1);
				e.i = null;
			}
		}
		notify(e, t, n, i) {
			if (this.i) return this.i.notify(e, t, n, i);
			return false;
		}
		run(e) {
			if (this.ie[e - 1].length) {
				const t = this.ie[e - 1];
				this.ie[e - 1] = [];
				runQueue$1(t, e);
			}
			for (let t = 0; t < this.re.length; t++) this.re[t].run?.(e);
		}
		enqueue(e, t) {
			if (e) if (currentOptimisticLane$1) findLane$1(currentOptimisticLane$1).G[e - 1].push(t);
			else this.ie[e - 1].push(t);
			schedule$1();
		}
		stashQueues(e) {
			e.ie[0].push(...this.ie[0]);
			e.ie[1].push(...this.ie[1]);
			this.ie = [[], []];
			for (let t = 0; t < this.re.length; t++) {
				let n = this.re[t];
				let i = e.re[t];
				if (!i) {
					i = {
						ie: [[], []],
						re: []
					};
					e.re[t] = i;
				}
				n.stashQueues(i);
			}
		}
		restoreQueues(e) {
			this.ie[0].push(...e.ie[0]);
			this.ie[1].push(...e.ie[1]);
			for (let t = 0; t < e.re.length; t++) {
				const n = e.re[t];
				let i = this.re[t];
				if (i) i.restoreQueues(n);
			}
		}
	};
	var GlobalQueue$1 = class GlobalQueue$1 extends Queue$1 {
		constructor(..._args) {
			super(..._args);
			_defineProperty(this, "ne", false);
			_defineProperty(this, "se", []);
			_defineProperty(this, "Y", []);
			_defineProperty(this, "Z", /* @__PURE__ */ new Set());
		}
		flush() {
			if (this.ne) return;
			this.ne = true;
			try {
				runHeap$1(dirtyQueue$1, GlobalQueue$1.oe);
				if (activeTransition$1) {
					if (!transitionComplete$1(activeTransition$1)) {
						const e = activeTransition$1;
						runHeap$1(zombieQueue$1, GlobalQueue$1.oe);
						this.se = [];
						this.Y = [];
						this.Z = /* @__PURE__ */ new Set();
						runLaneEffects$1(EFFECT_RENDER$1);
						runLaneEffects$1(EFFECT_USER$1);
						this.stashQueues(e.ae);
						clock$1++;
						scheduled$1 = dirtyQueue$1.R >= dirtyQueue$1.P;
						reassignPendingTransition$1(e.se);
						activeTransition$1 = null;
						if (!e.$.length && e.Y.length) {
							stashedOptimisticReads$1 = /* @__PURE__ */ new Set();
							for (let t = 0; t < e.Y.length; t++) {
								const n = e.Y[t];
								if (n.L || n.le) continue;
								stashedOptimisticReads$1.add(n);
								queueStashedOptimisticEffects$1(n);
							}
						}
						try {
							finalizePureQueue$1(null, true);
						} finally {
							stashedOptimisticReads$1 = null;
						}
						return;
					}
					this.se !== activeTransition$1.se && this.se.push(...activeTransition$1.se);
					this.restoreQueues(activeTransition$1.ae);
					transitions$1.delete(activeTransition$1);
					const t = activeTransition$1;
					activeTransition$1 = null;
					reassignPendingTransition$1(this.se);
					finalizePureQueue$1(t);
				} else {
					if (transitions$1.size) runHeap$1(zombieQueue$1, GlobalQueue$1.oe);
					finalizePureQueue$1();
				}
				clock$1++;
				scheduled$1 = dirtyQueue$1.R >= dirtyQueue$1.P;
				runLaneEffects$1(EFFECT_RENDER$1);
				this.run(EFFECT_RENDER$1);
				runLaneEffects$1(EFFECT_USER$1);
				this.run(EFFECT_USER$1);
			} finally {
				this.ne = false;
			}
		}
		notify(e, t, n, i) {
			if (t & STATUS_PENDING$1) {
				if (n & STATUS_PENDING$1) {
					const t = i !== void 0 ? i : e.fe;
					if (activeTransition$1 && t) {
						const n = t.source;
						let i = activeTransition$1.B.get(n);
						if (!i) activeTransition$1.B.set(n, i = /* @__PURE__ */ new Set());
						const r = i.size;
						i.add(e);
						if (i.size !== r) schedule$1();
					}
				}
				return true;
			}
			return false;
		}
		initTransition(e) {
			if (e) e = currentTransition$1(e);
			if (e && e === activeTransition$1) return;
			if (!e && activeTransition$1 && activeTransition$1.Ee === clock$1) return;
			if (!activeTransition$1) activeTransition$1 = e ?? {
				Ee: clock$1,
				se: [],
				B: /* @__PURE__ */ new Map(),
				Y: [],
				Z: /* @__PURE__ */ new Set(),
				$: [],
				ae: {
					ie: [[], []],
					re: []
				},
				j: false
			};
			else if (e) {
				const t = activeTransition$1;
				mergeTransitionState$1(e, t);
				transitions$1.delete(t);
				activeTransition$1 = e;
			}
			transitions$1.add(activeTransition$1);
			activeTransition$1.Ee = clock$1;
			if (this.se !== activeTransition$1.se) {
				for (let e = 0; e < this.se.length; e++) {
					const t = this.se[e];
					t.K = activeTransition$1;
					activeTransition$1.se.push(t);
				}
				this.se = activeTransition$1.se;
			}
			if (this.Y !== activeTransition$1.Y) {
				for (let e = 0; e < this.Y.length; e++) {
					const t = this.Y[e];
					t.K = activeTransition$1;
					activeTransition$1.Y.push(t);
				}
				this.Y = activeTransition$1.Y;
			}
			for (const e of activeLanes$1) if (!e.K) e.K = activeTransition$1;
			if (this.Z !== activeTransition$1.Z) {
				for (const e of this.Z) activeTransition$1.Z.add(e);
				this.Z = activeTransition$1.Z;
			}
		}
	};
	_defineProperty(GlobalQueue$1, "oe", void 0);
	_defineProperty(GlobalQueue$1, "ue", void 0);
	_defineProperty(GlobalQueue$1, "ce", null);
	function insertSubs$1(e, t = false) {
		const n = e.q || currentOptimisticLane$1;
		const i = e.de !== void 0;
		for (let r = e.I; r !== null; r = r.h) {
			if (i && r.p.Te) {
				r.p.O |= REACTIVE_SNAPSHOT_STALE$1;
				continue;
			}
			if (t && n) {
				r.p.O |= REACTIVE_OPTIMISTIC_DIRTY$1;
				assignOrMergeLane$1(r.p, n);
			} else if (t) {
				r.p.O |= REACTIVE_OPTIMISTIC_DIRTY$1;
				r.p.q = void 0;
			}
			const e = r.p;
			if (e.W === EFFECT_TRACKED$1) {
				if (!e.H) {
					e.H = true;
					e.F.enqueue(EFFECT_USER$1, e.M);
				}
				continue;
			}
			const s = r.p.O & REACTIVE_ZOMBIE$1 ? zombieQueue$1 : dirtyQueue$1;
			if (s.P > r.p.o) s.P = r.p.o;
			insertIntoHeap$1(r.p, s);
		}
	}
	function commitPendingNodes$1() {
		const e = globalQueue$1.se;
		for (let t = 0; t < e.length; t++) {
			const n = e[t];
			if (n.X !== NOT_PENDING$1) {
				n.J = n.X;
				n.X = NOT_PENDING$1;
				if (n.W && n.W !== EFFECT_TRACKED$1) n.H = true;
			}
			if (!(n.Se & STATUS_PENDING$1)) n.Se &= ~STATUS_UNINITIALIZED$1;
			if (n.L) GlobalQueue$1.ue(n, false, true);
		}
		e.length = 0;
	}
	function finalizePureQueue$1(e = null, t = false) {
		const n = !t;
		if (n) commitPendingNodes$1();
		if (!t) checkBoundaryChildren$1(globalQueue$1);
		if (dirtyQueue$1.R >= dirtyQueue$1.P) runHeap$1(dirtyQueue$1, GlobalQueue$1.oe);
		if (n) {
			commitPendingNodes$1();
			resolveOptimisticNodes$1(e ? e.Y : globalQueue$1.Y);
			const t = e ? e.Z : globalQueue$1.Z;
			if (GlobalQueue$1.ce && t.size) {
				for (const e of t) GlobalQueue$1.ce(e);
				t.clear();
				schedule$1();
			}
			cleanupCompletedLanes$1(e);
		}
	}
	function checkBoundaryChildren$1(e) {
		for (const t of e.re) {
			t.checkSources?.();
			checkBoundaryChildren$1(t);
		}
	}
	function reassignPendingTransition$1(e) {
		for (let t = 0; t < e.length; t++) e[t].K = activeTransition$1;
	}
	var globalQueue$1 = new GlobalQueue$1();
	function flush$1() {
		if (globalQueue$1.ne) return;
		while (scheduled$1 || activeTransition$1) globalQueue$1.flush();
	}
	function runQueue$1(e, t) {
		for (let n = 0; n < e.length; n++) e[n](t);
	}
	function reporterBlocksSource$1(e, t) {
		if (e.O & (REACTIVE_ZOMBIE$1 | REACTIVE_DISPOSED$1)) return false;
		if (e.Re === t || e.Oe?.has(t)) return true;
		for (let n = e.C; n; n = n.D) {
			let e = n.m;
			while (e) {
				if (e === t || e.V === t) return true;
				e = e._e;
			}
		}
		return !!(e.Se & STATUS_PENDING$1 && e.fe instanceof NotReadyError$1 && e.fe.source === t);
	}
	function transitionComplete$1(e) {
		if (e.j) return true;
		if (e.$.length) return false;
		let t = true;
		for (const [n, i] of e.B) {
			let r = false;
			for (const e of i) {
				if (reporterBlocksSource$1(e, n)) {
					r = true;
					break;
				}
				i.delete(e);
			}
			if (!r) e.B.delete(n);
			else if (n.Se & STATUS_PENDING$1 && n.fe?.source === n) {
				t = false;
				break;
			}
		}
		if (t) for (let n = 0; n < e.Y.length; n++) {
			const i = e.Y[n];
			if (hasActiveOverride$1(i) && "Se" in i && i.Se & STATUS_PENDING$1 && i.fe instanceof NotReadyError$1 && i.fe.source !== i) {
				t = false;
				break;
			}
		}
		t && (e.j = true);
		return t;
	}
	function currentTransition$1(e) {
		while (e.j && typeof e.j === "object") e = e.j;
		return e;
	}
	function runInTransition$1(e, t) {
		const n = activeTransition$1;
		try {
			activeTransition$1 = currentTransition$1(e);
			return t();
		} finally {
			activeTransition$1 = n;
		}
	}
	var signalLanes$1 = /* @__PURE__ */ new WeakMap();
	var activeLanes$1 = /* @__PURE__ */ new Set();
	function getOrCreateLane$1(e) {
		let t = signalLanes$1.get(e);
		if (t) return findLane$1(t);
		const n = e._e;
		const i = n?.q ? findLane$1(n.q) : null;
		t = {
			te: e,
			k: /* @__PURE__ */ new Set(),
			G: [[], []],
			U: null,
			K: activeTransition$1,
			Ie: i
		};
		signalLanes$1.set(e, t);
		activeLanes$1.add(t);
		e.he = false;
		return t;
	}
	function findLane$1(e) {
		while (e.U) e = e.U;
		return e;
	}
	function mergeLanes$1(e, t) {
		e = findLane$1(e);
		t = findLane$1(t);
		if (e === t) return e;
		t.U = e;
		for (const n of t.k) e.k.add(n);
		e.G[0].push(...t.G[0]);
		e.G[1].push(...t.G[1]);
		return e;
	}
	function resolveLane$1(e) {
		const t = e.q;
		if (!t) return void 0;
		const n = findLane$1(t);
		if (activeLanes$1.has(n)) return n;
		e.q = void 0;
	}
	function resolveTransition$1(e) {
		return resolveLane$1(e)?.K ?? e.K;
	}
	function hasActiveOverride$1(e) {
		return !!(e.ee !== void 0 && e.ee !== NOT_PENDING$1);
	}
	function assignOrMergeLane$1(e, t) {
		const n = findLane$1(t);
		const i = e.q;
		if (i) {
			if (i.U) {
				e.q = t;
				return;
			}
			const r = findLane$1(i);
			if (activeLanes$1.has(r)) {
				if (r !== n && !hasActiveOverride$1(e)) if (n.Ie && findLane$1(n.Ie) === r) e.q = t;
				else if (r.Ie && findLane$1(r.Ie) === n);
				else mergeLanes$1(n, r);
				return;
			}
		}
		e.q = t;
	}
	function unlinkSubs$1(e) {
		const t = e.m;
		const n = e.D;
		const i = e.h;
		const r = e.pe;
		if (i !== null) i.pe = r;
		else t.Ae = r;
		if (r !== null) r.h = i;
		else {
			t.I = i;
			if (i === null) {
				t.Ne?.();
				t.L && !t.Pe && !(t.O & REACTIVE_ZOMBIE$1) && unobserved$1(t);
			}
		}
		return n;
	}
	function unobserved$1(e) {
		deleteFromHeap$1(e, e.O & REACTIVE_ZOMBIE$1 ? zombieQueue$1 : dirtyQueue$1);
		let t = e.C;
		while (t !== null) t = unlinkSubs$1(t);
		e.C = null;
		e.ge = null;
		disposeChildren$1(e, true);
	}
	function link$1(e, t) {
		const n = t.ge;
		if (n !== null && n.m === e) return;
		let i = null;
		const r = t.O & REACTIVE_RECOMPUTING_DEPS$1;
		if (r) {
			i = n !== null ? n.D : t.C;
			if (i !== null && i.m === e) {
				t.ge = i;
				return;
			}
		}
		const s = e.Ae;
		if (s !== null && s.p === t && (!r || isValidLink$1(s, t))) return;
		const o = t.ge = e.Ae = {
			m: e,
			p: t,
			D: i,
			pe: s,
			h: null
		};
		if (n !== null) n.D = o;
		else t.C = o;
		if (s !== null) s.h = o;
		else e.I = o;
	}
	function isValidLink$1(e, t) {
		const n = t.ge;
		if (n !== null) {
			let i = t.C;
			do {
				if (i === e) return true;
				if (i === n) break;
				i = i.D;
			} while (i !== null);
		}
		return false;
	}
	function markDisposal$1(e) {
		let t = e.Ce;
		while (t) {
			t.O |= REACTIVE_ZOMBIE$1;
			if (t.O & REACTIVE_IN_HEAP$1) {
				deleteFromHeap$1(t, dirtyQueue$1);
				insertIntoHeap$1(t, zombieQueue$1);
			}
			markDisposal$1(t);
			t = t.De;
		}
	}
	function disposeChildren$1(e, t = false, n) {
		if (e.O & REACTIVE_DISPOSED$1) return;
		if (t) e.O = REACTIVE_DISPOSED$1;
		if (t && e.L) e.ye = null;
		let i = n ? e.ve : e.Ce;
		while (i) {
			const e = i.De;
			if (i.C) {
				const e = i;
				deleteFromHeap$1(e, e.O & REACTIVE_ZOMBIE$1 ? zombieQueue$1 : dirtyQueue$1);
				let t = e.C;
				do
					t = unlinkSubs$1(t);
				while (t !== null);
				e.C = null;
				e.ge = null;
			}
			disposeChildren$1(i, true);
			i = e;
		}
		if (n) e.ve = null;
		else {
			e.Ce = null;
			e.we = 0;
		}
		runDisposal$1(e, n);
	}
	function runDisposal$1(e, t) {
		let n = t ? e.me : e.Ve;
		if (!n) return;
		if (Array.isArray(n)) for (let e = 0; e < n.length; e++) {
			const t = n[e];
			t.call(t);
		}
		else n.call(n);
		t ? e.me = null : e.Ve = null;
	}
	function childId(e, t) {
		let n = e;
		while (n.be && n.i) n = n.i;
		if (n.id != null) return formatId(n.id, t ? n.we++ : n.we);
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
		return context$1;
	}
	function cleanup$1(e) {
		if (!context$1) return e;
		if (!context$1.Ve) context$1.Ve = e;
		else if (Array.isArray(context$1.Ve)) context$1.Ve.push(e);
		else context$1.Ve = [context$1.Ve, e];
		return e;
	}
	function createOwner(e) {
		const t = context$1;
		const n = e?.transparent ?? false;
		const i = {
			id: e?.id ?? (n ? t?.id : t?.id != null ? getNextChildId(t) : void 0),
			be: n || void 0,
			t: true,
			u: t?.t ? t.u : t,
			Ce: null,
			De: null,
			Ve: null,
			F: t?.F ?? globalQueue$1,
			Le: t?.Le || defaultContext$1,
			we: 0,
			me: null,
			ve: null,
			i: t,
			dispose(e = true) {
				disposeChildren$1(i, e);
			}
		};
		if (t) {
			const e = t.Ce;
			if (e === null) t.Ce = i;
			else {
				i.De = e;
				t.Ce = i;
			}
		}
		return i;
	}
	function createRoot(e, t) {
		const n = createOwner(t);
		return runWithOwner(n, () => e(n.dispose));
	}
	function addPendingSource$1(e, t) {
		if (e.Re === t || e.Oe?.has(t)) return false;
		if (!e.Re) {
			e.Re = t;
			return true;
		}
		if (!e.Oe) e.Oe = new Set([e.Re, t]);
		else e.Oe.add(t);
		e.Re = void 0;
		return true;
	}
	function removePendingSource$1(e, t) {
		if (e.Re) {
			if (e.Re !== t) return false;
			e.Re = void 0;
			return true;
		}
		if (!e.Oe?.delete(t)) return false;
		if (e.Oe.size === 1) {
			e.Re = e.Oe.values().next().value;
			e.Oe = void 0;
		} else if (e.Oe.size === 0) e.Oe = void 0;
		return true;
	}
	function clearPendingSources$1(e) {
		e.Re = void 0;
		e.Oe?.clear();
		e.Oe = void 0;
	}
	function setPendingError$1(e, t, n) {
		if (!t) {
			e.fe = null;
			return;
		}
		if (n instanceof NotReadyError$1 && n.source === t) {
			e.fe = n;
			return;
		}
		const i = e.fe;
		if (!(i instanceof NotReadyError$1) || i.source !== t) e.fe = new NotReadyError$1(t);
	}
	function forEachDependent$1(e, t) {
		for (let n = e.I; n !== null; n = n.h) t(n.p);
		for (let n = e.A; n !== null; n = n.N) for (let e = n.I; e !== null; e = e.h) t(e.p);
	}
	function settlePendingSource$1(e) {
		let t = false;
		const n = /* @__PURE__ */ new Set();
		const settle = (i) => {
			if (n.has(i) || !removePendingSource$1(i, e)) return;
			n.add(i);
			i.Ee = clock$1;
			const r = i.Re ?? i.Oe?.values().next().value;
			if (r) {
				setPendingError$1(i, r);
				updatePendingSignal$1(i);
			} else {
				i.Se &= ~STATUS_PENDING$1;
				setPendingError$1(i);
				updatePendingSignal$1(i);
				if (i.Ue) {
					if (i.W === EFFECT_TRACKED$1) {
						const e = i;
						if (!e.H) {
							e.H = true;
							e.F.enqueue(EFFECT_USER$1, e.M);
						}
					} else {
						const e = i.O & REACTIVE_ZOMBIE$1 ? zombieQueue$1 : dirtyQueue$1;
						if (e.P > i.o) e.P = i.o;
						insertIntoHeap$1(i, e);
					}
					t = true;
				}
				i.Ue = false;
			}
			forEachDependent$1(i, settle);
		};
		forEachDependent$1(e, settle);
		if (t) schedule$1();
	}
	function handleAsync$1(e, t, n) {
		const i = typeof t === "object" && t !== null;
		const r = i && untrack$1(() => t[Symbol.asyncIterator]);
		const s = !r && i && untrack$1(() => typeof t.then === "function");
		if (!s && !r) {
			e.ye = null;
			return t;
		}
		e.ye = t;
		let o;
		const handleError = (n) => {
			if (e.ye !== t) return;
			globalQueue$1.initTransition(resolveTransition$1(e));
			notifyStatus$1(e, n instanceof NotReadyError$1 ? STATUS_PENDING$1 : STATUS_ERROR$1, n);
			e.Ee = clock$1;
		};
		const asyncWrite = (i, r) => {
			if (e.ye !== t) return;
			if (e.O & (REACTIVE_DIRTY$1 | REACTIVE_OPTIMISTIC_DIRTY$1)) return;
			globalQueue$1.initTransition(resolveTransition$1(e));
			const s = !!(e.Se & STATUS_UNINITIALIZED$1);
			clearStatus$1(e);
			const o = resolveLane$1(e);
			if (o) o.k.delete(e);
			if (n) n(i);
			else if (e.ee !== void 0) {
				if (e.ee !== void 0 && e.ee !== NOT_PENDING$1) e.X = i;
				else {
					e.J = i;
					insertSubs$1(e);
				}
				e.Ee = clock$1;
			} else if (o) {
				const t = e.W;
				const n = e.J;
				const r = e.ke;
				if (!t && s || !r || !r(i, n)) {
					e.J = i;
					e.Ee = clock$1;
					if (e.xe) setSignal$1(e.xe, i);
					insertSubs$1(e, true);
				}
			} else setSignal$1(e, () => i);
			settlePendingSource$1(e);
			schedule$1();
			flush$1();
			r?.();
		};
		if (s) {
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
				globalQueue$1.initTransition(resolveTransition$1(e));
				throw new NotReadyError$1(context$1);
			}
		}
		if (r) {
			const n = t[Symbol.asyncIterator]();
			let i = false;
			let r = false;
			cleanup$1(() => {
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
					} else if (e.ye !== t) return;
					else if (!n.done) asyncWrite(n.value, iterate);
					else {
						r = true;
						schedule$1();
						flush$1();
					}
				}, (n) => {
					if (!c && e.ye === t) {
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
				globalQueue$1.initTransition(resolveTransition$1(e));
				throw new NotReadyError$1(context$1);
			}
		}
		return o;
	}
	function clearStatus$1(e, t = false) {
		clearPendingSources$1(e);
		e.Ue = false;
		e.Se = t ? 0 : e.Se & STATUS_UNINITIALIZED$1;
		setPendingError$1(e);
		updatePendingSignal$1(e);
		e.Ge?.();
	}
	function notifyStatus$1(e, t, n, i, r) {
		if (t === STATUS_ERROR$1 && !(n instanceof StatusError$1) && !(n instanceof NotReadyError$1)) n = new StatusError$1(e, n);
		const s = t === STATUS_PENDING$1 && n instanceof NotReadyError$1 ? n.source : void 0;
		const o = s === e;
		const u = t === STATUS_PENDING$1 && e.ee !== void 0 && !o;
		const c = u && hasActiveOverride$1(e);
		if (!i) {
			if (t === STATUS_PENDING$1 && s) {
				addPendingSource$1(e, s);
				e.Se = STATUS_PENDING$1 | e.Se & STATUS_UNINITIALIZED$1;
				setPendingError$1(e, s, n);
			} else {
				clearPendingSources$1(e);
				e.Se = t | (t !== STATUS_ERROR$1 ? e.Se & STATUS_UNINITIALIZED$1 : 0);
				e.fe = n;
			}
			updatePendingSignal$1(e);
		}
		if (r && !i) assignOrMergeLane$1(e, r);
		const a = i || c;
		const l = i || u ? void 0 : r;
		if (e.Ge) {
			if (i && t === STATUS_PENDING$1) return;
			if (a) e.Ge(t, n);
			else e.Ge();
			return;
		}
		forEachDependent$1(e, (e) => {
			e.Ee = clock$1;
			if (t === STATUS_PENDING$1 && s && e.Re !== s && !e.Oe?.has(s) || t !== STATUS_PENDING$1 && (e.fe !== n || e.Re || e.Oe)) {
				if (!a && !e.K) globalQueue$1.se.push(e);
				notifyStatus$1(e, t, n, a, l);
			}
		});
	}
	var externalSourceConfig = null;
	GlobalQueue$1.oe = recompute$1;
	GlobalQueue$1.ue = disposeChildren$1;
	var tracking$1 = false;
	var stale$1 = false;
	var refreshing = false;
	var pendingCheckActive = false;
	var latestReadActive = false;
	var context$1 = null;
	var currentOptimisticLane$1 = null;
	var snapshotCaptureActive = false;
	var snapshotSources = null;
	function ownerInSnapshotScope(e) {
		while (e) {
			if (e.We) return true;
			e = e.i;
		}
		return false;
	}
	function recompute$1(e, t = false) {
		const n = e.W;
		if (!t) {
			if (e.K && (!n || activeTransition$1) && activeTransition$1 !== e.K) globalQueue$1.initTransition(e.K);
			deleteFromHeap$1(e, e.O & REACTIVE_ZOMBIE$1 ? zombieQueue$1 : dirtyQueue$1);
			e.ye = null;
			if (e.K || n === EFFECT_TRACKED$1) disposeChildren$1(e);
			else {
				markDisposal$1(e);
				e.me = e.Ve;
				e.ve = e.Ce;
				e.Ve = null;
				e.Ce = null;
				e.we = 0;
			}
		}
		const i = !!(e.O & REACTIVE_OPTIMISTIC_DIRTY$1);
		const r = e.ee !== void 0 && e.ee !== NOT_PENDING$1;
		const s = !!(e.Se & STATUS_PENDING$1);
		const o = !!(e.Se & STATUS_UNINITIALIZED$1);
		const u = context$1;
		context$1 = e;
		e.ge = null;
		e.O = REACTIVE_RECOMPUTING_DEPS$1;
		e.Ee = clock$1;
		let c = e.X === NOT_PENDING$1 ? e.J : e.X;
		let a = e.o;
		let l = tracking$1;
		let f = currentOptimisticLane$1;
		tracking$1 = true;
		if (i) {
			const t = resolveLane$1(e);
			if (t) currentOptimisticLane$1 = t;
		}
		try {
			c = handleAsync$1(e, e.L(c));
			clearStatus$1(e, t);
			const n = resolveLane$1(e);
			if (n) {
				n.k.delete(e);
				updatePendingSignal$1(n.te);
			}
		} catch (t) {
			if (t instanceof NotReadyError$1 && currentOptimisticLane$1) {
				const t = findLane$1(currentOptimisticLane$1);
				if (t.te !== e) {
					t.k.add(e);
					e.q = t;
					updatePendingSignal$1(t.te);
				}
			}
			if (t instanceof NotReadyError$1) e.Ue = true;
			notifyStatus$1(e, t instanceof NotReadyError$1 ? STATUS_PENDING$1 : STATUS_ERROR$1, t, void 0, t instanceof NotReadyError$1 ? e.q : void 0);
		} finally {
			tracking$1 = l;
			e.O = REACTIVE_NONE$1 | (t ? e.O & REACTIVE_SNAPSHOT_STALE$1 : 0);
			context$1 = u;
		}
		if (!e.fe) {
			const u = e.ge;
			let l = u !== null ? u.D : e.C;
			if (l !== null) {
				do
					l = unlinkSubs$1(l);
				while (l !== null);
				if (u !== null) u.D = null;
				else e.C = null;
			}
			const f = r ? e.ee : e.X === NOT_PENDING$1 ? e.J : e.X;
			if (!n && o || !e.ke || !e.ke(f, c)) {
				const o = r ? e.ee : void 0;
				if (t || n && activeTransition$1 !== e.K || i) {
					e.J = c;
					if (r && i) {
						e.ee = c;
						e.X = c;
					}
				} else e.X = c;
				if (r && !i && s && !e.he) e.ee = c;
				if (!r || i || e.ee !== o) insertSubs$1(e, i || r);
			} else if (r) e.X = c;
			else if (e.o != a) for (let t = e.I; t !== null; t = t.h) insertIntoHeapHeight$1(t.p, t.p.O & REACTIVE_ZOMBIE$1 ? zombieQueue$1 : dirtyQueue$1);
		}
		currentOptimisticLane$1 = f;
		(!t || e.Se & STATUS_PENDING$1) && !e.K && !(activeTransition$1 && r) && globalQueue$1.se.push(e);
		e.K && n && activeTransition$1 !== e.K && runInTransition$1(e.K, () => recompute$1(e));
	}
	function updateIfNecessary$1(e) {
		if (e.O & REACTIVE_CHECK$1) for (let t = e.C; t; t = t.D) {
			const n = t.m;
			const i = n.V || n;
			if (i.L) updateIfNecessary$1(i);
			if (e.O & REACTIVE_DIRTY$1) break;
		}
		if (e.O & (REACTIVE_DIRTY$1 | REACTIVE_OPTIMISTIC_DIRTY$1) || e.fe && e.Ee < clock$1 && !e.ye) recompute$1(e);
		e.O = e.O & (REACTIVE_IN_HEAP$1 | 272);
	}
	function computed$1(e, t, n) {
		const i = n?.transparent ?? false;
		const r = {
			id: n?.id ?? (i ? context$1?.id : context$1?.id != null ? getNextChildId(context$1) : void 0),
			be: i || void 0,
			ke: n?.equals != null ? n.equals : isEqual$1,
			le: !!n?.ownedWrite,
			Ne: n?.unobserved,
			Ve: null,
			F: context$1?.F ?? globalQueue$1,
			Le: context$1?.Le ?? defaultContext$1,
			we: 0,
			L: e,
			J: t,
			o: 0,
			A: null,
			S: void 0,
			T: null,
			C: null,
			ge: null,
			I: null,
			Ae: null,
			i: context$1,
			De: null,
			Ce: null,
			O: n?.lazy ? REACTIVE_LAZY$1 : REACTIVE_NONE$1,
			Se: STATUS_UNINITIALIZED$1,
			Ee: clock$1,
			X: NOT_PENDING$1,
			me: null,
			ve: null,
			ye: null,
			K: null
		};
		r.T = r;
		const s = context$1?.t ? context$1.u : context$1;
		if (context$1) {
			const e = context$1.Ce;
			if (e === null) context$1.Ce = r;
			else {
				r.De = e;
				context$1.Ce = r;
			}
		}
		if (s) r.o = s.o + 1;
		if (snapshotCaptureActive && ownerInSnapshotScope(context$1)) r.Te = true;
		if (externalSourceConfig) {
			const e = signal(void 0, {
				equals: false,
				ownedWrite: true
			});
			const t = externalSourceConfig.factory(r.L, () => {
				setSignal$1(e, void 0);
			});
			cleanup$1(() => t.dispose());
			r.L = (n) => {
				read$1(e);
				return t.track(n);
			};
		}
		!n?.lazy && recompute$1(r, true);
		if (snapshotCaptureActive && !n?.lazy) {
			if (!(r.Se & STATUS_PENDING$1)) {
				r.de = r.J === void 0 ? NO_SNAPSHOT : r.J;
				snapshotSources.add(r);
			}
		}
		return r;
	}
	function signal(e, t, n = null) {
		const i = {
			ke: t?.equals != null ? t.equals : isEqual$1,
			le: !!t?.ownedWrite,
			He: !!t?.He,
			Ne: t?.unobserved,
			J: e,
			I: null,
			Ae: null,
			Ee: clock$1,
			V: n,
			N: n?.A || null,
			X: NOT_PENDING$1
		};
		n && (n.A = i);
		if (snapshotCaptureActive && !i.He && !((n?.Se ?? 0) & STATUS_PENDING$1)) {
			i.de = e === void 0 ? NO_SNAPSHOT : e;
			snapshotSources.add(i);
		}
		return i;
	}
	function optimisticSignal(e, t) {
		const n = signal(e, t);
		n.ee = NOT_PENDING$1;
		return n;
	}
	function optimisticComputed(e, t, n) {
		const i = computed$1(e, t, n);
		i.ee = NOT_PENDING$1;
		return i;
	}
	function isEqual$1(e, t) {
		return e === t;
	}
	function untrack$1(e, t) {
		if (!externalSourceConfig && !tracking$1 && true) return e();
		const n = tracking$1;
		tracking$1 = false;
		try {
			if (externalSourceConfig) return externalSourceConfig.untrack(e);
			return e();
		} finally {
			tracking$1 = n;
		}
	}
	function read$1(e) {
		if (latestReadActive) {
			const t = getLatestValueComputed(e);
			const n = latestReadActive;
			latestReadActive = false;
			const i = e.ee !== void 0 && e.ee !== NOT_PENDING$1 ? e.ee : e.J;
			let r;
			try {
				r = read$1(t);
			} catch (e) {
				if (!context$1 && e instanceof NotReadyError$1) return i;
				throw e;
			} finally {
				latestReadActive = n;
			}
			if (t.Se & STATUS_PENDING$1) return i;
			if (stale$1 && currentOptimisticLane$1 && t.q) {
				const e = findLane$1(t.q);
				if (e !== findLane$1(currentOptimisticLane$1) && e.k.size > 0) return i;
			}
			return r;
		}
		if (pendingCheckActive) {
			const t = e.V;
			const n = pendingCheckActive;
			pendingCheckActive = false;
			if (t && e.ee !== void 0) {
				if (e.ee !== NOT_PENDING$1 && (t.ye || !!(t.Se & STATUS_PENDING$1)));
				let n = context$1;
				if (n?.t) n = n.u;
				if (n && tracking$1) link$1(e, n);
				read$1(getPendingSignal(e));
				read$1(getPendingSignal(t));
			} else {
				if (read$1(getPendingSignal(e)));
				if (t && read$1(getPendingSignal(t)));
			}
			pendingCheckActive = n;
			return e.J;
		}
		let t = context$1;
		if (t?.t) t = t.u;
		const n = e;
		if (typeof n.L === "function") {
			const t = e;
			if (refreshing && !(t.O & REACTIVE_DISPOSED$1)) recompute$1(t);
			if (t.O & REACTIVE_LAZY$1) {
				t.O &= ~REACTIVE_LAZY$1;
				recompute$1(t, true);
			} else if (t.O & REACTIVE_DISPOSED$1) recompute$1(t, true);
		}
		const i = e.V || e;
		if (t && tracking$1) {
			link$1(e, t);
			if (i.L) {
				const n = e.O & REACTIVE_ZOMBIE$1;
				if (i.o >= (n ? zombieQueue$1.P : dirtyQueue$1.P)) {
					markNode$1(t);
					markHeap$1(n ? zombieQueue$1 : dirtyQueue$1);
					updateIfNecessary$1(i);
				}
				const r = i.o;
				if (r >= t.o && e.i !== t) t.o = r + 1;
			}
		}
		if (i.Se & STATUS_PENDING$1) {
			if (t && !(stale$1 && i.K && activeTransition$1 !== i.K)) if (currentOptimisticLane$1) {
				const n = i.q;
				const r = findLane$1(currentOptimisticLane$1);
				if (n && findLane$1(n) === r && !hasActiveOverride$1(i)) {
					if (!tracking$1 && e !== t) link$1(e, t);
					throw i.fe;
				}
			} else {
				if (!tracking$1 && e !== t) link$1(e, t);
				throw i.fe;
			}
			else if (t && i !== e && i.Se & STATUS_UNINITIALIZED$1) {
				if (!tracking$1 && e !== t) link$1(e, t);
				throw i.fe;
			} else if (!t && i.Se & STATUS_UNINITIALIZED$1) throw i.fe;
		}
		if (e.L && e.Se & STATUS_ERROR$1) if (e.Ee < clock$1) {
			recompute$1(e);
			return read$1(e);
		} else throw e.fe;
		if (snapshotCaptureActive && t && t.Te) {
			const n = e.de;
			if (n !== void 0) {
				const i = n === NO_SNAPSHOT ? void 0 : n;
				if ((e.X !== NOT_PENDING$1 ? e.X : e.J) !== i) t.O |= REACTIVE_SNAPSHOT_STALE$1;
				return i;
			}
		}
		if (e.ee !== void 0 && e.ee !== NOT_PENDING$1) {
			if (t && stale$1 && shouldReadStashedOptimisticValue(e)) return e.J;
			return e.ee;
		}
		const r = !t || currentOptimisticLane$1 !== null && (e.ee !== void 0 || e.q || i === e && stale$1 || !!(i.Se & STATUS_PENDING$1)) || e.X === NOT_PENDING$1 || stale$1 && e.K && activeTransition$1 !== e.K ? e.J : e.X;
		if (!t && i === e && typeof n.L === "function" && !n.Pe && !(i.Se & STATUS_PENDING$1) && !n.i && !e.I) unobserved$1(e);
		return r;
	}
	function setSignal$1(e, t) {
		if (e.K && activeTransition$1 !== e.K) globalQueue$1.initTransition(e.K);
		const n = e.ee !== void 0 && !projectionWriteActive;
		const i = e.ee !== void 0 && e.ee !== NOT_PENDING$1;
		const r = n ? i ? e.ee : e.J : e.X === NOT_PENDING$1 ? e.J : e.X;
		if (typeof t === "function") t = t(r);
		if (!(!e.ke || !e.ke(r, t) || !!(e.Se & STATUS_UNINITIALIZED$1))) {
			if (n && i && e.L) {
				insertSubs$1(e, true);
				schedule$1();
			}
			return t;
		}
		if (n) {
			const n = e.ee === NOT_PENDING$1;
			if (!n) globalQueue$1.initTransition(resolveTransition$1(e));
			if (n) {
				e.X = e.J;
				globalQueue$1.Y.push(e);
			}
			e.he = true;
			e.q = getOrCreateLane$1(e);
			e.ee = t;
		} else {
			if (e.X === NOT_PENDING$1) globalQueue$1.se.push(e);
			e.X = t;
		}
		updatePendingSignal$1(e);
		if (e.xe) setSignal$1(e.xe, t);
		e.Ee = clock$1;
		insertSubs$1(e, n);
		schedule$1();
		return t;
	}
	function runWithOwner(e, t) {
		const n = context$1;
		const i = tracking$1;
		context$1 = e;
		tracking$1 = false;
		try {
			return t();
		} finally {
			context$1 = n;
			tracking$1 = i;
		}
	}
	function getPendingSignal(e) {
		if (!e.Fe) {
			e.Fe = optimisticSignal(false, { ownedWrite: true });
			if (e._e) e.Fe._e = e;
			if (computePendingState$1(e)) setSignal$1(e.Fe, true);
		}
		return e.Fe;
	}
	function computePendingState$1(e) {
		const t = e;
		const n = e.V;
		if (n && e.X !== NOT_PENDING$1) return !n.ye && !(n.Se & STATUS_PENDING$1);
		if (e.ee !== void 0 && e.ee !== NOT_PENDING$1) {
			if (t.Se & STATUS_PENDING$1 && !(t.Se & STATUS_UNINITIALIZED$1)) return true;
			if (e._e) {
				const t = e.q ? findLane$1(e.q) : null;
				return !!(t && t.k.size > 0);
			}
			return true;
		}
		if (e.ee !== void 0 && e.ee === NOT_PENDING$1 && !e._e) return false;
		if (e.X !== NOT_PENDING$1 && !(t.Se & STATUS_UNINITIALIZED$1)) return true;
		return !!(t.Se & STATUS_PENDING$1 && !(t.Se & STATUS_UNINITIALIZED$1));
	}
	function updatePendingSignal$1(e) {
		if (e.Fe) {
			const t = computePendingState$1(e);
			const n = e.Fe;
			setSignal$1(n, t);
			if (!t && n.q) {
				const t = resolveLane$1(e);
				if (t && t.k.size > 0) {
					const e = findLane$1(n.q);
					if (e !== t) mergeLanes$1(t, e);
				}
				signalLanes$1.delete(n);
				n.q = void 0;
			}
		}
	}
	function getLatestValueComputed(e) {
		if (!e.xe) {
			const t = latestReadActive;
			latestReadActive = false;
			const n = pendingCheckActive;
			pendingCheckActive = false;
			const i = context$1;
			context$1 = null;
			e.xe = optimisticComputed(() => read$1(e));
			e.xe._e = e;
			context$1 = i;
			pendingCheckActive = n;
			latestReadActive = t;
		}
		return e.xe;
	}
	function staleValues(e, t = true) {
		const n = stale$1;
		stale$1 = t;
		try {
			return e();
		} finally {
			stale$1 = n;
		}
	}
	function createContext$1(e, t) {
		return {
			id: Symbol(t),
			defaultValue: e
		};
	}
	function getContext(e, t = getOwner()) {
		if (!t) throw new NoOwnerError();
		const n = hasContext(e, t) ? t.Le[e.id] : e.defaultValue;
		if (isUndefined(n)) throw new ContextNotFoundError();
		return n;
	}
	function setContext(e, t, n = getOwner()) {
		if (!n) throw new NoOwnerError();
		n.Le = {
			...n.Le,
			[e.id]: isUndefined(t) ? e.defaultValue : t
		};
	}
	function hasContext(e, t) {
		return !isUndefined(t?.Le[e.id]);
	}
	function isUndefined(e) {
		return typeof e === "undefined";
	}
	function effect$1(e, t, n, i, r) {
		let s = false;
		const o = computed$1(r?.render ? (t) => staleValues(() => e(t)) : e, i, {
			...r,
			equals: () => {
				o.H = !o.fe;
				if (s) o.F.enqueue(o.W, runEffect.bind(o));
				return false;
			},
			lazy: true
		});
		o.Qe = i;
		o.Me = t;
		o.je = n;
		o.$e = void 0;
		o.W = r?.render ? EFFECT_RENDER$1 : EFFECT_USER$1;
		o.Ge = (e, t) => {
			const n = e !== void 0 ? e : o.Se;
			const i = t !== void 0 ? t : o.fe;
			if (n & STATUS_ERROR$1) {
				let e = i;
				o.F.notify(o, STATUS_PENDING$1, 0);
				if (o.W === EFFECT_USER$1) try {
					return o.je ? o.je(e, () => {
						o.$e?.();
						o.$e = void 0;
					}) : console.error(e);
				} catch (t) {
					e = t;
				}
				if (!o.F.notify(o, STATUS_ERROR$1, STATUS_ERROR$1)) throw e;
			} else if (o.W === EFFECT_RENDER$1) o.F.notify(o, STATUS_PENDING$1 | STATUS_ERROR$1, n, i);
		};
		recompute$1(o, true);
		!r?.defer && (o.W === EFFECT_USER$1 ? o.F.enqueue(o.W, runEffect.bind(o)) : runEffect.call(o));
		s = true;
		cleanup$1(() => o.$e?.());
	}
	function runEffect() {
		if (!this.H || this.O & REACTIVE_DISPOSED$1) return;
		this.$e?.();
		this.$e = void 0;
		try {
			this.$e = this.Me(this.J, this.Qe);
		} catch (e) {
			this.fe = new StatusError$1(this, e);
			this.Se |= STATUS_ERROR$1;
			if (!this.F.notify(this, STATUS_ERROR$1, STATUS_ERROR$1)) throw e;
		} finally {
			this.Qe = this.J;
			this.H = false;
		}
	}
	function onCleanup(e) {
		return cleanup$1(e);
	}
	function accessor$1(e) {
		const t = read$1.bind(null, e);
		t.$r = true;
		return t;
	}
	function createSignal$1(e, t) {
		if (typeof e === "function") {
			const n = computed$1(e, void 0, t);
			n.Pe = true;
			return [accessor$1(n), setSignal$1.bind(null, n)];
		}
		const n = signal(e, t);
		return [accessor$1(n), setSignal$1.bind(null, n)];
	}
	function createMemo$2(e, t) {
		return accessor$1(computed$1(e, void 0, t));
	}
	function createRenderEffect$1(e, t, n) {
		effect$1(e, t, void 0, void 0, {
			render: true,
			...n
		});
	}
	var $TRACK = Symbol(0), $PROXY = Symbol(0);
	function isWrappable$1(e) {
		return e != null && typeof e === "object" && !Object.isFrozen(e) && !(typeof Node !== "undefined" && e instanceof Node);
	}
	var DELETE$1 = Symbol(0);
	function updatePath$1(e, t, n = 0) {
		let i, r = e;
		if (n < t.length - 1) {
			i = t[n];
			const s = typeof i;
			const o = Array.isArray(e);
			if (Array.isArray(i)) {
				for (let r = 0; r < i.length; r++) {
					t[n] = i[r];
					updatePath$1(e, t, n);
				}
				t[n] = i;
				return;
			} else if (o && s === "function") {
				for (let r = 0; r < e.length; r++) if (i(e[r], r)) {
					t[n] = r;
					updatePath$1(e, t, n);
				}
				t[n] = i;
				return;
			} else if (o && s === "object") {
				const { from: r = 0, to: s = e.length - 1, by: o = 1 } = i;
				for (let i = r; i <= s; i += o) {
					t[n] = i;
					updatePath$1(e, t, n);
				}
				t[n] = i;
				return;
			} else if (n < t.length - 2) {
				updatePath$1(e[i], t, n + 1);
				return;
			}
			r = e[i];
		}
		let s = t[t.length - 1];
		if (typeof s === "function") {
			s = s(r);
			if (s === r) return;
		}
		if (i === void 0 && s == void 0) return;
		if (s === DELETE$1) delete e[i];
		else if (i === void 0 || isWrappable$1(r) && isWrappable$1(s) && !Array.isArray(s)) {
			const t = i !== void 0 ? e[i] : e;
			const n = Object.keys(s);
			for (let e = 0; e < n.length; e++) {
				const i = n[e];
				const r = Object.getOwnPropertyDescriptor(s, i);
				if (r.get || r.set) Object.defineProperty(t, i, r);
				else t[i] = r.value;
			}
		} else e[i] = s;
	}
	Object.assign(function storePath(...e) {
		return (t) => {
			updatePath$1(t, e);
		};
	}, { DELETE: DELETE$1 });
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
			const s = !!r && r[$SOURCES];
			if (s) n.push(...s);
			else n.push(typeof r === "function" ? (t = true, createMemo$2(r)) : r);
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
				const e = [];
				for (let t = 0; t < n.length; t++) e.push(...Object.keys(resolveSource(n[t])));
				return [...new Set(e)];
			}
		}, propTraps);
		const i = Object.create(null);
		let r = false;
		let s = n.length - 1;
		for (let e = s; e >= 0; e--) {
			const t = n[e];
			if (!t) {
				e === s && s--;
				continue;
			}
			const o = Object.getOwnPropertyNames(t);
			for (let n = o.length - 1; n >= 0; n--) {
				const u = o[n];
				if (u === "__proto__" || u === "constructor") continue;
				if (!i[u]) {
					r = r || e !== s;
					const n = Object.getOwnPropertyDescriptor(t, u);
					i[u] = n.get ? {
						enumerable: true,
						configurable: true,
						get: n.get.bind(t)
					} : n;
				}
			}
		}
		if (!r) return n[s];
		const o = {};
		const u = Object.keys(i);
		for (let e = u.length - 1; e >= 0; e--) {
			const t = u[e], n = i[t];
			if (n.get) Object.defineProperty(o, t, n);
			else o[t] = n.value;
		}
		o[$SOURCES] = n;
		return o;
	}
	function omit(e, ...t) {
		const n = new Set(t);
		if (SUPPORTS_PROXY && $PROXY in e) return new Proxy({
			get(t) {
				return n.has(t) ? void 0 : e[t];
			},
			has(t) {
				return !n.has(t) && t in e;
			},
			keys() {
				return Object.keys(e).filter((e) => !n.has(e));
			}
		}, propTraps);
		const i = {};
		for (const t of Object.getOwnPropertyNames(e)) if (!n.has(t)) {
			const n = Object.getOwnPropertyDescriptor(e, t);
			!n.get && !n.set && n.enumerable && n.writable && n.configurable ? i[t] = n.value : Object.defineProperty(i, t, n);
		}
		return i;
	}
	function mapArray(e, t, n) {
		const i = typeof n?.keyed === "function" ? n.keyed : void 0;
		const r = t.length > 1;
		const s = t;
		const o = computed$1(updateKeyedMap.bind({
			Ye: createOwner(),
			Ze: 0,
			Be: e,
			qe: [],
			Xe: s,
			ze: [],
			Je: [],
			et: i,
			tt: i || n?.keyed === false ? [] : void 0,
			nt: r ? [] : void 0,
			it: n?.fallback
		}));
		o.Pe = true;
		return accessor$1(o);
	}
	var pureOptions = { ownedWrite: true };
	function updateKeyedMap() {
		const e = this.Be() || [], t = e.length;
		e[$TRACK];
		runWithOwner(this.Ye, () => {
			let n, i, r = this.tt ? () => {
				this.tt[i] = signal(e[i], pureOptions);
				this.nt && (this.nt[i] = signal(i, pureOptions));
				return this.Xe(accessor$1(this.tt[i]), this.nt ? accessor$1(this.nt[i]) : void 0);
			} : this.nt ? () => {
				const t = e[i];
				this.nt[i] = signal(i, pureOptions);
				return this.Xe(() => t, accessor$1(this.nt[i]));
			} : () => {
				const t = e[i];
				return this.Xe(() => t);
			};
			if (t === 0) {
				if (this.Ze !== 0) {
					this.Ye.dispose(false);
					this.Je = [];
					this.qe = [];
					this.ze = [];
					this.Ze = 0;
					this.tt && (this.tt = []);
					this.nt && (this.nt = []);
				}
				if (this.it && !this.ze[0]) this.ze[0] = runWithOwner(this.Je[0] = createOwner(), this.it);
			} else if (this.Ze === 0) {
				if (this.Je[0]) this.Je[0].dispose();
				this.ze = new Array(t);
				for (i = 0; i < t; i++) {
					this.qe[i] = e[i];
					this.ze[i] = runWithOwner(this.Je[i] = createOwner(), r);
				}
				this.Ze = t;
			} else {
				let s, o, u, c, a, l, f, E = new Array(t), d = new Array(t), T = this.tt ? new Array(t) : void 0, S = this.nt ? new Array(t) : void 0;
				for (s = 0, o = Math.min(this.Ze, t); s < o && (this.qe[s] === e[s] || this.tt && compare(this.et, this.qe[s], e[s])); s++) if (this.tt) setSignal$1(this.tt[s], e[s]);
				for (o = this.Ze - 1, u = t - 1; o >= s && u >= s && (this.qe[o] === e[u] || this.tt && compare(this.et, this.qe[o], e[u])); o--, u--) {
					E[u] = this.ze[o];
					d[u] = this.Je[o];
					T && (T[u] = this.tt[o]);
					S && (S[u] = this.nt[o]);
				}
				l = /* @__PURE__ */ new Map();
				f = new Array(u + 1);
				for (i = u; i >= s; i--) {
					c = e[i];
					a = this.et ? this.et(c) : c;
					n = l.get(a);
					f[i] = n === void 0 ? -1 : n;
					l.set(a, i);
				}
				for (n = s; n <= o; n++) {
					c = this.qe[n];
					a = this.et ? this.et(c) : c;
					i = l.get(a);
					if (i !== void 0 && i !== -1) {
						E[i] = this.ze[n];
						d[i] = this.Je[n];
						T && (T[i] = this.tt[n]);
						S && (S[i] = this.nt[n]);
						i = f[i];
						l.set(a, i);
					} else this.Je[n].dispose();
				}
				for (i = s; i < t; i++) if (i in E) {
					this.ze[i] = E[i];
					this.Je[i] = d[i];
					if (T) {
						this.tt[i] = T[i];
						setSignal$1(this.tt[i], e[i]);
					}
					if (S) {
						this.nt[i] = S[i];
						setSignal$1(this.nt[i], i);
					}
				} else this.ze[i] = runWithOwner(this.Je[i] = createOwner(), r);
				this.ze = this.ze.slice(0, this.Ze = t);
				this.qe = e.slice(0);
			}
		});
		return this.ze;
	}
	function compare(e, t, n) {
		return e ? e(t) === e(n) : true;
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
		for (let s = 0; s < e.length; s++) try {
			let i = e[s];
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
			if (!(e instanceof NotReadyError$1)) throw e;
			i = e;
		}
		if (i) throw i;
		return r;
	}
	//#endregion
	//#region ../../node_modules/.bun/solid-js@2.0.0-beta.7/node_modules/solid-js/dist/solid.js
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
	function useContext(context) {
		return getContext(context);
	}
	function children(fn) {
		const c = createMemo$2(fn, { lazy: true });
		const memo = createMemo$2(() => flatten(c()), { lazy: true });
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
	var createMemo$1 = (...args) => (_createMemo || createMemo$2)(...args);
	var createSignal = (...args) => (_createSignal || createSignal$1)(...args);
	var createRenderEffect = (...args) => (_createRenderEffect || createRenderEffect$1)(...args);
	function createComponent(Comp, props) {
		return untrack$1(() => Comp(props || {}));
	}
	function For(props) {
		const options = "fallback" in props ? {
			keyed: props.keyed,
			fallback: () => props.fallback
		} : { keyed: props.keyed };
		return mapArray(() => props.each, props.children, options);
	}
	//#endregion
	//#region ../../node_modules/.bun/@solidjs+universal@2.0.0-beta.7+b8339d087ca3085b/node_modules/@solidjs/universal/dist/universal.js
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
	var STATUS_PENDING = 1;
	var STATUS_ERROR = 2;
	var STATUS_UNINITIALIZED = 4;
	var EFFECT_RENDER = 1;
	var EFFECT_USER = 2;
	var EFFECT_TRACKED = 3;
	var NOT_PENDING = {};
	var defaultContext = {};
	function actualInsertIntoHeap(e, t) {
		const n = (e.i?.t ? e.i.u?.o : e.i?.o) ?? -1;
		if (n >= e.o) e.o = n + 1;
		const i = e.o;
		const r = t.l[i];
		if (r === void 0) t.l[i] = e;
		else {
			const t = r.T;
			t.S = e;
			e.T = t;
			r.T = e;
		}
		if (i > t.R) t.R = i;
	}
	function insertIntoHeap(e, t) {
		let n = e.O;
		if (n & (REACTIVE_IN_HEAP | REACTIVE_RECOMPUTING_DEPS)) return;
		if (n & REACTIVE_CHECK) e.O = n & -4 | 10;
		else e.O = n | REACTIVE_IN_HEAP;
		if (!(n & REACTIVE_IN_HEAP_HEIGHT)) actualInsertIntoHeap(e, t);
	}
	function insertIntoHeapHeight(e, t) {
		let n = e.O;
		if (n & (REACTIVE_RECOMPUTING_DEPS | 24)) return;
		e.O = n | REACTIVE_IN_HEAP_HEIGHT;
		actualInsertIntoHeap(e, t);
	}
	function deleteFromHeap(e, t) {
		const n = e.O;
		if (!(n & (REACTIVE_IN_HEAP | REACTIVE_IN_HEAP_HEIGHT))) return;
		e.O = n & -25;
		const i = e.o;
		if (e.T === e) t.l[i] = void 0;
		else {
			const n = e.S;
			const r = t.l[i];
			const s = n ?? r;
			if (e === r) t.l[i] = n;
			else e.T.S = n;
			s.T = e.T;
		}
		e.T = e;
		e.S = void 0;
	}
	function markHeap(e) {
		if (e._) return;
		e._ = true;
		for (let t = 0; t <= e.R; t++) for (let n = e.l[t]; n !== void 0; n = n.S) if (n.O & REACTIVE_IN_HEAP) markNode(n);
	}
	function markNode(e, t = REACTIVE_DIRTY) {
		const n = e.O;
		if ((n & (REACTIVE_CHECK | REACTIVE_DIRTY)) >= t) return;
		e.O = n & -4 | t;
		for (let t = e.I; t !== null; t = t.h) markNode(t.p, REACTIVE_CHECK);
		if (e.A !== null) for (let t = e.A; t !== null; t = t.N) for (let e = t.I; e !== null; e = e.h) markNode(e.p, REACTIVE_CHECK);
	}
	function runHeap(e, t) {
		e._ = false;
		for (e.P = 0; e.P <= e.R; e.P++) {
			let n = e.l[e.P];
			while (n !== void 0) {
				if (n.O & REACTIVE_IN_HEAP) t(n);
				else adjustHeight(n, e);
				n = e.l[e.P];
			}
		}
		e.R = 0;
	}
	function adjustHeight(e, t) {
		deleteFromHeap(e, t);
		let n = e.o;
		for (let t = e.C; t; t = t.D) {
			const e = t.m;
			const i = e.V || e;
			if (i.L && i.o >= n) n = i.o + 1;
		}
		if (e.o !== n) {
			e.o = n;
			for (let n = e.I; n !== null; n = n.h) insertIntoHeapHeight(n.p, t);
		}
	}
	var transitions = /* @__PURE__ */ new Set();
	var dirtyQueue = {
		l: new Array(2e3).fill(void 0),
		_: false,
		P: 0,
		R: 0
	};
	var zombieQueue = {
		l: new Array(2e3).fill(void 0),
		_: false,
		P: 0,
		R: 0
	};
	var clock = 0;
	var activeTransition = null;
	var scheduled = false;
	var stashedOptimisticReads = null;
	function runLaneEffects(e) {
		for (const t of activeLanes) {
			if (t.U || t.k.size > 0) continue;
			const n = t.G[e - 1];
			if (n.length) {
				t.G[e - 1] = [];
				runQueue(n, e);
			}
		}
	}
	function queueStashedOptimisticEffects(e) {
		for (let t = e.I; t !== null; t = t.h) {
			const e = t.p;
			if (!e.W) continue;
			if (e.W === EFFECT_TRACKED) {
				if (!e.H) {
					e.H = true;
					e.F.enqueue(EFFECT_USER, e.M);
				}
				continue;
			}
			const n = e.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue;
			if (n.P > e.o) n.P = e.o;
			insertIntoHeap(e, n);
		}
	}
	function mergeTransitionState(e, t) {
		t.j = e;
		e.$.push(...t.$);
		for (const n of activeLanes) if (n.K === t) n.K = e;
		e.Y.push(...t.Y);
		for (const n of t.Z) e.Z.add(n);
		for (const [n, i] of t.B) {
			let t = e.B.get(n);
			if (!t) e.B.set(n, t = /* @__PURE__ */ new Set());
			for (const e of i) t.add(e);
		}
	}
	function resolveOptimisticNodes(e) {
		for (let t = 0; t < e.length; t++) {
			const n = e[t];
			n.q = void 0;
			if (n.X !== NOT_PENDING) {
				n.J = n.X;
				n.X = NOT_PENDING;
			}
			const i = n.ee;
			n.ee = NOT_PENDING;
			if (i !== NOT_PENDING && n.J !== i) insertSubs(n, true);
			n.K = null;
		}
		e.length = 0;
	}
	function cleanupCompletedLanes(e) {
		for (const t of activeLanes) {
			if (!(e ? t.K === e : !t.K)) continue;
			if (!t.U) {
				if (t.G[0].length) runQueue(t.G[0], EFFECT_RENDER);
				if (t.G[1].length) runQueue(t.G[1], EFFECT_USER);
			}
			if (t.te.q === t) t.te.q = void 0;
			t.k.clear();
			t.G[0].length = 0;
			t.G[1].length = 0;
			activeLanes.delete(t);
			signalLanes.delete(t.te);
		}
	}
	function schedule() {
		if (scheduled) return;
		scheduled = true;
		if (!globalQueue.ne && true) queueMicrotask(flush);
	}
	var Queue = class {
		constructor() {
			_defineProperty(this, "i", null);
			_defineProperty(this, "ie", [[], []]);
			_defineProperty(this, "re", []);
			_defineProperty(this, "created", clock);
		}
		addChild(e) {
			this.re.push(e);
			e.i = this;
		}
		removeChild(e) {
			const t = this.re.indexOf(e);
			if (t >= 0) {
				this.re.splice(t, 1);
				e.i = null;
			}
		}
		notify(e, t, n, i) {
			if (this.i) return this.i.notify(e, t, n, i);
			return false;
		}
		run(e) {
			if (this.ie[e - 1].length) {
				const t = this.ie[e - 1];
				this.ie[e - 1] = [];
				runQueue(t, e);
			}
			for (let t = 0; t < this.re.length; t++) this.re[t].run?.(e);
		}
		enqueue(e, t) {
			if (e) if (currentOptimisticLane) findLane(currentOptimisticLane).G[e - 1].push(t);
			else this.ie[e - 1].push(t);
			schedule();
		}
		stashQueues(e) {
			e.ie[0].push(...this.ie[0]);
			e.ie[1].push(...this.ie[1]);
			this.ie = [[], []];
			for (let t = 0; t < this.re.length; t++) {
				let n = this.re[t];
				let i = e.re[t];
				if (!i) {
					i = {
						ie: [[], []],
						re: []
					};
					e.re[t] = i;
				}
				n.stashQueues(i);
			}
		}
		restoreQueues(e) {
			this.ie[0].push(...e.ie[0]);
			this.ie[1].push(...e.ie[1]);
			for (let t = 0; t < e.re.length; t++) {
				const n = e.re[t];
				let i = this.re[t];
				if (i) i.restoreQueues(n);
			}
		}
	};
	var GlobalQueue = class GlobalQueue extends Queue {
		constructor(..._args) {
			super(..._args);
			_defineProperty(this, "ne", false);
			_defineProperty(this, "se", []);
			_defineProperty(this, "Y", []);
			_defineProperty(this, "Z", /* @__PURE__ */ new Set());
		}
		flush() {
			if (this.ne) return;
			this.ne = true;
			try {
				runHeap(dirtyQueue, GlobalQueue.oe);
				if (activeTransition) {
					if (!transitionComplete(activeTransition)) {
						const e = activeTransition;
						runHeap(zombieQueue, GlobalQueue.oe);
						this.se = [];
						this.Y = [];
						this.Z = /* @__PURE__ */ new Set();
						runLaneEffects(EFFECT_RENDER);
						runLaneEffects(EFFECT_USER);
						this.stashQueues(e.ae);
						clock++;
						scheduled = dirtyQueue.R >= dirtyQueue.P;
						reassignPendingTransition(e.se);
						activeTransition = null;
						if (!e.$.length && e.Y.length) {
							stashedOptimisticReads = /* @__PURE__ */ new Set();
							for (let t = 0; t < e.Y.length; t++) {
								const n = e.Y[t];
								if (n.L || n.le) continue;
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
					this.se !== activeTransition.se && this.se.push(...activeTransition.se);
					this.restoreQueues(activeTransition.ae);
					transitions.delete(activeTransition);
					const t = activeTransition;
					activeTransition = null;
					reassignPendingTransition(this.se);
					finalizePureQueue(t);
				} else {
					if (transitions.size) runHeap(zombieQueue, GlobalQueue.oe);
					finalizePureQueue();
				}
				clock++;
				scheduled = dirtyQueue.R >= dirtyQueue.P;
				runLaneEffects(EFFECT_RENDER);
				this.run(EFFECT_RENDER);
				runLaneEffects(EFFECT_USER);
				this.run(EFFECT_USER);
			} finally {
				this.ne = false;
			}
		}
		notify(e, t, n, i) {
			if (t & STATUS_PENDING) {
				if (n & STATUS_PENDING) {
					const t = i !== void 0 ? i : e.fe;
					if (activeTransition && t) {
						const n = t.source;
						let i = activeTransition.B.get(n);
						if (!i) activeTransition.B.set(n, i = /* @__PURE__ */ new Set());
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
			if (!e && activeTransition && activeTransition.Ee === clock) return;
			if (!activeTransition) activeTransition = e ?? {
				Ee: clock,
				se: [],
				B: /* @__PURE__ */ new Map(),
				Y: [],
				Z: /* @__PURE__ */ new Set(),
				$: [],
				ae: {
					ie: [[], []],
					re: []
				},
				j: false
			};
			else if (e) {
				const t = activeTransition;
				mergeTransitionState(e, t);
				transitions.delete(t);
				activeTransition = e;
			}
			transitions.add(activeTransition);
			activeTransition.Ee = clock;
			if (this.se !== activeTransition.se) {
				for (let e = 0; e < this.se.length; e++) {
					const t = this.se[e];
					t.K = activeTransition;
					activeTransition.se.push(t);
				}
				this.se = activeTransition.se;
			}
			if (this.Y !== activeTransition.Y) {
				for (let e = 0; e < this.Y.length; e++) {
					const t = this.Y[e];
					t.K = activeTransition;
					activeTransition.Y.push(t);
				}
				this.Y = activeTransition.Y;
			}
			for (const e of activeLanes) if (!e.K) e.K = activeTransition;
			if (this.Z !== activeTransition.Z) {
				for (const e of this.Z) activeTransition.Z.add(e);
				this.Z = activeTransition.Z;
			}
		}
	};
	_defineProperty(GlobalQueue, "oe", void 0);
	_defineProperty(GlobalQueue, "ue", void 0);
	_defineProperty(GlobalQueue, "ce", null);
	function insertSubs(e, t = false) {
		const n = e.q || currentOptimisticLane;
		const i = e.de !== void 0;
		for (let r = e.I; r !== null; r = r.h) {
			if (i && r.p.Te) {
				r.p.O |= REACTIVE_SNAPSHOT_STALE;
				continue;
			}
			if (t && n) {
				r.p.O |= REACTIVE_OPTIMISTIC_DIRTY;
				assignOrMergeLane(r.p, n);
			} else if (t) {
				r.p.O |= REACTIVE_OPTIMISTIC_DIRTY;
				r.p.q = void 0;
			}
			const e = r.p;
			if (e.W === EFFECT_TRACKED) {
				if (!e.H) {
					e.H = true;
					e.F.enqueue(EFFECT_USER, e.M);
				}
				continue;
			}
			const s = r.p.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue;
			if (s.P > r.p.o) s.P = r.p.o;
			insertIntoHeap(r.p, s);
		}
	}
	function commitPendingNodes() {
		const e = globalQueue.se;
		for (let t = 0; t < e.length; t++) {
			const n = e[t];
			if (n.X !== NOT_PENDING) {
				n.J = n.X;
				n.X = NOT_PENDING;
				if (n.W && n.W !== EFFECT_TRACKED) n.H = true;
			}
			if (!(n.Se & STATUS_PENDING)) n.Se &= ~STATUS_UNINITIALIZED;
			if (n.L) GlobalQueue.ue(n, false, true);
		}
		e.length = 0;
	}
	function finalizePureQueue(e = null, t = false) {
		const n = !t;
		if (n) commitPendingNodes();
		if (!t) checkBoundaryChildren(globalQueue);
		if (dirtyQueue.R >= dirtyQueue.P) runHeap(dirtyQueue, GlobalQueue.oe);
		if (n) {
			commitPendingNodes();
			resolveOptimisticNodes(e ? e.Y : globalQueue.Y);
			e ? e.Z : globalQueue.Z;
			cleanupCompletedLanes(e);
		}
	}
	function checkBoundaryChildren(e) {
		for (const t of e.re) {
			t.checkSources?.();
			checkBoundaryChildren(t);
		}
	}
	function reassignPendingTransition(e) {
		for (let t = 0; t < e.length; t++) e[t].K = activeTransition;
	}
	var globalQueue = new GlobalQueue();
	function flush() {
		if (globalQueue.ne) return;
		while (scheduled || activeTransition) globalQueue.flush();
	}
	function runQueue(e, t) {
		for (let n = 0; n < e.length; n++) e[n](t);
	}
	function reporterBlocksSource(e, t) {
		if (e.O & (REACTIVE_ZOMBIE | REACTIVE_DISPOSED)) return false;
		if (e.Re === t || e.Oe?.has(t)) return true;
		for (let n = e.C; n; n = n.D) {
			let e = n.m;
			while (e) {
				if (e === t || e.V === t) return true;
				e = e._e;
			}
		}
		return !!(e.Se & STATUS_PENDING && e.fe instanceof NotReadyError && e.fe.source === t);
	}
	function transitionComplete(e) {
		if (e.j) return true;
		if (e.$.length) return false;
		let t = true;
		for (const [n, i] of e.B) {
			let r = false;
			for (const e of i) {
				if (reporterBlocksSource(e, n)) {
					r = true;
					break;
				}
				i.delete(e);
			}
			if (!r) e.B.delete(n);
			else if (n.Se & STATUS_PENDING && n.fe?.source === n) {
				t = false;
				break;
			}
		}
		if (t) for (let n = 0; n < e.Y.length; n++) {
			const i = e.Y[n];
			if (hasActiveOverride(i) && "Se" in i && i.Se & STATUS_PENDING && i.fe instanceof NotReadyError && i.fe.source !== i) {
				t = false;
				break;
			}
		}
		t && (e.j = true);
		return t;
	}
	function currentTransition(e) {
		while (e.j && typeof e.j === "object") e = e.j;
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
	var signalLanes = /* @__PURE__ */ new WeakMap();
	var activeLanes = /* @__PURE__ */ new Set();
	function getOrCreateLane(e) {
		let t = signalLanes.get(e);
		if (t) return findLane(t);
		const n = e._e;
		const i = n?.q ? findLane(n.q) : null;
		t = {
			te: e,
			k: /* @__PURE__ */ new Set(),
			G: [[], []],
			U: null,
			K: activeTransition,
			Ie: i
		};
		signalLanes.set(e, t);
		activeLanes.add(t);
		e.he = false;
		return t;
	}
	function findLane(e) {
		while (e.U) e = e.U;
		return e;
	}
	function mergeLanes(e, t) {
		e = findLane(e);
		t = findLane(t);
		if (e === t) return e;
		t.U = e;
		for (const n of t.k) e.k.add(n);
		e.G[0].push(...t.G[0]);
		e.G[1].push(...t.G[1]);
		return e;
	}
	function resolveLane(e) {
		const t = e.q;
		if (!t) return void 0;
		const n = findLane(t);
		if (activeLanes.has(n)) return n;
		e.q = void 0;
	}
	function resolveTransition(e) {
		return resolveLane(e)?.K ?? e.K;
	}
	function hasActiveOverride(e) {
		return !!(e.ee !== void 0 && e.ee !== NOT_PENDING);
	}
	function assignOrMergeLane(e, t) {
		const n = findLane(t);
		const i = e.q;
		if (i) {
			if (i.U) {
				e.q = t;
				return;
			}
			const r = findLane(i);
			if (activeLanes.has(r)) {
				if (r !== n && !hasActiveOverride(e)) if (n.Ie && findLane(n.Ie) === r) e.q = t;
				else if (r.Ie && findLane(r.Ie) === n);
				else mergeLanes(n, r);
				return;
			}
		}
		e.q = t;
	}
	function unlinkSubs(e) {
		const t = e.m;
		const n = e.D;
		const i = e.h;
		const r = e.pe;
		if (i !== null) i.pe = r;
		else t.Ae = r;
		if (r !== null) r.h = i;
		else {
			t.I = i;
			if (i === null) {
				t.Ne?.();
				t.L && !t.Pe && !(t.O & REACTIVE_ZOMBIE) && unobserved(t);
			}
		}
		return n;
	}
	function unobserved(e) {
		deleteFromHeap(e, e.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue);
		let t = e.C;
		while (t !== null) t = unlinkSubs(t);
		e.C = null;
		e.ge = null;
		disposeChildren(e, true);
	}
	function link(e, t) {
		const n = t.ge;
		if (n !== null && n.m === e) return;
		let i = null;
		const r = t.O & REACTIVE_RECOMPUTING_DEPS;
		if (r) {
			i = n !== null ? n.D : t.C;
			if (i !== null && i.m === e) {
				t.ge = i;
				return;
			}
		}
		const s = e.Ae;
		if (s !== null && s.p === t && (!r || isValidLink(s, t))) return;
		const o = t.ge = e.Ae = {
			m: e,
			p: t,
			D: i,
			pe: s,
			h: null
		};
		if (n !== null) n.D = o;
		else t.C = o;
		if (s !== null) s.h = o;
		else e.I = o;
	}
	function isValidLink(e, t) {
		const n = t.ge;
		if (n !== null) {
			let i = t.C;
			do {
				if (i === e) return true;
				if (i === n) break;
				i = i.D;
			} while (i !== null);
		}
		return false;
	}
	function markDisposal(e) {
		let t = e.Ce;
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
		if (e.O & REACTIVE_DISPOSED) return;
		if (t) e.O = REACTIVE_DISPOSED;
		if (t && e.L) e.ye = null;
		let i = n ? e.ve : e.Ce;
		while (i) {
			const e = i.De;
			if (i.C) {
				const e = i;
				deleteFromHeap(e, e.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue);
				let t = e.C;
				do
					t = unlinkSubs(t);
				while (t !== null);
				e.C = null;
				e.ge = null;
			}
			disposeChildren(i, true);
			i = e;
		}
		if (n) e.ve = null;
		else {
			e.Ce = null;
			e.we = 0;
		}
		runDisposal(e, n);
	}
	function runDisposal(e, t) {
		let n = t ? e.me : e.Ve;
		if (!n) return;
		if (Array.isArray(n)) for (let e = 0; e < n.length; e++) {
			const t = n[e];
			t.call(t);
		}
		else n.call(n);
		t ? e.me = null : e.Ve = null;
	}
	function cleanup(e) {
		if (!context) return e;
		if (!context.Ve) context.Ve = e;
		else if (Array.isArray(context.Ve)) context.Ve.push(e);
		else context.Ve = [context.Ve, e];
		return e;
	}
	function addPendingSource(e, t) {
		if (e.Re === t || e.Oe?.has(t)) return false;
		if (!e.Re) {
			e.Re = t;
			return true;
		}
		if (!e.Oe) e.Oe = new Set([e.Re, t]);
		else e.Oe.add(t);
		e.Re = void 0;
		return true;
	}
	function removePendingSource(e, t) {
		if (e.Re) {
			if (e.Re !== t) return false;
			e.Re = void 0;
			return true;
		}
		if (!e.Oe?.delete(t)) return false;
		if (e.Oe.size === 1) {
			e.Re = e.Oe.values().next().value;
			e.Oe = void 0;
		} else if (e.Oe.size === 0) e.Oe = void 0;
		return true;
	}
	function clearPendingSources(e) {
		e.Re = void 0;
		e.Oe?.clear();
		e.Oe = void 0;
	}
	function setPendingError(e, t, n) {
		if (!t) {
			e.fe = null;
			return;
		}
		if (n instanceof NotReadyError && n.source === t) {
			e.fe = n;
			return;
		}
		const i = e.fe;
		if (!(i instanceof NotReadyError) || i.source !== t) e.fe = new NotReadyError(t);
	}
	function forEachDependent(e, t) {
		for (let n = e.I; n !== null; n = n.h) t(n.p);
		for (let n = e.A; n !== null; n = n.N) for (let e = n.I; e !== null; e = e.h) t(e.p);
	}
	function settlePendingSource(e) {
		let t = false;
		const n = /* @__PURE__ */ new Set();
		const settle = (i) => {
			if (n.has(i) || !removePendingSource(i, e)) return;
			n.add(i);
			i.Ee = clock;
			const r = i.Re ?? i.Oe?.values().next().value;
			if (r) {
				setPendingError(i, r);
				updatePendingSignal(i);
			} else {
				i.Se &= ~STATUS_PENDING;
				setPendingError(i);
				updatePendingSignal(i);
				if (i.Ue) {
					if (i.W === EFFECT_TRACKED) {
						const e = i;
						if (!e.H) {
							e.H = true;
							e.F.enqueue(EFFECT_USER, e.M);
						}
					} else {
						const e = i.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue;
						if (e.P > i.o) e.P = i.o;
						insertIntoHeap(i, e);
					}
					t = true;
				}
				i.Ue = false;
			}
			forEachDependent(i, settle);
		};
		forEachDependent(e, settle);
		if (t) schedule();
	}
	function handleAsync(e, t, n) {
		const i = typeof t === "object" && t !== null;
		const r = i && untrack(() => t[Symbol.asyncIterator]);
		const s = !r && i && untrack(() => typeof t.then === "function");
		if (!s && !r) {
			e.ye = null;
			return t;
		}
		e.ye = t;
		let o;
		const handleError = (n) => {
			if (e.ye !== t) return;
			globalQueue.initTransition(resolveTransition(e));
			notifyStatus(e, n instanceof NotReadyError ? STATUS_PENDING : STATUS_ERROR, n);
			e.Ee = clock;
		};
		const asyncWrite = (i, r) => {
			if (e.ye !== t) return;
			if (e.O & (REACTIVE_DIRTY | REACTIVE_OPTIMISTIC_DIRTY)) return;
			globalQueue.initTransition(resolveTransition(e));
			const s = !!(e.Se & STATUS_UNINITIALIZED);
			clearStatus(e);
			const o = resolveLane(e);
			if (o) o.k.delete(e);
			if (e.ee !== void 0) {
				if (e.ee !== void 0 && e.ee !== NOT_PENDING) e.X = i;
				else {
					e.J = i;
					insertSubs(e);
				}
				e.Ee = clock;
			} else if (o) {
				const t = e.W;
				const n = e.J;
				const r = e.ke;
				if (!t && s || !r || !r(i, n)) {
					e.J = i;
					e.Ee = clock;
					if (e.xe) setSignal(e.xe, i);
					insertSubs(e, true);
				}
			} else setSignal(e, () => i);
			settlePendingSource(e);
			schedule();
			flush();
			r?.();
		};
		if (s) {
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
		if (r) {
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
					} else if (e.ye !== t) return;
					else if (!n.done) asyncWrite(n.value, iterate);
					else {
						r = true;
						schedule();
						flush();
					}
				}, (n) => {
					if (!c && e.ye === t) {
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
		clearPendingSources(e);
		e.Ue = false;
		e.Se = t ? 0 : e.Se & STATUS_UNINITIALIZED;
		setPendingError(e);
		updatePendingSignal(e);
		e.Ge?.();
	}
	function notifyStatus(e, t, n, i, r) {
		if (t === STATUS_ERROR && !(n instanceof StatusError) && !(n instanceof NotReadyError)) n = new StatusError(e, n);
		const s = t === STATUS_PENDING && n instanceof NotReadyError ? n.source : void 0;
		const o = s === e;
		const u = t === STATUS_PENDING && e.ee !== void 0 && !o;
		const c = u && hasActiveOverride(e);
		if (!i) {
			if (t === STATUS_PENDING && s) {
				addPendingSource(e, s);
				e.Se = STATUS_PENDING | e.Se & STATUS_UNINITIALIZED;
				setPendingError(e, s, n);
			} else {
				clearPendingSources(e);
				e.Se = t | (t !== STATUS_ERROR ? e.Se & STATUS_UNINITIALIZED : 0);
				e.fe = n;
			}
			updatePendingSignal(e);
		}
		if (r && !i) assignOrMergeLane(e, r);
		const a = i || c;
		const l = i || u ? void 0 : r;
		if (e.Ge) {
			if (i && t === STATUS_PENDING) return;
			if (a) e.Ge(t, n);
			else e.Ge();
			return;
		}
		forEachDependent(e, (e) => {
			e.Ee = clock;
			if (t === STATUS_PENDING && s && e.Re !== s && !e.Oe?.has(s) || t !== STATUS_PENDING && (e.fe !== n || e.Re || e.Oe)) {
				if (!a && !e.K) globalQueue.se.push(e);
				notifyStatus(e, t, n, a, l);
			}
		});
	}
	GlobalQueue.oe = recompute;
	GlobalQueue.ue = disposeChildren;
	var tracking = false;
	var stale = false;
	var context = null;
	var currentOptimisticLane = null;
	function recompute(e, t = false) {
		const n = e.W;
		if (!t) {
			if (e.K && (!n || activeTransition) && activeTransition !== e.K) globalQueue.initTransition(e.K);
			deleteFromHeap(e, e.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue);
			e.ye = null;
			if (e.K || n === EFFECT_TRACKED) disposeChildren(e);
			else {
				markDisposal(e);
				e.me = e.Ve;
				e.ve = e.Ce;
				e.Ve = null;
				e.Ce = null;
				e.we = 0;
			}
		}
		const i = !!(e.O & REACTIVE_OPTIMISTIC_DIRTY);
		const r = e.ee !== void 0 && e.ee !== NOT_PENDING;
		const s = !!(e.Se & STATUS_PENDING);
		const o = !!(e.Se & STATUS_UNINITIALIZED);
		const u = context;
		context = e;
		e.ge = null;
		e.O = REACTIVE_RECOMPUTING_DEPS;
		e.Ee = clock;
		let c = e.X === NOT_PENDING ? e.J : e.X;
		let a = e.o;
		let l = tracking;
		let f = currentOptimisticLane;
		tracking = true;
		if (i) {
			const t = resolveLane(e);
			if (t) currentOptimisticLane = t;
		}
		try {
			c = handleAsync(e, e.L(c));
			clearStatus(e, t);
			const n = resolveLane(e);
			if (n) {
				n.k.delete(e);
				updatePendingSignal(n.te);
			}
		} catch (t) {
			if (t instanceof NotReadyError && currentOptimisticLane) {
				const t = findLane(currentOptimisticLane);
				if (t.te !== e) {
					t.k.add(e);
					e.q = t;
					updatePendingSignal(t.te);
				}
			}
			if (t instanceof NotReadyError) e.Ue = true;
			notifyStatus(e, t instanceof NotReadyError ? STATUS_PENDING : STATUS_ERROR, t, void 0, t instanceof NotReadyError ? e.q : void 0);
		} finally {
			tracking = l;
			e.O = REACTIVE_NONE | (t ? e.O & REACTIVE_SNAPSHOT_STALE : 0);
			context = u;
		}
		if (!e.fe) {
			const u = e.ge;
			let l = u !== null ? u.D : e.C;
			if (l !== null) {
				do
					l = unlinkSubs(l);
				while (l !== null);
				if (u !== null) u.D = null;
				else e.C = null;
			}
			const f = r ? e.ee : e.X === NOT_PENDING ? e.J : e.X;
			if (!n && o || !e.ke || !e.ke(f, c)) {
				const o = r ? e.ee : void 0;
				if (t || n && activeTransition !== e.K || i) {
					e.J = c;
					if (r && i) {
						e.ee = c;
						e.X = c;
					}
				} else e.X = c;
				if (r && !i && s && !e.he) e.ee = c;
				if (!r || i || e.ee !== o) insertSubs(e, i || r);
			} else if (r) e.X = c;
			else if (e.o != a) for (let t = e.I; t !== null; t = t.h) insertIntoHeapHeight(t.p, t.p.O & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue);
		}
		currentOptimisticLane = f;
		(!t || e.Se & STATUS_PENDING) && !e.K && !(activeTransition && r) && globalQueue.se.push(e);
		e.K && n && activeTransition !== e.K && runInTransition(e.K, () => recompute(e));
	}
	function updateIfNecessary(e) {
		if (e.O & REACTIVE_CHECK) for (let t = e.C; t; t = t.D) {
			const n = t.m;
			const i = n.V || n;
			if (i.L) updateIfNecessary(i);
			if (e.O & REACTIVE_DIRTY) break;
		}
		if (e.O & (REACTIVE_DIRTY | REACTIVE_OPTIMISTIC_DIRTY) || e.fe && e.Ee < clock && !e.ye) recompute(e);
		e.O = e.O & (REACTIVE_IN_HEAP | 272);
	}
	function computed(e, t, n) {
		const i = n?.transparent;
		const r = {
			id: n?.id ?? context?.id,
			be: i,
			ke: n?.equals != null ? n.equals : isEqual,
			le: !!n?.ownedWrite,
			Ne: n?.unobserved,
			Ve: null,
			F: context?.F ?? globalQueue,
			Le: context?.Le ?? defaultContext,
			we: 0,
			L: e,
			J: t,
			o: 0,
			A: null,
			S: void 0,
			T: null,
			C: null,
			ge: null,
			I: null,
			Ae: null,
			i: context,
			De: null,
			Ce: null,
			O: n?.lazy ? REACTIVE_LAZY : REACTIVE_NONE,
			Se: STATUS_UNINITIALIZED,
			Ee: clock,
			X: NOT_PENDING,
			me: null,
			ve: null,
			ye: null,
			K: null
		};
		r.T = r;
		const s = context?.t ? context.u : context;
		if (context) {
			const e = context.Ce;
			if (e === null) context.Ce = r;
			else {
				r.De = e;
				context.Ce = r;
			}
		}
		if (s) r.o = s.o + 1;
		!n?.lazy && recompute(r, true);
		return r;
	}
	function isEqual(e, t) {
		return e === t;
	}
	function untrack(e, t) {
		if (!tracking && true) return e();
		const n = tracking;
		tracking = false;
		try {
			return e();
		} finally {
			tracking = n;
		}
	}
	function read(e) {
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
		if (t && tracking) {
			link(e, t);
			if (i.L) {
				const n = e.O & REACTIVE_ZOMBIE;
				if (i.o >= (n ? zombieQueue.P : dirtyQueue.P)) {
					markNode(t);
					markHeap(n ? zombieQueue : dirtyQueue);
					updateIfNecessary(i);
				}
				const r = i.o;
				if (r >= t.o && e.i !== t) t.o = r + 1;
			}
		}
		if (i.Se & STATUS_PENDING) {
			if (t && true) if (currentOptimisticLane) {
				const n = i.q;
				const r = findLane(currentOptimisticLane);
				if (n && findLane(n) === r && !hasActiveOverride(i)) {
					if (!tracking && e !== t) link(e, t);
					throw i.fe;
				}
			} else {
				if (!tracking && e !== t) link(e, t);
				throw i.fe;
			}
			else if (t && i !== e && i.Se & STATUS_UNINITIALIZED) {
				if (!tracking && e !== t) link(e, t);
				throw i.fe;
			} else if (!t && i.Se & STATUS_UNINITIALIZED) throw i.fe;
		}
		if (e.L && e.Se & STATUS_ERROR) if (e.Ee < clock) {
			recompute(e);
			return read(e);
		} else throw e.fe;
		if (e.ee !== void 0 && e.ee !== NOT_PENDING) return e.ee;
		const r = !t || currentOptimisticLane !== null && (e.ee !== void 0 || e.q || !!(i.Se & STATUS_PENDING)) || e.X === NOT_PENDING || stale ? e.J : e.X;
		if (!t && i === e && typeof n.L === "function" && !n.Pe && !(i.Se & STATUS_PENDING) && !n.i && !e.I) unobserved(e);
		return r;
	}
	function setSignal(e, t) {
		if (e.K && activeTransition !== e.K) globalQueue.initTransition(e.K);
		const n = e.ee !== void 0 && true;
		const i = e.ee !== void 0 && e.ee !== NOT_PENDING;
		const r = n ? i ? e.ee : e.J : e.X === NOT_PENDING ? e.J : e.X;
		if (typeof t === "function") t = t(r);
		if (!(!e.ke || !e.ke(r, t) || !!(e.Se & STATUS_UNINITIALIZED))) {
			if (n && i && e.L) {
				insertSubs(e, true);
				schedule();
			}
			return t;
		}
		if (n) {
			const n = e.ee === NOT_PENDING;
			if (!n) globalQueue.initTransition(resolveTransition(e));
			if (n) {
				e.X = e.J;
				globalQueue.Y.push(e);
			}
			e.he = true;
			e.q = getOrCreateLane(e);
			e.ee = t;
		} else {
			if (e.X === NOT_PENDING) globalQueue.se.push(e);
			e.X = t;
		}
		updatePendingSignal(e);
		if (e.xe) setSignal(e.xe, t);
		e.Ee = clock;
		insertSubs(e, n);
		schedule();
		return t;
	}
	function computePendingState(e) {
		const t = e;
		const n = e.V;
		if (n && e.X !== NOT_PENDING) return !n.ye && !(n.Se & STATUS_PENDING);
		if (e.ee !== void 0 && e.ee !== NOT_PENDING) {
			if (t.Se & STATUS_PENDING && !(t.Se & STATUS_UNINITIALIZED)) return true;
			if (e._e) {
				const t = e.q ? findLane(e.q) : null;
				return !!(t && t.k.size > 0);
			}
			return true;
		}
		if (e.ee !== void 0 && e.ee === NOT_PENDING && !e._e) return false;
		if (e.X !== NOT_PENDING && !(t.Se & STATUS_UNINITIALIZED)) return true;
		return !!(t.Se & STATUS_PENDING && !(t.Se & STATUS_UNINITIALIZED));
	}
	function updatePendingSignal(e) {
		if (e.Fe) {
			const t = computePendingState(e);
			const n = e.Fe;
			setSignal(n, t);
			if (!t && n.q) {
				const t = resolveLane(e);
				if (t && t.k.size > 0) {
					const e = findLane(n.q);
					if (e !== t) mergeLanes(t, e);
				}
				signalLanes.delete(n);
				n.q = void 0;
			}
		}
	}
	function accessor(e) {
		const t = read.bind(null, e);
		t.$r = true;
		return t;
	}
	function createMemo(e, t) {
		return accessor(computed(e, void 0, t));
	}
	function isWrappable(e) {
		return e != null && typeof e === "object" && !Object.isFrozen(e) && !(typeof Node !== "undefined" && e instanceof Node);
	}
	var DELETE = Symbol(0);
	function updatePath(e, t, n = 0) {
		let i, r = e;
		if (n < t.length - 1) {
			i = t[n];
			const s = typeof i;
			const o = Array.isArray(e);
			if (Array.isArray(i)) {
				for (let r = 0; r < i.length; r++) {
					t[n] = i[r];
					updatePath(e, t, n);
				}
				t[n] = i;
				return;
			} else if (o && s === "function") {
				for (let r = 0; r < e.length; r++) if (i(e[r], r)) {
					t[n] = r;
					updatePath(e, t, n);
				}
				t[n] = i;
				return;
			} else if (o && s === "object") {
				const { from: r = 0, to: s = e.length - 1, by: o = 1 } = i;
				for (let i = r; i <= s; i += o) {
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
		let s = t[t.length - 1];
		if (typeof s === "function") {
			s = s(r);
			if (s === r) return;
		}
		if (i === void 0 && s == void 0) return;
		if (s === DELETE) delete e[i];
		else if (i === void 0 || isWrappable(r) && isWrappable(s) && !Array.isArray(s)) {
			const t = i !== void 0 ? e[i] : e;
			const n = Object.keys(s);
			for (let e = 0; e < n.length; e++) {
				const i = n[e];
				const r = Object.getOwnPropertyDescriptor(s, i);
				if (r.get || r.set) Object.defineProperty(t, i, r);
				else t[i] = r.value;
			}
		} else e[i] = s;
	}
	Object.assign(function storePath(...e) {
		return (t) => {
			updatePath(t, e);
		};
	}, { DELETE });
	var effect = (fn, effectFn) => createRenderEffect(fn, effectFn, { transparent: true });
	var memo = (fn, transparent) => transparent ? fn.$r ? fn : createMemo(() => fn(), { transparent: true }) : createMemo$1(() => fn());
	function createRenderer({ createElement, createTextNode, createSentinel = () => createTextNode(""), isTextNode, replaceText, insertNode, removeNode, setProperty, getParentNode, getFirstChild, getNextSibling }) {
		function insert(parent, accessor, marker, initial) {
			const multi = marker !== void 0;
			if (multi && !initial) initial = [];
			if (typeof accessor !== "function") {
				accessor = normalize(accessor, multi, true);
				if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
			}
			accessor = memo(accessor, true);
			if (multi && initial.length === 0) {
				const sentinel = createSentinel();
				insertNode(parent, sentinel, marker);
				initial = [sentinel];
			}
			effect(() => normalize(accessor, multi), (value, current = initial) => insertExpression(parent, value, current, marker));
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
					const node = getNextSibling(a[--aEnd]);
					insertNode(parentNode, b[bStart++], getNextSibling(a[aStart++]));
					insertNode(parentNode, b[--bEnd], node);
					a[aEnd] = b[bEnd];
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
			const resolved = untrack$1(fn);
			runWithOwner(null, () => applyRef(resolved, element));
		}
		return {
			render(code, element) {
				let disposer;
				createRoot((dispose) => {
					disposer = dispose;
					insert(element, code());
				});
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
	//#endregion
	//#region ../../packages/solid-fuse/dist/index.js
	var h$1 = /* @__PURE__ */ new Map(), g$1;
	function _$1(e, t) {
		h$1.set(e, t);
	}
	function v$1(e, t = {}) {
		fjs.bridge_call({
			channel: e,
			...t
		});
	}
	function y$1(e, t = {}, n) {
		b$1?.();
		let r = n?.timeout ?? 3e4, i = fjs.bridge_call({
			channel: e,
			...t
		});
		return r <= 0 ? i : new Promise((t, n) => {
			let a = setTimeout(() => {
				let t = /* @__PURE__ */ Error(`channels.call("${e}") timed out after ${r}ms`);
				t.name = "ChannelTimeoutError", n(t);
			}, r);
			i.then((e) => {
				clearTimeout(a), t(e);
			}, (e) => {
				clearTimeout(a), n(e);
			});
		});
	}
	function ne$1(e) {
		g$1 = e;
	}
	var b$1;
	function x$1(e) {
		b$1 = e;
	}
	globalThis.__dispatch = async (e, t) => {
		let n = h$1.get(e);
		try {
			let e = n ? await n(t) : void 0;
			return g$1?.(), e;
		} catch (e) {
			throw g$1?.(), e;
		}
	};
	var S$1 = {
		send: v$1,
		call: y$1,
		on: _$1
	};
	function C$1(e) {
		"@babel/helpers - typeof";
		return C$1 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
			return typeof e;
		} : function(e) {
			return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
		}, C$1(e);
	}
	function w$1(e, t) {
		if (C$1(e) != "object" || !e) return e;
		var n = e[Symbol.toPrimitive];
		if (n !== void 0) {
			var r = n.call(e, t || "default");
			if (C$1(r) != "object") return r;
			throw TypeError("@@toPrimitive must return a primitive value.");
		}
		return (t === "string" ? String : Number)(e);
	}
	function re$1(e) {
		var t = w$1(e, "string");
		return C$1(t) == "symbol" ? t : t + "";
	}
	function T$1(e, t, n) {
		return (t = re$1(t)) in e ? Object.defineProperty(e, t, {
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
				T$1(this, "_id", void 0), T$1(this, "url", void 0), T$1(this, "readyState", 0), T$1(this, "protocol", ""), T$1(this, "binaryType", "blob"), T$1(this, "bufferedAmount", 0), T$1(this, "extensions", ""), T$1(this, "onopen", null), T$1(this, "onmessage", null), T$1(this, "onclose", null), T$1(this, "onerror", null), this._id = t++, this.url = n, e.set(this._id, this), v$1("_ws", {
					op: "open",
					id: this._id,
					url: n,
					protocols: Array.isArray(r) ? r : r ? [r] : []
				});
			}
			send(e) {
				if (this.readyState !== 1) throw Error("WebSocket is not open");
				v$1("_ws", {
					op: "send",
					id: this._id,
					data: e
				});
			}
			close(e, t) {
				this.readyState === 2 || this.readyState === 3 || (this.readyState = 2, v$1("_ws", {
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
		T$1(n, "CONNECTING", 0), T$1(n, "OPEN", 1), T$1(n, "CLOSING", 2), T$1(n, "CLOSED", 3), _$1("_wsEvent", (t) => {
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
	var E$1 = 0, D$1, O$1 = class {
		constructor(e) {
			T$1(this, "id", E$1++), T$1(this, "props", {}), T$1(this, "children", []), T$1(this, "parent", void 0), this.type = e;
		}
	}, k$1 = /* @__PURE__ */ new Map();
	_$1("_functionCall", (e) => {
		k$1.get(`${e.nodeId}:${e.name}`)?.(e.value);
	});
	var A$1 = [], j$1 = new O$1("root"), M$1 = !1, N$1 = !1;
	function P$1() {
		flush$1(), M$1 = !1, A$1.length !== 0 && (v$1("_ops", { ops: A$1.slice() }), A$1.length = 0);
	}
	function F$1() {
		M$1 || N$1 || (M$1 = !0, Promise.resolve().then(P$1));
	}
	ne$1(P$1), x$1(P$1);
	var { render: ie$1, effect: ae$1, memo: oe$1, createComponent: I$1, createElement: L$1, createTextNode: R$1, insertNode: z$1, insert: B$1, spread: V$1, setProp: H$1, mergeProps: U$1, ...W$1 } = createRenderer({
		createElement(e) {
			let t = new O$1(e), n = {};
			return flutterMode !== "release" && D$1 && (n._component = D$1), A$1.push({
				op: "create",
				id: t.id,
				type: e,
				props: n
			}), t;
		},
		createTextNode(e) {
			let t = new O$1("__text__");
			return t.props.text = e, A$1.push({
				op: "create",
				id: t.id,
				type: "__text__",
				props: { text: e }
			}), t;
		},
		replaceText(e, t) {
			e.props.text = t, A$1.push({
				op: "setText",
				id: e.id,
				text: t
			}), F$1();
		},
		isTextNode(e) {
			return e.type === "__text__";
		},
		setProperty(e, t, n) {
			if (typeof n == "function") {
				k$1.set(`${e.id}:${t}`, n), e.props[t] = !0, A$1.push({
					op: "setProp",
					id: e.id,
					name: t,
					value: !0
				});
				return;
			}
			let r = n instanceof O$1 ? n : n?.node instanceof O$1 ? n.node : null;
			if (r) {
				e.props[t] = n, A$1.push({
					op: "setProp",
					id: e.id,
					name: t,
					value: { _node: r.id }
				});
				return;
			}
			e.props[t] = n, A$1.push({
				op: "setProp",
				id: e.id,
				name: t,
				value: n
			});
		},
		insertNode(e, t, n) {
			t.parent = e;
			let r;
			if (n) {
				let i = e.children.indexOf(n);
				i >= 0 ? (e.children.splice(i, 0, t), r = i) : (e.children.push(t), r = e.children.length - 1);
			} else e.children.push(t), r = e.children.length - 1;
			A$1.push({
				op: "insert",
				parentId: e.id,
				childId: t.id,
				index: r
			}), F$1();
		},
		removeNode(e, t) {
			let n = e.children.indexOf(t);
			n >= 0 && e.children.splice(n, 1), t.parent = void 0, A$1.push({
				op: "remove",
				parentId: e.id,
				childId: t.id
			}), F$1();
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
	function G$1(e, t) {
		if (flutterMode === "release") return I$1(e, t);
		let n = D$1;
		D$1 = (e.name || "").replace(/^\[.*?\]/, "") || void 0;
		try {
			return I$1(e, t);
		} finally {
			D$1 = n;
		}
	}
	function K$1(e) {
		N$1 = !0;
		let t = ie$1(e, j$1);
		return N$1 = !1, P$1(), () => {
			typeof t == "function" && t();
			for (let e of j$1.children) A$1.push({
				op: "remove",
				parentId: j$1.id,
				childId: e.id
			});
			j$1.children = [], k$1.clear();
		};
	}
	W$1.ref;
	function q$1(e, t) {
		let n = createMemo$1(e);
		return createMemo$1(() => {
			let e = n();
			switch (typeof e) {
				case "function": return untrack$1(() => e(t));
				case "string": {
					let n = L$1(e);
					return V$1(n, t), n;
				}
			}
		});
	}
	function J$1(e) {
		return q$1(() => e.component, omit(e, "component"));
	}
	function Y$1({ child: e, ...t }) {
		return {
			type: "materialPage",
			child: e,
			props: t
		};
	}
	var X$1 = createContext();
	function Z$1(e = {}) {
		let t = 0, n = untrack$1(() => {
			let t = e.initialPage;
			return typeof t == "function" ? Y$1({ child: t }) : t;
		}), [r, i] = createSignal(n ? [{
			id: t++,
			cfg: n,
			resolve: () => {}
		}] : []);
		function a(e) {
			return new Promise((n) => {
				let r = {
					id: t++,
					cfg: e,
					resolve: n
				};
				i((e) => [...e, r]);
			});
		}
		function o(e, t) {
			let n;
			i((t) => t.filter((t) => t.id === e ? (n = t, !1) : !0)), n?.resolve(t);
		}
		return getOwner() && onCleanup(() => {
			for (let e of r()) e.resolve(null);
			i([]);
		}), {
			pages: r,
			stackDepth: () => r().length,
			push: (e) => a(e),
			pop: (e) => {
				let t = r();
				if (t.length <= 1) {
					console.warn("[Fuse] nav.pop() ignored — cannot pop the root page");
					return;
				}
				o(t[t.length - 1].id, e);
			},
			pushReplacement: (e, t) => {
				let n = r();
				return n.length > 0 && o(n[n.length - 1].id, t), a(e);
			},
			popUntil: (e) => {
				let t = r();
				if (e) {
					let n = t.findLastIndex((t) => t.cfg.props.name === e);
					if (n < 0) {
						console.warn(`[Fuse] nav.popUntil(${JSON.stringify(e)}) ignored — no page with that name on the stack`);
						return;
					}
					let r = t.slice(n + 1);
					i(t.slice(0, n + 1));
					for (let e of r) e.resolve(null);
				} else {
					let e = t.slice(1);
					i(t.slice(0, 1));
					for (let t of e) t.resolve(null);
				}
			},
			replaceAll: (e) => {
				if (e.length === 0) return console.warn("[Fuse] nav.replaceAll([]) ignored — would leave the navigator empty"), [];
				let t = r();
				i([]);
				for (let e of t) e.resolve(null);
				return e.map((e) => a(e));
			},
			onDidRemovePage: (e) => o(e, null)
		};
	}
	function ce$1() {
		let e = useContext(X$1);
		if (!e) throw Error("useNavigation must be called inside a <Navigator>");
		return e;
	}
	function le$1(e) {
		let t = untrack$1(() => e.controller ?? Z$1({ initialPage: e.initialPage }));
		return G$1(X$1, {
			value: t,
			get children() {
				var e = L$1("navigator");
				return H$1(e, "onDidRemovePage", (e) => t.onDidRemovePage(e.id)), B$1(e, G$1(For, {
					get each() {
						return t.pages();
					},
					children: (e) => {
						let t = e();
						return G$1(J$1, U$1({
							get component() {
								return t.cfg.type;
							},
							get _pageId() {
								return t.id;
							}
						}, () => t.cfg.props, { get children() {
							return t.cfg.child();
						} }));
					}
				})), e;
			}
		});
	}
	function ue$1(e) {
		return (() => {
			var t = L$1("view");
			return V$1(t, e, !1), t;
		})();
	}
	function de$1(e) {
		return (() => {
			var t = L$1("text");
			return V$1(t, e, !1), t;
		})();
	}
	function Q$1(e) {
		return (() => {
			var t = L$1("icon");
			return V$1(t, e, !1), t;
		})();
	}
	function fe$1(e) {
		return (() => {
			var t = L$1("gestureDetector");
			return V$1(t, e, !1), t;
		})();
	}
	function pe$1(e) {
		return (() => {
			var t = L$1("scrollView");
			return V$1(t, e, !1), t;
		})();
	}
	function ge$1(e) {
		return (() => {
			var t = L$1("textField");
			return V$1(t, e, !1), t;
		})();
	}
	function $$1(e, t = {}) {
		let n = new O$1(e), r = {}, i = [];
		for (let [e, a] of Object.entries(t)) typeof a == "function" || a instanceof O$1 || a?.node instanceof O$1 ? i.push([e, a]) : (r[e] = a, n.props[e] = a);
		A$1.push({
			op: "create",
			id: n.id,
			type: e,
			props: r
		});
		for (let [e, t] of i) H$1(n, e, t);
		F$1();
		let a = !1, o = () => {
			a || (a = !0, A$1.push({
				op: "dispose",
				id: n.id
			}), F$1());
		};
		return getOwner() && onCleanup(o), {
			node: n,
			call: (e, t, r) => S$1.call("_handleCall", {
				node: n.id,
				method: e,
				value: t
			}, r),
			dispose: o
		};
	}
	function _e$1(e = {}) {
		let [t, n] = createSignal(e.initialScrollOffset ?? 0), { node: r, call: i, dispose: a } = $$1("scrollController", {
			...e,
			setScrollOffset: n
		});
		return {
			node: r,
			scrollOffset: t,
			animateTo: (e, t) => i("animateTo", {
				offset: e,
				...t
			}),
			jumpTo: (e) => i("jumpTo", e),
			dispose: a
		};
	}
	function ve$1() {
		let [e, t] = createSignal(!1), { node: n, call: r, dispose: i } = $$1("focusNode", { setHasFocus: t });
		return {
			node: n,
			hasFocus: e,
			focus: () => r("focus"),
			unfocus: () => r("unfocus"),
			dispose: i
		};
	}
	//#endregion
	//#region src/ui.tsx
	function Button(props) {
		return G$1(fe$1, {
			get onTap() {
				return props.onTap;
			},
			get children() {
				return G$1(ue$1, {
					padding: {
						horizontal: 16,
						vertical: 12
					},
					decoration: {
						color: "#2563eb",
						borderRadius: 8
					},
					get children() {
						return G$1(de$1, {
							color: "white",
							fontWeight: "semiBold",
							get children() {
								return props.children;
							}
						});
					}
				});
			}
		});
	}
	function Row(props) {
		return G$1(ue$1, {
			get flex() {
				return {
					direction: "horizontal",
					gap: props.gap ?? 8,
					align: "center"
				};
			},
			get children() {
				return props.children;
			}
		});
	}
	function MenuItem(props) {
		return G$1(fe$1, {
			get onTap() {
				return props.onTap;
			},
			get children() {
				return G$1(ue$1, {
					padding: 16,
					decoration: { border: { bottom: {
						width: 1,
						color: "#E5E7EB"
					} } },
					get children() {
						return G$1(de$1, {
							fontSize: 16,
							get children() {
								return props.label;
							}
						});
					}
				});
			}
		});
	}
	//#endregion
	//#region ../../packages/solid-fuse/dist/icons/material.js
	var e = (e, t = !1) => ({
		codePoint: e,
		fontFamily: "MaterialIcons",
		...t && { matchTextDirection: !0 }
	}), EY = /* @__PURE__ */ e(57947), lre = /* @__PURE__ */ e(58136), coe = /* @__PURE__ */ e(58172), Bge = /* @__PURE__ */ e(58286), x4e = /* @__PURE__ */ e(58727), _6e = /* @__PURE__ */ e(58751), est = /* @__PURE__ */ e(58873);
	//#endregion
	//#region src/screens/text-field.tsx
	function TextFieldScreen() {
		const nav = ce$1();
		const [name, setName] = createSignal("");
		const [digits, setDigits] = createSignal("");
		const focus = ve$1();
		return G$1(pe$1, {
			flex: {
				direction: "vertical",
				gap: 16
			},
			get children() {
				return [
					G$1(ue$1, {
						padding: {
							horizontal: 16,
							top: 16,
							bottom: 8
						},
						get children() {
							return [G$1(de$1, {
								fontSize: 24,
								fontWeight: "bold",
								children: "textField"
							}), G$1(de$1, {
								color: "#6B7280",
								fontSize: 14,
								children: "Reactive value, focus control, filtering"
							})];
						}
					}),
					G$1(ue$1, {
						padding: { horizontal: 16 },
						flex: {
							direction: "vertical",
							gap: 24
						},
						get children() {
							return [
								G$1(ue$1, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [
											G$1(de$1, {
												fontWeight: "semiBold",
												children: "Name"
											}),
											G$1(ge$1, {
												get value() {
													return name();
												},
												onChanged: setName,
												placeholder: "Your name",
												decoration: {
													border: "outline",
													contentPadding: 12
												}
											}),
											G$1(de$1, {
												color: "#6B7280",
												fontSize: 13,
												get children() {
													return [
														"value = \"",
														oe$1(() => name()),
														"\""
													];
												}
											}),
											G$1(Row, { get children() {
												return [G$1(Button, {
													onTap: () => setName("Override!"),
													children: "external setName"
												}), G$1(Button, {
													onTap: () => setName(""),
													children: "clear"
												})];
											} })
										];
									}
								}),
								G$1(ue$1, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [
											G$1(de$1, {
												fontWeight: "semiBold",
												children: "Focus control"
											}),
											G$1(ge$1, {
												focusNode: focus,
												placeholder: "Controlled by buttons below",
												decoration: {
													border: "outline",
													contentPadding: 12
												}
											}),
											G$1(de$1, {
												color: "#6B7280",
												fontSize: 13,
												get children() {
													return ["hasFocus = ", oe$1(() => focus.hasFocus() ? "true" : "false")];
												}
											}),
											G$1(Row, { get children() {
												return [G$1(Button, {
													onTap: () => focus.focus(),
													children: "focus"
												}), G$1(Button, {
													onTap: () => focus.unfocus(),
													children: "unfocus"
												})];
											} })
										];
									}
								}),
								G$1(ue$1, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [G$1(de$1, {
											fontWeight: "semiBold",
											children: "Digits only"
										}), G$1(ge$1, {
											get value() {
												return digits();
											},
											onChanged: setDigits,
											placeholder: "Type letters, they vanish",
											keyboardType: "number",
											allowPattern: "[0-9]",
											decoration: {
												border: "outline",
												contentPadding: 12
											}
										})];
									}
								}),
								G$1(ue$1, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [
											G$1(de$1, {
												fontWeight: "semiBold",
												children: "Slot widgets"
											}),
											G$1(ge$1, {
												placeholder: "Search…",
												get prefixIcon() {
													return G$1(Q$1, {
														data: x4e,
														size: 20,
														color: "#6B7280"
													});
												},
												decoration: {
													border: "outline",
													contentPadding: 12
												}
											}),
											G$1(ge$1, {
												placeholder: "Password",
												obscureText: true,
												get prefixIcon() {
													return G$1(Q$1, {
														data: Bge,
														size: 20,
														color: "#6B7280"
													});
												},
												decoration: {
													border: "outline",
													contentPadding: 12
												}
											})
										];
									}
								}),
								G$1(ue$1, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [G$1(de$1, {
											fontWeight: "semiBold",
											children: "Autofocus"
										}), G$1(de$1, {
											color: "#6B7280",
											fontSize: 13,
											children: "(would autofocus on mount — disabled here so it doesn't steal focus)"
										})];
									}
								})
							];
						}
					}),
					G$1(ue$1, {
						padding: 16,
						get children() {
							return G$1(Button, {
								onTap: () => nav.pop(),
								children: "Back"
							});
						}
					})
				];
			}
		});
	}
	//#endregion
	//#region src/screens/icon.tsx
	function IconScreen() {
		const nav = ce$1();
		const [size, setSize] = createSignal(32);
		const [color, setColor] = createSignal("#111827");
		return G$1(pe$1, {
			flex: {
				direction: "vertical",
				gap: 16
			},
			get children() {
				return [
					G$1(ue$1, {
						padding: {
							horizontal: 16,
							top: 16,
							bottom: 8
						},
						get children() {
							return [G$1(de$1, {
								fontSize: 24,
								fontWeight: "bold",
								children: "icon"
							}), G$1(de$1, {
								color: "#6B7280",
								fontSize: 14,
								children: "Baseline icon rendering + reactive props"
							})];
						}
					}),
					G$1(ue$1, {
						padding: { horizontal: 16 },
						flex: {
							direction: "vertical",
							gap: 24
						},
						get children() {
							return [
								G$1(ue$1, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [G$1(de$1, {
											fontWeight: "semiBold",
											children: "Static grid"
										}), G$1(ue$1, {
											flex: {
												direction: "horizontal",
												gap: 16,
												align: "center"
											},
											get children() {
												return [
													G$1(Q$1, {
														data: x4e,
														size: 32
													}),
													G$1(Q$1, {
														data: Bge,
														size: 32
													}),
													G$1(Q$1, {
														data: lre,
														size: 32
													}),
													G$1(Q$1, {
														data: _6e,
														size: 32
													}),
													G$1(Q$1, {
														data: EY,
														size: 32,
														color: "#EF4444"
													}),
													G$1(Q$1, {
														data: est,
														size: 32,
														color: "#F59E0B"
													})
												];
											}
										})];
									}
								}),
								G$1(ue$1, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [
											G$1(de$1, {
												fontWeight: "semiBold",
												children: "Reactive props"
											}),
											G$1(ue$1, {
												flex: {
													direction: "horizontal",
													gap: 12,
													align: "center"
												},
												padding: 12,
												get children() {
													return [G$1(Q$1, {
														data: EY,
														get size() {
															return size();
														},
														get color() {
															return color();
														}
													}), G$1(de$1, {
														color: "#6B7280",
														fontSize: 13,
														get children() {
															return [
																"size = ",
																oe$1(() => size()),
																", color = ",
																oe$1(() => color())
															];
														}
													})];
												}
											}),
											G$1(Row, { get children() {
												return [
													G$1(Button, {
														onTap: () => setSize(16),
														children: "16"
													}),
													G$1(Button, {
														onTap: () => setSize(32),
														children: "32"
													}),
													G$1(Button, {
														onTap: () => setSize(64),
														children: "64"
													})
												];
											} }),
											G$1(Row, { get children() {
												return [
													G$1(Button, {
														onTap: () => setColor("#EF4444"),
														children: "red"
													}),
													G$1(Button, {
														onTap: () => setColor("#10B981"),
														children: "green"
													}),
													G$1(Button, {
														onTap: () => setColor("#3B82F6"),
														children: "blue"
													})
												];
											} })
										];
									}
								}),
								G$1(ue$1, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [G$1(de$1, {
											fontWeight: "semiBold",
											children: "Icon + text row"
										}), G$1(ue$1, {
											flex: {
												direction: "horizontal",
												gap: 8,
												align: "center"
											},
											padding: 12,
											get children() {
												return [G$1(Q$1, {
													data: coe,
													size: 20,
													color: "#3B82F6"
												}), G$1(de$1, { children: "Inline icon + text composition" })];
											}
										})];
									}
								})
							];
						}
					}),
					G$1(ue$1, {
						padding: 16,
						get children() {
							return G$1(Button, {
								onTap: () => nav.pop(),
								children: "Back"
							});
						}
					})
				];
			}
		});
	}
	//#endregion
	//#region src/screens/scroll.tsx
	function ScrollScreen() {
		const nav = ce$1();
		const scroll = _e$1({ initialScrollOffset: 120 });
		return G$1(pe$1, {
			controller: scroll,
			flex: {
				direction: "vertical",
				gap: 12
			},
			get children() {
				return [
					G$1(ue$1, {
						padding: {
							horizontal: 16,
							top: 16,
							bottom: 8
						},
						flex: {
							direction: "vertical",
							gap: 4
						},
						get children() {
							return [G$1(de$1, {
								fontSize: 24,
								fontWeight: "bold",
								children: "scrollController"
							}), G$1(de$1, {
								color: "#6B7280",
								fontSize: 14,
								children: "initialScrollOffset, reactive offset, imperative scroll"
							})];
						}
					}),
					G$1(ue$1, {
						padding: { horizontal: 16 },
						flex: {
							direction: "vertical",
							gap: 8
						},
						get children() {
							return [G$1(de$1, {
								fontWeight: "semiBold",
								get children() {
									return ["scrollOffset = ", oe$1(() => scroll.scrollOffset().toFixed(1))];
								}
							}), G$1(pe$1, {
								scrollDirection: "horizontal",
								flex: {
									direction: "horizontal",
									gap: 8,
									align: "center"
								},
								get children() {
									return [G$1(Button, {
										onTap: () => scroll.jumpTo(0),
										children: "jumpTo(0)"
									}), G$1(Button, {
										onTap: () => scroll.animateTo(1200, { duration: 800 }),
										children: "animateTo(1200)"
									})];
								}
							})];
						}
					}),
					G$1(ue$1, {
						padding: 16,
						flex: {
							direction: "vertical",
							gap: 8
						},
						get children() {
							return Array.from({ length: 40 }, (_, i) => G$1(ue$1, {
								padding: 16,
								decoration: {
									color: i % 2 === 0 ? "#F3F4F6" : "#E5E7EB",
									borderRadius: 8
								},
								get children() {
									return G$1(de$1, { get children() {
										return ["row ", i];
									} });
								}
							}));
						}
					}),
					G$1(ue$1, {
						padding: 16,
						get children() {
							return G$1(Button, {
								onTap: () => nav.pop(),
								children: "Back"
							});
						}
					})
				];
			}
		});
	}
	//#endregion
	//#region src/screens/home.tsx
	function HomeScreen() {
		const nav = ce$1();
		return G$1(ue$1, {
			flex: { direction: "vertical" },
			get children() {
				return [
					G$1(ue$1, {
						padding: {
							horizontal: 16,
							top: 24,
							bottom: 12
						},
						get children() {
							return [G$1(de$1, {
								fontSize: 28,
								fontWeight: "bold",
								children: "solid-fuse demos"
							}), G$1(de$1, {
								color: "#6B7280",
								fontSize: 14,
								children: "Playground for widget primitives"
							})];
						}
					}),
					G$1(MenuItem, {
						label: "textField",
						onTap: () => nav.push(Y$1({ child: () => G$1(TextFieldScreen, {}) }))
					}),
					G$1(MenuItem, {
						label: "icon",
						onTap: () => nav.push(Y$1({ child: () => G$1(IconScreen, {}) }))
					}),
					G$1(MenuItem, {
						label: "scrollController",
						onTap: () => nav.push(Y$1({ child: () => G$1(ScrollScreen, {}) }))
					})
				];
			}
		});
	}
	//#endregion
	//#region src/index.tsx
	var App = () => G$1(le$1, { initialPage: () => G$1(HomeScreen, {}) });
	K$1(App);
	//#endregion
})();
