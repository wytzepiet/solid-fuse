(function() {
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/core/error.js
	/**
	* Thrown by a tracked read whose value is currently pending (an async memo /
	* `createSignal(asyncFn)` / projection / store derivation that hasn't settled
	* yet). Surfacing through the reactive graph is what suspends the consumer
	* scope — the nearest enclosing `<Loading>` boundary catches the throw and
	* renders its fallback until the source resolves.
	*
	* App code rarely catches this directly; `<Loading>` is the canonical
	* handler. The error type is exposed for advanced cases — e.g. interop layers
	* that bridge Solid's pending-throw protocol to a different async strategy,
	* or tests that want to assert on the suspension shape.
	*
	* @example
	* ```ts
	* // Advanced: distinguish "not ready yet" from a real error in custom
	* // boundary plumbing. App code should rely on `<Loading>` / `<Errored>`.
	* try {
	*   const value = readReactiveSource();
	* } catch (err) {
	*   if (err instanceof NotReadyError) throw err; // re-throw to suspend
	*   reportError(err);
	* }
	* ```
	*/
	var NotReadyError = class extends Error {
		constructor(r) {
			const o = Error;
			const t = o.stackTraceLimit;
			if (t) o.stackTraceLimit = 0;
			super();
			if (t) o.stackTraceLimit = t;
			this.source = r;
		}
	};
	var StatusError = class extends Error {
		constructor(r, o) {
			try {
				var t = String(o instanceof Error ? o.message : o);
			} catch {}
			super(t, { cause: o });
			this.source = r;
		}
	};
	/** Return the user's error from an internal status wrapper. */ function unwrapStatusError(r) {
		return r instanceof StatusError ? r.cause : r;
	}
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
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/core/constants.js
	var REACTIVE_MANUAL_WRITE = 1024;
	/** L2, rule 3 — the node's LAST pass was a render effect's read of the
	* future as committed (`frameRead`): the frame shows the committed world
	* beside a future it also derives from, and re-derives at the landing.
	* Survives its own pass's wipe; the next pass's wipe clears it (a pass that
	* re-derived the frame — in the future, or without the held read — owes the
	* landing nothing). The landing consumes it (the transaction's `_reruns`). */ var REACTIVE_FRAME_READ = 2048;
	/**
	* A dependency write landed while this subscriber was mid-recompute — a
	* nested pull committed beneath one of its reads (#3037). The heap refuses
	* RECOMPUTING nodes, so recompute's tail consumes this latch and reschedules:
	* values the pass read before the nested commit are stale. Only set for
	* links validated this pass (gen-current): a write to an untouched link is
	* either re-read later in the pass (fresh) or trimmed with it (not a dep).
	*/ var REACTIVE_MISSED_WAKE = 4096;
	/** A `refresh()` asked this node to re-ask its question (F-9, D-23):
	* consumed by the next pass, which — going pending — classifies its flight
	* quiet (`_x._reask`). */ var REACTIVE_REASK = 8192;
	/** The pass was served a node's ambient staging — written this flush, not
	* held. If the flush parks, the pass is the frame's with it (the same sync
	* frame as the async): a verdict read cannot break it out. Per pass. */ var REACTIVE_STAGED_READ = 16384;
	/** The pass entered a verdict window (`isPending`/`latest`). Per pass: a
	* pass that did not keeps CONFIG_VERDICT no longer — the frame-reader
	* posture lasts exactly as long as the probing does. */ var REACTIVE_PROBED = 32768;
	/** Lanes — the node (a lane's member) was dirtied by the lane's own
	* re-staging (a re-guess, lane work re-derived): its next pass is the
	* lane's from the start (`recompute`), not a stale reader's re-run by an
	* unrelated write (#3460). Consumed by the pass. */ var REACTIVE_LANE_DIRTY = 65536;
	/** Lanes — the pass read a lane's value as lane work (`enterLane`): a
	* tracked derivation's read of displayed optimism, a verdict read routed
	* into the holder's verdict lane. A pass in a lane's seat that read none of
	* its world has left the lane (`recompute`'s tail). Per pass. */ var REACTIVE_LANE_READ = 1 << 17;
	/** Lanes — a render effect in the frame's seat was served the screen
	* for a lane's node (`laneRead`: a stale reader of a lane that has not
	* shown). Its pass computing exactly what it last applied has nothing to
	* run — an effect has no comparator, and the guess's notification is not a
	* change it can see. Per pass. */ var REACTIVE_SCREEN_READ = 1 << 18;
	/** A verdict reader whose probe was answered before the flush had a
	* transaction (verdict.ts `watchVerdict`): the seam re-runs it even if a
	* later read of the same pass routed it into a verdict lane — that was not
	* the probe's answer (lanes.ts). Per pass. */ var REACTIVE_PROBE_UNANSWERED = 1 << 19;
	/** The pass opened a verdict window of its own (`isPending`/`latest`) — not
	* only read a verdict memo (F-6, core.ts `read`). An async memo whose pass
	* did not is D-25's hold work while its flight is up (verdict.ts
	* `holdWork`). Per pass. */ var REACTIVE_WINDOW = 1 << 21;
	/** #4544: a render effect born into a hold read a settled verdict reader's
	* value this pass (core.ts `read`). Per pass: `recompute`'s tail keeps it as
	* CONFIG_AHEAD. */ var REACTIVE_AHEAD = 1 << 20;
	/** An observation-lifecycle node found unobserved by a settle (#2934) while
	* a pass of it was already queued — a source's landing re-enqueued the
	* `_blocked` reader it walks (`settlePendingSource`). The release waits for
	* that pass: a memo nobody read has still produced what the flushes it
	* missed gave it (D-22, #4474), so the queued pass runs, then `recompute`'s
	* tail releases the node. Survives the head wipe; the tail consumes it. */ var REACTIVE_RELEASE_AFTER = 1 << 22;
	/** A computed its own owner reads (a memo reading the memo it created): the
	* owner sits below it (heights put owners first), so a wake of it wakes the
	* owner too — the owner's pass re-creates it and is what its readers see. */ var REACTIVE_OWNER_READS = 1 << 23;
	/** A member of the uncommitted frame a held pass built (ruling A): set at
	* the park seam on every computed under a staged node (`holdFrame`). Never
	* shown, it has no screen: its reads are its transaction's, whichever flush
	* runs it (`bornInto`, #4010). Cleared by its commit. */ var CONFIG_HELD_FRAME = 1 << 20;
	/** F-1 (#3305): a commit published this flight's inputs
	* beneath it — the node was pending, nothing staged, when it committed — so
	* its committed value is torn against the visible frame. A render effect
	* revealing it cannot be a stale reader: it observes the flight (pends,
	* holds) instead of showing the pre-flight value. Outlives the flight that
	* earned it for as long as the node stays pending, and no longer: the
	* commit that lands a value clears it. */ var CONFIG_INPUTS_PUBLISHED = 1024;
	/** D-41: the staged value in `_pendingValue` is an error — an
	* answer of the held frame, published at its landing like a value. */ var CONFIG_STAGED_ERROR = 1 << 21;
	/** The node's pass read a verdict (`isPending`/`latest`): a dependency going
	* pending is a question for its next pass — the verdict changed — so the
	* propagation re-derives it instead of marking it pending (as a kept-tail
	* link does, D-10). Set at the window, never cleared: a reader that stopped
	* asking re-derives once and goes pending through its own read. The same
	* bit as REACTIVE_PROBED: a pass's probe (or a read of a verdict memo,
	* core.ts `read`) carries into the config at its end without a shift. */ var CONFIG_VERDICT = 32768;
	/** F-10: the node was written inside a recompute that ran OUTSIDE a flush
	* (a creation-time compute — boundary machinery, a mapArray's first run). Such
	* a write is promoted at that recompute's end: readers in the same block see
	* it. Cleared when the next flush begins; set only on that rare path. */ var CONFIG_PROMOTED = 1 << 22;
	/** A render effect created by a pass that probed (`isPending`/`latest`) —
	* the mount a display-ahead `Show` opens (S-46, D-25). Stamped at its first
	* pass; its first read of a hold's staging or flight is born held, not a
	* D-3 leaf of the screen, and the verdict lane that opened it reveals with
	* the landing (lanes.ts `mountPending`). */ var CONFIG_MOUNT_AHEAD = 1 << 24;
	/** The node's last answering pass registered a flight: an async memo. Kept
	* by the verdict engine alone (verdict.ts `holdWork`), which reads it. */ var CONFIG_ASYNC = 1 << 29;
	var NOT_PENDING = {};
	var NO_SNAPSHOT = {};
	var SUPPORTS_PROXY = typeof Proxy === "function";
	var defaultContext = {};
	/**
	* Brand symbol used by `Refreshable<T>` values (projection stores, async
	* memos) to expose their underlying computation to `refresh()`. Not part of
	* the user-facing API.
	*
	* @internal
	*/ var $REFRESH = Symbol("refresh");
	var NewSet = Set;
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/core/owner.js
	function markDisposal(e) {
		let n = e.pe;
		while (n) {
			n.R |= 32;
			markDisposal(n);
			n = n.Ge;
		}
	}
	var cleanupError;
	/** Runs a cleanup or `unobserved` hook; a throw is collected, not raised. @internal */ function runCleanup(e) {
		try {
			e();
		} catch (e) {
			cleanupError || (cleanupError = [e]);
			schedule();
		}
	}
	/** Rethrows the error `runCleanup` collected, once; `drop` discards it. @internal */ function rethrowCleanupError(e) {
		const n = cleanupError;
		cleanupError = void 0;
		if (n && !e) throw n[0];
	}
	function disposeChildren(e, n = false, r) {
		const t = e.R;
		if (t & 64) return;
		if (n) {
			if (!r && e.T !== null && (e.T.me !== null || e.T.Le !== null)) disposeChildren(e, false, true);
			e.R = t | 64;
			if (e.X) {
				clearInFlight(e);
				if (e.m & 1 && e.T?.Re != null || t & 2048 || pendingNodes.length) schedule();
			}
		}
		let l = r ? e.T.me : e.pe;
		if (r) e.T.me = null;
		else e.pe = null;
		while (l) {
			l.l &= -33;
			deleteFromHeap(l, dirtyQueue);
			clearDeps(l);
			l.Me = l;
			disposeChildren(l, true);
			l = l.Ge;
		}
		if (!r) e.be = 0;
		if (n && !r && !(t & 32) && e._parent !== null && !(e._parent.R & 64)) {
			const n = e.Me;
			const r = e.Ge;
			if (n !== null) n.Ge = r;
			else e._parent.pe = r;
			if (r !== null) r.Me = n;
			e.Me = null;
		}
		runDisposal(e, r);
		if (n && e.ze) {
			const n = e.ze;
			e.ze = void 0;
			runCleanup(n);
		}
	}
	function linkChild(e, n) {
		const r = e.pe;
		n.Me = null;
		n.Ge = r;
		if (r !== null) r.Me = n;
		e.pe = n;
	}
	function runDisposal(e, n) {
		const r = n ? e.T.Le : e.ke;
		if (!r) return;
		if (n) e.T.Le = null;
		else e.ke = null;
		if (Array.isArray(r)) for (let e = r.length - 1; e >= 0; e--) runCleanup(r[e]);
		else runCleanup(r);
	}
	function childId(e, n) {
		while (e.l & 4 && e._parent) e = e._parent;
		if (e.id != null) return formatId(e.id, n ? e.be++ : e.be);
		throw new Error();
	}
	/**
	* Allocates and returns the next stable child id for `owner`. Used by
	* hydration plumbing and `createUniqueId`. Not part of the user-facing API.
	*
	* @internal
	*/ function getNextChildId(e) {
		return childId(e, true);
	}
	/**
	* The id a freshly-created node inherits: an explicit `options.id` wins;
	* transparent nodes share their parent's id; otherwise the parent's next
	* child id is consumed (or `undefined` outside an id-carrying tree).
	*/ function inheritId(e, n, r) {
		return e?.id ?? (n ? r?.id : r?.id != null ? getNextChildId(r) : void 0);
	}
	function formatId(e, n) {
		const r = n.toString(36), t = r.length - 1;
		return e + (t ? String.fromCharCode(64 + t) : "") + r;
	}
	/**
	* Returns the current reactive **owner** — the lifecycle node that the next
	* `cleanup()` / `onCleanup()` / `createSignal()` etc. will be attached to.
	*
	* Returns `null` if called outside any owner. Capture the owner with
	* `getOwner()` and re-enter it later with `runWithOwner(owner, fn)` to attach
	* disposables created from a callback (event handler, async resolution, etc.)
	* back to a component's lifecycle.
	*
	* @example
	* ```ts
	* function defer<T>(fn: () => T) {
	*   const owner = getOwner();
	*   queueMicrotask(() => runWithOwner(owner, fn));
	* }
	* ```
	*/ function getOwner() {
		return context;
	}
	/**
	* Low-level: registers `fn` as a disposal callback on the current owner.
	* Most code should use `onCleanup()` from `solid-js`, which adds dev-mode
	* checks. `cleanup()` is the unchecked primitive used by internals; `owner`
	* (internal) targets a specific owner's disposal list instead of the ambient
	* one.
	*/ function cleanup(e, n = context) {
		if (!n) return e;
		if (!n.ke) n.ke = e;
		else if (Array.isArray(n.ke)) n.ke.push(e);
		else n.ke = [n.ke, e];
		return e;
	}
	function disposeRootSelf(e = true) {
		disposeChildren(this, e);
		if (cleanupError && !globalQueue.Y) rethrowCleanupError();
	}
	/**
	* Creates a fresh owner attached as a child of the current owner (or as a
	* detached root if there is none). Used by framework internals to group
	* cleanups; app code should use `createRoot()` (host a reactive scope outside
	* a component) or `runWithOwner()` (re-enter a captured owner).
	*
	* @internal
	*/ function createOwner(e) {
		const n = context;
		const r = e?.transparent ?? false;
		const t = {
			id: inheritId(e, r, n),
			l: r ? 4 : 0,
			R: 0,
			Qe: true,
			Ke: n?.Qe ? n.Ke : n,
			pe: null,
			Ge: null,
			Me: null,
			ke: null,
			A: n?.A || defaultContext,
			be: 0,
			T: null,
			_parent: n,
			dispose: disposeRootSelf
		};
		if (n) linkChild(n, t);
		return t;
	}
	/**
	* Creates a reactive root — an owner scope with its own `dispose()`. A root
	* created inside an existing owner is owned by it and is disposed when the
	* parent is disposed; call `dispose()` to tear it down earlier. To create a
	* root that outlives its creator, detach explicitly:
	* `runWithOwner(null, () => createRoot(...))`. Pass `id` to seed hydration
	* ids for the tree it owns.
	*
	* `dispose()` tears down every signal, memo, effect, and `onCleanup`
	* registered inside the root.
	*
	* Use this to host long-lived reactive scopes outside of a component (custom
	* controllers, app bootstrapping, tests). Inside a component, prefer
	* letting Solid's component lifecycle own things.
	*
	* @example
	* ```ts
	* // At module level there is no owner, so this root lives until disposed.
	* const dispose = createRoot(dispose => {
	*   const [n, setN] = createSignal(0);
	*   createEffect(() => n(), value => console.log(value));
	*   setInterval(() => setN(x => x + 1), 1000);
	*   return dispose;
	* });
	*
	* // Later, to tear everything down:
	* dispose();
	*
	* // Inside an owner (component, effect, another root), detach explicitly
	* // if the root must outlive its creator:
	* const detached = runWithOwner(null, () => createRoot(d => d));
	* ```
	*
	* @description https://docs.solidjs.com/reference/solid-js/advanced/owner-introspection/create-root
	*/ function createRoot$1(e, n) {
		const r = createOwner(n);
		return runWithOwner(r, () => e(disposeRootSelf.bind(r, true)));
	}
	// \0@oxc-project+runtime@0.156.0/helpers/esm/typeof.js
	function _typeof(o) {
		"@babel/helpers - typeof";
		return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
			return typeof o;
		} : function(o) {
			return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
		}, _typeof(o);
	}
	// \0@oxc-project+runtime@0.156.0/helpers/esm/toPrimitive.js
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
	// \0@oxc-project+runtime@0.156.0/helpers/esm/toPropertyKey.js
	function toPropertyKey(t) {
		var i = toPrimitive(t, "string");
		return "symbol" == _typeof(i) ? i : i + "";
	}
	// \0@oxc-project+runtime@0.156.0/helpers/esm/defineProperty.js
	function _defineProperty(e, r, t) {
		return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
			value: t,
			enumerable: !0,
			configurable: !0,
			writable: !0
		}) : e[r] = t, e;
	}
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/core/scheduler.js
	var laneReadHook = null;
	var laneStageHook = null;
	var laneOutcomeHook = null;
	var laneWriteHook = null;
	var applyGuessesHook = null;
	var laneSeamsHook = null;
	var laneCorrectionsHook = null;
	var endLanesHook = null;
	var lanesBlockedHook = null;
	/** R5 (verdict.ts: the seam parks a frame flight of a reader that reads
	* ahead): the landing's re-derive of the reader adopts the flight instead
	* (`adoptParked`; true: adopted, nothing to queue). */ var laneAdoptHook = null;
	/** core.ts `frameRead` served lane work or a verdict reader a held node's
	* committed value (lanes.ts `laneServed`). */ var laneServedHook = null;
	/** A guess was written (guesses.ts `optimisticWrite`): the arms only a guess
	* reaches (CONFIG_GUESS) — a build without `createOptimistic` or
	* `createOptimisticStore` never sets it, and its bundler folds them. */ var guessing = false;
	var catchHook = null;
	var freshHook = null;
	var hiddenHook = null;
	var boundarySeamHook = null;
	var heldRunHook = null;
	/** Store (store/store.ts): `park` — the flush parked into `t`: the store
	* materializes and holds the container node of every staging that had none
	* (a staging needs the node as its home only when something can read the
	* frame through it; a hold can); `commit` — fold the pending backings whose
	* container nodes this flush committed (the owned-raw model's one mutation
	* point). */ var storeParkHook = null;
	var storeCommitHook = null;
	/** `affects()` marks (affects.ts): the releases at a landing and at the seam
	* (ambient marks). */ var releaseMarksHook = null;
	var releaseAmbientMarksHook = null;
	/** Verdicts (verdict.ts). */ var observeFlightHook = null;
	/** D-25's hold work (verdict.ts `holdWork`): on `source` going pending,
	* whether verdict reader `n` waits on it instead of re-deriving. */ var holdWorkHook = null;
	/** D-41's staged-error mark (verdict.ts `stageMark`): the settle walk's
	* reached node `n` carries staged error source `el`'s staging. */ var stageMarkHook = null;
	/** #4417 (verdict.ts `keepReaders`); a landing's held re-derivation run (verdict.ts `attachWaits`). */ var keepReadersHook = null;
	var attachHook = null;
	/** #4544 (verdict.ts). Null without the verdict engine. */ var holdStagingHook = null;
	/** D-8 (verdict engine), at the flush: the readers a tick netting to its
	* starting value woke are let go (verdict.ts `revert`). */ var revertHook = null;
	/** Verdict engine, a pass's head (D-22, D-41: the held error `latest` keeps
	* showing) and, with `tail`, its end
	* (A19 exc. 2: whether it asked the committed question again). */ var passHook = null;
	/** External-source bridge (wired by enableExternalSource(); undefined while
	* no config is active — including after _resetExternalSourceConfig()). */ var wireExternalSourceHook = void 0;
	var externalUntrackHook = void 0;
	/** Live transactions — opened, unmerged, not landed. Scanned at every seam
	* while non-empty; nothing on the plain path. */ var transactions = [];
	/** A transaction (listed here) or a lane (lanes.ts lists its own). */ function newTransaction(e, o = null) {
		const n = {
			ln: [],
			rn: [[], []],
			fn: [],
			eo: null,
			_parent: o,
			P: e,
			Pe: null,
			tt: 0,
			nt: false,
			nn: null,
			Ue: false,
			un: false,
			I: null
		};
		if (!e) transactions.push(n);
		return n;
	}
	/** The lane the running pass is work of; set at `recompute`'s head from the
	* node, moved by a derivation's lane read, saved and restored around the
	* pass. */ var passLane = null;
	function setPassLane(e) {
		passLane = e;
	}
	/** The transaction this flush parks into: set by the first join, merged
	* with every further one. Consumed at the seam. A join outside a flush (a
	* mount's pending observer, a write to a held node, an action opening)
	* schedules the seam that consumes it: membership is the tick's — the same
	* synchronous frame — and the next tick's writes are not this one's. */ var flushTransaction = null;
	/** The transaction the passes running OUTSIDE a flush this tick derive from
	* (a mainline mount, a mainline re-pass): the passes' own (A29, creation-
	* time form — "the entry is the pass's alone"): their results are staged
	* into it, and nothing else in the tick is — a write made after the mount
	* is a mainline write, a render effect mounted beside it a stale reader.
	* Inside a flush, or in a tick that already has its transaction (an
	* action's body), the frame joins instead (`flushTransaction`) — except a
	* first pass a loading boundary that has not shown content catches (`own`,
	* A29's boundary exemption, #3540): it is the boundary's, not the tick's,
	* and a flush that has joined nothing keeps it pass-scoped as outside one.
	* Cleared by the flush the join schedules, and at the end of a flush that
	* set it. */ var passTx = null;
	function joinPassTx(e, o) {
		if (globalQueue.Y && !o || flushTransaction !== null) return joinFuture(e);
		if (passTx === null) passTx = resolveTx(e);
		else merge$1(resolveTx(e), passTx);
		schedule();
	}
	/** The transaction holding a node (CONFIG_HELD set), resolved through
	* merges; the path is compressed. */ function txOf(e) {
		return e.T.Re = resolveTx(e.T.Re);
	}
	/** `t` resolved through merges while it is still parked or open; null once
	* it has landed. */ function liveTx(e) {
		e = resolveTx(e);
		return transactions.indexOf(e) !== -1 ? e : null;
	}
	function resolveTx(e) {
		while (e.eo !== null) e = e.eo;
		return e;
	}
	function joinFuture(e) {
		if (laneStageHook && e?.P) return;
		const o = flushTransaction;
		if (o === null) flushTransaction = e === null ? newTransaction(false) : resolveTx(e);
		else if (e !== null) merge$1(resolveTx(e), o);
		if (!globalQueue.Y) schedule();
	}
	/** `t` merges into `f`: the work that touched both entangles them (A15).
	* A lane never merges: it is a sub-frame, not a peer — its work is routed
	* per pass (`passLane`). */
	/** #4777: the merges made since a pass adopted the flush's hold (core.ts
	* `adopter`), as [t, f._acted before]: a restart gives them back too. */ var adopted = [];
	function merge$1(e, o) {
		var _o, _o2;
		e = resolveTx(e);
		o = resolveTx(o);
		if (e === o || e.P || o.P) return;
		if (observeFlightHook && adopter) adopted.push(e, o.nt);
		e.eo = o;
		o.tt += e.tt;
		(_o = o).nt || (_o.nt = e.nt);
		append(o.ln, e.ln);
		append(o.rn[0], e.rn[0]);
		append(o.rn[1], e.rn[1]);
		append(o.fn, e.fn);
		if (e.I !== null) append((_o2 = o).I ?? (_o2.I = []), e.I);
		transactions.splice(transactions.indexOf(e), 1);
	}
	/** A15: a hold is a property of the async node — observed pending by a
	* render reader. A transaction is blocked while a node it holds, in flight,
	* has one: a pending render effect (the frame itself), or a pending held
	* node a render effect reads. A stale reader served the committed value
	* never went pending, but derives from the flight all the same (#3494) and
	* is still linked to it; a memo between them is pending, and held, too — so
	* one hop of `_subs` is the chain. Reads of the reader's LAST pass only (the
	* link's generation is the pass's): a tail kept for A30 — the committed
	* frame's dependency, awaiting the run that retires it — is not a read of
	* the flight, and a reader that stopped reading releases it (O3, #3494).
	* An errored pass (NotReady included) did not stop: it never got there, and
	* its full list stands (A30) — the reads it did not reach still observe. A
	* flight nobody renders holds nothing (A29). Only the nodes `t` still owns
	* count: one a lane took over since is the lane's to wait on. A guess whose
	* own truth is in flight blocks the lane's parent, not the lane — it stands
	* in for the flight (A17: "visible until its own fetch settles"). */ function blocked(e) {
		return e.tt !== 0 || blockedBy(e.ln, e) || !!lanesBlockedHook?.(e);
	}
	/** The transaction being judged — the outermost `blocked` of a nest (a lane
	* consulted on its behalf judges for it): a zombie whose removal it stages
	* is moot for it alone (`onScreen`). Set around the lanes' hook
	* (`installLaneHooks`), the only path that nests; null otherwise, where the
	* transaction judged is `blockedBy`'s own `owner`. */ var judge = null;
	/** `own`: the pending node's filter (`ownFlights` passes `ownSource`) — a
	* parameter, not a flag, so a build without lanes or guesses (the only
	* callers of `ownFlights`) does not retain `ownSource`. */ function blockedBy(e, o, n) {
		for (let t = 0; t < e.length; t++) {
			const l = e[t];
			if (!(l.m & 1) || l.R & 64 || l.l & 8192 || l.T.Re !== null && txOf(l) !== o || n && !n(l, o) || guessing && o.P && l.T.se && reasks(l)) continue;
			if (l.i === 1) {
				if (!(observeFlightHook && l.l & -2147483648 && !o.P) && onScreen(l, judge ?? o)) return true;
				continue;
			}
			for (let e = l.o; e !== null; e = e.t) {
				const n = e.u;
				if ((n.i === 1 && n.m & 1 && !(observeFlightHook && n.l & -2147483648 && !o.P) || n.R & 2048 || n.l & 16384 && n.m === 1) && (e.Ne === n.de || n.T?.U != null) && !(n.R & 64) && onScreen(n, judge ?? o)) return true;
			}
		}
		return false;
	}
	/** A frame reader whose say counts for `t`'s hold — `t` the transaction
	* being judged: not a zombie whose removal `t` stages (A15 #3463: a re-ask
	* in the unmount frame lands its pending on the zombie it unmounts — the
	* compiled <Show> of #3372; a zombie blocks every other judgment while it
	* is visible, a lane's reveal included: only the commit that disposes it
	* makes its say moot), and not behind a fallback (A33: a boundary showing its fallback is the display of
	* everything under it, so a reader there is not on screen and holds
	* nothing — boundaries.ts). */ function onScreen(e, o) {
		return !hiddenHook?.(e) && !(e.R & 32 && removalStagedBy(e, o));
	}
	/** A15 (#3463): a reader whose removal is staged — a zombie, parked by a
	* pass awaiting its commit — is still on screen and live for every hold,
	* except the transaction staging its removal: for that one its say is moot
	* (done, and the commit disposes it; not done, and it stays parked). The
	* staging transaction is the one holding the pass that parked the frame:
	* the nearest non-zombie ancestor. */ function removalStagedBy(e, o) {
		while (e?.R & 32) e = e._parent;
		return e?.l & 256 && e.T?.Re != null && txOf(e) === resolveTx(o);
	}
	/** Unchanged passes this flush whose stale dependency tail awaits the
	* flush's verdict (A30, #3469): trimmed when the flush commits, kept when
	* it parks — the committed frame still derives from the previous pass's
	* dependencies, and a write to one of them must reach the node until a
	* committing pass replaces it. */ var heldTrims = [];
	function heldTrim(e) {
		heldTrims.push(e);
	}
	/** Zombies popped from the dirty heap this flush (`deferZombie`). The seam
	* decides their fate: a park cancels them (the writes that dirtied them are
	* held with it); a commit runs the survivors — the ones whose owner is still
	* awaiting its commit — in height order, after the commits that would have
	* disposed them (#3546). No second heap: the list is the deferral. */ var deferredZombies = [];
	function deferZombie(e) {
		deleteFromHeap(e, dirtyQueue);
		e.R &= -4;
		deferredZombies.push(e);
	}
	/** Put a staged node in a transaction: flagged, stamped, on its landing
	* list. */ function holdNode(e, o) {
		e.l |= 256;
		list(e, o);
	}
	/** Put a node on a transaction's list, once: a node's `_transaction` is the
	* transaction whose `_nodes` it is on (every site that sets one does the
	* other), so a re-pass, a re-landing or a re-staging adds nothing. */ function list(e, o) {
		const n = ext(e);
		if (n.Re === o) return;
		n.Re = o;
		o.ln.push(e);
	}
	/** Hold the (uncommitted) frame under a held pass: every computed in the
	* live child chain, recursively. Plain owners are walked through, not held
	* — nothing reads or re-passes them. Once per park, over the parked frames
	* only; recomputes pay nothing for it. A lane's node in the frame (listed on
	* a lane: a verdict reader broken out of this very hold — display-ahead — or
	* a derivation of a guess, CONFIG_OVERRIDE; a lane pass's effect) is the
	* lane's, as the seam's own loop has it: "lane work never makes its node
	* transaction work" (A15, #3698). Re-listed here it would carry the lane's
	* value on the transaction's list, where the landing nulls its transaction
	* and `dissolveLane` no longer finds it — a lane node with no lane, which the
	* next read of it trips over (`laneRead` → `txOf`). Its frame is the lane's
	* too (ruling A: a lane pass's children are the lane's), revealed and
	* retired at the lane's seam. */ function holdFrame(e, o) {
		for (let n = e.pe; n !== null; n = n.Ge) {
			if (n.T?.Re?.P) continue;
			if (n.X !== void 0) {
				if (!(n.l & 256)) holdNode(n, o);
				n.l |= CONFIG_HELD_FRAME;
			}
			holdFrame(n, o);
		}
	}
	/** `n` leaves the hold it was staged in: its next pass publishes mainline. */ function unhold(e) {
		e.T.Re = null;
		e.l &= -257;
	}
	var dirtyQueue = {
		et: new Array(2e3).fill(void 0),
		p: false,
		Fe: 0,
		Et: 0
	};
	var clock = 0;
	var scheduled = false;
	var halted = false;
	var haltNotified = false;
	var syncDepth = 0;
	/** @internal Action bodies on the stack (action.ts): `flush()` is refused
	* inside one — the body's writes are its transaction's and commit when it
	* settles; a drain mid-step cannot reveal them, and dev says so. Read live
	* by `@solidjs/web`'s server function transport: a call made while it is
	* nonzero is the action's mutation (#4913). */ var actionDepth = 0;
	/** Provenance (A18, #3331): the question being asked — an action's
	* sequence while a slice of its body and the flush that carries it run, 0
	* otherwise. A guess is stamped with it (lanes.ts; a mainline guess takes a
	* fresh sequence: the newest intent), a flight with the question that
	* started it (async.ts; mainline is always the current question). An
	* answer from an older question than the guess it lands on is stale: held
	* silently, it does not move the graph. */ var question = 0;
	function schedule() {
		if (halted) {
			notifyHalted();
			return;
		}
		if (scheduled) return;
		scheduled = true;
		if (!syncDepth && !globalQueue.Y) queueMicrotask(flush);
	}
	var HALTED = "[REACTIVITY_HALTED]";
	function haltReactivity(e) {
		if (halted) return;
		halted = true;
		rethrowCleanupError(true);
		let o = HALTED;
		const n = e !== void 0 && globalThis.reportError;
		n || e === void 0 ? console.error(o) : console.error(o, e);
		n && n(e);
	}
	function notifyHalted() {
		if (haltNotified) return;
		haltNotified = true;
		console.error(HALTED);
	}
	var GlobalQueue = class GlobalQueue {
		constructor() {
			_defineProperty(this, "rn", [[], []]);
			_defineProperty(this, "Y", false);
		}
		flush() {
			if (this.Y) return;
			this.Y = true;
			resyncUnflushedCompanions();
			passLane = null;
			passTx = null;
			try {
				sweepDormant();
				if (revertHook) revertHook();
				runHeap(dirtyQueue, GlobalQueue._e);
				this.settle();
				clock++;
				scheduled = dirtyQueue.Et >= dirtyQueue.Fe || pendingNodes.length !== 0;
				this.run(1);
				this.run(2);
			} finally {
				this.Y = false;
				passTx = null;
			}
		}
		/** L2 — the seam: end of the pure phase. Commit this flush's staged nodes,
		* or park them with the transaction the flush joined; then land every
		* transaction no frame is waiting on. The landing flush is an ordinary
		* flush: the settle walk (async.ts) re-ran the parked readers in its pure
		* phase, and here no flight the transaction holds has a frame deriving
		* from it (`blocked`). */ settle() {
			if (laneCorrectionsHook?.()) runHeap(dirtyQueue, GlobalQueue._e);
			const e = flushTransaction;
			flushTransaction = null;
			applyGuessesHook?.(e);
			const o = e !== null && !e.P ? resolveTx(e) : null;
			if (o !== null) {
				const e = pendingNodes.length;
				for (let n = 0; n < e; n++) {
					const e = pendingNodes[n];
					if (!(e.l & 2304) && (e.T === null || e.T.Re === null || !e.T.Re.P)) {
						if (e.ue === NOT_PENDING && e.m & 4 && e.i !== 1) continue;
						if (e.ue !== NOT_PENDING && !(e.m & 5) && e.T?.me == null && e.T?.Le == null && !e.T?.Te && isSame(e, e.le, e.ue)) {
							e.ue = NOT_PENDING;
							e.l &= -129;
							continue;
						}
						holdNode(e, o);
					}
					if (e.l & 128) holdFrame(e, o);
				}
				pendingNodes.length = 0;
				storeParkHook?.(o);
				const n = deferredZombies.splice(0);
				if (observeFlightHook) {
					n.sort((e, o) => e.he - o.he);
					for (let e = 0; e < n.length; e++) if ((n[e].R & 96) === 32 && n[e].l & 32768) recompute(n[e]);
				}
			} else {
				commitPendingNodes();
				for (let e = 0; e < heldTrims.length; e++) {
					const o = heldTrims[e];
					if (o.T?.U == null && !o.Ae) trimStaleDeps(o);
				}
			}
			if (heldTrims.length) heldTrims.length = 0;
			const n = this.rn;
			let t = null;
			if (laneSeamsHook) {
				this.rn = t = [[], []];
				laneSeamsHook(o);
				if (stagedReaders.length) stagedReaders.length = 0;
			}
			this.rn = [[], []];
			for (let e = transactions.length - 1; e >= 0; e--) {
				const o = transactions[e];
				if (blocked(o)) continue;
				transactions.splice(e, 1);
				endLanesHook?.(o);
				land(o);
				e = transactions.length;
			}
			storeCommitHook?.();
			const l = o && liveTx(o);
			releaseAmbientMarksHook?.(l);
			const s = l !== null;
			for (let e = 0; e < 2; e++) {
				if (s) append(l.rn[e], n[e]);
				this.rn[e] = s || t?.[e].length || this.rn[e].length ? (t ? t[e] : []).concat(s ? [] : n[e], this.rn[e]) : n[e];
			}
			if (deferredZombies.length !== 0) {
				const e = deferredZombies.splice(0).sort((e, o) => e.he - o.he);
				for (let o = 0; o < e.length; o++) if (!(e[o].R & 64)) recompute(e[o]);
			}
			boundarySeamHook?.();
		}
		run(e) {
			const o = this.rn[e - 1];
			if (o.length) {
				this.rn[e - 1] = [];
				runQueue(o, e);
			}
		}
		enqueue(e, o, n = passLane) {
			if (e) (n?.P ? n : this).rn[e - 1].push(o);
			schedule();
		}
		/** Status reaching the root: pending is absorbed (the root mount defers —
		* dev records it for the ASYNC_OUTSIDE_LOADING_BOUNDARY FYI); an error is
		* unhandled (`false` → the caller halts).
		*
		* L2: this is where a transaction is registered. Pending that reaches an
		* observer (a render effect: the frame) is a frame that cannot show — the
		* flush parks, and the transaction waits on the flight while a frame
		* derives from it (`blocked`). Pending nobody observes holds nothing: a
		* memo in flight that no frame reads is not a frame waiting. (Base: the
		* queue's `_asyncReporters`, INV-3's one registration site.)
		*
		* A boundary between the observer and the root (boundaries.ts) is asked
		* first: a fallback catches what is not ready under it, and the root
		* never hears of it. */ notify(e, o, n, t) {
			if (catchHook?.(e, n & o, t)) return true;
			if (o & 1) {
				if (n & 1) {
					if (passLane === null) joinFuture(null);
				}
				return true;
			}
			return false;
		}
	};
	/** A15's stale readers: a frame whose LAST pass read a held node as
	* committed re-derives on the landed world — next round, after the commits.
	* One re-derived since (any later pass cleared the bit: in the transaction,
	* or without the held read) owes nothing. A run this transaction stashed
	* for it is void (#3322: an effect has one value slot, and the stale pass
	* overwrote the value that run was for) — the re-derivation's run replaces
	* it. Truthy when an effect re-derives (`land`). */ function reruns(e) {
		let o;
		for (let n = 0; n < e.fn.length; n++) {
			const t = e.fn[n];
			const l = t.T?.U?.source;
			if (t.R & 64 || t.m & 2 && (t.i || !(t.l & 8388608)) && l !== t && (l?.m ?? 2) & 2) continue;
			if (t.R & 2048 || observeFlightHook && t.l & 32768) {
				o = 1;
				if (!e.P) t.R &= ~REACTIVE_FRAME_READ;
				t.Ae = false;
				for (let e = t.pe; e !== null; e = e.Ge) if (e.i) e.Ae = false;
				laneAdoptHook?.(t);
				enqueueSub(t);
			}
		}
		e.fn.length = 0;
		return o;
	}
	/** The landing: the held frame becomes the frame. */ function land(e) {
		const o = reruns(e);
		if (releaseMarksHook && e.I !== null) releaseMarksHook(e.I);
		for (let o = 0; o < e.ln.length; o++) {
			const n = e.ln[o];
			if (n.T.Re === null || txOf(n) !== e) continue;
			n.T.Re = null;
			commitPendingNode(n);
		}
		if (flushTransaction === e) flushTransaction = null;
		if (o) globalQueue.rn[1].push(() => releaseQueues(e));
		else releaseQueues(e);
	}
	/** The held runs join this flush's effect phase after its own runs (the
	* landing's re-passes, in height order): the frame's effects run as one
	* pass would have queued them — a shell re-derived at the landing before a
	* boundary swap held since the write (#3540's log order). */ function releaseQueues(e) {
		for (let o = 0; o < 2; o++) {
			append(globalQueue.rn[o], e.rn[o]);
			e.rn[o] = [];
		}
	}
	/** `a.push(...b)` without the argument-count limit. */ function append(e, o) {
		for (let n = 0; n < o.length; n++) e.push(o[n]);
	}
	/** Nodes staged this flush (`_pendingValue` set), committed at its end. */ var pendingNodes = [];
	/** Held slots rewritten since the last flush, with the verdict engine (D-8: `revertHook`). */ var heldRewrites = [];
	/** Passes that read a staging of this flush as the screen — lane work
	* (core.ts `stagedRead`), a verdict reader before the frame's verdict
	* (verdict.ts): if the frame parks they read a held write — re-derived next
	* round (lanes.ts; a lane's runs wait that round). */ var stagedReaders = [];
	/** A15's stale reader: `c` was served the committed value of a node `t`
	* holds (a render effect, a verdict reader, lane work) and is re-derived
	* after `t`'s landing (`_reruns`). Called per read of a held node, so `t`'s
	* list holds one entry per such read, not one per pass: `reruns` re-runs the
	* reader at its first entry and skips the rest by the cleared flag. (A dedupe
	* here costs ~17-30 B minified in every client bundle, which the 10 KB
	* compiled floor cannot take; the repeats are inert and short-lived — the
	* list empties at the landing.) */ function staleReader(e, o) {
		o.fn.push(e);
		e.R |= REACTIVE_FRAME_READ;
	}
	function queuePendingNode(e) {
		pendingNodes.push(e);
		if (!globalQueue.Y) markUnflushedStaged();
	}
	/** §12d: bumped by every recompute and every new subscriber edge. A node's
	* staged-rewrite skip is sound only while NOTHING recomputed or linked since
	* its last notify — a mid-batch pull can clean a marked subscriber, and a
	* skipped re-write would leave it stale. */ var notifyEpoch = 0;
	function bumpNotifyEpoch() {
		notifyEpoch++;
	}
	function insertSubs(e) {
		e.we = notifyEpoch;
		const n = (e.l & 512) !== 0 && e.T?.De !== void 0;
		for (let o = e.o; o !== null; o = o.t) {
			const t = o.u;
			if (t.R & 4 && o.Ne === t.de && (o !== t._ || !e.X)) t.R |= REACTIVE_MISSED_WAKE;
			if (n && t.l & 8) {
				t.R |= 256;
				continue;
			}
			enqueueSub(t);
			if (t.R & 8388608) markNode(t._parent, 1);
		}
	}
	/** Every flight `c` waits on is a `refresh()` re-ask (`_reask`): its own,
	* with no sources, or each source's, through a source that waits on
	* another's flight (a projection over the re-asked memo, #4824). The
	* propagated copies can form a cycle: two keyed projections whose derives
	* each read a row lent from the other's store are each pending on the
	* other's derive (D-1, D-9: a read of a pending leaf is pending on it), and
	* both on the real flight (#4969). A source already walked adds no flight of
	* its own; the flights at the ends of the walk decide. */ function reasks(e, o = new NewSet()) {
		return [...e.T.se ?? [e]].every((n) => n === e ? n.T.Ve : o.has(n) || (o.add(n), reasks(n, o)));
	}
	/** Lane work re-staged (lanes.ts; `recompute`): the node's subscribers are
	* notified (`insertSubs`), and the lane's members among them re-derive as
	* the lane's work (REACTIVE_LANE_DIRTY), their runs held with it — not as
	* stale readers republishing the committed view (#3460). `l` is a lane, so
	* it has a parent. A render effect on no lane is marked too: inert for its
	* pass (`recompute` seats a lane only from its own `_x`), it is a live
	* write if the effect becomes a zombie later this flush — an
	* on-screen reader whose removal an adopted write stages follows the lane
	* (the lane-membership ruling, 2026-10-05; `_update`).
	*
	* A render effect re-run by a verdict memo's change (`createMemo(() =>
	* latest(x))`, CONFIG_VERDICT) is the verdict reader the same read inline
	* makes it, for that pass (F-6; D-26 `[s(), L()]`, #4284): a frame reader
	* of its other reads — a staging's screen, a flight's committed value. One
	* an earlier propagation this flush seated in another lane leaves that
	* seat: its pass starts from the frame's, as the inline effect's does, and
	* `laneRead` re-derives it on the screen if that lane holds (`entered`). */ function laneDirty(e, o) {
		insertSubs(e);
		if (e.l & 4096) GlobalQueue.lo?.(e, o);
		for (let n = e.o; n !== null; n = n.t) {
			const t = n.u;
			let l = t.T?.Re, s = t.i === 1, u;
			if ((t.m & 5) === 1 && (l ? (t.l & 2304) === 256 : s) && (u = !!l && resolveTx(l) === resolveTx(o._parent), t.i ? s && !u && reasks(t) : u || reasks(t))) list(t, l = o);
			if (s && e.l & 32768) t.l |= CONFIG_VERDICT, t.R &= ~REACTIVE_LANE_DIRTY;
			if (l?.P ? sameLane(l, o) : t.i) t.R |= REACTIVE_LANE_DIRTY;
		}
	}
	/** An effect owes a run: marked, and its bound runner queued in its phase. */ function queueEffectRun(e) {
		e.Ae = true;
		globalQueue.enqueue(e.i, e.W ?? (e.W = GlobalQueue.q.bind(null, e)));
	}
	/** One lane, or two of one link group (#3335): one reveal unit. */ function sameLane(e, o) {
		return e === o || e.nn !== null && e.nn === o.nn;
	}
	/** A staged value becomes the node's value: truthy when one was staged. */ function applyStaged(e) {
		return e.ue !== NOT_PENDING && (e.le = e.ue, e.ue = NOT_PENDING);
	}
	function superseded(e) {
		return !(e.m & 4) && !!e.T?.Ee && !e.T.Ve && (e.ue = NOT_PENDING, true);
	}
	function commitPendingNode(e) {
		if (!e.X) {
			e.l &= -385;
			applyStaged(e);
			return;
		}
		const o = (e.m & 1) !== 0 && (e.ue === NOT_PENDING || superseded(e));
		const n = e.l & CONFIG_STAGED_ERROR;
		if (!o && e.T) e.T.Te = null;
		e.l = o ? e.l & -1048833 | CONFIG_INPUTS_PUBLISHED : e.l & -3147137;
		if (n) {
			const o = e.ue;
			e.ue = NOT_PENDING;
			e.ie = clock + 1;
			notifyStatus(e, 2, o);
		} else if (applyStaged(e)) {
			e.m &= -5;
			if (e.T != null) e.T.Ve = false, e.T.je = NOT_PENDING;
			if (e.i && e.i !== 3) queueEffectRun(e);
		}
		e.Ie = false;
		e.R &= ~REACTIVE_MANUAL_WRITE;
		if (e.T?.U == null) trimStaleDeps(e);
		if (!(e.m & 1)) e.m &= -5;
		if (!o && e.T != null && (e.T.me !== null || e.T.Le !== null)) GlobalQueue.Ce(e, false, true);
	}
	function commitPendingNodes() {
		for (let e = 0; e < pendingNodes.length; e++) {
			const o = pendingNodes[e];
			if (!(o.l & 2304)) commitPendingNode(o);
		}
		pendingNodes.length = 0;
	}
	var globalQueue = new GlobalQueue();
	function flush(e) {
		if (actionDepth > 0) return e ? e() : void 0;
		if (e) {
			syncDepth++;
			try {
				return e();
			} finally {
				try {
					flush();
				} finally {
					syncDepth--;
				}
			}
		}
		if (globalQueue.Y) return;
		if (halted) return;
		while (scheduled) globalQueue.flush();
		rethrowCleanupError();
	}
	function runQueue(e, o) {
		for (let n = 0; n < e.length; n++) e[n](o);
	}
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/core/heap.js
	/**
	* Schedule one subscriber to re-run on the next flush: inserted into the
	* dirty heap with the `_min` cursor pulled down. Tracked effects ride the
	* heap too — the heap visit is their (empty) compute phase, which hands the
	* callback to the user queue once the pass has committed (see
	* GlobalQueue._update, #3291).
	*/ function enqueueSub(e) {
		if (dirtyQueue.Fe > e.he) dirtyQueue.Fe = e.he;
		insertIntoHeap(e, dirtyQueue);
	}
	function actualInsertIntoHeap(e, t) {
		const E = (e._parent?.Qe ? e._parent.Ke?.he : e._parent?.he) ?? -1;
		if (E >= e.he) e.he = E + 1;
		const n = e.he;
		const I = t.et[n];
		if (I === void 0) t.et[n] = e;
		else {
			const t = I.We;
			t.ve = e;
			e.We = t;
			I.We = e;
		}
		if (n > t.Et) t.Et = n;
	}
	function insertIntoHeap(e, t) {
		let E = e.R;
		if (E & 12) return;
		if (E & 1) e.R = E & -4 | 10;
		else {
			e.R = E | 8;
			if (t.p) markNode(e);
		}
		if (!(E & 16)) actualInsertIntoHeap(e, t);
	}
	function insertIntoHeapHeight(e, t) {
		let E = e.R;
		if (E & 28) return;
		e.R = E | 16;
		actualInsertIntoHeap(e, t);
	}
	function deleteFromHeap(e, t) {
		const E = e.R;
		if (!(E & 24)) return;
		e.R = E & -25;
		const n = e.he;
		if (e.We === e) t.et[n] = void 0;
		else {
			const E = e.ve;
			const I = t.et[n];
			const i = E ?? I;
			if (e === I) t.et[n] = E;
			else e.We.ve = E;
			i.We = e.We;
		}
		e.We = e;
		e.ve = void 0;
	}
	function markHeap(e) {
		if (e.p) return;
		e.p = true;
		for (let t = 0; t <= e.Et; t++) for (let E = e.et[t]; E !== void 0; E = E.ve) if (E.R & 8) markNode(E);
	}
	function markNode(e, t = 2) {
		const E = e.R;
		if ((E & 3) >= t) return;
		e.R = E & -4 | t;
		for (let t = e.o; t !== null; t = t.t) markNode(t.u, 1);
	}
	function runHeap(e, t) {
		e.p = false;
		for (e.Fe = 0; e.Fe <= e.Et; e.Fe++) {
			let E = e.et[e.Fe];
			while (E !== void 0) {
				if (E.R & 8) t(E);
				else adjustHeight(E, e);
				E = e.et[e.Fe];
			}
		}
		e.Et = 0;
	}
	function adjustHeight(e, t) {
		deleteFromHeap(e, t);
		let E = e.he;
		for (let t = e.C; t; t = t.G) {
			const e = t.S;
			if (e.X && e.he >= E) E = e.he + 1;
		}
		if (e.he !== E) {
			e.he = E;
			liftOwned(e, E);
			for (let E = e.o; E !== null; E = E.t) if (E.u !== e._parent) insertIntoHeapHeight(E.u, t);
		}
	}
	/**
	* A raised node's owned computations (through roots) move above it (#4848).
	* The heap places a node above its direct owner only, at insert, so an owner
	* raised after its children's birth left a grandchild at or below it, to run
	* before the owner whose run disposes it. Paid when a height changes, never
	* per insert. A child waiting in the heap keeps its seat this pass (its next
	* insert lifts it above its owner); what it owns moves either way.
	*/ function liftOwned(e, t) {
		for (let E = e.pe; E; E = E.Ge) if (E.Qe) liftOwned(E, t);
		else if (E.he <= t) {
			const e = E.R & 24;
			deleteFromHeap(E, dirtyQueue);
			E.he = t + 1;
			if (e) (e & 8 ? insertIntoHeap : insertIntoHeapHeight)(E, dirtyQueue);
			liftOwned(E, t + 1);
		}
	}
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/core/graph.js
	/** The store's shared slot-node release handler (store/store.ts installs it
	* once) — a live binding read directly by the sweep site: no wrapper frame,
	* no null check (a CONFIG_SLOT_NODE node existing implies the store module
	* loaded and registered it). */ var slotUnobservedHook;
	function unlinkSubs(e) {
		const n = e.S;
		const l = e.G;
		const o = e.t;
		const s = e.en;
		if (o !== null) o.en = s;
		else n.Ze = s;
		if (s !== null) s.t = o;
		else {
			n.o = o;
			if (o === null) {
				if (n.l & 4096) slotUnobservedHook(n);
				else if (n.T?.Ye) runCleanup(n.T.Ye);
				n.X && n.l & 32 && !(n.R & 32) && !(n.m & 1) && (deferredReleases ? deferredReleases.push(n) : unobserved(n));
			}
		}
		return l;
	}
	function trimStaleDeps(e) {
		const n = e._;
		let l = n !== null ? n.G : e.C;
		if (l !== null) {
			do
				l = unlinkSubs(l);
			while (l !== null);
			if (n !== null) n.G = null;
			else e.C = null;
		}
	}
	function clearDeps(e) {
		if (e.C) {
			e._ = null;
			trimStaleDeps(e);
		}
	}
	/**
	* Last-one-out releases held back while a pass tears down the frame of an
	* earlier pass that never committed (#4142). The pass is about to rebuild
	* the same children, which read the same lazy nodes again. Released on the
	* spot, a lazy async memo whose only reader was the old frame's child memo
	* was torn down, re-ran on the new child's read, went pending, and the cycle
	* repeated forever. `recompute` collects them around that teardown and
	* releases what is still unobserved when the pass ends.
	*/ var deferredReleases = null;
	var deferReleases = (e) => deferredReleases = e;
	function unobserved(e) {
		deleteFromHeap(e, dirtyQueue);
		clearDeps(e);
		disposeChildren(e, true);
	}
	/**
	* Deferred dormancy for never-observed auto-dispose computeds (#3078).
	*
	* An untracked top-level read of a subscriber-less observation-lifecycle memo
	* used to call unobserved() inline at the end of read(). That kept the leak
	* closed (the compute links the memo into its deps' sub lists — without a
	* teardown point a never-observed memo is retained by its sources forever;
	* upstream alien-signals has exactly this retention), but it made reads
	* destructive: each read disposed the node, the next read revived it with a
	* full recompute in whatever ambient transition/lane context happened to be
	* current, so consecutive reads could return different answers with no write
	* in between.
	*
	* Instead, reads queue the node here and the scheduler sweeps at the top of
	* the next flush (before runHeap, so a same-tick dirtying is reclaimed
	* instead of recomputed). Reads become idempotent within a tick (the node
	* stays alive and serves its cache, uniform with observed memos) while
	* reclamation still happens within one microtask — the enqueue site arms
	* schedule(), so a flush is guaranteed even when no other work is queued.
	*/ var dormantNodes = new NewSet();
	function sweepDormant() {
		if (dormantNodes.size === 0) return;
		for (const e of dormantNodes) if (!e.o && e.l & 32 && !(e.m & 1) && !(e.R & 96)) unobserved(e);
		dormantNodes.clear();
	}
	/** Truthy when it reuses the link `sub`'s last pass made: a re-read. */ function link(e, n) {
		const l = n._;
		if (l !== null && l.S === e) return;
		let o = null;
		const s = n.R & 4;
		if (s) {
			o = l !== null ? l.G : n.C;
			if (o !== null && o.S === e) {
				o.Ne = n.de;
				return n._ = o;
			}
		}
		const r = e.Ze;
		if (r !== null && r.u === n && (!s || r.Ne === n.de)) return;
		const t = n._ = e.Ze = {
			S: e,
			u: n,
			G: o,
			en: r,
			t: null,
			Ne: n.de
		};
		if (l !== null) l.G = t;
		else n.C = t;
		if (r !== null) r.t = t;
		else e.o = t;
		bumpNotifyEpoch();
	}
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/core/async.js
	function addPendingSource(e, n) {
		var _ext;
		if (e.T?.se?.has(n)) return false;
		((_ext = ext(e)).se ?? (_ext.se = new NewSet())).add(n);
		return true;
	}
	function removePendingSource(e, n) {
		const t = e.T?.se;
		if (!t?.delete(n)) return false;
		if (!t.size) e.T.se = void 0;
		return true;
	}
	function clearInFlight(e) {
		if (e.T !== null) e.T.Ee = null;
	}
	function clearPendingSources(e) {
		if (e.T !== null) e.T.se = void 0;
	}
	function retryReaches(e, n) {
		for (let t = e.C; t; t = t.G) {
			const e = t.S;
			if (!(e.R & 64) && (e === n ? e.m & 1 : e.T?.se?.has(n))) return true;
		}
		return false;
	}
	/** Park a loading-window node on an unready source: registered for the
	* source's settle, with no visible pending and no propagation. */ function parkLoadingWindow(e, n) {
		ext(e).fe = true;
		if (n.source) addPendingSource(e, n.source);
		if (!(e.m & 2)) setPendingError(e, n.source, n);
	}
	function setPendingError(e, n, t) {
		if (!n) {
			if (e.T !== null) e.T.U = null;
			return;
		}
		const r = t instanceof NotReadyError && t.source === n ? t : e.T?.U;
		ext(e).U = r instanceof NotReadyError && r.source === n ? r : new NotReadyError(n);
	}
	function forEachDependent(e, n) {
		for (let t = e.o; t !== null; t = t.t) n(t.u, t);
	}
	/** Depth first. `fn` sees every arrival (`seen` on a diamond's second);
	* returning false leaves the node unmarked so a later branch may walk it. */ function walkDependents(e, n) {
		const t = new NewSet();
		const visit = (e) => {
			const r = t.has(e);
			if (n(e, r) !== false && !r) {
				t.add(e);
				forEachDependent(e, visit);
			}
		};
		forEachDependent(e, visit);
	}
	function releaseIfSettledUnobserved(e) {
		if (e.X && e.l & 32 && !e.o && !(e.R & 32) && !(e.m & 1)) e.R & 8 ? e.R |= REACTIVE_RELEASE_AFTER : unobserved(e);
	}
	function releaseSettledDependents(e) {
		let n;
		walkDependents(e, (e, t) => {
			if (!t && !e.o && e.l & 32) (n ?? (n = [])).push(e);
		});
		if (n) for (const e of n) releaseIfSettledUnobserved(e);
	}
	/** An error a held node's pass found is an answer of that frame, staged like
	* a value and published at the commit (D-41). Not for a lane pass, nor a
	* node born held. Returns whether it was staged. */ function stageError(e, n, t) {
		if (!(e.l & 256 || t && e.R & 16384 && globalQueue.Y && !e.rr) || passLane) return false;
		clearPendingSources(e);
		if (e.T) e.T.fe = false;
		if (!((e.m &= 6) & 2)) setPendingError(e);
		e.ue = n instanceof StatusError ? n : new StatusError(e, n);
		e.l |= 128 | CONFIG_STAGED_ERROR;
		settlePendingSource(e);
		schedule();
		return true;
	}
	function settleErroredDependents(e, n) {
		let t = false;
		walkDependents(e, (e, r) => {
			if (!r && e.T?.U === n) {
				enqueueSub(e);
				t = true;
			}
		});
		if (t) schedule();
	}
	function settlePendingSource(e, n = e) {
		removePendingSource(e, n);
		let t = false;
		let r;
		walkDependents(e, (o, s) => {
			if (s || n !== e && retryReaches(o, n) || !removePendingSource(o, n)) return false;
			o.ie = clock;
			const i = o.T?.se?.values().next().value;
			const f = o.m & 2;
			if (i) {
				if (!f) setPendingError(o, i);
			} else {
				o.m &= -2;
				if (!f) setPendingError(o);
				if (o.l & 256 && !(n.m & 1)) joinFuture(txOf(o));
				if (o.T?.fe) {
					enqueueSub(o);
					t = true;
				} else if (storeParkHook) o.rr?.st();
				if (o.T !== null) o.T.fe = false;
				if (!o.o && o.l & 32) (r ?? (r = [])).push(o);
				stageMarkHook?.(o, e);
			}
		});
		if (r) for (const e of r) releaseIfSettledUnobserved(e);
		if (t) schedule();
	}
	function isThenable(e) {
		return e != null && typeof e === "object" && typeof e.then === "function";
	}
	function releaseFlightTeardown(e) {
		const n = e.T?.Se;
		if (n != null) {
			e.T.Se = null;
			n();
		}
	}
	function handleAsync(e, n, t, r) {
		let o = false;
		let s = false;
		if (typeof n === "object" && n !== null) untrack(() => {
			o = n[Symbol.asyncIterator];
			s = !o && isThenable(n);
		});
		if (!s && !o) {
			if (e.T !== null) {
				e.T.Ee = null;
				if (holdWorkHook) e.l &= ~CONFIG_ASYNC;
			}
			e.Ie = false;
			return n;
		}
		ext(e).Ee = n;
		if (holdWorkHook) e.l |= CONFIG_ASYNC;
		e.T.ce = question || 2147483647;
		e.T.se = void 0;
		let i;
		const handleError = (t) => {
			if (e.T?.Ee !== n) return;
			let o = t instanceof NotReadyError;
			if (o && e.Ie) {
				clearInFlight(e);
				parkLoadingWindow(e, t);
				e.ie = clock;
				return;
			}
			if (o || !stageError(e, t)) {
				notifyStatus(e, o ? 1 : 2, t);
				if (!o) disposeChildren(e, false, true);
			}
			if (o) settlePendingSource(e);
			e.ie = clock;
			if (!o) releaseSettledDependents(e);
			r?.(t, o);
		};
		const asyncWrite = (r, o) => {
			if (e.T?.Ee !== n) return;
			if (e.R & 2 && !(holdWorkHook && e.m & 4)) return;
			const s = holdWorkHook && pendingNodes.some((e) => e.ue !== NOT_PENDING);
			const i = e.m & 4;
			landStatus(e);
			if (t) {
				if (!t(r, i, handleError)) return;
			} else setSignal(e, () => r);
			if (e.ue === NOT_PENDING) {
				e.Ie = false;
				trimStaleDeps(e);
			}
			settlePendingSource(e);
			schedule();
			if (o || !s) flush();
			o?.();
		};
		const settleAutodispose = () => {
			if (e.l & 32 && !e.o && !(e.m & 1)) {
				unobserved(e);
				return true;
			}
			return false;
		};
		const consumeIterator = (t, r) => {
			const o = t[Symbol.asyncIterator]();
			let s = false;
			let f = false;
			let u = !r;
			const close = () => {
				if (f) return;
				f = true;
				try {
					const e = o.return?.();
					if (isThenable(e)) e.then(void 0, () => {});
				} catch {}
			};
			cleanup(close, r);
			ext(e).Se = close;
			const iterateOrRelease = () => {
				try {
					if (!settleAutodispose()) iterate();
				} catch (e) {
					handleError(e);
				}
			};
			const iterate = () => {
				let t, r, l = false, a = false, S = true;
				const E = o.next();
				(isThenable(E) ? E : { then: (e) => void e(E) }).then((r) => {
					if (S && u) {
						t = r;
						l = true;
						if (r.done) f = true;
					} else if (e.T?.Ee !== n) return;
					else if (!r.done) {
						s = true;
						asyncWrite(r.value, iterateOrRelease);
					} else {
						f = true;
						if (s) {
							schedule();
							flush();
						} else asyncWrite(void 0);
						settleAutodispose();
					}
				}, (t) => {
					if (S && u) {
						r = t;
						a = true;
					} else if (e.T?.Ee === n) {
						f = true;
						handleError(t);
						settleAutodispose();
					}
				});
				S = false;
				if (a) {
					f = true;
					handleError(r);
					if (u) throw r;
					return true;
				}
				if (l && !t.done) {
					i = t.value;
					s = true;
					return iterate();
				}
				return l && t.done;
			};
			const l = iterate();
			u = false;
			return s || l;
		};
		let f = null;
		const flattenIfIterable = (e, n) => {
			let t = false;
			if (typeof e === "object" && e !== null) untrack(() => {
				t = e[Symbol.asyncIterator];
			});
			if (!t) return false;
			i = void 0;
			const r = consumeIterator(e, n);
			if (!n) f = r;
			return true;
		};
		if (s) {
			let t = false, r = false, o, s = true;
			n.then((r) => {
				if (s) {
					i = r;
					t = true;
				} else {
					try {
						if (e.T?.Ee === n && !(e.R & 64) && flattenIfIterable(r, e)) return;
						asyncWrite(r);
					} catch (e) {
						handleError(e);
					}
					settleAutodispose();
				}
			}, (e) => {
				if (s) {
					o = e;
					r = true;
				} else {
					handleError(e);
					settleAutodispose();
				}
			});
			s = false;
			if (r) {
				handleError(o);
				throw o;
			} else if (!t) f = false;
			else if (!flattenIfIterable(i)) e.Ie = false;
		}
		if (o) flattenIfIterable(n);
		if (f !== null) {
			if (!f) {
				if (e.Ie) return e.le;
				throw new NotReadyError(context);
			}
			e.Ie = false;
		}
		return i;
	}
	function clearStatus(e, n = false) {
		if (e.T?.se) clearPendingSources(e);
		if (e.T?.fe) e.T.fe = false;
		e.m = n ? 0 : e.m & 4;
		if (e.T?.U) setPendingError(e);
		const t = statusNotifierOf(e);
		if (t) t.call(e);
	}
	/** A landing answers the node's own question: it retires the self entry, not
	* pending its sources propagated. With another source still pending the
	* node stays pending on it (#3373, #3376). `_blocked` clears, so an input
	* settling unchanged does not ask again; `_error` moves off self. */ function landStatus(e, n = false) {
		const t = e.T?.se;
		if (t && (t.delete(e), t.size)) {
			e.T.fe = false;
			if (n) e.m = 1;
			setPendingError(e, t.values().next().value);
		} else clearStatus(e, n);
	}
	function notifyStatus(e, n, t) {
		if (n === 2 && !(t instanceof StatusError) && !(t instanceof NotReadyError)) t = new StatusError(e, t);
		const r = n === 1 && t instanceof NotReadyError && t.source;
		if (r) {
			if (e.m & 2) e.T.Te = e.T.U;
			addPendingSource(e, r);
		} else clearPendingSources(e);
		e.m = n | (n === 2 ? e.m & 12 ? 8 : 0 : n === 1 && e.m & 8 ? 4 : e.m & 4);
		if (r) setPendingError(e, r, t);
		else ext(e).U = t;
		if (guessing && n === 1 && e.l & 8192) {
			if (passLane === null) joinFuture(e.R & 8192 ? null : txOf(e)._parent);
			return;
		}
		const o = statusNotifierOf(e);
		if (o) {
			o.call(e);
			return;
		}
		propagateStatus(e, n, t);
	}
	/** The dependents' half of `notifyStatus`. Also used alone for a store
	* family's leaves, which are not the derive's dependents. */ function propagateStatus(e, n, t) {
		const r = n === 1 && t instanceof NotReadyError && t.source;
		forEachDependent(e, (o, s) => {
			o.ie = clock;
			if (o.l & 16384 || holdWorkHook && (o.l & 32768 || r && o.l & 2097152) && !(r && holdWorkHook(o, e)) || n === 1 && s.Ne !== o.de) {
				if (n !== 1 && removePendingSource(o, e)) settlePendingSource(o, e);
				enqueueSub(o);
				schedule();
				return;
			}
			if (r && o.T?.se?.has(r)) {
				if (passLane === null && (o.l & 2304) === 256 && globalQueue.Y && !freshHook?.(o, r.ie === clock)) joinFuture(txOf(o));
				return;
			}
			if (r || n !== 1 && (o.T?.U !== t || o.T?.se)) {
				if (laneStageHook && passLane !== null) laneStageHook(o, passLane, true, e);
				else {
					queuePendingNode(o);
					if (n === 1 && (o.l & 2304) === 256 && !o.i) if (guessing && o.m & 1 && reasks(o)) unhold(o);
					else joinFuture(txOf(o));
				}
				notifyStatus(o, n, t);
				o.rr?.st(n, t);
			}
		});
	}
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/core/core.js
	GlobalQueue._e = (e) => {
		if (e.i === 3) {
			deleteFromHeap(e, dirtyQueue);
			e.Ae = true;
			globalQueue.enqueue(2, e.Z);
		} else if (e.R & 32 && !(e.R & 65536)) deferZombie(e);
		else if (laneStageHook && e.R & 32 && laneFrameMember(e)) {
			deleteFromHeap(e, dirtyQueue);
			e.R &= -65540;
		} else if (!(laneAdoptHook && e.T?.He && laneAdoptHook(e, 1))) recompute(e);
	};
	/** The nearest non-zombie owner carries a lane's value or, an effect, is
	* listed in a lane. */ function laneFrameMember(e) {
		let t = e._parent;
		while (t.R & 32) t = t._parent;
		return (t.l & 10240) === 2048 || t.i && t.T?.Re?.P;
	}
	GlobalQueue.Ce = disposeChildren;
	var tracking = false;
	var context = null;
	var snapshotCaptureActive = false;
	/** The lane at the root of the running chain of first passes, inherited by
	* every first pass under it (#4166). */ var laneRoot;
	var snapshotSources = null;
	function ownerInSnapshotScope(e) {
		while (e) {
			if (e.Oe) return true;
			e = e._parent;
		}
		return false;
	}
	function recompute(e, t = false) {
		bumpNotifyEpoch();
		const n = e.i;
		let o;
		let E = NOT_PENDING;
		const s = passLane;
		const l = laneRoot;
		const r = laneStageHook && (laneRoot = t && (s || l));
		if (laneAdoptHook && !t && e.T) {
			const t = e.T.He;
			if (t ? t !== e.T.Ee && (e.T.He = void 0, 1) : e.l & 2048 && !(e.R & 65536)) laneAdoptHook(e, 2);
		}
		if (laneStageHook) {
			const n = t ? creatorPass(context) : null;
			const o = n?.R | 0;
			if (o & 32768 || n && (n.l & 16777216 && n.m & 4 || n.i === 1 && n._ && hasDep(n, (e) => e.l & 32768, n._))) e.l |= CONFIG_MOUNT_AHEAD;
			setPassLane((e.R & 65536 || (e.l & 10240) === 2048) && e.T?.Re?.P ? e.T.Re : s?._parent.Pe != s && o & 4 ? s : null);
		}
		const a = e.l & CONFIG_STAGED_ERROR;
		let i;
		if (!t) {
			deleteFromHeap(e, dirtyQueue);
			if (laneStageHook && !n && (e.m & 1 || (e.l & 1610612992) === 536871168)) e.l &= ~CONFIG_VERDICT;
			if (e.T !== null) {
				e.T.Ee = null;
				releaseFlightTeardown(e);
			}
			if (e.l & 256) {
				const t = txOf(e);
				if (t.P || e.l & 524288);
				else if (!(e.l & 8421376) || observeFlightHook && !(e.l & 1 << 23) && bornInto(e, t)) joinPassTx(t, freshHook?.(e, e.m & 4));
				else if (t !== flushTransaction && !(e.m & 4 || e.l & 1048576)) {
					if ((E = e.ue) !== NOT_PENDING) insertSubs(e);
					e.ue = NOT_PENDING;
					e.l &= -257;
				}
			}
			if (n === 3 || e.l & 128) {
				const t = deferredReleases;
				deferReleases(o = []);
				disposeChildren(e);
				deferReleases(t);
			} else if (e.pe !== null || e.ke !== null) parkChildren(e);
			if (passHook) {
				i = e.C !== null;
				if (e.T !== null && (e.l & 2097152 || e.T.Ft !== void 0)) passHook(e);
			}
			if (e.l & 2097152) {
				e.ue = NOT_PENDING;
				e.l ^= CONFIG_STAGED_ERROR;
			}
		}
		const I = e.m & 4;
		const _ = e.m & 2 && e.T?.U;
		const u = (e.m & 1) !== 0 && e.T?.se;
		const f = e.T?.se?.has(e);
		let T = false;
		let S = (e.R & 8192) !== 0 && !((e.m & 1 || e.ue !== NOT_PENDING && !(e.R & 1024)) && e.T !== null && !e.T.Ve);
		const A = context;
		context = e;
		e._ = null;
		e.de++;
		const c = e.R & REACTIVE_RELEASE_AFTER;
		e.R = 4 | e.R & (32 | REACTIVE_REASK);
		e.ie = clock;
		let R = e.ue !== NOT_PENDING ? e.ue : e.le;
		let C = e.he;
		let O = false;
		let d = false;
		let D = tracking;
		tracking = true;
		try {
			if (e.l & 64) {
				R = e.X(R);
				if (e.T !== null) e.T.Ee = null;
				e.Ie = false;
			} else {
				const t = e.T?.Ee;
				const n = e.X(R);
				const o = typeof n === "object" && n !== null;
				const E = e.T?.Ee !== t;
				R = E || !o ? n : handleAsync(e, n);
				if (!E && !o) {
					if (e.T !== null) {
						e.T.Ee = null;
						if (holdWorkHook) e.l &= ~CONFIG_ASYNC;
					}
					e.Ie = false;
				}
			}
			if ((e.m !== 0 || e.T !== null) && !(laneServedHook && e.m & 1 && laneServedHook(e, null, true))) clearStatus(e, t);
		} catch (t) {
			const n = t instanceof NotReadyError;
			if (holdWorkHook && (!n || e.Ie)) e.l &= ~CONFIG_ASYNC;
			if (n && e.Ie) parkLoadingWindow(e, t);
			else {
				if (n || !(T = stageError(e, t, true))) {
					if (n) ext(e).fe = true;
					notifyStatus(e, n ? 1 : 2, t);
					if (n && f && !e.T?.Ee) settlePendingSource(e);
				}
				if ((n || T) && u) {
					for (const t of u) if (t !== e && !(e.T?.se?.has(t) && (t.m & 1 || retryReaches(e, t)))) settlePendingSource(e, t);
				}
			}
		} finally {
			tracking = D;
			if (laneStageHook) laneRoot = l;
			O = (e.R & REACTIVE_MISSED_WAKE) !== 0;
			d = !!(e.R & (r ? s || n || !(e.m & 1) ? 128 | REACTIVE_STAGED_READ : 0 : 128));
			if (observeFlightHook) e.l = e.l & 1073709055 | e.R & REACTIVE_PROBED | (e.R & REACTIVE_WINDOW) << 9 | (e.R & REACTIVE_AHEAD) << 11;
			e.R = e.R & (96 | REACTIVE_FRAME_READ | REACTIVE_STAGED_READ | REACTIVE_LANE_READ | REACTIVE_SCREEN_READ | REACTIVE_PROBE_UNANSWERED) | (t ? e.R & 256 : 0);
			context = A;
			if (o) for (const e of o) releaseIfSettledUnobserved(e);
			if (i && !S && e.m & 1) S = !!passHook(e, 1);
			if (e.T !== null) e.T.Ve = S && (e.m & 1) !== 0;
		}
		if (e.R & 64) {
			clearDeps(e);
			clearInFlight(e);
			if (laneStageHook) setPassLane(s);
			return;
		}
		let p = !laneStageHook ? null : passLane;
		const G = !!e.T?.U || T;
		if (laneStageHook && p !== null) {
			if (laneStageHook(e, p, t, G)) setPassLane(p);
			else p = null;
		}
		if (!G) {
			const o = e.ue === NOT_PENDING;
			const E = !o ? e.ue : e.le;
			const s = flushTransaction ?? passTx;
			const l = o && I && !n || !!e.T?.Te || !!(_ && s) || !!a || p !== null && e._parent?.l & 256 || !isSame(e, E, R);
			if (n && l && !(e.R & 262144 && !e.Ae && Object.is(e.ge, R)) && o) {
				e.Ae = !e.T?.U;
				if (!t) globalQueue.enqueue(n, e.W ?? (e.W = GlobalQueue.q.bind(null, e)), p);
			}
			if (laneOutcomeHook && !t && p === null && e.l & 8192 && laneOutcomeHook(e, R, G));
			else if (G);
			else if (l) {
				if (p !== null) {
					if (n && e.ue === NOT_PENDING) e.le = R;
					else e.ue = R;
					if (t && !n) e.m |= 4;
				} else if (t ? !(s !== null && (d || creatorPass(A)?.R & 128)) : n && e.ue === NOT_PENDING) e.le = R;
				else {
					e.ue = R;
					if (_) e.T.Te = _;
					if (t) {
						holdNode(e, s);
						e.m |= 4;
						freshHook?.(e, !r && flushTransaction);
					}
				}
				if (e.o !== null) p !== null ? laneDirty(e, p) : insertSubs(e);
			} else if (e.he != C) for (let t = e.o; t !== null; t = t.t) insertIntoHeapHeight(t.u, dirtyQueue);
			if (!l && !e.T?.U) {
				if (_) settleErroredDependents(e, _);
				if (u) {
					for (const t of u) if (t !== e) settlePendingSource(e, t);
				}
			}
			if (f && !(e.m & 5)) settlePendingSource(e);
		}
		if (t && p === null && d && e.m & 1) {
			const t = flushTransaction ?? passTx;
			t && !t.P && (n && freshHook?.(e) === 2 || holdNode(e, t));
		}
		if (!e.T?.U && (p !== null || e.ue === NOT_PENDING) && !(n && e.Ae)) {
			if (t || n === 3) trimStaleDeps(e);
			else heldTrim(e);
		}
		if (e.ue !== NOT_PENDING || e.T !== null && (e.T.me !== null || e.T.Le !== null) || (e.m & 5) !== 0 && (!t || (e.m & 1) !== 0)) {
			e.l |= 128;
			if (p === null) queuePendingNode(e);
		}
		if (laneStageHook) setPassLane(s);
		if (O) {
			enqueueSub(e);
			schedule();
		}
		if (keepReadersHook && E !== NOT_PENDING && Object.is(R, E)) keepReadersHook(e);
		if (c) releaseIfSettledUnobserved(e);
	}
	function updateIfNecessary(e) {
		if (e.R & 68) return;
		if (e.R & 1) for (let t = e.C; t; t = t.G) {
			const n = t.S;
			if (n.X) updateIfNecessary(n);
			if (e.R & 2) break;
		}
		if (e.R & 2 || e.T?.U && e.ie < clock && !e.T?.Ee) recompute(e);
		e.R = e.R & (376 | REACTIVE_MANUAL_WRITE | REACTIVE_FRAME_READ | REACTIVE_STAGED_READ | REACTIVE_LANE_READ | REACTIVE_SCREEN_READ | REACTIVE_PROBE_UNANSWERED);
	}
	function computed(e, t) {
		const n = t?.transparent ?? false;
		const o = t !== null && typeof t === "object" && "loadingValue" in t;
		const E = {
			id: inheritId(t, n, context),
			l: (n ? 4 : 0) | (t?.ownedWrite ? 1 : 0) | (!context || t?.lazy ? 32 : 0) | (t?.sync ? 64 : 0) | (t?.ae ? 2 : 0) | (t?.xe ?? 0) | (snapshotCaptureActive && ownerInSnapshotScope(context) ? 8 : 0),
			ye: t?.equals ?? isEqual,
			ke: null,
			A: context?.A ?? defaultContext,
			be: 0,
			X: e,
			le: o ? t.loadingValue : void 0,
			he: 0,
			ve: void 0,
			We: null,
			C: null,
			_: null,
			de: 0,
			o: null,
			Ze: null,
			_parent: context,
			Ge: null,
			Me: null,
			pe: null,
			R: t?.lazy ? 512 : 0,
			m: o ? 0 : 4,
			ie: clock,
			ue: NOT_PENDING,
			we: -1,
			Ie: o,
			T: null
		};
		if (t?.unobserved) ext(E).Ye = t.unobserved;
		setupComputedNode(E, t);
		return E;
	}
	/** Lazily allocate the cold extension. Hot paths read `el._x?._field` behind
	* `_config` bits; never call `ext()` just to store a default. */ function ext(e) {
		return e.T ?? (e.T = {
			Ee: null,
			Se: null,
			U: void 0,
			fe: void 0,
			se: void 0,
			Ye: void 0,
			De: void 0,
			me: null,
			Le: null,
			Re: null,
			Ve: false,
			je: NOT_PENDING,
			Be: -1,
			ce: 0,
			Ue: false,
			I: 0,
			Te: null
		});
	}
	/** A tracked read of a held node joins the flush to its hold (D-1), unless the
	* reader is a render effect: the frame reads the committed value outside its
	* hold's flush (D-25, `frameRead`). A node born held has no committed value,
	* so every reader joins. Under a boundary that has not shown content, a first
	* pass is the boundary's (F-4, #3540). */
	/** The pass whose plain read made this flush adopt a hold: a window it then
	* opens can give the hold back (#4777). */ var adopter = null;
	function joinPass(e, t) {
		if (observeFlightHook && !flushTransaction) adopter = e, adopted.length = 0;
		e.R |= 128;
		if (t.m & 4 || e.i !== 1) joinPassTx(txOf(t), !e.i && e.m & 4 || freshHook?.(e));
	}
	/** A frame reader of a node another hold holds is served the committed value,
	* publishes mainline and re-derives at that landing (D-25). Not one born
	* into that hold (#4010), nor a flight whose inputs already show: that would
	* tear (F-1, #3305). Lane work is a frame reader too: a lane sees the screen
	* plus its own guesses (F-6). */ function frameRead(e, t) {
		const n = observeFlightHook && e.l & 32768;
		const o = laneStageHook && passLane !== null;
		if (laneStageHook && e.l & 16777216 && e.m & 4 && (!o || t.m & 1)) {
			joinPass(e, t);
			return false;
		}
		if (!(n && holdStagingHook(e, t)) && !((!o || e.m & 4 && t.m & 1) && !n && (!(e.l & 1 << 23) || t.l & 1024))) {
			const E = txOf(t);
			if (o && passLane.over && resolveTx(passLane.over) === E && !n) return false;
			if (!(!o && E === flushTransaction && !n || bornInto(e, E))) {
				staleReader(e, E);
				if (o || n) laneServedHook(e, t);
				return true;
			}
		}
		joinPass(e, t);
		return false;
	}
	/** Born into `t`: held and never committed, or a member of a frame its held
	* pass built. It reads `t`'s values in any flush and keeps staging (#4010). */ function bornInto(e, t) {
		return (e.m & 4 || e.l & 1048576) && e.l & 256 && txOf(e) === t;
	}
	/** With `tail`, this pass's reads only. */ function hasDep(e, t, n) {
		for (let o = e.C; o !== null; o = o === n ? null : o.G) if (t(o.S)) return 1;
	}
	/** A staging a verdict pass reads for the first time is content it opens,
	* not a value it keeps (D-25, S-46, #4806). */ var fresh;
	function readsFresh(e, t) {
		return t.ue !== NOT_PENDING && e.l & 32768 && !hasDep(e, (e) => e === t);
	}
	/** The computed a creation under `owner` belongs to, or null. */ function creatorPass(e) {
		return e !== null && e.Qe ? e.Ke : e;
	}
	/** Park the previous pass's children and disposal list until this node's
	* commit replaces them. */ function parkChildren(e) {
		markDisposal(e);
		const t = ext(e);
		t.Le = e.ke;
		t.me = e.pe;
		e.ke = null;
		e.pe = null;
		e.be = 0;
	}
	/** One literal with every effect field, so V8 sees the full shape at construction. */ function createEffectNode(e, t, n, o, E) {
		const s = E?.transparent ?? false;
		const l = {
			id: inheritId(E, s, context),
			l: o << 23 | (s ? 4 : 0) | (E?.ownedWrite ? 1 : 0) | (E?.sync ? 64 : 0) | (E?.xe ?? 0) | (snapshotCaptureActive && ownerInSnapshotScope(context) ? 8 : 0),
			ye: false,
			ke: null,
			A: context?.A ?? defaultContext,
			be: 0,
			X: e,
			le: void 0,
			he: 0,
			ve: void 0,
			We: null,
			C: null,
			_: null,
			de: 0,
			o: null,
			Ze: null,
			_parent: context,
			Ge: null,
			Me: null,
			pe: null,
			R: 512,
			m: 4,
			ie: clock,
			ue: NOT_PENDING,
			we: -1,
			Ie: false,
			Ae: false,
			ge: void 0,
			qe: t,
			Je: n,
			ze: void 0,
			i: o,
			T: null
		};
		if (E?.unobserved) ext(l).Ye = E.unobserved;
		setupComputedNode(l, lazyOptions);
		return l;
	}
	/** The shared effect status notifier, installed by effect.ts. */ var effectStatusNotify = null;
	function setEffectStatusNotify(e) {
		effectStatusNotify = e;
	}
	/** Effect nodes get the shared notifier; presence also marks a display consumer. */ function statusNotifierOf(e) {
		return e.i ? effectStatusNotify : null;
	}
	var lazyOptions = { lazy: true };
	function setupComputedNode(e, t) {
		e.We = e;
		const n = context?.Qe ? context.Ke : context;
		if (context) linkChild(context, e);
		if (n) e.he = n.he + 1;
		wireExternalSourceHook?.(e);
		!t?.lazy && recompute(e, true);
		if (snapshotCaptureActive && !t?.lazy) {
			if (!(e.m & 1) && !(e.l & 2)) takeSnapshot(e, e.le);
		}
	}
	function signal(e, t) {
		const n = {
			ye: t?.equals ?? isEqual,
			l: (t?.ownedWrite ? 1 : 0) | (t?.ae ? 2 : 0),
			le: e,
			o: null,
			Ze: null,
			ie: clock,
			ue: NOT_PENDING,
			we: -1,
			T: null
		};
		if (t?.unobserved) ext(n).Ye = t.unobserved;
		if (snapshotCaptureActive && !(n.l & 2)) takeSnapshot(n, e);
		return n;
	}
	function isEqual(e, t) {
		return e === t;
	}
	/** Dev: when set to a component name, a reactive read outside a nested
	* tracking scope warns. Managed by `untrack(fn, strictReadLabel)`. */
	/** The verdict windows' read, set while a window is open. */ var verdict = null;
	/**
	* Runs `fn` outside of any reactive tracking — reads inside `fn` will not
	* subscribe the current scope. Returns whatever `fn` returns.
	*
	* Use `untrack` inside a memo or effect when you need to read a signal once
	* without making the surrounding computation depend on its future changes.
	*
	* In a component body, `untrack` marks a read as a deliberate one-time
	* snapshot and silences `STRICT_READ_UNTRACKED`. Use it only when the value
	* must never update and is never downstream of async: an async-derived value
	* can still be pending (the read throws) or mid-transition (the snapshot is
	* the old committed value). When it should follow its source, move the read
	* to where the value is used (JSX, a memo, an effect's compute, the event
	* handler, or an accessor passed to the hook that needs it) instead.
	*
	* `untrack` stops dependency tracking, not async settlement. Reading an
	* uninitialized async source still suspends the owning computation; it runs
	* again when that source first resolves. Afterward, the untracked read is a
	* snapshot and does not subscribe the computation to later changes.
	*
	* If the first read must return immediately, give the async source a
	* `loadingValue` before reading it with `untrack`. `isPending` and `latest`
	* inspect updates to an existing value; neither supplies a missing initial
	* value.
	*
	* Pass a `strictReadLabel` string to enable a dev-mode warning: any reactive
	* read inside `fn` that isn't inside a nested tracking scope will log a
	* warning naming the label.
	*
	* @example
	* ```ts
	* createEffect(
	*   () => trigger(),                 // tracks `trigger` only
	*   () => {
	*     const snapshot = untrack(() => state); // read once, untracked
	*     log(snapshot);
	*   }
	* );
	*
	* const color = createMemo<string>(() => fetchColor(), { loadingValue: "gray" });
	* const initialColor = untrack(color); // "gray" while the fetch is unresolved
	* ```
	*/ function untrack(e, t) {
		const n = tracking;
		tracking = false;
		try {
			if (externalUntrackHook) return externalUntrackHook(e);
			return e();
		} finally {
			tracking = n;
		}
	}
	/** > 0 while `runRefCallback` runs: a ref born into a held node's hold may
	* read its staging (#4767, F-7). */ var refCallbackDepth = 0;
	/** Runs a compiled `ref()` callback untracked in the creating pass's context
	* (#4761); in dev, creating a primitive there is PRIMITIVE_IN_EFFECT_CALLBACK.
	*
	* @internal */ function runRefCallback(e) {
		refCallbackDepth++;
		try {
			untrack(e);
		} finally {
			refCallbackDepth--;
		}
	}
	function prepareComputed(e, t) {
		if (e.R & 512) {
			e.R &= -513;
			recompute(e, true);
		} else if (e.R & 64) {
			if (e.l & 32) {
				const t = e._parent;
				if (t !== null) {
					if (t.R & 64) {
						e.l &= -33;
						return;
					}
					if (!(e.R & 32)) linkChild(t, e);
				}
				recompute(e, true);
			}
		}
	}
	/** Does reader `c` see a staged node's committed value? Read's fast block
	* carries the same test inline. An untracked read and a frame-only reader
	* (createTrackedEffect / onSettled, D-29) see the committed frame. */ function readerSeesCommitted(e, t) {
		return !t || e.ue === NOT_PENDING || t.l & 16;
	}
	/** Set when a node is staged outside a flush, cleared when a flush begins:
	* one module boolean keeps the F-10 arm free inside a flush. */ var unflushedStaged = false;
	function markUnflushedStaged() {
		unflushedStaged = true;
	}
	/** A write is visible from the flush that carries it (F-10): outside a flush
	* a staged node serves its committed value. Promoted writes are exempt. */ function unflushedValue(e) {
		if (globalQueue.Y || e.ue === NOT_PENDING || e.l & 4194304) return NOT_PENDING;
		if (e.l & 256) return e.T.Be === clock ? e.T.je : NOT_PENDING;
		return e.le;
	}
	/** A held node rewritten outside a flush keeps the last flushed staging until
	* the flush that carries the rewrite (F-10); the clock stamps the stash. */ function stashFlushed(e) {
		const t = e.T;
		if (t.Be !== clock) {
			if (revertHook) heldRewrites.push(e);
			t.je = e.ue;
			t.Be = clock;
			unflushedStaged = true;
		}
	}
	var promotedWrites = [];
	/** A derivation served the committed value because of an unflushed write runs
	* again in the flush that carries it: it linked after the write walked (F-10, #3337). */ function markLateLinker(e) {
		e.R |= REACTIVE_MISSED_WAKE;
		return true;
	}
	function resyncUnflushedCompanions() {
		unflushedStaged = false;
		if (promotedWrites.length !== 0) {
			for (const e of promotedWrites) e.l &= ~CONFIG_PROMOTED;
			promotedWrites.length = 0;
		}
	}
	function pullComputed(e, t) {
		if (e.he >= dirtyQueue.Fe || e.R & 1) {
			markNode(t);
			markHeap(dirtyQueue);
			updateIfNecessary(e);
		} else if (t.l & 65536) updateIfNecessary(e);
		const n = e.he;
		if (e._parent === t) e.R |= REACTIVE_OWNER_READS;
		else if (n >= t.he) liftOwned(t, t.he = n + 1);
	}
	/** A first answer staged this flush and re-asked in it (D-22, F-9): a memo
	* with no value derives from that answer once, as a flush of the answer
	* alone would have let it, then waits on the re-ask. One served pass a
	* flush (`_served`), or a pass that throws anyway re-runs without end. Not a
	* render effect, lane work, a verdict lane's pass (D-25) or a held node. */ function servesStaged(e, t, n) {
		return passLane === null && e.m & n.m & 4 && t.ue !== NOT_PENDING && !(t.l & 2097408) && !e.i && (e.R & 4096 || e.ue === NOT_PENDING && e.T?.$e !== clock && (!(e.m & 1) || e.T?.se?.delete(n.T.U.source)) && (ext(e).$e = clock, e.R |= 4096));
	}
	function read(e) {
		let t = context;
		if (t?.Qe) t = t.Ke;
		if (verdict !== null) return verdict(e, t);
		if (typeof e.X === "function") prepareComputed(e);
		if (!e.X && e.T?.De === void 0 && !snapshotCaptureActive && (!unflushedStaged || e.ue === NOT_PENDING) && !(e.l & 2048) && true) {
			if (t) {
				if (laneStageHook) fresh = tracking && readsFresh(t, e);
				if (tracking) link(e, t);
				if (e.l & 256 && !(t.l & 16)) {
					if (frameRead(t, e)) return e.le;
				}
			}
			if (!t || e.ue === NOT_PENDING || t.l & 16) return e.le;
			if (e.ue === e.le && Object.is(e.ue, e.le) || (observeFlightHook && t.l & 32768 || laneStageHook && passLane?.folded) && stagedScreen(t, e)) return e.le;
			stagedRead(t);
			return e.ue;
		}
		let n = false;
		let o;
		if (t) {
			if (laneStageHook) fresh = tracking && readsFresh(t, e);
			if (tracking) {
				o = link(e, t);
				if (e.X) {
					pullComputed(e, t);
					if (observeFlightHook && (t.m & 4 ? t.l & 256 || flushTransaction : t.l & 1048576)) {
						if (t.i === 1 && e.l & 32768 && !(e.m & 5)) t.R |= REACTIVE_AHEAD;
						if ((e.l & 1619034112) === 32768 && !(t.l & 536870912)) {
							const n = resolveTx(t.l & 256 ? txOf(t) : flushTransaction), o = ext(e);
							if (o.Dt !== n) {
								o.Dt = n;
								recompute(e);
							}
						}
					}
					if (observeFlightHook && !t.i) t.R |= e.l & CONFIG_VERDICT & (e.m & 1 && (t.l & 128 || t.m & 4) ? t.l : -1);
				}
			}
			if (e.l & 256 && !(e.l & 2048) && !(t.l & 16)) {
				if (e.m & 4) joinPass(t, e);
				else n = frameRead(t, e);
			}
		}
		if (laneReadHook && e.l & 2048) {
			const n = laneReadHook(t, e);
			if (n !== NOT_PENDING) return n;
		}
		if (snapshotCaptureActive && t && t.l & 8) {
			const n = e.T?.De;
			if (n !== void 0 && !(e.m & 2)) {
				const o = n === NO_SNAPSHOT ? void 0 : n;
				if ((e.ue !== NOT_PENDING ? e.ue : e.le) !== o) t.R |= 256;
				return o;
			}
		}
		if (laneStageHook && e.m & 1 && !n && !(e.l & 2048) && !(e.m & 4)) {
			if (t !== null && t.l & 32768 && !(t.l & 16777216 && t.m & 4)) n = observeFlightHook(t, e);
			else if (passLane !== null && (!(t?.m & 4) || bornOfLaneRerun(t))) n = laneServedHook(t, e, true);
		}
		if (e.m & 1 && !n) {
			if (t) {
				if (!(t.l & 16) || e.m & 4) {
					if (observeFlightHook && servesStaged(t, e, e)) return e.ue;
					if (!tracking && e !== t) link(e, t);
					throw e.T?.U;
				}
			} else if (e.m & 4) throw e.T?.U;
		}
		if (e.X && e.m & 2) {
			if (o && e.ie < clock && !(e.R & 32)) {
				recompute(e);
				return read(e);
			}
			if (!n && e.l & 2097152) serve(e, t);
			throw e.T?.U;
		}
		if (n || !t) throwShown(e);
		const E = serve(e, n ? null : t);
		if (!t && typeof e.X === "function" && e.l & 32 && !(e.m & 1) && !e.o) {
			dormantNodes.add(e);
			schedule();
		}
		return E;
	}
	/** A first pass a guess lane's re-run creates stands where the memo it
	* replaces stood, so lane work's read of a parent's flight is the screen's
	* for it too (#4824). A boundary's structure (F-7, #3835) and a mount a
	* display-ahead read opens (S-58, D-25) still see the flight. */ function bornOfLaneRerun(e) {
		const t = e._parent;
		return passLane._parent?.Pe !== passLane && t?.X && !(t.m & 4 | t.l & 8388608);
	}
	/** A reader served the screen reads a shown error until its replacement
	* commits (D-41). */ function throwShown(e) {
		if (e.T?.Te) throw e.T.Te;
	}
	/** The value reader `c` (null: untracked) is served from `el`; read's fast
	* block keeps its trivial ternary for speed. */ function serve(e, t) {
		if (e.ue !== NOT_PENDING && e.m & 4 && (!t || t.l & 16)) {
			if (refCallbackDepth > 0) {
				const t = creatorPass(context);
				if (t && e.l & 256 && bornInto(t, txOf(e))) return e.ue;
			}
			throw new NotReadyError(null);
		}
		const n = t && unflushedStaged ? unflushedValue(e) : NOT_PENDING;
		if (n !== NOT_PENDING) {
			markLateLinker(t);
			return n;
		}
		if (readerSeesCommitted(e, t) || observeFlightHook && t.l & 32768 && !(e.m & 4) && stagedScreen(t, e) && !throwShown(e)) return e.le;
		stagedRead(t, e);
		if (e.l & 2097152) throw e.ue;
		return e.ue;
	}
	/** A pass read a staging of this flush: the seam decides (D-25). Lane work
	* too: if the flush parks, the pass re-derives on the committed world and
	* its lane waits that round, so the held write never shows through it. A
	* folded lane only before the frame has a transaction (D-34). Not a node
	* born staged: a re-run would read the same staging every round (#3969). */ function stagedRead(e, t) {
		if (!(t?.m & 4)) {
			if (laneServedHook && passLane !== null) laneServedHook(e, null);
			e.R |= REACTIVE_STAGED_READ;
			if (laneSeamsHook && (passLane !== null || e.i && e.l & 32768)) stagedReaders.push(e);
		}
	}
	/** A verdict reader's plain read of a staged node sees the screen once the
	* frame has a transaction, and re-derives at its landing (D-25, #3322).
	* Before that the seam answers. A node born into the future (F-7), a reader
	* born into the transaction (#4010) or into the hold (D-25) has no screen. */ function stagedScreen(e, t) {
		if (flushTransaction === null || bornInto(e, flushTransaction) || (t?.l & 2304) === 256 || observeFlightHook && holdStagingHook(e, t)) return false;
		if (laneStageHook && t && fresh && passLane && e.R >> 24 != 1) passLane.Gt = 1;
		staleReader(e, flushTransaction);
		return true;
	}
	/** A write inside a recompute outside a flush is promoted at that pass's end. */ function notePromotedWrite(e) {
		if (globalQueue.Y || e.l & 4194304) return;
		e.l |= CONFIG_PROMOTED;
		promotedWrites.push(e);
	}
	/** The first write during snapshot capture to a plain user signal records the
	* pre-write value. Async landings reveal, and projection leaves are their
	* compute's, so neither qualifies. */ function captureWriteSnapshot(e, t) {
		if (e.l & 2 || e.X !== void 0 || e.T?.De !== void 0) return;
		takeSnapshot(e, t);
	}
	function takeSnapshot(e, t) {
		ext(e).De = t === void 0 ? NO_SNAPSHOT : t;
		e.l |= 512;
		snapshotSources.add(e);
	}
	/** Called before every signal or store write while set. The server-components
	* client mounts still-deferred slots before a write applies, then clears it. */ var writeHook = null;
	/** The one guarded comparator call. A comparator that read unresolved async
	* reports a change (#4111); any other throw is `el`'s error, routed to its
	* boundary and answered "same" (D-38, #2837).
	* @internal */ function isSame(e, t, n) {
		if (e.ye === isEqual) return t === n;
		try {
			return e.ye && e.ye(t, n);
		} catch (t) {
			if (!(t instanceof NotReadyError)) return notifyStatus(e, 2, t), true;
		}
	}
	function setSignal(e, t) {
		if (writeHook !== null) writeHook(e);
		const n = e.ue === NOT_PENDING ? e.le : e.ue;
		if (typeof t === "function") t = t(n);
		if (laneWriteHook && e.l & 2048) return laneWriteHook(e, t);
		if (e.l & 256) joinFuture(txOf(e));
		const o = observeFlightHook ? e.ye !== isEqual : null;
		if (!(!!(e.m & 4) || !!e.T?.Te || (o === false ? n !== t : !isSame(e, n, t)))) return t;
		if (snapshotCaptureActive) captureWriteSnapshot(e, n);
		const s = e.ue !== NOT_PENDING;
		if (!s) queuePendingNode(e);
		else if (e.l & 256 && !globalQueue.Y) stashFlushed(e);
		e.ue = o && s && !(e.m & 4 || e.T?.Te) && isSame(e, e.le, t) ? e.le : t;
		if (context !== null) notePromotedWrite(e);
		if (e.X !== void 0) e.ie = clock;
		if (s && e.we === notifyEpoch) return t;
		insertSubs(e);
		schedule();
		return t;
	}
	/** User-facing setter for the memo form of `createSignal(fn)`. The write
	* stages like any other, and a later source change re-derives with it as
	* `prev` (D-8, CS-R31). REACTIVE_MANUAL_WRITE marks it a user proposal until
	* a pass re-derives it or the commit lands it. */ function setMemo(e, t) {
		const n = e.l & 256 && !(e.R & 1024) && txOf(e) !== flushTransaction;
		if (n && typeof t === "function") {
			const n = t(e.le);
			t = () => n;
		}
		if (e.m & 2) {
			e.T.Te = e.T.U;
			notifyStatus(e, 0);
		}
		t = setSignal(e, t);
		e.l &= ~CONFIG_STAGED_ERROR;
		if (n) {
			e.R = e.R & -2 | 2;
			insertIntoHeap(e, dirtyQueue);
			schedule();
		} else if (e.ue !== NOT_PENDING) e.R |= REACTIVE_MANUAL_WRITE;
		return t;
	}
	/**
	* Executes `fn` with the given `owner` set as the current owner. Any reactive
	* primitives (`createSignal`, `createMemo`, `createEffect`, `onCleanup`,
	* `cleanup`, etc.) created inside `fn` are attached to that owner, so they
	* are disposed when the owner is disposed.
	*
	* The classic pattern: capture the current owner with `getOwner()` inside a
	* component, then re-enter it from a callback (event handler, async resolve,
	* setTimeout) so disposables created in the callback get cleaned up with the
	* component.
	*
	* @example
	* ```ts
	* function delayed<T>(ms: number, fn: () => T) {
	*   const owner = getOwner();
	*   setTimeout(() => runWithOwner(owner, fn), ms);
	* }
	* ```
	*/ function runWithOwner(e, t) {
		const n = context;
		const o = tracking;
		context = e;
		tracking = false;
		try {
			return t();
		} finally {
			context = n;
			tracking = o;
		}
	}
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/core/identities.js
	/**
	* @internal Called with every plain signal `createSignal` makes, and every
	* plain store root `createStore` makes, while set (the namer above). Never
	* set unless `setSignalIdentities` is imported, so a bundle without it keeps
	* only a null check.
	*/ var signalHook = null;
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/core/context.js
	/**
	* Low-level owner-targeted context read. The user-facing read API is
	* `useContext` (in `solid-js`), which wraps this primitive. Exposed here for
	* cross-package wiring (e.g. hydration-aware context plumbing).
	*
	* @throws `NoOwnerError` in dev if there's no owner at the time of call; production
	*   reads the default instead (see below).
	* @throws `ContextNotFoundError` if a context value has not been set yet.
	*
	* @internal
	*/ function getContext(e, t = getOwner()) {
		let r;
		if (t) r = t.A[e.id];
		if (r === void 0) r = e.defaultValue;
		if (r === void 0) throw new ContextNotFoundError();
		return r;
	}
	/**
	* Low-level owner-targeted context write. The user-facing API is
	* `createContext` (in `solid-js`); its provider component wraps this
	* primitive. Exposed here for cross-package wiring.
	*
	* @throws `NoOwnerError` if there's no owner at the time of call.
	*
	* @internal
	*/ function setContext(e, t, r = getOwner()) {
		if (!r) throw new NoOwnerError();
		r.A = {
			...r.A,
			[e.id]: t === void 0 ? e.defaultValue : t
		};
	}
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/core/effect.js
	/**
	* Effects are the leaf nodes of our reactive graph. When their sources change, they are
	* automatically added to the queue of effects to re-execute, which will cause them to fetch their
	* sources and recompute
	*/ function effect$1(e, t, E, f) {
		const o = createEffectNode(e, t, E, !!f?.user ? 2 : 1, f);
		recompute(o, true);
		f?.defer ? applyStaged(o) : o.ue === NOT_PENDING && (o.T?.Re?.P || o.i === 2 || f?.schedule ? globalQueue.enqueue(o.i, runEffect.bind(null, o), o.T?.Re) : runEffect(o, 0));
	}
	function notifyEffectStatus() {
		const e = this.m;
		const t = this.T?.U;
		if (e & 2) {
			globalQueue.notify(this, 1, 0);
			if (this.i === 2) {
				if (this.m & 2) queueEffectRun(this);
				return;
			}
			escalate(this, unwrapStatusError(t));
		} else if (this.i === 2) {
			if (e & 1 && this.Ae && !t?.source?.T?.Ve) ext(this).fe = !(this.Ae = false);
		} else if (this.i === 1) globalQueue.notify(this, 3, e, t);
	}
	/** An effect's error no boundary takes halts the system (boundary-or-halt):
	* halted with `cause` and rethrown; dev locates it at `subject` (default:
	* the effect). */ function escalate(e, t, E) {
		if (!globalQueue.notify(e, 2, 2)) {
			haltReactivity(t);
			throw t;
		}
	}
	function runEffect(e, t) {
		if (!e.Ae || e.R & 64) return;
		if (t && heldRunHook?.(e)) return;
		if (t && attachHook?.(e)) return;
		if (e.m & 2 && e.i === 2) {
			const t = unwrapStatusError(e.T?.U);
			e.ge = e.le;
			e.Ae = false;
			try {
				e.Je ? e.Je(t, () => {
					const t = e.ze;
					e.ze = void 0;
					t?.();
				}) : console.error(t);
			} catch (t) {
				escalate(e, t);
			}
			return;
		}
		const E = e.T?.U == null;
		const f = e.ze;
		e.ze = void 0;
		try {
			f?.();
			e.ze = e.qe(e.le, e.ge);
		} catch (t) {
			ext(e).U = new StatusError(e, t);
			e.m |= 2;
			escalate(e, t);
		} finally {
			e.ge = e.le;
			e.Ae = false;
			if (E) trimStaleDeps(e);
		}
	}
	GlobalQueue.q = runEffect;
	setEffectStatusNotify(notifyEffectStatus);
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/store/types.js
	/** Brand keys the proxy answers directly (never user data). */
	var $TRACK = Symbol(0);
	var $TARGET = Symbol(0);
	var $PROXY = Symbol(0);
	var $RECORD = Symbol(0);
	function ownEnumerableKeys(e) {
		return Reflect.ownKeys(e).filter((a) => Object.prototype.propertyIsEnumerable.call(e, a));
	}
	/** The list driver's view of a shallow store (map.ts): the backing a read of
	* every slot serves this reader, or `undefined` when the list is no shallow
	* store or a slot read could differ from it. Installed by store.ts's top
	* level, so a `<For>` in an app without stores carries none of it; it lives
	* beside `$TRACK` so map.ts reaches no other store module. */ var shallowView = null;
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/signals.js
	/**
	* Low-level reactive-cleanup primitive. Registers a callback that runs when
	* the surrounding owner is disposed.
	*
	* **In 2.0 user code this is rare.** The two cases where you might reach for
	* it have better-shaped tools:
	*
	* - **Component lifecycle (mount/unmount, listeners, intervals):** use
	*   {@link onSettled} and **return** a cleanup function. Setup and teardown
	*   stay paired in one block. This replaces the 1.x `onMount` + `onCleanup`
	*   pairing.
	* - **Cleanup tied to an effect run:** `onCleanup` does not belong in
	*   `createEffect`'s apply phase. If a compute phase genuinely needs per-run
	*   teardown, that's usually a sign the work should be a memo/projection
	*   instead, or moved to `onSettled` if it's lifecycle-shaped.
	*
	* Where `onCleanup` is the right tool is **library / custom-primitive
	* internals** — coordinating disposal inside a `createRoot` body, or wiring
	* cleanup to a captured owner via `runWithOwner` from a custom factory.
	* Application code rarely needs to write any of those shapes directly.
	*
	* Must be called inside an owner. Calling outside an owner is a no-op (with a
	* dev-mode warning).
	*
	* Cannot be used inside `createTrackedEffect` or `onSettled` — return a
	* cleanup function from the callback body instead.
	*
	* Cleanups run in unwind order: an owner's children are disposed before its
	* own cleanups, and within one owner later registrations run before earlier
	* ones. In production a component body shares its enclosing owner, so
	* register cleanup before creating children when the order between them
	* matters.
	*
	* @example
	* ```ts
	* // Library shape: thread a resource's disposal into a *captured* owner
	* // from a factory that has no settle-phase setup of its own. `onSettled`
	* // would queue a callback we don't need; `onCleanup` is the leaner
	* // primitive when the only job is "register disposal on this owner".
	* function bindToOwner<T extends { dispose(): void }>(owner: Owner, resource: T): T {
	*   runWithOwner(owner, () => onCleanup(() => resource.dispose()));
	*   return resource;
	* }
	* ```
	*/ function onCleanup(e) {
		return cleanup(e);
	}
	function accessor(e) {
		const t = read.bind(null, e);
		t[$REFRESH] = e;
		return t;
	}
	function createSignal$1(e, t) {
		if (typeof e === "function") {
			const r = computed(e, t);
			r.l &= -33;
			return [accessor(r), setMemo.bind(null, r)];
		}
		const r = signal(e, t);
		if (signalHook !== null) signalHook(r);
		return [accessor(r), setSignal.bind(null, r)];
	}
	function createMemo$1(e, t) {
		return accessor(computed(e, t));
	}
	/**
	* Creates a reactive effect with **separate compute and effect phases**.
	*
	* - `compute(prev)` runs reactively — *put all reactive reads here*. The
	*   returned value is passed to `effect` and is also the new "previous" value
	*   for the next run.
	* - `effect(next, prev?)` runs imperatively (untracked) after the queue
	*   flushes. *Put DOM writes / fetch / logging / subscriptions here.* It may
	*   return a cleanup function which runs before the next effect or on
	*   disposal.
	*
	* Reactive reads inside `effect` will *not* re-trigger this effect — that's
	* intentional. If you need a single-phase tracked effect, use
	* `createTrackedEffect` (with the tradeoffs noted there).
	*
	* Pass an `EffectBundle` (`{ effect, error }`) instead of a plain function to
	* intercept **compute-phase** errors — errors thrown by `compute` or arriving
	* from upstream reactive sources (including async rejections), which your own
	* code has no frame to `try/catch`. The `error` handler is the error arm of
	* the effect phase: it runs on the same schedule and in the same imperative,
	* writable scope as `effect` (setting error state via signals is fine), and
	* only for *settled* errors — a transient error that recovers before the
	* effect phase runs `effect` with the recovered value instead, and a held
	* transition defers it exactly as it defers `effect`. Without an `error`
	* handler a compute-phase error is logged and the effect simply skips that
	* run — a non-render effect's reactivity failing does not crash the app.
	* Rethrowing from `error` escalates it to the nearest error boundary
	* (halting the system if none exists).
	*
	* The **effect phase is different**: it is your own imperative code, so handle
	* failures with `try/catch` where they occur. An uncaught effect-phase throw
	* is treated as an unhandled application error — caught by the nearest
	* `createErrorBoundary`/`<Errored>`, and permanently halting the reactive
	* system if there is none. It is *not* routed to the bundle's `error` handler.
	*
	* ```typescript
	* createEffect<T>(compute, effectFn | { effect, error }, options?: EffectOptions);
	* ```
	* @param compute a function that receives its previous value and returns a new value used to react on a computation
	* @param effectFn a function that receives the new value and is used to perform side effects (return a cleanup function), or an `EffectBundle` with `effect` and `error` handlers
	* @param options `EffectOptions` -- name, defer, schedule, transparent
	*
	* @example
	* ```ts
	* const [count, setCount] = createSignal(0);
	*
	* createEffect(
	*   () => count(),                  // compute: tracks `count`
	*   value => console.log(value)     // effect: side effect
	* );
	*
	* setCount(1); // logs 1 after the next flush
	* ```
	*
	* @example
	* ```ts
	* createEffect(
	*   () => userId(),
	*   id => {
	*     const ctrl = new AbortController();
	*     fetch(`/users/${id}`, { signal: ctrl.signal });
	*     return () => ctrl.abort(); // cleanup before next run / disposal
	*   }
	* );
	* ```
	*
	* @description https://docs.solidjs.com/reference/solid-js/reactivity/create-effect
	*/ function createEffect$1(e, t, r) {
		effect$1(e, t.effect || t, t.error, {
			user: true,
			...r
		});
	}
	/**
	* Creates a reactive computation that runs during the render phase as DOM elements
	* are created and updated but not necessarily connected.
	*
	* Same compute / effect split as `createEffect`, but scheduled inside the render
	* queue rather than after it. Reach for this only when authoring renderer
	* plumbing (custom DOM bindings, JSX-generated `insert()` / `spread()` calls).
	* App code should use `createEffect`.
	*
	* ```typescript
	* createRenderEffect<T>(compute, effectFn, options?: EffectOptions);
	* ```
	* @param compute a function that receives its previous value and returns a new value used to react on a computation
	* @param effectFn a function that receives the new value and is used to perform side effects
	* @param options `EffectOptions` -- name, defer, schedule, transparent
	*
	* @example
	* ```ts
	* // Custom directive: bind an element's textContent to a reactive source.
	* function bindText(el: HTMLElement, source: () => string) {
	*   createRenderEffect(
	*     () => source(),
	*     value => { el.textContent = value; }
	*   );
	* }
	* ```
	*
	* @description https://docs.solidjs.com/reference/solid-js/advanced/specialized-reactivity/create-render-effect
	*/ function createRenderEffect$1(e, t, r) {
		effect$1(e, t, void 0, r);
	}
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/map.js
	function mapArray(t, e, i) {
		const s = typeof i?.keyed === "function" ? i.keyed : void 0;
		const n = e.length > 1;
		const r = e;
		const o = {
			H: createOwner(),
			it: 0,
			st: t,
			ot: [],
			ft: r,
			ht: [],
			ln: [],
			Xe: s,
			ct: s || i?.keyed === false ? [] : void 0,
			lt: n && i?.keyed !== false ? [] : void 0,
			ut: i?.keyed === false,
			L: i?.fallback
		};
		const h = computed(updateKeyedMap.bind(o), void 0);
		h.l &= -33;
		return accessor(h);
	}
	var pureOptions = { ownedWrite: true };
	function trySmallMove(t, e, i, s) {
		const n = t.ot;
		const r = t.it - 1;
		const o = [];
		const h = [];
		const f = [];
		let c = 256;
		let a = s;
		let l = s;
		while (a <= r && l <= i - 1) {
			const t = n[a];
			const s = e[l];
			if (t === s) {
				const t = a;
				do
					l++;
				while (++a <= r && l < i && n[a] === e[l]);
				f.push(t, l - a + t, a - t);
				continue;
			}
			let u = -1;
			let w = Math.min(32 - o.length, r - a, c);
			for (let t = 1; t <= w; t++) if (n[a + t] === s) {
				u = t;
				break;
			}
			c -= u === -1 ? w : u;
			let d = -1;
			w = Math.min(32 - h.length, i - 1 - l, c);
			for (let i = 1; i <= w; i++) if (e[l + i] === t) {
				d = i;
				break;
			}
			c -= d === -1 ? w : d;
			if (u !== -1 && (d === -1 || u <= d)) {
				while (u-- > 0) o.push(a++);
				continue;
			}
			if (d !== -1) {
				while (d-- > 0) h.push(l++);
				continue;
			}
			if (c <= 0 || o.length === 32 || h.length === 32) return false;
			o.push(a++);
			h.push(l++);
		}
		for (; a <= r; a++) {
			if (o.length === 32) return false;
			o.push(a);
		}
		for (; l <= i - 1; l++) {
			if (h.length === 32) return false;
			h.push(l);
		}
		return commitSmallMove(t, e, i, s, o, h, f);
	}
	/** PHASE 2 of the small-move path, in its OWN function so that a pass which
	* only SCANS and bails (a full replace: the first structural pass of a page,
	* typically) compiles nothing but the scan — V8 parses and compiles lazily
	* per function, and cold `replace` measured +0.5 ms with both phases in one
	* body. Pairs displaced sources with destinations (an unmatched destination
	* is a replacement/insertion → general path), then commits: slice() the live
	* arrays, copy shifted runs, patch displaced pairs, dispose leftovers. */ function commitSmallMove(t, e, i, s, n, r, o) {
		const h = t.ot;
		let f;
		let c;
		let a;
		if (r.length !== 0) {
			a = new Array(n.length);
			for (c = 0; c < r.length; c++) {
				let t = -1;
				for (f = 0; f < n.length; f++) if (!a[f] && h[n[f]] === e[r[c]]) {
					t = f;
					break;
				}
				if (t === -1) return false;
				a[t] = true;
				r[c] = r[c] << 6 | t;
			}
		}
		for (f = 0; f < n.length; f++) {
			const t = h[n[f]];
			if (t === void 0) return false;
			for (c = s - 1; (c = h.indexOf(t, c + 1)) !== -1;) if (!n.includes(c)) return false;
		}
		const l = t.ht;
		const u = t.ln;
		const w = l.slice(0, i);
		const d = u.slice(0, i);
		for (let t = 0; t < o.length; t += 3) {
			const e = o[t];
			const i = o[t + 1];
			if (e !== i) for (let s = 0; s < o[t + 2]; s++) {
				w[i + s] = l[e + s];
				d[i + s] = u[e + s];
			}
		}
		for (c = 0; c < r.length; c++) {
			const t = r[c] >> 6;
			const e = n[r[c] & 63];
			w[t] = l[e];
			d[t] = u[e];
		}
		t.ht = w;
		t.ln = d;
		t.it = i;
		t.ot = e;
		for (f = 0; f < n.length; f++) if (a === void 0 || !a[f]) u[n[f]].dispose();
		return true;
	}
	/** Stage a PURE REMOVAL without the key map: when the new window is the old
	* window with items dropped, in order (one-item removals, every-nth, the
	* table filters), a two-pointer walk lands every survivor in the window
	* stage with one key call per item and returns the leavers; a shape that is
	* not an ordered subsequence returns null with the node stage cleared, and
	* the map path below starts from scratch (it rewrites every window slot of
	* `temp` / `rows` / `indexes`, so only `tempNodes`' `!== undefined` probe
	* needs the reset). The stage arrays are scratch — nothing live is touched. */ function stageRemoval(t, e, i, s, n, r, o, h, f) {
		const c = t.Xe;
		const a = t.ot;
		const l = t.ln;
		const u = [];
		let w = i;
		for (let d = i; d <= n; w++, d++) {
			const n = c ? c(e[d]) : e[d];
			while (w <= s && (c ? c(a[w]) : a[w]) !== n) u.push(l[w++]);
			if (w > s) {
				o.fill(void 0);
				return null;
			}
			r[d] = t.ht[w];
			o[d - i] = l[w];
			if (h) h[d - i] = t.ct[w];
			if (f) f[d - i] = t.lt[w];
		}
		for (; w <= s; w++) u.push(l[w]);
		return u;
	}
	/** Land a staged window into the live bookkeeping arrays in place: shift the
	* suffix by `dif` (a loop walked from the side that never overwrites an
	* unread slot), take the window from the stage, write survivors' row and
	* index signals. Its own function so the general path's body stays under
	* the JIT's optimization budget — the inlined commit measured ~10% slower on
	* full-window reorders (the small-move note has the same finding). */ function commitWindow(t, e, i, s, n, r, o, h, f) {
		const c = t.ln;
		const a = t.ct;
		const l = t.lt;
		const u = t.it;
		const w = i - u;
		let d, p;
		if (w > 0) {
			c.length = i;
			if (a) a.length = i;
			if (l) l.length = i;
			for (d = u - 1, p = i - 1; d > n; d--, p--) {
				c[p] = c[d];
				if (a) a[p] = a[d];
				if (l) l[p] = l[d];
			}
		} else if (w < 0) {
			for (d = n + 1, p = r + 1; d < u; d++, p++) {
				c[p] = c[d];
				if (a) a[p] = a[d];
				if (l) l[p] = l[d];
			}
			c.length = i;
			if (a) a.length = i;
			if (l) l.length = i;
		}
		for (p = s; p <= r; p++) {
			c[p] = o[p - s];
			if (a) writeRow(a[p] = h[p - s], e[p]);
			if (l) setSignal(l[p] = f[p - s], p);
		}
		for (p = r + 1; p < i; p++) {
			if (a) writeRow(a[p], e[p]);
			if (l && w !== 0) setSignal(l[p], p);
		}
	}
	var writeRow = (t, e) => t.le === e && t.ue === NOT_PENDING || setSignal(t, e);
	function updateKeyedMap() {
		this.H.Ke = getOwner();
		let t = this.st() || [];
		t[$TRACK];
		t = shallowView?.(t[$TARGET]) ?? t;
		const e = t.length;
		runWithOwner(this.H, updateKeyedRows.bind(this, t, e));
		return this.ht;
	}
	function updateKeyedRows(t, e) {
		const i = t.slice(0);
		let s, n, r, o, h, f = this.ct ? this.ut ? () => {
			o[r] = signal(i[n], pureOptions);
			return this.ft(accessor(o[r]), n);
		} : () => {
			o[r] = signal(i[n], pureOptions);
			h && (h[r] = signal(n, pureOptions));
			return this.ft(accessor(o[r]), h ? accessor(h[r]) : void 0);
		} : this.lt ? () => {
			const t = i[n];
			h[r] = signal(n, pureOptions);
			return this.ft(t, accessor(h[r]));
		} : () => {
			const t = i[n];
			return this.ft(t);
		};
		if (e === 0) {
			if (this.it !== 0) {
				this.H.dispose(false);
				this.ln = [];
				this.ot = [];
				this.ht = [];
				this.it = 0;
				this.ct && (this.ct = []);
				this.lt && (this.lt = []);
			}
			if (this.L && !this.ht.length) {
				this.ln[0]?.dispose();
				this.ht[0] = runWithOwner(this.ln[0] = createOwner(), this.L);
			}
		} else if (this.it === 0) {
			const t = new Array(e);
			const c = new Array(e);
			o = this.ct && new Array(e);
			h = this.lt && new Array(e);
			try {
				for (n = 0; n < e; n++) {
					r = n;
					t[n] = runWithOwner(c[n] = createOwner(), f);
				}
			} catch (t) {
				for (s = 0; s <= n; s++) c[s]?.dispose();
				throw t;
			}
			if (this.ln[0]) this.ln[0].dispose();
			this.ht = t;
			this.ln = c;
			o && (this.ct = o);
			h && (this.lt = h);
			this.ot = i;
			this.it = e;
		} else {
			let t, c, a, l, u, w, d, p, m;
			for (t = 0, c = Math.min(this.it, e); t < c && (this.ot[t] === i[t] || this.ct && compare(this.Xe, this.ot[t], i[t])); t++) if (this.ct) writeRow(this.ct[t], i[t]);
			for (c = this.it - 1, a = e - 1; c >= t && a >= t && (this.ot[c] === i[a] || this.ct && compare(this.Xe, this.ot[c], i[a])); c--, a--);
			if (t === e && this.it === e) {
				this.ot = i;
				return;
			}
			if (e <= this.it && c - t > 64 && this.ct === void 0 && this.lt === void 0) {
				const s = t + (a - t >> 1);
				const n = i[s];
				const r = Math.min(c, s + 32);
				let o = Math.max(t, s - 32);
				while (o <= r && this.ot[o] !== n) o++;
				if (o <= r && trySmallMove(this, i, e, t)) return;
			}
			const _ = e - this.it;
			const y = a - t + 1;
			const A = new Array(e);
			const R = new Array(y);
			o = this.ct ? new Array(y) : void 0;
			h = this.lt ? new Array(y) : void 0;
			const g = _ < 0 ? stageRemoval(this, i, t, c, a, A, R, o, h) : null;
			if (g !== null) {
				if (g.length !== 0) p = g;
			} else {
				w = /* @__PURE__ */ new Map();
				d = new Array(y);
				for (n = a; n >= t; n--) {
					l = i[n];
					u = this.Xe ? this.Xe(l) : l;
					s = w.get(u);
					d[n - t] = s === void 0 ? -1 : s;
					w.set(u, n);
				}
				for (s = t; s <= c; s++) {
					l = this.ot[s];
					u = this.Xe ? this.Xe(l) : l;
					n = w.get(u);
					if (n !== void 0 && n !== -1) {
						A[n] = this.ht[s];
						R[n - t] = this.ln[s];
						o && (o[n - t] = this.ct[s]);
						h && (h[n - t] = this.lt[s]);
						n = d[n - t];
						w.set(u, n);
					} else (p ?? (p = [])).push(this.ln[s]);
				}
				try {
					for (n = t; n <= a; n++) {
						if (R[n - t] !== void 0) continue;
						(m ?? (m = [])).push(R[n - t] = createOwner());
						r = n - t;
						A[n] = runWithOwner(R[n - t], f);
					}
				} catch (t) {
					if (m) for (s = 0; s < m.length; s++) m[s].dispose();
					throw t;
				}
			}
			for (s = 0; s < t; s++) A[s] = this.ht[s];
			for (n = a + 1; n < e; n++) A[n] = this.ht[n - _];
			commitWindow(this, i, e, t, c, a, R, o, h);
			this.ht = A;
			this.it = e;
			this.ot = i;
			if (p) for (s = 0; s < p.length; s++) p[s].dispose();
		}
	}
	function compare(t, e, i) {
		return t ? t(e) === t(i) : true;
	}
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/flatten.js
	/**
	* Resolves nested accessors and arrays in a children tree to their rendered
	* values. See the `children()` helper in solid-js for the memoized form.
	*/
	function flatten(r, t) {
		if (typeof r === "function" && !r.length) {
			if (t?.doNotUnwrap) return r;
			do
				r = r();
			while (typeof r === "function" && !r.length);
		}
		if (t?.skipNonRendered && (r == null || r === true || r === false || r === "")) return;
		if (Array.isArray(r)) {
			let e = [];
			if (flattenArray(r, e, t)) return () => {
				let r = [];
				flattenArray(e, r, {
					...t,
					doNotUnwrap: false
				});
				return r;
			};
			return e;
		}
		return r;
	}
	function flattenArray(r, t = [], e) {
		let o = null;
		let f = false;
		for (let n = 0; n < r.length; n++) try {
			let o = r[n];
			if (typeof o === "function" && !o.length) {
				if (e?.doNotUnwrap) {
					t.push(o);
					f = true;
					continue;
				}
				do
					o = o();
				while (typeof o === "function" && !o.length);
			}
			if (Array.isArray(o)) f = flattenArray(o, t, e) || f;
			else if (e?.skipNonRendered && (o == null || o === true || o === false || o === "")) {} else t.push(o);
		} catch (r) {
			if (!(r instanceof NotReadyError)) throw r;
			o = r;
		}
		if (o) throw o;
		return f;
	}
	// ../../node_modules/.bun/@solidjs+signals@2.0.3/node_modules/@solidjs/signals/dist/prod/store/utils.js
	function trueFn() {
		return true;
	}
	var EMPTY = Object.freeze({});
	function leafOf(e, n) {
		return n === 3 ? (e = e()) || EMPTY : e;
	}
	/** @internal The record behind an `omit()` proxy: `source` with `hidden`
	* keys removed. It is the proxy's TARGET, so the shared handler reads it as
	* plain fields — no per-instance closures — and it is what props consumers
	* walk directly (`merge`, `spread`, `ssrElement`): a view never materializes
	* a copy, and a consumer that knows the record never goes through its traps
	* (a `getOwnPropertyDescriptor` trap per key allocates a descriptor and a
	* getter, so enumerating a proxy costs more than the copy it was avoiding).
	* `hidden` is a key list or a predicate (`omit(props, k => k[0] === "$")`).
	*
	* An omit over a `merge()` holds the merge's RECORD (`MergeView`, kind
	* `SOURCE_MERGE`) — never its proxy, so no read hops through a trap — and is
	* one record however many leaves the merge has. A consumer walks it as ONE
	* filtered entry (`sourceKeys` / `sourceGet` recurse into the merge's
	* sources by function call), and a later `merge()` over it carries the
	* record as one entry instead of copying its leaves: on a component chain of
	* defaults + omit + spread (`merge(omit(merge(omit(props))))`) the layers
	* nest as records, each a few fields, where a flatten to leaf views built a
	* view and a combined key list per leaf per layer — the largest allocation
	* of a Kobalte-shaped render. A merge leaf may be merge's memo for a
	* function source; it is resolved on access. */ var OmitView = class {
		constructor(e, n, t) {
			_defineProperty(this, "source", void 0);
			_defineProperty(this, "kind", void 0);
			_defineProperty(this, "hidden", void 0);
			_defineProperty(
				this,
				/** see `MergeView.table` */
				"table",
				0
			);
			_defineProperty(
				this,
				/** see `tableOwnKeys` / `tableDescriptor` */
				"keys",
				void 0
			);
			_defineProperty(this, "descs", void 0);
			this.source = e;
			this.kind = n;
			this.hidden = t;
		}
	};
	function isHidden(e, n) {
		const t = e.hidden;
		return typeof t === "function" ? t(n) : t.includes(n);
	}
	function combineHidden(e, n) {
		if (typeof e !== "function" && typeof n !== "function") {
			const t = e.slice();
			for (let e = 0; e < n.length; e++) t.push(n[e]);
			return t;
		}
		return (t) => (typeof e === "function" ? e(t) : e.includes(t)) || (typeof n === "function" ? n(t) : n.includes(t));
	}
	function viewSource(e) {
		return leafOf(e.source, e.kind);
	}
	function recordOf(e) {
		return e[$RECORD];
	}
	function leafKeys(e, n) {
		if (n === 0) return Object.keys(e);
		if (n === 2 || e[$PROXY] === e) {
			const n = e[$TARGET];
			return (n?.px === e ? n : Reflect).ownKeys(e);
		}
		return Object.keys(e);
	}
	/** @internal Own string keys of a source entry — every consumer skips
	* symbols itself. */ function sourceKeys(e, n) {
		if (n === 1) {
			if (e.kind === 4) return mergeKeysOf(e.source, false, e);
			const n = leafKeys(viewSource(e), e.kind);
			const t = [];
			for (let r = 0; r < n.length; r++) if (!isHidden(e, n[r])) t.push(n[r]);
			return t;
		}
		return leafKeys(leafOf(e, n), n);
	}
	/** @internal `key in entry`. */ function sourceHas(e, n, t) {
		if (n === 1) {
			if (isHidden(e, t)) return false;
			return e.kind === 4 ? mergeHas(e.source, t) : t in viewSource(e);
		}
		return t in leafOf(e, n);
	}
	/** @internal `entry[key]` — the source's getter runs once, here. */ function sourceGet(e, n, t) {
		if (n === 1) {
			if (isHidden(e, t)) return void 0;
			return e.kind === 4 ? mergeGet(e.source, t) : viewSource(e)[t];
		}
		return leafOf(e, n)[t];
	}
	function entryHasStaticKeys(e, n) {
		if (n === 0) return true;
		if (n !== 1) return false;
		if (e.kind === 0) return true;
		return e.kind === 4 && mergeHasStaticKeys(e.source);
	}
	function mergeHasStaticKeys(e) {
		const n = e.sources, t = e.kinds;
		for (let e = 0; e < n.length; e++) if (!entryHasStaticKeys(n[e], t[e])) return false;
		return true;
	}
	/** @internal Whether the own key set of a props object cannot change
	* reactively: a plain object, or a merge/omit view over plain objects only.
	* A consumer may then decide from `Object.getOwnPropertyDescriptor` once —
	* "no `children` key" or "a data `children`" holds for the object's lifetime,
	* so no tracking scope is needed for it (#3388). For a store, or a view with
	* a store or memo leaf, keys can appear later and the reactive path is the
	* only correct one. */ function hasStaticKeys(e) {
		if (!($PROXY in e)) return true;
		const n = recordOf(e);
		if (n instanceof MergeView) return mergeHasStaticKeys(n);
		return n !== void 0 && entryHasStaticKeys(n, 1);
	}
	function accessorDescriptor(e, n = true) {
		return {
			configurable: true,
			enumerable: n,
			get: e,
			set: trueFn
		};
	}
	/** The descriptor a consumer should see for `key` on an entry —
	* the view proxies answer `getOwnPropertyDescriptor` with it, so it tells the
	* truth through any depth of merge/omit layers.
	*
	* A DATA descriptor means "nothing reactive can hide behind this value": the
	* key is a data property of a plain-object leaf — the compiler's own
	* encoding of a static attribute. Everything else is an accessor: a getter
	* on a leaf, a key on a store proxy (its "data" is a signal), or a key on a
	* merge memo source (the whole object is reactive). That is what lets a
	* consumer skip a reactive node for a static prop at the bottom of a
	* component chain, and it is why the store case must NOT forward the store's
	* own descriptor, which reports a value.
	*
	* `configurable: true` always — the target has no such property, and the
	* Proxy invariants forbid reporting a non-configurable one. */
	function sourceDescriptor(e, n, t, r = false) {
		if (n === 1) {
			if (isHidden(e, t)) return void 0;
			return sourceDescriptor(e.source, e.kind, t, r);
		}
		if (n === 4) return mergeDescriptor(e, t);
		if (n === 3) return r || t in leafOf(e, n) ? accessorDescriptor(() => leafOf(e, n)[t]) : void 0;
		if (n === 2) {
			if (recordOf(e) !== void 0) return Reflect.getOwnPropertyDescriptor(e, t);
			return r || t in e ? accessorDescriptor(() => e[t]) : void 0;
		}
		const i = Reflect.getOwnPropertyDescriptor(e, t);
		if (i === void 0) return void 0;
		if (i.get !== void 0 || i.set !== void 0) return accessorDescriptor(() => e[t], i.enumerable);
		if (i.configurable) return i;
		return {
			configurable: true,
			enumerable: i.enumerable,
			writable: true,
			value: i.value
		};
	}
	function sourceEnumerableKeys(e, n) {
		{
			if (e.kind === 4) return mergeEnumerableKeys(e.source, e);
			const n = ownEnumerableKeys(viewSource(e));
			const t = [];
			for (let r = 0; r < n.length; r++) if (!isHidden(e, n[r])) t.push(n[r]);
			return t;
		}
	}
	/** @internal */ var MergeView = class {
		constructor(e, n) {
			_defineProperty(this, "sources", void 0);
			_defineProperty(this, "kinds", void 0);
			_defineProperty(
				this,
				/** key → the plain leaf that owns it (later sources win), built by an
				* enumeration or once the reads have paid for it (see `resolvedTable`)
				* when every leaf has static keys; `null` when one doesn't. Until then
				* the slot counts the per-key trap reads so far. One slot rather than a
				* counter field of its own: a view is built per source per component
				* layer, and each field initializer is a measurable share of a
				* constructor that small in the lower JIT tiers. */
				"table",
				0
			);
			_defineProperty(
				this,
				/** see `tableOwnKeys` / `tableDescriptor` */
				"keys",
				void 0
			);
			_defineProperty(this, "descs", void 0);
			this.sources = e;
			this.kinds = n;
		}
	};
	/** @internal The record behind a merge() or omit() proxy — a `MergeView`
	* (flattened `sources` with their `kinds`) or an `OmitView` — or undefined
	* for anything else (a plain object, a store, a foreign proxy). Two fast
	* traps on a proxy (`has`, then `$RECORD`), none on a plain object. */ function viewOf(e) {
		return e && $PROXY in e ? e[$RECORD] : void 0;
	}
	/** @internal The resolved key table of a merge/omit view — every own key of
	* the view mapped to the plain object that owns it, in merged order (a key
	* at the position of the last source that carries it, see `tableSet`) — or
	* undefined when it has none: a leaf is a store or a memo source, whose
	* keys can change, or the object is not a view at all.
	*
	* This is the flat object the eager copy used to build, made lazily and
	* without copying: one pass over the leaves' own keys, then every
	* `get`/`has`/descriptor is one lookup plus one read of the owning leaf, and
	* a consumer (`spread` rerunning its effect) walks the table instead of
	* re-deriving shadowing from the leaves each time. Own keys only, as the
	* copy's were: a plain source's key set is fixed once merged (keys added to
	* it later are not seen — the copy didn't see them either).
	*
	* It is built by an ENUMERATION — the `ownKeys` trap, or a consumer asking
	* for it here — or once per-key reads have paid for it (`READS_FOR_TABLE`),
	* not on the first read. A per-key read has a direct answer (a walk of the
	* sources, last to first, one `in` each) whose cost is the source count,
	* while the table's is every key of every leaf, so the walk wins until a
	* view has been read about as many times as it has keys. On the server it
	* never is: a component reads its props a few times, the element enumerates
	* them once through its own source walk, and the view is gone — building on
	* first read there cost a component chain a table per layer (profiled on
	* the Kobalte-shaped chain: a third of SSR time in the table code and its
	* garbage). On the
	* client a view read on every reactive rerun crosses the threshold in its
	* first few updates and is one lookup per read from then on, as before.
	* Once built — by a `spread`, `Object.keys`, `{...props}`, or the count —
	* every trap uses it. */ function resolvedTable(e) {
		if (!e || !($PROXY in e)) return void 0;
		const n = recordOf(e);
		if (n instanceof OmitView) return omitTable(n);
		return n === void 0 ? void 0 : mergeTable(n);
	}
	function mergeTable(e) {
		let n = e.table;
		if (typeof n !== "object") {
			const t = e.sources, r = e.kinds;
			for (let n = 0; n < t.length; n++) if (!entryHasStaticKeys(t[n], r[n])) {
				e.table = null;
				return;
			}
			n = /* @__PURE__ */ new Map();
			collectTable(n, e, void 0);
			e.table = n;
		}
		return n === null ? void 0 : n;
	}
	function collectTable(e, n, t) {
		const r = n.sources, i = n.kinds;
		for (let n = 0; n < r.length; n++) {
			const f = r[n];
			if (i[n] === 1) {
				if (f.kind === 4) {
					if (t === void 0) t = [f];
					else t.push(f);
					collectTable(e, f.source, t);
					t.pop();
					continue;
				}
				const n = f.source;
				const r = Reflect.ownKeys(n);
				for (let i = 0; i < r.length; i++) {
					const u = r[i];
					if (!isHidden(f, u) && !hiddenByAny(t, u)) tableSet(e, u, n);
				}
			} else {
				const n = Reflect.ownKeys(f);
				for (let r = 0; r < n.length; r++) {
					const i = n[r];
					if (!hiddenByAny(t, i)) tableSet(e, i, f);
				}
			}
		}
	}
	function hiddenByAny(e, n) {
		if (e !== void 0) {
			for (let t = e.length - 1; t >= 0; t--) if (isHidden(e[t], n)) return true;
		}
		return false;
	}
	function tableSet(e, n, t) {
		if (e.has(n)) e.delete(n);
		e.set(n, t);
	}
	function omitTable(e) {
		let n = e.table;
		if (typeof n !== "object") {
			const t = e.source;
			if (e.kind === 4) {
				if (!mergeHasStaticKeys(t)) {
					e.table = null;
					return;
				}
				n = /* @__PURE__ */ new Map();
				collectTable(n, t, [e]);
			} else if (e.kind === 0) {
				n = /* @__PURE__ */ new Map();
				const r = Reflect.ownKeys(t);
				for (let i = 0; i < r.length; i++) {
					const f = r[i];
					if (!isHidden(e, f)) n.set(f, t);
				}
			} else {
				e.table = null;
				return;
			}
			e.table = n;
		}
		return n === null ? void 0 : n;
	}
	var propertyIsEnumerable = Object.prototype.propertyIsEnumerable;
	function tableOwnKeys(e, n) {
		let t = e.keys;
		if (t === void 0) {
			t = e.keys = [];
			for (const [e, r] of n) if (propertyIsEnumerable.call(r, e)) t.push(e);
		}
		return t;
	}
	function tableDescriptor(e, n, t) {
		const r = n.get(t);
		if (r === void 0) return void 0;
		let i = e.descs;
		if (i === void 0) i = e.descs = /* @__PURE__ */ new Map();
		let f = i.get(t);
		if (f === void 0) {
			f = sourceDescriptor(r, 0, t);
			if (f === void 0) return void 0;
			i.set(t, f);
			return f;
		}
		if (f.get !== void 0) return f;
		return {
			configurable: true,
			enumerable: f.enumerable,
			writable: f.writable,
			value: r[t]
		};
	}
	var READS_FOR_TABLE = 16;
	function mergeReadTable(e) {
		const n = e.table;
		if (typeof n === "object") return n === null ? void 0 : n;
		if (n + 1 < READS_FOR_TABLE) {
			e.table = n + 1;
			return;
		}
		return mergeTable(e);
	}
	function omitReadTable(e) {
		const n = e.table;
		if (typeof n === "object") return n === null ? void 0 : n;
		if (n + 1 < READS_FOR_TABLE) {
			e.table = n + 1;
			return;
		}
		return omitTable(e);
	}
	function tableOf(e) {
		const n = e.table;
		return typeof n === "object" && n !== null ? n : void 0;
	}
	var MISSING = Symbol();
	function mergeLookup(e, n) {
		const t = tableOf(e);
		if (t !== void 0) {
			const e = t.get(n);
			return e === void 0 ? MISSING : e[n];
		}
		const r = e.sources, i = e.kinds;
		for (let e = r.length - 1; e >= 0; e--) {
			const t = i[e];
			if (t === 0) {
				const t = r[e];
				if (n in t) return t[n];
				continue;
			}
			if (t === 1) {
				const t = r[e];
				if (isHidden(t, n)) continue;
				if (t.kind === 4) {
					const e = mergeLookup(t.source, n);
					if (e !== MISSING) return e;
					continue;
				}
				const i = viewSource(t);
				if (n in i) return i[n];
			} else {
				const i = leafOf(r[e], t);
				if (n in i) return i[n];
			}
		}
		return MISSING;
	}
	function mergeGet(e, n) {
		const t = mergeLookup(e, n);
		return t === MISSING ? void 0 : t;
	}
	function mergeHas(e, n) {
		const t = tableOf(e);
		if (t !== void 0) return t.has(n);
		const r = e.sources, i = e.kinds;
		for (let e = r.length - 1; e >= 0; e--) if (sourceHas(r[e], i[e], n)) return true;
		return false;
	}
	function mergeDescriptor(e, n) {
		const t = tableOf(e);
		if (t !== void 0) return tableDescriptor(e, t, n);
		const r = e.sources, i = e.kinds;
		for (let t = r.length - 1; t >= 0; t--) {
			if (!sourceHas(r[t], i[t], n)) continue;
			return sourceDescriptor(r[t], i[t], n, true) ?? accessorDescriptor(() => mergeGet(e, n));
		}
	}
	function mergeKeysOf(e, n, t) {
		const r = [];
		collectKeys(e, t === void 0 ? void 0 : [t], n, r, null);
		return r;
	}
	function collectKeys(e, n, t, r, i) {
		const f = e.sources, u = e.kinds;
		for (let e = 0; e < f.length; e++) {
			let o = f[e], c = u[e];
			let s;
			if (c === 1) {
				if (o.kind === 4) {
					if (n === void 0) n = [o];
					else n.push(o);
					collectKeys(o.source, n, t, r, i);
					n.pop();
					continue;
				}
				s = o;
				c = o.kind;
				o = o.source;
			}
			o = leafOf(o, c);
			const d = t ? ownEnumerableKeys(o) : leafKeys(o, c);
			for (let e = 0; e < d.length; e++) {
				const t = d[e];
				if (s !== void 0 && isHidden(s, t)) continue;
				if (hiddenByAny(n, t)) continue;
				addKey(r, i, t, o);
			}
		}
	}
	function addKey(e, n, t, r) {
		const i = e.indexOf(t);
		if (i !== -1) {
			e.splice(i, 1);
			if (n !== null) n.splice(i, 1);
		}
		e.push(t);
		if (n !== null) n.push(r);
	}
	function mergeEnumerableKeys(e, n) {
		const t = mergeTable(e);
		if (t === void 0) return mergeKeysOf(e, true, n);
		const r = tableOwnKeys(e, t);
		if (n === void 0) return r;
		const i = [];
		for (let e = 0; e < r.length; e++) if (!isHidden(n, r[e])) i.push(r[e]);
		return i;
	}
	var mergeTraps = {
		get(e, n, t) {
			if (typeof n === "symbol") {
				if (n === $PROXY) return t;
				if (n === $RECORD) return e;
				if (n === $TARGET) return void 0;
			}
			const r = e.table;
			let i;
			if (typeof r !== "object") {
				if (r + 1 < READS_FOR_TABLE) {
					e.table = r + 1;
					const t = e.sources, i = e.kinds;
					for (let r = t.length - 1; r >= 0; r--) {
						if (i[r] !== 0) return mergeGet(e, n);
						const f = t[r][n];
						if (f !== void 0 || n in t[r]) return f;
					}
					return;
				}
				i = mergeTable(e);
				if (i === void 0) return mergeGet(e, n);
			} else if (r === null) return mergeGet(e, n);
			else i = r;
			const f = i.get(n);
			return f === void 0 ? void 0 : f[n];
		},
		has(e, n) {
			if (n === $PROXY) return true;
			if (n === $TARGET || n === $RECORD) return false;
			const t = mergeReadTable(e);
			if (t !== void 0) return t.has(n);
			return mergeHas(e, n);
		},
		set: trueFn,
		deleteProperty: trueFn,
		getOwnPropertyDescriptor(e, n) {
			if (n === $PROXY || n === $TARGET || n === $RECORD) return void 0;
			const t = mergeReadTable(e);
			if (t !== void 0) return tableDescriptor(e, t, n);
			return mergeDescriptor(e, n);
		},
		ownKeys(e) {
			return mergeEnumerableKeys(e);
		}
	};
	var omitTraps = {
		get(e, n, t) {
			if (n === $PROXY) return t;
			if (n === $RECORD) return e;
			if (n === $TARGET) return void 0;
			if (e.kind === 4) {
				const t = omitReadTable(e);
				if (t !== void 0) {
					const e = t.get(n);
					return e === void 0 ? void 0 : e[n];
				}
				if (isHidden(e, n)) return void 0;
				return mergeGet(e.source, n);
			}
			if (isHidden(e, n)) return void 0;
			return viewSource(e)[n];
		},
		has(e, n) {
			if (n === $PROXY) return true;
			if (n === $TARGET || n === $RECORD) return false;
			if (e.kind === 4) {
				const t = omitReadTable(e);
				if (t !== void 0) return t.has(n);
				if (isHidden(e, n)) return false;
				return mergeHas(e.source, n);
			}
			if (isHidden(e, n)) return false;
			return n in viewSource(e);
		},
		set: trueFn,
		deleteProperty: trueFn,
		getOwnPropertyDescriptor(e, n) {
			if (n === $PROXY || n === $TARGET || n === $RECORD) return void 0;
			if (e.kind === 4) {
				const t = omitReadTable(e);
				if (t !== void 0) return tableDescriptor(e, t, n);
			}
			return sourceDescriptor(e, 1, n);
		},
		ownKeys(e) {
			if (e.kind === 4) {
				const n = omitTable(e);
				if (n !== void 0) return tableOwnKeys(e, n);
				return sourceEnumerableKeys(e);
			}
			const n = Reflect.ownKeys(viewSource(e));
			const t = [];
			for (let r = 0; r < n.length; r++) if (!isHidden(e, n[r])) t.push(n[r]);
			return t;
		}
	};
	/**
	* Merges multiple props-like objects into a single proxy that *preserves
	* reactivity*. Reads are forwarded to the right-most source that defines the
	* property, so later sources override earlier ones (like `Object.assign`).
	*
	* Function arguments are treated as memo-backed sources — useful for passing
	* derived defaults whose computation should track reactively.
	*
	* The result is a live VIEW of its sources, never a copy: creating it costs
	* nothing per key, every read goes to the source that owns the key (a getter
	* runs there, a data property is read live), and writing to it is a no-op.
	* A single non-function source is returned as is. To own a mutable object,
	* copy it: `{ ...merged }` snapshots the current values.
	*
	* Use this in component bodies to merge defaults / overrides without losing
	* Solid's per-property tracking.
	*
	* Reading props, here and anywhere: a prop's getter is defined only for a
	* read through its own object (`props.x`, `{ ...props }`, `Reflect.get`,
	* these views). Forwarding its descriptor onto another object and reading it
	* there is not supported — the compiler's server-side props keep their state
	* on the instance, so the getter needs its object as receiver. A copy that
	* must stay live defines its own getter that reads through the source, as
	* the no-Proxy paths of merge() and omit() do.
	*
	* @example
	* ```tsx
	* function Button(_props: { label: string; type?: string; disabled?: boolean }) {
	*   const props = merge({ type: "button", disabled: false }, _props);
	*
	*   return <button type={props.type} disabled={props.disabled}>{props.label}</button>;
	* }
	* ```
	*/ function merge(...e) {
		if (e.length === 1 && typeof e[0] !== "function") return e[0];
		const n = new Array(e.length);
		const t = new Array(e.length);
		let r = 0;
		let i = void 0;
		let f = 0;
		for (let u = 0; u < e.length; u++) {
			const o = e[u];
			if (!o) continue;
			f++;
			i = o;
			if (typeof o === "function") {
				n[r] = createMemo$1(o);
				t[r++] = 3;
				continue;
			}
			if ($PROXY in o) {
				const e = recordOf(o);
				if (e instanceof MergeView) for (let i = 0; i < e.sources.length; i++) {
					n[r] = e.sources[i];
					t[r++] = e.kinds[i];
				}
				else if (e !== void 0) {
					n[r] = e;
					t[r++] = 1;
				} else {
					n[r] = o;
					t[r++] = 2;
				}
				continue;
			}
			n[r] = o;
			t[r++] = 0;
		}
		if (r !== n.length) {
			n.length = r;
			t.length = r;
		}
		if (SUPPORTS_PROXY) {
			if (f === 1 && typeof i !== "function") return i;
			return new Proxy(new MergeView(n, t), mergeTraps);
		}
		const u = Object.create(null);
		let o = false;
		let c = n.length - 1;
		for (let e = c; e >= 0; e--) {
			const t = n[e];
			if (!t) {
				e === c && c--;
				continue;
			}
			const r = Object.getOwnPropertyNames(t);
			for (let n = r.length - 1; n >= 0; n--) {
				const i = r[n];
				if (i === "__proto__" || i === "constructor") continue;
				if (!u[i]) {
					o = o || e !== c;
					const n = Object.getOwnPropertyDescriptor(t, i);
					u[i] = n.get ? {
						enumerable: true,
						configurable: true,
						get: n.get.bind(t)
					} : n;
				}
			}
		}
		if (!o) return n[c];
		const s = {};
		const d = Object.keys(u);
		for (let e = d.length - 1; e >= 0; e--) {
			const n = d[e], t = u[n];
			if (t.get) Object.defineProperty(s, n, t);
			else s[n] = t.value;
		}
		return s;
	}
	function omit(e, ...n) {
		let t = n.length === 1 && typeof n[0] === "function" ? n[0] : n;
		if (SUPPORTS_PROXY) {
			let n = e;
			let r = 0;
			if (typeof e === "function") r = 3;
			else if ($PROXY in e) {
				r = 2;
				const i = recordOf(e);
				if (i instanceof OmitView) {
					n = i.source;
					r = i.kind;
					t = combineHidden(i.hidden, t);
				} else if (i !== void 0) {
					n = i;
					r = 4;
				}
			}
			return new Proxy(new OmitView(n, r, t), omitTraps);
		}
		const r = {};
		const i = Object.getOwnPropertyNames(e);
		const f = typeof t === "function" ? t : t.length > 4 && i.length > t.length ? ((e) => (n) => e.has(n))(new Set(t)) : (e) => t.includes(e);
		for (const n of i) if (!f(n)) {
			const t = Object.getOwnPropertyDescriptor(e, n);
			if (!t.get && !t.set && t.enumerable && t.writable && t.configurable) r[n] = t.value;
			else if (t.get || t.set) Object.defineProperty(r, n, {
				enumerable: t.enumerable,
				configurable: true,
				get: t.get && t.get.bind(e),
				set: t.set && t.set.bind(e)
			});
			else Object.defineProperty(r, n, t);
		}
		return r;
	}
	// ../../node_modules/.bun/solid-js@2.0.3/node_modules/solid-js/dist/solid.js
	var IS_DEV = false;
	function createContext(defaultValue, options) {
		const id = Symbol(options && options.name || "");
		function provider(props) {
			const value = props.value;
			const c = createMemo$1((p) => (p || setContext(provider, value), props.children), { lazy: true });
			return createMemo$1((p) => (p || setContext(provider, value), flatten(c())), {
				lazy: true,
				sync: true
			});
		}
		provider.id = id;
		provider.defaultValue = defaultValue;
		return provider;
	}
	function useContext(context) {
		return getContext(context);
	}
	var sharedConfig = {
		hydrating: false,
		registry: void 0,
		done: false
	};
	var _createMemo;
	var _createEffect;
	var createMemo = (...args) => {
		return (_createMemo || createMemo$1)(...args);
	};
	var createSignal = createSignal$1;
	var createRoot = createRoot$1;
	var createRenderEffect = createRenderEffect$1;
	var createEffect = (...args) => (_createEffect || createEffect$1)(...args);
	function createComponent(Comp, props, name, loc) {
		return untrack(() => Comp(props || {}));
	}
	var narrowedError = (name) => {
		throw `Stale read from <${name}>.`;
	};
	function For(props) {
		const options = "fallback" in props ? {
			keyed: props.keyed,
			fallback: () => props.fallback
		} : { keyed: props.keyed };
		const owner = getOwner();
		let mapped;
		const create = () => runWithOwner(owner, () => mapArray(() => props.each, props.children, options));
		if (sharedConfig.hydrating) mapped = create();
		const list = () => (mapped ?? (mapped = create()))();
		return list;
	}
	function Show(props) {
		const keyed = props.keyed;
		const conditionValue = createMemo$1(() => props.when, void 0);
		const condition = keyed ? conditionValue : createMemo$1(conditionValue, {
			equals: (a, b) => !a === !b,
			sync: true
		});
		return createMemo$1(() => {
			const c = condition();
			if (c) {
				const child = props.children;
				return typeof child === "function" && child.length > 0 ? keyed ? untrack(() => child(c), IS_DEV) : untrack(() => child(() => {
					condition() || narrowedError("Show");
					return conditionValue();
				}), IS_DEV) : child;
			}
			return props.fallback;
		}, { sync: true });
	}
	// ../../node_modules/.bun/@solidjs+universal@2.0.3+ef26f217b6584227/node_modules/@solidjs/universal/dist/universal.js
	var transparentOptions = {
		transparent: true,
		sync: true
	};
	var syncOptions = { sync: true };
	var effect = (fn, effectFn, options) => createRenderEffect(fn, effectFn, options ? {
		sync: true,
		...options,
		transparent: !options.scope
	} : transparentOptions);
	var memo = (fn) => createMemo(() => fn(), syncOptions);
	var named = (options, fallback) => options;
	var INNER_OWNED = {};
	function createRenderer({ createElement, createTextNode, createSentinel = () => createTextNode(""), isTextNode, replaceText, insertNode, removeNode, cleanupNodes, setProperty, getParentNode, getFirstChild, getNextSibling }) {
		function insert(parent, accessor, marker, initial, options) {
			const onUpdate = options && options.onUpdate;
			let effectOptions = options;
			if (onUpdate) {
				const { onUpdate, ...rest } = options;
				effectOptions = rest;
			}
			effectOptions = named(effectOptions);
			const multi = marker !== void 0;
			if (multi && !initial) initial = [];
			if (typeof accessor !== "function") {
				accessor = normalize(accessor, multi, true);
				if (typeof accessor !== "function") {
					insertExpression(parent, accessor, initial, marker);
					onUpdate && onUpdate(accessor);
					return;
				}
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
					onUpdate && onUpdate(current);
				}, prev !== void 0 && !(options && options.schedule) ? {
					...effectOptions,
					schedule: true
				} : effectOptions);
				return INNER_OWNED;
			}, (value) => {
				if (value === INNER_OWNED) return;
				insertExpression(parent, value, current, marker);
				current = value;
				onUpdate && onUpdate(current);
			}, effectOptions);
		}
		function insertExpression(parent, value, current, marker) {
			if (value === current) return;
			const t = typeof value, multi = marker !== void 0;
			if (t === "string" || t === "number") {
				const tc = typeof current;
				if (tc === "string" || tc === "number") replaceText(getFirstChild(parent), value);
				else cleanChildren(parent, current, marker, createTextNode(value));
			} else if (value == null) cleanChildren(parent, current, marker);
			else if (Array.isArray(value)) {
				if (value.length === 0) cleanChildren(parent, current, marker);
				else if (Array.isArray(current)) {
					if (current.length === 0) appendNodes(parent, value, marker);
					else reconcileArrays(parent, current, value);
				} else if (current == null) appendNodes(parent, value);
				else reconcileArrays(parent, multi && current || [getFirstChild(parent)], value);
			} else if (Array.isArray(current)) cleanChildren(parent, current, multi ? marker : null, value);
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
			else if (multi && !value.length) value = [createSentinel()];
			if (Array.isArray(value)) for (let i = 0, len = value.length; i < len; i++) {
				const item = value[i], t = typeof item;
				if (t === "string" || t === "number") value[i] = createTextNode(item);
			}
			return value;
		}
		function reconcileArrays(parentNode, a, b) {
			let bLength = b.length, aEnd = a.length, bEnd = bLength, aStart = 0, bStart = 0, after = getNextSibling(a[aEnd - 1]), map = null;
			const isLive = (n) => n && getParentNode(n) === parentNode;
			while (aStart < aEnd || bStart < bEnd) {
				if (a[aStart] === b[bStart] && isLive(a[aStart])) {
					aStart++;
					bStart++;
					continue;
				}
				while (a[aEnd - 1] === b[bEnd - 1] && isLive(a[aEnd - 1])) {
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
					if (index != null) {
						if (bStart < index && index < bEnd) {
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
					} else removeNode(parentNode, a[aStart++]);
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
		function collectNodes(value, nodes) {
			if (Array.isArray(value)) for (let i = 0, len = value.length; i < len; i++) collectNodes(value[i], nodes);
			else if (value != null && typeof value !== "string" && typeof value !== "number") nodes.push(value);
			return nodes;
		}
		function collectMounted(parent, value) {
			const nodes = collectNodes(value, []);
			if (!nodes.length && (typeof value === "string" || typeof value === "number")) {
				const node = getFirstChild(parent);
				if (node) nodes.push(node);
			}
			return nodes;
		}
		function defaultCleanupNodes(parent, nodes) {
			for (let i = 0, len = nodes.length; i < len; i++) {
				const node = nodes[i];
				if (getParentNode(node) === parent) removeNode(parent, node);
			}
		}
		function spread(node, props, skipChildren, options) {
			const prevProps = {};
			const apply = (newProps) => {
				for (const prop in prevProps) {
					if (prop in newProps) continue;
					if (prop !== "ref") setProperty(node, prop, void 0, prevProps[prop]);
					delete prevProps[prop];
				}
				for (const prop in newProps) {
					const value = newProps[prop];
					if (value === prevProps[prop]) continue;
					if (prop === "ref") (typeof value === "function" || Array.isArray(value)) && ref(() => value, node);
					else setProperty(node, prop, value, prevProps[prop]);
					prevProps[prop] = value;
				}
			};
			const childrenOptions = () => named(options);
			if (Array.isArray(props)) {
				if (!skipChildren) insert(node, () => {
					for (let i = props.length - 1; i >= 0; i--) {
						const s = resolveSource(props[i]);
						if (s != null && entryHas(s, "children")) return entryGet(s, "children");
					}
				}, void 0, void 0, childrenOptions());
				effect(() => collectSources({}, props, void 0), apply, named(options));
				return prevProps;
			}
			if (!skipChildren) {
				if (typeof props !== "function" && props != null && hasStaticKeys(props)) {
					const desc = Object.getOwnPropertyDescriptor(props, "children");
					if (desc !== void 0) {
						if (desc.get === void 0) insert(node, desc.value, void 0, void 0, childrenOptions());
						else insert(node, () => props.children, void 0, void 0, childrenOptions());
					}
				} else insert(node, () => {
					const s = resolveSource(props);
					return s != null ? entryGet(s, "children") : void 0;
				}, void 0, void 0, childrenOptions());
			}
			effect(() => {
				const s = resolveSource(props);
				const newProps = {};
				const table = resolvedTable(s);
				if (table !== void 0) {
					for (const [prop, leaf] of table) {
						if (typeof prop !== "string" || prop === "children") continue;
						newProps[prop] = leaf[prop];
					}
					return newProps;
				}
				if (s != null) {
					const view = viewOf(s);
					if (view instanceof OmitView) collectProps(newProps, view, 1);
					else if (view !== void 0) collectSources(newProps, view.sources, view.kinds);
					else collectProps(newProps, s, $PROXY in s ? 2 : 0);
				}
				return newProps;
			}, apply, named(options));
			return prevProps;
		}
		function resolveSource(s) {
			return typeof s === "function" ? s() : s;
		}
		function entryHas(s, key) {
			const view = viewOf(s);
			return view instanceof OmitView ? sourceHas(view, 1, key) : key in s;
		}
		function entryGet(s, key) {
			const view = viewOf(s);
			return view instanceof OmitView ? sourceGet(view, 1, key) : s[key];
		}
		function collectSources(out, sources, kinds) {
			const resolved = [];
			const resolvedKinds = [];
			for (let i = 0; i < sources.length; i++) pushEntry(resolved, resolvedKinds, sources[i], kinds !== void 0 ? kinds[i] : 3);
			for (let i = 0; i < resolved.length; i++) collectProps(out, resolved[i], resolvedKinds[i], resolved, resolvedKinds, i + 1);
			return out;
		}
		function pushEntry(resolved, kinds, s, kind) {
			if (kind !== 3) {
				resolved.push(s);
				kinds.push(kind);
				return;
			}
			s = resolveSource(s);
			if (s == null) return;
			const view = viewOf(s);
			if (view instanceof OmitView) {
				resolved.push(view);
				kinds.push(1);
			} else if (view !== void 0) {
				const f = view.sources, k = view.kinds;
				for (let j = 0; j < f.length; j++) pushEntry(resolved, kinds, f[j], k[j]);
			} else {
				resolved.push(s);
				kinds.push($PROXY in s ? 2 : 0);
			}
		}
		function collectProps(out, s, kind, later, laterKinds, from) {
			const keys = sourceKeys(s, kind);
			outer: for (let i = 0; i < keys.length; i++) {
				const prop = keys[i];
				if (typeof prop !== "string" || prop === "children") continue;
				if (later !== void 0) {
					for (let j = from; j < later.length; j++) if (sourceHas(later[j], laterKinds[j], prop)) continue outer;
				}
				out[prop] = sourceGet(s, kind, prop);
			}
			return out;
		}
		function applyRef(r, element) {
			Array.isArray(r) ? r.flat(Infinity).forEach((f) => f && f(element)) : r(element);
		}
		function ref(fn, element) {
			const resolved = untrack(fn);
			runRefCallback(() => applyRef(resolved, element));
		}
		return {
			render(code, element) {
				let disposer, disposed = false, mounted = [];
				const cleanup = cleanupNodes || defaultCleanupNodes;
				try {
					createRoot((dispose) => {
						disposer = dispose;
						const tree = code();
						insert(element, () => tree, void 0, void 0, {
							schedule: true,
							onUpdate(value) {
								mounted = collectMounted(element, value);
							}
						});
					});
					flush();
				} catch (err) {
					if (disposer) disposer();
					cleanup(element, mounted);
					throw err;
				}
				return () => {
					if (disposed) return;
					disposed = true;
					disposer();
					cleanup(element, mounted);
					mounted = [];
				};
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
	// ../../packages/solid-fuse/dist/renderer-Cx3cfG8i.js
	function u(e) {
		let t = globalThis.__fuseDevServer;
		if (!t) console.error(e);
		else try {
			let n = e instanceof Error ? e : Error(String(e)), r = se(n), i = r !== n && typeof r.stack == "string" ? r.stack : void 0;
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
	function se(e) {
		let t = /* @__PURE__ */ new Set([e]), n = e;
		for (;;) {
			let e = n.cause;
			if (!(e instanceof Error) || t.has(e)) return n;
			t.add(e), n = e;
		}
	}
	var d = /* @__PURE__ */ new Map();
	var f;
	function p(e, t) {
		d.set(e, t);
	}
	function m$1(e, t = {}) {
		fjs.bridge_call({
			channel: e,
			...t
		});
	}
	function ce(e, t = {}, n) {
		_$1?.();
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
	var h$1 = /* @__PURE__ */ new Map();
	function le(e, t) {
		h$1.set(e, t);
	}
	var g$1;
	function ue(e) {
		g$1 = e;
	}
	globalThis.__dispatchSync = (e, t) => {
		let n = h$1.get(e), r;
		try {
			r = n ? n(t) : void 0;
		} catch (e) {
			u(e);
		}
		return {
			result: r,
			ops: g$1?.()
		};
	};
	function de(e) {
		f = e;
	}
	var _$1;
	function fe(e) {
		_$1 = e;
	}
	globalThis.__dispatch = async (e, t) => {
		let n = d.get(e);
		try {
			let e = n ? await n(t) : void 0;
			return f?.(), e;
		} catch (e) {
			f?.(), u(e);
		}
	};
	var pe = {
		send: m$1,
		call: ce,
		on: p
	};
	var v$1 = globalThis.__fuseHost;
	if (!v$1) throw Error("[solid-fuse] `host` is unavailable — it only exists inside a running solid-fuse app.");
	var [me, he] = createSignal(v$1.brightness);
	p("_brightness", (e) => he(e.value));
	var y$1 = {
		left: 0,
		top: 0,
		right: 0,
		bottom: 0
	}, b$1 = {
		size: {
			width: 0,
			height: 0
		},
		devicePixelRatio: 1,
		padding: y$1,
		viewInsets: y$1,
		viewPadding: y$1,
		textScale: 1,
		...v$1.view
	}, x$1 = (e, t) => e.left === t.left && e.top === t.top && e.right === t.right && e.bottom === t.bottom, [S$1, ge] = createSignal(b$1.size, { equals: (e, t) => e.width === t.width && e.height === t.height }), [_e, ve] = createSignal(b$1.devicePixelRatio), [ye, be] = createSignal(b$1.padding, { equals: x$1 }), [xe, Se] = createSignal(b$1.viewInsets, { equals: x$1 }), [Ce, we$1] = createSignal(b$1.viewPadding, { equals: x$1 }), [Te$1, Ee$1] = createSignal(b$1.textScale);
	p("_view", (e) => {
		ge(e.size), ve(e.devicePixelRatio), be(e.padding), Se(e.viewInsets), we$1(e.viewPadding), Ee$1(e.textScale);
	});
	var C$1 = {
		brightness: me,
		platform: v$1.platform,
		mode: v$1.mode,
		size: S$1,
		orientation: () => S$1().width > S$1().height ? "landscape" : "portrait",
		devicePixelRatio: _e,
		padding: ye,
		viewInsets: xe,
		viewPadding: Ce,
		textScale: Te$1
	};
	var w$2 = 0;
	var T$2;
	var E$2 = class {
		constructor(e, t = w$2++) {
			this.id = t, this.type = e, this.parent = void 0, this.first = void 0, this.last = void 0, this.prev = void 0, this.next = void 0, this.batch = -1, this.slot = -1, this.adopt = !1, this.handlers = void 0;
		}
		get children() {
			let e = [];
			for (let t = this.first; t; t = t.next) e.push(t);
			return e;
		}
	};
	var D$2 = /* @__PURE__ */ new Map();
	p("_functionCall", (e) => {
		e.args ? e.args = q$1(e.args) : e.value = q$1(e.value);
		let t = D$2.get(e.nodeId)?.deref()?.handlers?.[e.name];
		if (e.reply) return t === void 0 ? { error: `no function "${e.name}" on node ${e.nodeId}` } : (async () => {
			try {
				return { value: J$1("", await (e.args ? t(...e.args) : t(e.value)), null).wire };
			} catch (e) {
				return { error: e instanceof Error ? e.message : String(e) };
			}
		})();
		t !== void 0 && (e.args ? t(...e.args) : t(e.value));
	});
	var O$2 = /* @__PURE__ */ new Map();
	var De$1 = 0;
	le("_callSync", (e) => {
		e.args ? e.args = q$1(e.args) : e.value = q$1(e.value);
		let t = D$2.get(e.nodeId)?.deref(), n = t?.handlers?.[e.name];
		if (n === void 0) return { error: `no function "${e.name}" on node ${e.nodeId}` };
		let r = () => e.args ? n(...e.args) : n(e.value);
		if (!e.widget) try {
			return { value: J$1("", r(), null).wire };
		} catch (e) {
			return u(e), { error: e instanceof Error ? e.message : String(e) };
		}
		let i;
		try {
			let e = runWithOwner(t.owner ?? null, () => createRoot((e) => {
				i = e;
				let t = r();
				return t == null ? null : k$2(t);
			}));
			if (e === null) return i(), { value: null };
			let n = De$1++;
			return O$2.set(n, {
				dispose: i,
				node: e
			}), P$1(e), {
				value: { _node: e.id },
				root: n
			};
		} catch (e) {
			return i?.(), u(e), { error: e instanceof Error ? e.message : String(e) };
		}
	}), p("_unbuild", (e) => {
		let t = O$2.get(e.root);
		t && (O$2.delete(e.root), t.dispose());
	});
	function k$2(e) {
		if (e instanceof E$2 && !e.parent) return e;
		let t = G$1("__slot__");
		return Q$1(t, e), t;
	}
	var Oe$1 = 0;
	var ke$1 = 1;
	var A$2 = 2;
	var Ae$1 = 3;
	var je$1 = 4;
	var Me$1 = 5;
	var j$2 = 6;
	var Ne$1 = 7;
	var Pe$1 = 8;
	var Fe$1 = 9;
	var Ie$1 = 4;
	var M$1 = [];
	var N$1 = 0;
	var Le$1 = new FinalizationRegistry((e) => {
		D$2.delete(e), M$1.push(j$2, e), U$1();
	});
	function P$1(e) {
		e.tracked || (e.tracked = !0, Le$1.register(e, e.id));
	}
	var F$1 = globalThis.__fuseGeneration = (globalThis.__fuseGeneration ?? 0) + 1;
	var I$1 = new E$2("root");
	var L$1 = !1;
	var R$1 = !1;
	var z$1 = /* @__PURE__ */ new Map();
	var B$1 = [];
	function V$1() {
		let e = N$1, t = H$1();
		if (t === void 0) return;
		z$1.set(e, t);
		let n = () => z$1.delete(e), [r, i] = t;
		fjs.bridge_call({
			channel: "_ops",
			v: Ie$1,
			g: F$1,
			b: e,
			json: r,
			...i ? { bytes: i } : {}
		})?.then?.(n, n);
	}
	function H$1() {
		if (flush(), L$1 = !1, M$1.length === 0) return;
		if (F$1 !== globalThis.__fuseGeneration) {
			M$1.length = 0;
			return;
		}
		let e;
		try {
			e = JSON.stringify(M$1);
		} catch (e) {
			u(e);
			for (let e of W$1) e.batch = -1;
		}
		W$1.length = 0, M$1.length = 0, N$1++;
		let t = B$1.length ? B$1 : void 0;
		return t && (B$1 = []), e === void 0 ? void 0 : [e, t];
	}
	function Re$1() {
		let e = N$1, t = H$1(), n = [];
		for (let [e, [t, r]] of z$1) n.push(r ? [
			e,
			t,
			r
		] : [e, t]);
		return z$1.clear(), t !== void 0 && n.push(t[1] ? [
			e,
			t[0],
			t[1]
		] : [e, t[0]]), {
			v: Ie$1,
			g: F$1,
			batches: n
		};
	}
	ue(Re$1);
	function U$1() {
		L$1 || R$1 || (L$1 = !0, Promise.resolve().then(V$1));
	}
	de(V$1), fe(V$1);
	var ze$1 = 0;
	var W$1 = [];
	function Be$1(e, t) {
		return {
			id: ze$1++,
			shape: e,
			size: t,
			batch: -1
		};
	}
	function Ve$1(e) {
		e.batch < 0 && (e.batch = N$1, W$1.push(e), M$1.push(Ne$1, e.id, e.shape));
		let t = w$2;
		return w$2 += e.size, M$1.push(Pe$1, e.id, t, C$1.mode !== "release" && T$2 ? T$2 : null), t;
	}
	function He$1(e, t) {
		let n = t.$i, r = new E$2(e.slice(2), t.$t + n);
		r.adopt = n !== 0, r.batch = N$1;
		for (let e in t) e !== "$t" && e !== "$i" && Y$1(r, e, t[e]);
		return r;
	}
	function G$1(e, t) {
		let n = new E$2(e), r = {};
		return C$1.mode !== "release" && T$2 && (r._component = T$2), n.batch = N$1, n.slot = M$1.push(Oe$1, n.id, e, r) - 1, t && K$1(n, t), n;
	}
	function K$1(e, t) {
		let n;
		for (let r in t) {
			let i = t[r];
			if (i == null || typeof i == "function") {
				Y$1(e, r, i);
				continue;
			}
			let a = J$1(r, i);
			a.refs ? (n ?? (n = [])).push([r, a]) : Z$1(e, r, a);
		}
		if (n) for (let [t, r] of n) Z$1(e, t, r);
	}
	var Ue$1 = new FinalizationRegistry((e) => {
		e.collected = !0, e.owned || We$1(e);
	});
	function We$1(e) {
		D$2.delete(e.id), M$1.push(j$2, e.id), U$1();
	}
	function Ge$1(e, t) {
		let n = G$1(e);
		n.tracked = !0;
		let r = {
			id: n.id,
			owned: getOwner() !== null,
			collected: !1
		};
		if (Ue$1.register(n, r), r.owned) {
			let e = F$1;
			onCleanup(() => {
				r.owned = !1, r.collected && e === globalThis.__fuseGeneration && We$1(r);
			});
		}
		return t && K$1(n, t), U$1(), n;
	}
	var q$1 = (e) => e;
	function Ke$1(e) {
		q$1 = e;
	}
	var qe$1 = new FinalizationRegistry(({ id: e, done: t }) => {
		D$2.get(e)?.deref() === void 0 && D$2.delete(e), t();
	});
	function Je$1(e, t, n) {
		let r = new E$2(e, t);
		return r.tracked = !0, qe$1.register(r, {
			id: t,
			done: n
		}), r;
	}
	function Ye$1(e) {
		return D$2.get(e)?.deref();
	}
	function Xe$1(e) {
		return e == null ? e : J$1("", e, null).wire;
	}
	function Ze$1(e, t, n) {
		n ? X$1(e)[t] = n : e.handlers && delete e.handlers[t];
	}
	function Qe$1(e) {
		return typeof e != "object" || !e ? null : e instanceof E$2 ? e : e.node instanceof E$2 ? e.node : null;
	}
	function J$1(e, t, n = B$1) {
		let r = {
			wire: t,
			refs: null,
			fns: null
		}, i = (t, a) => {
			if (typeof t == "number") return t === t && t !== Infinity && t !== -Infinity ? t : String(t);
			if (typeof t == "function") return { $fn: `${e}#${(r.fns ?? (r.fns = [])).push(t) - 1}` };
			if (typeof t != "object" || !t || a > 16) return t;
			if (t instanceof ArrayBuffer) return n ? { $bytes: n.push(t.slice(0)) - 1 } : t;
			if (ArrayBuffer.isView(t)) return n ? { $bytes: n.push(t.buffer.slice(t.byteOffset, t.byteOffset + t.byteLength)) - 1 } : t;
			let o = Qe$1(t);
			if (o) return (r.refs ?? (r.refs = [])).push(o), { _node: o.id };
			let s;
			if (Array.isArray(t)) for (let e = 0; e < t.length; e++) {
				let n = t[e], r = i(n, a + 1);
				r !== n && ((s ?? (s = t.slice()))[e] = r);
			}
			else for (let e in t) {
				let n = t[e], r = i(n, a + 1);
				r !== n && ((s ?? (s = { ...t }))[e] = r);
			}
			return s ?? t;
		};
		return r.wire = i(t, 0), r;
	}
	function Y$1(e, t, n) {
		typeof n == "function" ? ($e$1(e, t, null), e.refs && delete e.refs[t], X$1(e)[t] = n, et$1(e, t, !0)) : Z$1(e, t, n == null ? {
			wire: n,
			refs: null,
			fns: null
		} : J$1(t, n));
	}
	function X$1(e) {
		let t = e.handlers;
		return t === void 0 && (t = e.handlers = {}, e.owner = getOwner(), D$2.set(e.id, new WeakRef(e)), P$1(e)), t;
	}
	function $e$1(e, t, n) {
		let r = e.nested?.[t] ?? 0;
		if (r === 0 && n === null) return;
		let i = X$1(e);
		for (let e = n?.length ?? 0; e < r; e++) delete i[`${t}#${e}`];
		if (n) {
			for (let e = 0; e < n.length; e++) i[`${t}#${e}`] = n[e];
			(e.nested ?? (e.nested = {}))[t] = n.length;
		} else delete e.nested[t];
	}
	function Z$1(e, t, n) {
		if ($e$1(e, t, n.fns), n.refs) {
			let r = n.refs.length === 1 && n.wire?._node === n.refs[0].id && Qe$1(n.wire) === null;
			(e.refs ?? (e.refs = {}))[t] = r ? n.refs[0] : n.refs;
			for (let e of n.refs) P$1(e);
			e.batch = -1, M$1.push(A$2, e.id, t, n.wire), U$1();
		} else e.refs && delete e.refs[t], et$1(e, t, n.wire);
	}
	function et$1(e, t, n) {
		e.batch === N$1 ? (e.slot < 0 && (e.slot = M$1.push(Fe$1, e.id, {}) - 1), M$1[e.slot][t] = n) : M$1.push(A$2, e.id, t, n), U$1();
	}
	var { render: tt$1, effect: nt$1, memo: rt$1, createComponent: it$1, createElement: at$1, createTextNode: ot$1, insertNode: st$1, insert: Q$1, spread: ct$1, setProp: lt$1, mergeProps: ut$1, ...dt$1 } = createRenderer({
		createElement(e, t) {
			return e.charCodeAt(1) === 36 && e.charCodeAt(0) === 104 ? He$1(e, t) : G$1(e, t);
		},
		createTextNode(e) {
			let t = new E$2("__text__");
			return M$1.push(ke$1, t.id, e), t;
		},
		replaceText(e, t) {
			M$1.push(Ae$1, e.id, t), U$1();
		},
		isTextNode(e) {
			return e.type === "__text__";
		},
		setProperty: Y$1,
		insertNode(e, t, n) {
			if (t !== n) {
				if (t.parent && $$1(t), n && n.parent !== e && (n = void 0), t.parent = e, n) {
					let r = n.prev;
					t.prev = r, t.next = n, n.prev = t, r ? r.next = t : e.first = t;
				} else {
					let n = e.last;
					t.prev = n, e.last = t, n ? n.next = t : e.first = t;
				}
				t.adopt ? t.adopt = !1 : (M$1.push(je$1, e.id, t.id, n ? n.id : null), U$1());
			}
		},
		removeNode(e, t) {
			t.parent === e && ($$1(t), P$1(t), M$1.push(Me$1, t.id), U$1());
		},
		getParentNode(e) {
			return e.parent;
		},
		getFirstChild(e) {
			return e.first;
		},
		getNextSibling(e) {
			return e.next;
		}
	});
	function $$1(e) {
		let t = e.parent, { prev: n, next: r } = e;
		n ? n.next = r : t.first = r, r ? r.prev = n : t.last = n, e.parent = e.prev = e.next = void 0;
	}
	function pt$1(e, t) {
		if (C$1.mode === "release") return it$1(e, t);
		let n = T$2;
		T$2 = (e.name || "").replace(/^\[.*?\]/, "") || void 0;
		try {
			return it$1(e, t);
		} finally {
			T$2 = n;
		}
	}
	function mt$1(e) {
		R$1 = !0;
		let t;
		try {
			t = tt$1(e, I$1);
		} catch (e) {
			return R$1 = !1, u(e), () => {};
		}
		return R$1 = !1, V$1(), () => {
			typeof t == "function" && t();
			for (let e = I$1.first; e; e = I$1.first) $$1(e), M$1.push(j$2, e.id);
			D$2.clear(), U$1();
		};
	}
	var ht$1 = st$1, { ref: gt$1, applyRef: _t$1 } = dt$1;
	function vt$1(t, n, r, i) {
		if (typeof n != "object" || !n || Array.isArray(n)) {
			ct$1(t, n, r, i);
			return;
		}
		if ($PROXY in n) {
			ct$1(t, n, !0, i), r || Q$1(t, () => n.children, void 0, void 0, i);
			return;
		}
		let a;
		for (let e in n) {
			let o = Object.getOwnPropertyDescriptor(n, e), s = o === void 0 || o.get !== void 0;
			e === "children" ? r || Q$1(t, s ? () => n.children : o.value, void 0, void 0, i) : s ? (a ?? (a = [])).push(e) : e === "ref" ? yt$1(t, o.value) : Y$1(t, e, o.value);
		}
		if (a === void 0) return;
		let o = a, s = {};
		nt$1(() => {
			let e = {};
			for (let t = 0; t < o.length; t++) e[o[t]] = n[o[t]];
			return e;
		}, (e) => {
			for (let n = 0; n < o.length; n++) {
				let r = o[n], i = e[r];
				i !== s[r] && (r === "ref" ? yt$1(t, i) : Y$1(t, r, i), s[r] = i);
			}
		}, i);
	}
	function yt$1(e, t) {
		(typeof t == "function" || Array.isArray(t)) && gt$1(() => t, e);
	}
	// ../../packages/solid-fuse/dist/index.js
	function w$1(e) {
		"@babel/helpers - typeof";
		return w$1 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
			return typeof e;
		} : function(e) {
			return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
		}, w$1(e);
	}
	function we(e, t) {
		if (w$1(e) != "object" || !e) return e;
		var n = e[Symbol.toPrimitive];
		if (n !== void 0) {
			var r = n.call(e, t || "default");
			if (w$1(r) != "object") return r;
			throw TypeError("@@toPrimitive must return a primitive value.");
		}
		return (t === "string" ? String : Number)(e);
	}
	function Te(e) {
		var t = we(e, "string");
		return w$1(t) == "symbol" ? t : t + "";
	}
	function T$1(e, t, n) {
		return (t = Te(t)) in e ? Object.defineProperty(e, t, {
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
				if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(i)) return new e(i);
				let a = r.endsWith("/") ? r : r + "/";
				return new e(a + i);
			}
			return new e(typeof t == "string" ? t : t.href);
		}, Object.setPrototypeOf(globalThis.URL, e), globalThis.URL.prototype = e.prototype;
	}
	if (globalThis.WebSocket === void 0) {
		let e = /* @__PURE__ */ new Map(), t = 0;
		class n {
			constructor(n, r) {
				T$1(this, "_id", void 0), T$1(this, "url", void 0), T$1(this, "readyState", 0), T$1(this, "protocol", ""), T$1(this, "binaryType", "blob"), T$1(this, "bufferedAmount", 0), T$1(this, "extensions", ""), T$1(this, "onopen", null), T$1(this, "onmessage", null), T$1(this, "onclose", null), T$1(this, "onerror", null), this._id = t++, this.url = n, e.set(this._id, this), m$1("_ws", {
					op: "open",
					id: this._id,
					url: n,
					protocols: Array.isArray(r) ? r : r ? [r] : []
				});
			}
			send(e) {
				if (this.readyState !== 1) throw Error("WebSocket is not open");
				m$1("_ws", {
					op: "send",
					id: this._id,
					data: e
				});
			}
			close(e, t) {
				this.readyState !== 2 && this.readyState !== 3 && (this.readyState = 2, m$1("_ws", {
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
		T$1(n, "CONNECTING", 0), T$1(n, "OPEN", 1), T$1(n, "CLOSING", 2), T$1(n, "CLOSED", 3), p("_wsEvent", (t) => {
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
				case "error": n.onerror?.({
					type: "error",
					message: t.message
				});
			}
		}), globalThis.WebSocket = n;
	}
	{
		let e = (e) => {
			if (typeof e == "string") return e;
			if (e instanceof Error) {
				let t = `${e.name}: ${e.message}`, n = e.stack ?? "";
				return n.startsWith(t) ? n : n ? `${t}\n${n}` : t;
			}
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
		}, n = (e, n) => m$1("_log", { message: e + t(n) }), r = () => {};
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
	var E$1 = /* @__PURE__ */ new Map();
	var Ee = 1;
	var D$1 = !1;
	globalThis.requestAnimationFrame = (e) => {
		let t = Ee++;
		return E$1.set(t, e), D$1 || (D$1 = !0, m$1("_frames", { op: "start" })), t;
	}, globalThis.cancelAnimationFrame = (e) => {
		E$1.delete(e);
	}, le("_frame", (e) => {
		let t = E$1;
		E$1 = /* @__PURE__ */ new Map();
		for (let n of t.values()) try {
			n(e.t);
		} catch (e) {
			console.error(e);
		}
		return flush(), D$1 = E$1.size > 0, { more: D$1 };
	});
	function De(e, t) {
		let n = createMemo(e);
		return createMemo(() => {
			let e = n();
			switch (typeof e) {
				case "function": return untrack(() => e(t));
				case "string": {
					let n = at$1(e);
					return vt$1(n, t), n;
				}
			}
		});
	}
	function Oe(e) {
		return De(() => e.component, omit(e, "component"));
	}
	var O$1 = [];
	function k$1(e) {
		return "/" + e.split("/").filter(Boolean).join("/");
	}
	function ke(e) {
		let t = e.path === void 0 ? void 0 : k$1(e.path), n = {
			path: t,
			in: e.in,
			page: e.page,
			parse: e.parse,
			get key() {
				if (t !== void 0) return e.in && e.in.path === t ? `${t}#${e.in.key ?? ""}` : t;
			},
			component: e.component,
			returns: () => n
		};
		return O$1.push(n), n;
	}
	function Ae(e) {
		return typeof e == "object" && !!e && "component" in e && "returns" in e;
	}
	function je(e) {
		return O$1.findLast((t) => t.key === e);
	}
	function Me(e) {
		let t = [];
		for (let n = e.in; n; n = n.in) {
			if (t.includes(n)) throw Error(`[Fuse] route ${e.path}: its holders go round in a circle`);
			t.unshift(n);
		}
		return t;
	}
	function A$1(e, t) {
		return O$1.findLast((n) => n.in === e && n.path !== void 0 && Ne(n.path, t));
	}
	function Ne(e, t) {
		let n = e.split("/").filter(Boolean), r = k$1(t).split("/").filter(Boolean);
		return n.length === r.length && n.every((e, t) => e === r[t] || e.startsWith(":"));
	}
	function j$1(e) {
		return e ? e.split("/").filter((e) => e.startsWith(":")).map((e) => e.slice(1)) : [];
	}
	function Pe(e) {
		let t = 0;
		for (let n = e.in; n; n = n.in) t++;
		return t;
	}
	function M(e) {
		let [t, n = ""] = e.split("?", 2), r = k$1(t.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "")).split("/").filter(Boolean), i;
		for (let e of O$1) {
			if (e.path === void 0) continue;
			let t = e.path.split("/").filter(Boolean);
			if (t.length !== r.length) continue;
			let n = {}, a = 0, o = !0;
			for (let e = 0; e < t.length; e++) {
				let i = t[e], s = decodeURIComponent(r[e]);
				if (i.startsWith(":")) n[i.slice(1)] = s;
				else if (i === s) a += 2 ** (t.length - e);
				else {
					o = !1;
					break;
				}
			}
			o && (a = a * 64 + Pe(e), (!i || a >= i.score) && (i = {
				route: e,
				raw: n,
				score: a
			}));
		}
		if (i) {
			for (let [e, t] of new URLSearchParams(n)) e in i.raw || (i.raw[e] = t);
			return {
				route: i.route,
				params: Fe(i.route, i.raw)
			};
		}
	}
	function Fe(e, t) {
		let n = { ...t };
		for (let r = e; r; r = r.in) for (let [e, i] of Object.entries(r.parse ?? {})) typeof t[e] == "string" && typeof i == "function" && (n[e] = i(t[e]));
		return n;
	}
	function Ie(e, t) {
		if (e.path === void 0) throw Error("[Fuse] addressOf: this route has no path");
		let n = t ?? {};
		return e.path.split("/").map((t) => {
			if (!t.startsWith(":")) return t;
			let r = n[t.slice(1)];
			if (r === void 0) throw Error(`[Fuse] addressOf ${e.path}: missing param ${t.slice(1)}`);
			return encodeURIComponent(String(r));
		}).join("/") || "/";
	}
	var Le = 0;
	var N = /* @__PURE__ */ new Set();
	function Re(e, t, n) {
		let [r, i] = createSignal([], { ownedWrite: !0 }), [a, o] = createSignal(void 0, { ownedWrite: !0 }), s = {
			route: e,
			params: t,
			entry: n,
			stacks: /* @__PURE__ */ new Map(),
			order: [],
			setOrder: (e) => {
				s.order = e, i(e);
			},
			readOrder: () => (r(), s.order),
			active: void 0,
			setActive: (e) => {
				s.active = e, o(e);
			},
			readActive: () => (a(), s.active)
		};
		return s;
	}
	var P = Re(void 0, {});
	function F(e) {
		return e.route?.path ?? "/";
	}
	function I(e, t) {
		let n = e.stacks.get(t);
		if (n) return n;
		let [r, i] = createSignal([], { ownedWrite: !0 }), a = {
			key: t,
			holder: e,
			list: [],
			read: () => (r(), a.list),
			write: (e) => {
				a.list = e, i(e), bt();
			},
			mounted: 0
		};
		return e.stacks.set(t, a), e.order.includes(t) || e.setOrder([...e.order, t]), a;
	}
	function ze(e, t) {
		let n = {};
		for (let r of t) r in e && (n[r] = e[r]);
		return n;
	}
	function L(e, t, n) {
		return j$1(e.path).every((e) => String(t[e]) === String(n[e]));
	}
	function Be(e, t, n, r) {
		let i, a = new Promise((e) => i = e), o = Ae(t) ? t : void 0, s = {
			id: Le++,
			route: o,
			params: n,
			address: o?.path === void 0 ? void 0 : Ve(o, n),
			stack: e,
			content: o ? void 0 : t,
			pageType: r?.page,
			resolve: i,
			promise: a,
			gone: !1
		};
		return s.holder = Re(o, n, s), s;
	}
	function Ve(e, t) {
		try {
			return Ie(e, t);
		} catch {
			return;
		}
	}
	function R(e, t, n, r) {
		z(e);
		let i = Be(e, t, n, r);
		return N.add(i), e.write([...e.list, i]), i;
	}
	function z(e) {
		if (e.list.length) return;
		let t = e.holder, n = A$1(t.route, e.key);
		if (!n) {
			console.warn(`[Fuse] no page at ${e.key} for a stack to start on`);
			return;
		}
		let r = Be(e, n, {
			...t.params,
			...He(n, e.key)
		});
		N.add(r), e.write([r]);
	}
	function He(e, t) {
		let n = {}, r = (e.path ?? "").split("/").filter(Boolean), i = t.split("/").filter(Boolean);
		return r.forEach((e, t) => {
			e.startsWith(":") && i[t] !== void 0 && !i[t].startsWith(":") && (n[e.slice(1)] = decodeURIComponent(i[t]));
		}), n;
	}
	function Ue(e, t) {
		for (let n of e) n.gone = !0, N.delete(n), We(n, (e) => {
			e.gone = !0, N.delete(e), e.resolve(null);
		}), n.resolve(t);
	}
	function We(e, t) {
		for (let n of e.holder.stacks.values()) for (let e of n.list) We(e, t), t(e);
	}
	function B(e, t, n) {
		let r = e.list.filter((e) => t.has(e.id));
		r.length && (e.write(e.list.filter((e) => !t.has(e.id))), Ue(r, n));
	}
	function V(e, t) {
		let n = e.list.slice(t);
		n.length && (e.write(e.list.slice(0, t)), Ue(n, null));
	}
	function Ge(e) {
		return !e.gone && e.stack.list.at(-1) === e && Ke(e.stack);
	}
	function Ke(e) {
		let t = e.holder;
		return t.active !== void 0 && t.active !== e.key ? !1 : !t.entry || Ge(t.entry);
	}
	function H(e) {
		e.holder.active !== e.key && e.holder.setActive(e.key), bt(), e.holder.entry && H(e.holder.entry.stack);
	}
	function qe(e, t) {
		let n = e.order;
		if (!n.length) return;
		for (let r of n) if (A$1(e.route, r) === t) return r;
		let r = t.path;
		if (r !== void 0) {
			let t;
			for (let i of n) i !== F(e) && Je(r, i) && (!t || i.length > t.length) && (t = i);
			if (t) return t;
		}
		return e.active !== void 0 && n.includes(e.active) ? e.active : n[0];
	}
	function Je(e, t) {
		let n = e.split("/").filter(Boolean), r = t.split("/").filter(Boolean);
		return n.length > r.length && r.every((e, t) => e === n[t] || e.startsWith(":") || n[t].startsWith(":"));
	}
	function Ye(e, t, n) {
		for (let r = n; r; r = r.stack.holder.entry) if (r.route === e && L(e, r.params, t)) return r.holder;
		let r;
		for (let n of N) if (n.route === e && L(e, n.params, t)) {
			if (Ge(n) || [...n.holder.stacks.values()].some((e) => e.list.some(Ge))) return n.holder;
			r = n;
		}
		return r?.holder;
	}
	function Xe(e, t, n, r) {
		let i = P;
		if (e.in) {
			let a = Ye(e.in, t, r), o = a?.entry && Ze(a.entry);
			if (o) return {
				done: !0,
				promise: R(o, e, t, n).promise
			};
			if (a) i = a;
			else {
				let n = Xe(e.in, ze(t, j$1(e.in.path)), void 0, r);
				if (!n.done) return n;
				let a = [...N].findLast((n) => n.route === e.in && L(e.in, n.params, t));
				if (!a) return { done: !1 };
				i = a.holder;
			}
		}
		let a = qe(i, e);
		if (a === void 0) return { done: !1 };
		let o = I(i, a);
		return z(o), H(o), A$1(i.route, a) === e ? {
			done: !0,
			promise: Promise.resolve(null)
		} : {
			done: !0,
			promise: R(o, e, t, n).promise
		};
	}
	function Ze(e) {
		for (let t = e; t; t = t.stack.holder.entry) if (t.stack.list.at(-1) !== t) return t.stack;
	}
	var U = [];
	var Qe = !1;
	function $e(e) {
		e.link && (U = U.filter((e) => !e.link)), U.push(e), et();
	}
	function et() {
		Qe || (Qe = !0, queueMicrotask(() => {
			Qe = !1, tt();
		}));
	}
	function tt() {
		U = U.filter((e) => !e.run(!0));
	}
	function nt(e, t, n, r) {
		let i = Xe(e, t, n, r);
		if (i.done) return i.promise;
		let a, o = new Promise((e) => a = e);
		return $e({
			link: !1,
			run: () => {
				let i = Xe(e, t, n, r);
				return i.done && i.promise.then(a), i.done;
			}
		}), o;
	}
	function rt(e, t) {
		let n = P;
		for (let r of [...Me(e), e]) {
			let i = r === e, a = qe(n, r);
			if (a === void 0) return !1;
			let o = I(n, a);
			z(o), H(o);
			let s = i ? t : ze(t, j$1(r.path)), c = o.list[0];
			if (c?.route === r && L(r, c.params, s)) {
				V(o, 1), n = c.holder;
				continue;
			}
			let l = o.list[1];
			if (!i && l?.route === r && L(r, l.params, s)) V(o, 2), n = l.holder;
			else {
				if (V(o, 1), i) for (let [r, i] of it(n, a, e, t)) R(o, r, i);
				n = R(o, r, s).holder;
			}
		}
		return !0;
	}
	function it(e, t, n, r) {
		let i = Ve(n, r);
		if (!i) return [];
		let a = [], o = i.split("/").filter(Boolean), s = t.split("/").filter(Boolean).length + 1;
		for (let r = Math.max(1, s); r < o.length; r++) {
			let i = M("/" + o.slice(0, r).join("/"));
			i && i.route !== n && i.route.in === e.route && qe(e, i.route) === t && A$1(e.route, t) !== i.route && a.push([i.route, i.params]);
		}
		return a;
	}
	function at(e) {
		let t = M(e);
		t ? rt(t.route, t.params) ? U = U.filter((e) => !e.link) : $e({
			link: !0,
			run: () => rt(t.route, t.params)
		}) : console.warn(`[Fuse] no page at ${JSON.stringify(e)}`);
	}
	function ot(e) {
		G ? at(e) : K = e;
	}
	var st = createContext(void 0);
	function W() {
		if (getOwner()) try {
			return useContext(st);
		} catch {
			return;
		}
	}
	var G = !1;
	var K;
	function ct() {
		if (!G) {
			if (G = !0, X) {
				let e = X;
				X = void 0, K = void 0, _t(P, e);
			}
			if (K !== void 0) {
				let e = K;
				K = void 0, queueMicrotask(() => at(e));
			}
		}
	}
	function lt(e = {}) {
		let t = W(), n = t ? t.holder : P;
		n === P && ct();
		let r = k$1(untrack(() => e.index) ?? F(n)), i = I(n, r);
		return i.mounted++, n.active === void 0 && n.setActive(r), z(i), getOwner() && onCleanup(() => i.mounted--), et(), {
			...J(i),
			takesBack: () => n.readActive() === r,
			entries: i.read,
			removed: (e) => B(i, /* @__PURE__ */ new Set([e]), null)
		};
	}
	function q(e, t, n) {
		if (typeof e == "string") {
			let n = M(e);
			if (!n) throw Error(`[Fuse] no page at ${JSON.stringify(e)}`);
			return {
				route: n.route,
				params: n.params,
				options: t
			};
		}
		if (Ae(e)) return {
			route: e,
			params: t ?? {},
			options: n
		};
	}
	function J(e) {
		let t = () => e.read();
		return {
			index: e.key,
			pages: t,
			top: () => t().at(-1),
			push: ((t, n, r) => {
				let i = q(t, n, r);
				return i ? (H(e), R(e, i.route, i.params, i.options).promise) : R(e, t, {}).promise;
			}),
			pop: (t) => ut(e, t),
			set: (t) => {
				V(e, 1), z(e);
				for (let n of t) {
					let t = q(n);
					R(e, t.route, t.params);
				}
			}
		};
	}
	function ut(e, t) {
		if (e.list.length > 1) {
			B(e, /* @__PURE__ */ new Set([e.list.at(-1).id]), t);
			return;
		}
		let n = e.holder.entry;
		n && n.stack.list.length > 1 && !n.gone ? B(n.stack, /* @__PURE__ */ new Set([n.id]), t) : n ? ut(n.stack, t) : console.warn("[Fuse] pop() ignored: this is the app's first page");
	}
	function dt(e) {
		let t = () => e?.stack ?? ft();
		return {
			push: ((n, r, i) => {
				let a = q(n, r, i);
				return a ? nt(a.route, a.params, a.options, e) : R(t(), n, {}).promise;
			}),
			pop: (e) => ut(t(), e),
			replace: ((n, r, i) => {
				let a = t();
				a.list.length > 1 && B(a, /* @__PURE__ */ new Set([a.list.at(-1).id]), null);
				let o = q(n, r, i);
				return o ? nt(o.route, o.params, o.options, e) : R(a, n, {}).promise;
			}),
			go: (e) => at(e),
			get stack() {
				return J(t());
			},
			get app() {
				return J(ft());
			}
		};
	}
	function ft() {
		return I(P, P.active ?? P.order[0] ?? "/");
	}
	function pt() {
		return dt(W());
	}
	function mt() {
		let e = W(), t = e?.holder ?? P;
		return {
			id: e?.id ?? -1,
			route: e?.route,
			params: e?.params ?? {},
			address: e?.address,
			stack: (e) => {
				let n = e === void 0 ? t.order[0] ?? F(t) : k$1(e);
				return J(I(t, n));
			},
			stacks: t.readOrder,
			active: t.readActive,
			show: (e) => {
				let n = k$1(e), r = I(t, n);
				z(r), t.active === n ? V(r, 1) : H(r);
			}
		};
	}
	function ht(e, t, n) {
		let r = e, i = r.content;
		if (i && typeof i == "object") return {
			...i,
			child: () => n(e, i.child)
		};
		let a = i || (() => createComponent(r.route.component, r.params));
		return (r.pageType ?? r.route?.page ?? t)(() => n(e, a));
	}
	function gt(e) {
		let t = {};
		for (let [n, r] of e.stacks) {
			let e = [];
			for (let t of r.list) {
				if (!t.route || t.route.key === void 0 || !yt(t.params)) break;
				let n = {
					r: t.route.key,
					...gt(t.holder)
				};
				Object.keys(t.params).length && (n.p = t.params), e.push(n);
			}
			e.length && ((t.s ?? (t.s = {}))[n] = e);
		}
		return e.active !== void 0 && t.s && (t.a = e.active), t;
	}
	function _t(e, t) {
		for (let [n, r] of Object.entries(t.s ?? {})) {
			let t = I(e, n), i = [];
			for (let e of r) {
				let n = je(e.r);
				if (!n) break;
				let r = Be(t, n, e.p ?? {});
				N.add(r), i.push(r), _t(r.holder, e);
			}
			t.list = i, t.write(i);
		}
		t.a !== void 0 && e.setActive(t.a);
	}
	function vt() {
		return gt(P);
	}
	function yt(e) {
		try {
			return JSON.stringify(JSON.parse(JSON.stringify(e ?? {}))) === JSON.stringify(e ?? {});
		} catch {
			return !1;
		}
	}
	var Y = globalThis.__fuseHost;
	var X;
	try {
		let e = Y?.restore ? JSON.parse(Y.restore) : void 0;
		e && !Array.isArray(e) && typeof e == "object" && (X = e);
	} catch {
		X = void 0;
	}
	{
		let e = Y?.link;
		e && e !== "/" && (K = e), p("_link", (e) => ot(e.link));
	}
	var Z = !1;
	function bt() {
		Y?.restoration && !Z && (Z = !0, queueMicrotask(() => {
			Z = !1, m$1("_navSave", { stack: JSON.stringify(vt()) });
		}));
	}
	function xt(e) {
		return (t, n) => e(at$1("routeChild"), {
			animation: t,
			secondaryAnimation: n
		});
	}
	function Q({ child: e, transition: t, ...n }) {
		return {
			type: "page",
			child: e,
			props: {
				...n,
				transition: typeof t == "function" ? xt(t) : t
			}
		};
	}
	var St = createContext((e) => Q({ child: e }));
	function Ct() {
		return getOwner() ? useContext(St) : (e) => Q({ child: e });
	}
	var wt = (e, t) => pt$1(st, {
		value: e,
		get children() {
			return t();
		}
	});
	function Tt(e) {
		let t = lt({ index: untrack(() => e.index) }), i = Ct();
		var a = at$1("navigator", { onDidRemovePage: (e) => t.removed(e.id) });
		return Q$1(a, pt$1(For, {
			get each() {
				return t.entries();
			},
			keyed: (e) => e.id,
			children: (e) => {
				let t = ht(e(), i, wt);
				return pt$1(Oe, ut$1({
					get component() {
						return t.type;
					},
					get _pageId() {
						return e().id;
					}
				}, () => t.props, { get children() {
					return t.child();
				} }));
			}
		})), nt$1(() => ({
			e: e.observers,
			t: t.takesBack()
		}), ({ e, t }, n) => {
			e !== n?.e && lt$1(a, "observers", e, n?.e), t !== n?.t && lt$1(a, "takesBack", t, n?.t);
		}), a;
	}
	function Et(e) {
		let t = mt(), r = () => Math.max(0, t.stacks().indexOf(t.active() ?? ""));
		var i = at$1("tabs", { onBack: () => t.show(t.stacks()[0]) });
		return Q$1(i, () => e.children), nt$1(() => ({
			e: r(),
			t: r() > 0 && t.stack(t.active()).pages().length <= 1
		}), ({ e, t }, n) => {
			e !== n?.e && lt$1(i, "index", e, n?.e), t !== n?.t && lt$1(i, "backToFirst", t, n?.t);
		}), i;
	}
	function kt(e) {
		var t = at$1("flutter_Icon");
		return nt$1(() => ({
			e: e.icon,
			t: e.size,
			a: e.color,
			o: e.semanticLabel,
			i: e.fill,
			n: e.weight,
			s: e.grade,
			h: e.opticalSize,
			r: e.applyTextScaling,
			d: e.flex,
			l: e.testId
		}), ({ e, t: n, a: r, o: i, i: a, n: o, s: c, h: l, r: u, d, l: f }, p) => {
			e !== p?.e && lt$1(t, "icon", e, p?.e), n !== p?.t && lt$1(t, "size", n, p?.t), r !== p?.a && lt$1(t, "color", r, p?.a), i !== p?.o && lt$1(t, "semanticLabel", i, p?.o), a !== p?.i && lt$1(t, "fill", a, p?.i), o !== p?.n && lt$1(t, "weight", o, p?.n), c !== p?.s && lt$1(t, "grade", c, p?.s), l !== p?.h && lt$1(t, "opticalSize", l, p?.h), u !== p?.r && lt$1(t, "applyTextScaling", u, p?.r), d !== p?.d && lt$1(t, "flex", d, p?.d), f !== p?.l && lt$1(t, "testId", f, p?.l);
		}), t;
	}
	function Pt(e) {
		let t = untrack(() => e.children);
		if (typeof t != "function") return (() => {
			var t = at$1("pressable");
			return vt$1(t, e, !1), t;
		})();
		let [r, i] = createSignal(!1), [a, o] = createSignal(!1), [s, l] = createSignal(!1), u = t;
		var d = at$1("pressable");
		return vt$1(d, [e, {
			onPressedChange: (t) => (i(t), e.onPressedChange?.(t)),
			onHoveredChange: (t) => (o(t), e.onHoveredChange?.(t)),
			onFocusedChange: (t) => (l(t), e.onFocusedChange?.(t))
		}], !0), Q$1(d, () => u({
			pressed: r,
			hovered: a,
			focused: s
		})), d;
	}
	function It(e) {
		let [t, r] = createSignal(!1);
		var i = at$1("modal");
		return vt$1(i, [e, { onRouteLive: r }], !0), Q$1(i, pt$1(Show, {
			get when() {
				return e.open || t();
			},
			get children() {
				return e.children;
			}
		})), i;
	}
	var Ht = 1 / 20;
	function Ut(e, t, n = {}) {
		let r = typeof e == "function" ? e : void 0, i = r ? untrack(r) : e, a = n.from ?? i, [o, s] = createSignal(a, { ownedWrite: !0 }), c = {
			value: a,
			velocity: 0
		}, l = a, u = 0, d, f, p, m = !0, h = () => {
			u && cancelAnimationFrame(u), f !== void 0 && clearTimeout(f), u = 0, f = void 0, d = void 0;
		}, g = (e) => {
			let t = p;
			p = void 0, t?.(e);
		}, _ = (e) => {
			if (u = 0, !m) return;
			let n = d === void 0 ? 1 / 60 : Math.min((e - d) / 1e3, Ht);
			d = e;
			let r = n > 0 ? t(c, l, n) : c;
			r ? (c = r, s(r.value), u = requestAnimationFrame(_)) : (c = {
				value: l,
				velocity: 0
			}, s(l), d = void 0, g("settled"));
		}, v = (e, t = {}) => {
			g("interrupted"), h(), l = e;
			let n = new Promise((e) => p = e), r = () => {
				f = void 0, t.instant ? (c = {
					value: e,
					velocity: 0
				}, s(e), g("settled")) : (t.velocity !== void 0 && (c = {
					...c,
					velocity: t.velocity
				}), u = requestAnimationFrame(_));
			};
			return t.delay && t.delay > 0 ? f = setTimeout(r, t.delay * 1e3) : r(), n;
		};
		if (getOwner() && onCleanup(() => {
			m = !1, h(), g("interrupted");
		}), r) {
			let e = !1;
			createEffect(r, (t) => {
				e ? v(t) : (e = !0, (t !== a || n.delay) && v(t, { delay: n.delay }));
			});
		} else i !== a && v(i, { delay: n.delay });
		return [o, v];
	}
	var Wt = {
		duration: .5,
		bounce: 0
	};
	var Kt = {
		duration: .5,
		bounce: .3
	};
	function qt(e = Wt) {
		if (e.stiffness !== void 0) {
			let t = e.stiffness;
			return {
				stiffness: t,
				damping: e.damping ?? 2 * Math.sqrt(t)
			};
		}
		let t = e.duration ?? .5, n = Math.max(-1, Math.min(e.bounce ?? 0, 1));
		return {
			stiffness: (2 * Math.PI / t) ** 2,
			damping: n >= 0 ? 4 * Math.PI * (1 - n) / t : 4 * Math.PI / (t * (1 + n))
		};
	}
	function Jt(e) {
		let { stiffness: t, damping: n } = qt(e), r = Math.sqrt(t), i = n / (2 * r);
		return ({ value: e, velocity: t }, n, a) => {
			let o = e - n, s = t, c, l;
			if (i < 1) {
				let e = r * Math.sqrt(1 - i * i), t = Math.exp(-i * r * a), n = o, u = (s + i * r * o) / e, d = Math.cos(e * a), f = Math.sin(e * a);
				c = t * (n * d + u * f), l = t * ((u * e - n * i * r) * d - (n * e + u * i * r) * f);
			} else if (i === 1) {
				let e = Math.exp(-r * a), t = s + r * o;
				c = e * (o + t * a), l = e * (t - r * (o + t * a));
			} else {
				let e = r * Math.sqrt(i * i - 1), t = -i * r + e, n = -i * r - e, u = (s - t * o) / (n - t), d = o - u, f = Math.exp(t * a), p = Math.exp(n * a);
				c = d * f + u * p, l = d * t * f + u * n * p;
			}
			if (!(Math.abs(c) < .001 && Math.abs(l) < .01)) return {
				value: n + c,
				velocity: l
			};
		};
	}
	function Yt(e, t = {}) {
		return Ut(e, Jt(t), {
			from: t.from,
			delay: t.delay
		});
	}
	function $(e, t, n) {
		return t + (n - t) * e;
	}
	function Zt(e) {
		if (typeof e != "string") return [
			e.r,
			e.g,
			e.b,
			e.a ?? 1
		];
		let t = e.replace(/^#/, "");
		t.length <= 4 && (t = [...t].map((e) => e + e).join(""));
		let n = (e) => parseInt(t.slice(e, e + 2), 16);
		return [
			n(0),
			n(2),
			n(4),
			t.length >= 8 ? n(6) / 255 : 1
		];
	}
	var Qt = (e) => {
		let t = e / 255;
		return t <= .04045 ? t / 12.92 : ((t + .055) / 1.055) ** 2.4;
	};
	var $t = (e) => {
		let t = e <= .0031308 ? 12.92 * e : 1.055 * Math.max(e, 0) ** (1 / 2.4) - .055;
		return Math.round(Math.max(0, Math.min(1, t)) * 255);
	};
	function en([e, t, n]) {
		let r = Qt(e), i = Qt(t), a = Qt(n), o = Math.cbrt(.4122214708 * r + .5363325363 * i + .0514459929 * a), s = Math.cbrt(.2119034982 * r + .6806995451 * i + .1073969566 * a), c = Math.cbrt(.0883024619 * r + .2817188376 * i + .6299787005 * a);
		return [
			.2104542553 * o + .793617785 * s - .0040720468 * c,
			1.9779984951 * o - 2.428592205 * s + .4505937099 * c,
			.0259040371 * o + .7827717662 * s - .808675766 * c
		];
	}
	function tn([e, t, n]) {
		let r = (e + .3963377774 * t + .2158037573 * n) ** 3, i = (e - .1055613458 * t - .0638541728 * n) ** 3, a = (e - .0894841775 * t - 1.291485548 * n) ** 3;
		return [
			$t(4.0767416621 * r - 3.3077115913 * i + .2309699292 * a),
			$t(-1.2684380046 * r + 2.6097574011 * i - .3413193965 * a),
			$t(-.0041960863 * r - .7034186147 * i + 1.707614701 * a)
		];
	}
	function nn(e, t, n) {
		let r = Zt(t), i = Zt(n), a = en(r), o = en(i), [s, c, l] = tn([
			$(e, a[0], o[0]),
			$(e, a[1], o[1]),
			$(e, a[2], o[2])
		]);
		return {
			r: s,
			g: c,
			b: l,
			a: $(e, r[3], i[3])
		};
	}
	// ../../packages/adaptive/src/platform.tsx
	/** Cupertino on iOS and macOS, Material everywhere else. Default: the device's platform. */
	function platformDesign(platform = C$1.platform) {
		const p = platform.toLowerCase();
		return p === "ios" || p === "macos" ? "cupertino" : "material";
	}
	var DesignContext = createContext(void 0);
	/** Overrides the design below it, e.g. to preview iOS on Android. Reactive. */
	function AdaptiveProvider(props) {
		return pt$1(DesignContext, {
			value: () => props.design,
			get children() {
				return props.children;
			}
		});
	}
	/** The design adaptive components render here. An accessor: it follows `AdaptiveProvider` and `AdaptiveApp`. */
	function useDesign() {
		return useContext(DesignContext) ?? (() => platformDesign());
	}
	// ../../packages/solid-fuse/dist/generated.js
	function m(e, t, n) {
		let r = { $: e }, i = t.length;
		for (let e = 0; e < i && e < n.length; e++) n[e] !== void 0 && (r[t[e]] = n[e]);
		let a = n[i];
		return typeof a == "object" && a && Object.assign(r, a), r;
	}
	function h(e) {
		for (; typeof e == "function";) e = e();
		return e;
	}
	function g(e, t) {
		if (e = h(e), Array.isArray(e)) for (let n of e) g(n, t);
		else e != null && typeof e != "boolean" && t.push(e);
		return t;
	}
	var _ = (e) => e instanceof E$2 && !e.parent ? e : k$2(e);
	function v(e) {
		return createMemo(() => {
			let t = g(e(), []);
			return t.length === 0 ? null : t.length === 1 ? _(t[0]) : k$2(t);
		});
	}
	function y(e) {
		return createMemo(() => g(e(), []).map(_));
	}
	var b = (e, t) => {
		if (e === t) return !0;
		if (typeof e != "object" || typeof t != "object" || e === null || t === null || Array.isArray(e) !== Array.isArray(t)) return !1;
		let n = Object.keys(e);
		if (n.length !== Object.keys(t).length) return !1;
		for (let r of n) if (!b(e[r], t[r])) return !1;
		return !0;
	};
	var x = (t) => t.catch(u);
	var S = /* @__PURE__ */ new Map();
	var C = {
		s: [],
		w: [],
		o: [],
		m: [],
		st: []
	};
	function w(e, t) {
		S.set(e, t);
	}
	function T(e, t, n, r) {
		let i = new Set(r.fns), o = new Set(r.live), s = {}, c = [];
		if (n) for (let e in n) {
			let t = n[e];
			typeof t == "function" && !i.has(e) ? (s[e] = untrack(t), o.has(e) && c.push([e, t])) : s[e] = t;
		}
		r.ctor && (s.$ctor = r.ctor);
		let l = {};
		for (let e of t.s) l[e] = s[e] === void 0 ? r.seeds?.[e] : s[e];
		let { handle: d, write: f } = k(Ge$1(e, s), t, l);
		for (let [e, t] of c) createEffect(t, (t, n) => {
			(n !== void 0 || t !== s[e]) && f(e, t);
		});
		return d;
	}
	var E = /* @__PURE__ */ new Map();
	function D(e) {
		let t = e.$h, n = Ye$1(t)?.handle;
		if (n) {
			if (!e.o) {
				let e = E.get(t);
				e ? e.n++ : pe.send("_unborrow", {
					id: t,
					n: 1
				});
			}
			return n;
		}
		let a = {
			id: t,
			n: +!e.o
		};
		e.o || E.set(t, a);
		let s = Je$1(e.t, t, () => {
			E.get(a.id) === a && E.delete(a.id), a.n > 0 && pe.send("_unborrow", {
				id: a.id,
				n: a.n
			});
		}), c = S.get(e.t) ?? C, { handle: l, call: u } = k(s, c, e.s ? O(e.s) : {});
		return !e.s && c.s.length && x(u("$sync", null)), l;
	}
	function O(e, t = 0) {
		if (typeof e != "object" || !e || t > 32) return e;
		let n = e;
		if (typeof n.$h == "number" && typeof n.t == "string") return D(n);
		let r;
		if (Array.isArray(e)) for (let n = 0; n < e.length; n++) {
			let i = O(e[n], t + 1);
			i !== e[n] && ((r ?? (r = e.slice()))[n] = i);
		}
		else for (let e in n) {
			let i = O(n[e], t + 1);
			i !== n[e] && ((r ?? (r = { ...n }))[e] = i);
		}
		return r ?? e;
	}
	Ke$1(O);
	function k(e, r, a) {
		let o = 0, s = /* @__PURE__ */ new Map();
		for (let e of r.s) {
			let [t, n] = createSignal(a[e], {
				equals: b,
				ownedWrite: !0
			});
			s.set(e, [t, (e) => n(() => e)]);
		}
		Ze$1(e, "$push", (e) => {
			if (!(e.v < o)) for (let t in e.s) s.get(t)?.[1](e.s[t]);
		});
		let c = (n, r) => pe.call("_handleCall", {
			node: e.id,
			method: n,
			value: Xe$1(r)
		}, { timeout: 0 }).then(O), l = { node: e };
		e.handle = l;
		for (let [e, [t]] of s) l[e] = t;
		let u = new Set(r.o), d = (e, t) => {
			o++, u.has(e) && s.get(e)?.[1](t), x(c("$set", {
				n: e,
				v: t,
				ver: o
			}));
		};
		for (let e of r.w) l[`set${e[0].toUpperCase()}${e.slice(1)}`] = (t) => d(e, t);
		for (let e of r.m) l[e] = (...t) => c(e, t);
		for (let t of r.st) l[t] = () => j(e, c, t);
		return {
			handle: l,
			write: d,
			call: c
		};
	}
	var A = 0;
	function j(e, t, r) {
		return { [Symbol.asyncIterator]() {
			let i = `$s${A++}`, a = [], o = null, s = !1, c, l = !1, u = () => {
				l || (l = !0, Ze$1(e, i, void 0));
			};
			Ze$1(e, i, (e) => {
				e.d ? s = !0 : e.e === void 0 ? a.push(e.v) : c = e.e, o?.();
			});
			let d = t("$listen", {
				stream: r,
				fn: i
			}).catch((e) => {
				c = e instanceof Error ? e.message : String(e), o?.();
			});
			return {
				async next() {
					for (await d;;) {
						if (a.length) return {
							value: a.shift(),
							done: !1
						};
						if (c !== void 0) throw u(), Error(c);
						if (s) return u(), {
							value: void 0,
							done: !0
						};
						await new Promise((e) => o = e), o = null;
					}
				},
				async return() {
					return s || x(t("$cancel", { fn: i })), s = !0, u(), {
						value: void 0,
						done: !0
					};
				}
			};
		} };
	}
	w("listen_ChangeNotifier", {
		"s": [],
		"w": [],
		"o": [],
		"m": [],
		"st": []
	});
	w("listen_Listenable", {
		"s": [],
		"w": [],
		"o": [],
		"m": [],
		"st": []
	});
	w("listen_ValueNotifier", {
		"s": ["value"],
		"w": ["value"],
		"o": [],
		"m": [],
		"st": []
	});
	w("listen_ValueNotifier2", {
		"s": ["value"],
		"w": ["value"],
		"o": ["value"],
		"m": [],
		"st": []
	});
	w("vector_math_Matrix4", {
		"s": [],
		"w": [
			"row0",
			"row1",
			"row2",
			"row3"
		],
		"o": [],
		"m": [
			"index",
			"entry",
			"setEntry",
			"splatDiagonal",
			"setValues",
			"setColumns",
			"setFrom",
			"setFromTranslationRotation",
			"setFromTranslationRotationScale",
			"setUpper2x2",
			"setDiagonal",
			"setOuter",
			"setRow",
			"getRow",
			"setColumn",
			"getColumn",
			"clone",
			"copyInto",
			"translateByDouble",
			"translateByVector2",
			"translateByVector3",
			"translateByVector4",
			"leftTranslateByDouble",
			"leftTranslateByVector2",
			"leftTranslateByVector3",
			"leftTranslateByVector4",
			"rotate",
			"rotateX",
			"rotateY",
			"rotateZ",
			"scaleByDouble",
			"scaleByVector3",
			"scaleByVector4",
			"scaledByDouble",
			"scaledByVector3",
			"scaledByVector4",
			"setZero",
			"setIdentity",
			"transposed",
			"transpose",
			"absolute",
			"determinant",
			"dotRow",
			"dotColumn",
			"trace",
			"infinityNorm",
			"relativeError",
			"absoluteError",
			"getTranslation",
			"setTranslation",
			"setTranslationRaw",
			"getRotation",
			"copyRotation",
			"setRotation",
			"getNormalMatrix",
			"getMaxScaleOnAxis",
			"transposeRotation",
			"invert",
			"copyInverse",
			"invertRotation",
			"setRotationX",
			"setRotationY",
			"setRotationZ",
			"scaleAdjoint",
			"absoluteRotate",
			"add",
			"sub",
			"negate",
			"multiply",
			"leftMultiply",
			"multiplied",
			"transposeMultiply",
			"multiplyTranspose",
			"decompose",
			"rotate3",
			"rotated3",
			"transform3",
			"transformed3",
			"transform",
			"perspectiveTransform",
			"transformed",
			"copyIntoArray",
			"copyFromArray",
			"applyToVector3Array",
			"isIdentity",
			"isZero"
		],
		"st": []
	});
	w("vector_math_Matrix3", {
		"s": [],
		"w": [
			"row0",
			"row1",
			"row2"
		],
		"o": [],
		"m": [
			"index",
			"entry",
			"setEntry",
			"setValues",
			"setColumns",
			"setFrom",
			"setOuter",
			"splatDiagonal",
			"setDiagonal",
			"setUpper2x2",
			"setRow",
			"getRow",
			"setColumn",
			"getColumn",
			"clone",
			"copyInto",
			"setZero",
			"setIdentity",
			"transposed",
			"transpose",
			"absolute",
			"determinant",
			"dotRow",
			"dotColumn",
			"trace",
			"infinityNorm",
			"relativeError",
			"absoluteError",
			"invert",
			"copyInverse",
			"copyNormalMatrix",
			"setRotationX",
			"setRotationY",
			"setRotationZ",
			"scaleAdjoint",
			"absoluteRotate",
			"absoluteRotate2",
			"transform2",
			"scale",
			"scaled",
			"add",
			"sub",
			"negate",
			"multiply",
			"multiplied",
			"transposeMultiply",
			"multiplyTranspose",
			"transform",
			"transformed",
			"copyIntoArray",
			"copyFromArray",
			"applyToVector3Array",
			"isIdentity",
			"isZero"
		],
		"st": []
	});
	w("vector_math_Vector2", {
		"s": [],
		"w": [
			"length",
			"xy",
			"yx",
			"r",
			"g",
			"s",
			"t",
			"x",
			"y",
			"rg",
			"gr",
			"st",
			"ts"
		],
		"o": [],
		"m": [
			"setValues",
			"setZero",
			"setFrom",
			"splat",
			"normalize",
			"normalized",
			"normalizeInto",
			"distanceTo",
			"distanceToSquared",
			"angleTo",
			"angleToSigned",
			"dot",
			"postmultiply",
			"cross",
			"scaleOrthogonalInto",
			"reflect",
			"reflected",
			"relativeError",
			"absoluteError",
			"add",
			"addScaled",
			"sub",
			"multiply",
			"divide",
			"scale",
			"scaled",
			"negate",
			"absolute",
			"clamp",
			"clampScalar",
			"floor",
			"ceil",
			"round",
			"roundToZero",
			"clone",
			"copyInto",
			"copyIntoArray",
			"copyFromArray"
		],
		"st": []
	});
	w("vector_math_Vector3", {
		"s": [],
		"w": [
			"length",
			"xy",
			"xz",
			"yx",
			"yz",
			"zx",
			"zy",
			"xyz",
			"xzy",
			"yxz",
			"yzx",
			"zxy",
			"zyx",
			"r",
			"g",
			"b",
			"s",
			"t",
			"p",
			"x",
			"y",
			"z",
			"rg",
			"rb",
			"gr",
			"gb",
			"br",
			"bg",
			"rgb",
			"rbg",
			"grb",
			"gbr",
			"brg",
			"bgr",
			"st",
			"sp",
			"ts",
			"tp",
			"ps",
			"pt",
			"stp",
			"spt",
			"tsp",
			"tps",
			"pst",
			"pts"
		],
		"o": [],
		"m": [
			"setValues",
			"setZero",
			"setFrom",
			"splat",
			"normalize",
			"normalized",
			"normalizeInto",
			"distanceTo",
			"distanceToSquared",
			"angleTo",
			"angleToSigned",
			"dot",
			"postmultiply",
			"cross",
			"crossInto",
			"reflect",
			"reflected",
			"applyProjection",
			"applyAxisAngle",
			"applyQuaternion",
			"applyMatrix3",
			"applyMatrix4",
			"relativeError",
			"absoluteError",
			"add",
			"addScaled",
			"sub",
			"multiply",
			"divide",
			"scale",
			"scaled",
			"negate",
			"absolute",
			"clamp",
			"clampScalar",
			"floor",
			"ceil",
			"round",
			"roundToZero",
			"clone",
			"copyInto",
			"copyIntoArray",
			"copyFromArray"
		],
		"st": []
	});
	w("vector_math_Vector4", {
		"s": [],
		"w": [
			"length",
			"xy",
			"xz",
			"xw",
			"yx",
			"yz",
			"yw",
			"zx",
			"zy",
			"zw",
			"wx",
			"wy",
			"wz",
			"xyz",
			"xyw",
			"xzy",
			"xzw",
			"xwy",
			"xwz",
			"yxz",
			"yxw",
			"yzx",
			"yzw",
			"ywx",
			"ywz",
			"zxy",
			"zxw",
			"zyx",
			"zyw",
			"zwx",
			"zwy",
			"wxy",
			"wxz",
			"wyx",
			"wyz",
			"wzx",
			"wzy",
			"xyzw",
			"xywz",
			"xzyw",
			"xzwy",
			"xwyz",
			"xwzy",
			"yxzw",
			"yxwz",
			"yzxw",
			"yzwx",
			"ywxz",
			"ywzx",
			"zxyw",
			"zxwy",
			"zyxw",
			"zywx",
			"zwxy",
			"zwyx",
			"wxyz",
			"wxzy",
			"wyxz",
			"wyzx",
			"wzxy",
			"wzyx",
			"r",
			"g",
			"b",
			"a",
			"s",
			"t",
			"p",
			"q",
			"x",
			"y",
			"z",
			"w",
			"rg",
			"rb",
			"ra",
			"gr",
			"gb",
			"ga",
			"br",
			"bg",
			"ba",
			"ar",
			"ag",
			"ab",
			"rgb",
			"rga",
			"rbg",
			"rba",
			"rag",
			"rab",
			"grb",
			"gra",
			"gbr",
			"gba",
			"gar",
			"gab",
			"brg",
			"bra",
			"bgr",
			"bga",
			"bar",
			"bag",
			"arg",
			"arb",
			"agr",
			"agb",
			"abr",
			"abg",
			"rgba",
			"rgab",
			"rbga",
			"rbag",
			"ragb",
			"rabg",
			"grba",
			"grab",
			"gbra",
			"gbar",
			"garb",
			"gabr",
			"brga",
			"brag",
			"bgra",
			"bgar",
			"barg",
			"bagr",
			"argb",
			"arbg",
			"agrb",
			"agbr",
			"abrg",
			"abgr",
			"st",
			"sp",
			"sq",
			"ts",
			"tp",
			"tq",
			"ps",
			"pt",
			"pq",
			"qs",
			"qt",
			"qp",
			"stp",
			"stq",
			"spt",
			"spq",
			"sqt",
			"sqp",
			"tsp",
			"tsq",
			"tps",
			"tpq",
			"tqs",
			"tqp",
			"pst",
			"psq",
			"pts",
			"ptq",
			"pqs",
			"pqt",
			"qst",
			"qsp",
			"qts",
			"qtp",
			"qps",
			"qpt",
			"stpq",
			"stqp",
			"sptq",
			"spqt",
			"sqtp",
			"sqpt",
			"tspq",
			"tsqp",
			"tpsq",
			"tpqs",
			"tqsp",
			"tqps",
			"pstq",
			"psqt",
			"ptsq",
			"ptqs",
			"pqst",
			"pqts",
			"qstp",
			"qspt",
			"qtsp",
			"qtps",
			"qpst",
			"qpts"
		],
		"o": [],
		"m": [
			"setValues",
			"setZero",
			"setIdentity",
			"setFrom",
			"splat",
			"normalize",
			"normalized",
			"normalizeInto",
			"distanceTo",
			"distanceToSquared",
			"dot",
			"applyMatrix4",
			"relativeError",
			"absoluteError",
			"add",
			"addScaled",
			"sub",
			"multiply",
			"div",
			"scale",
			"scaled",
			"negate",
			"absolute",
			"clamp",
			"clampScalar",
			"floor",
			"ceil",
			"round",
			"roundToZero",
			"clone",
			"copyInto",
			"copyIntoArray",
			"copyFromArray"
		],
		"st": []
	});
	// fuse/flutter/Curves.tsx
	var easeInOut = "Curves.easeInOut";
	// fuse/flutter.tsx
	/**
	* Creates a scrollable, linear array of widgets that are created on demand.
	* Dart: `ListView.builder`
	*/
	function ListViewBuilder(props) {
		const $prototypeItem = v(() => props.prototypeItem);
		var _el$154 = at$1("flutter_ListViewBuilder");
		vt$1(_el$154, [props, { get prototypeItem() {
			return $prototypeItem();
		} }], false);
		return _el$154;
	}
	w("flutter_AnimationController", {
		"s": [
			"lowerBound",
			"upperBound",
			"animationBehavior",
			"view",
			"duration",
			"reverseDuration",
			"value",
			"velocity",
			"lastElapsedDuration",
			"isAnimating",
			"status",
			"isDismissed",
			"isCompleted",
			"isForwardOrCompleted"
		],
		"w": [
			"duration",
			"reverseDuration",
			"value"
		],
		"o": ["value"],
		"m": [
			"reset",
			"forward",
			"reverse",
			"toggle",
			"animateTo",
			"animateBack",
			"repeat",
			"fling",
			"animateWith",
			"animateBackWith",
			"stop"
		],
		"st": []
	});
	w("flutter_AnimationMean", {
		"s": [
			"value",
			"first",
			"next",
			"status",
			"isDismissed",
			"isCompleted",
			"isAnimating",
			"isForwardOrCompleted"
		],
		"w": [],
		"o": [],
		"m": ["didStartListening", "didStopListening"],
		"st": []
	});
	w("flutter_AppLifecycleListener", {
		"s": [],
		"w": [],
		"o": [],
		"m": ["didRequestAppExit", "didChangeAppLifecycleState"],
		"st": []
	});
	w("flutter_BallisticScrollActivity", {
		"s": [],
		"w": [],
		"o": [],
		"m": [
			"resetActivity",
			"applyNewDimensions",
			"dispatchScrollStartNotification"
		],
		"st": []
	});
	w("flutter_BannerPainter", {
		"s": [
			"message",
			"textDirection",
			"location",
			"layoutDirection",
			"color",
			"textStyle",
			"shadow"
		],
		"w": [],
		"o": [],
		"m": [
			"paint",
			"shouldRepaint",
			"hitTest",
			"shouldRebuildSemantics"
		],
		"st": []
	});
	w("flutter_ClipboardStatusNotifier", {
		"s": ["value"],
		"w": ["value"],
		"o": ["value"],
		"m": ["update", "didChangeAppLifecycleState"],
		"st": []
	});
	w("flutter_CurvedAnimation", {
		"s": [
			"parent",
			"curve",
			"reverseCurve",
			"isDisposed",
			"value",
			"status",
			"isDismissed",
			"isCompleted",
			"isAnimating",
			"isForwardOrCompleted"
		],
		"w": [
			"curve",
			"reverseCurve",
			"isDisposed"
		],
		"o": ["isDisposed"],
		"m": [],
		"st": []
	});
	w("flutter_DragScrollActivity", {
		"s": [],
		"w": [],
		"o": [],
		"m": [
			"dispatchScrollStartNotification",
			"resetActivity",
			"applyNewDimensions"
		],
		"st": []
	});
	w("flutter_DraggableScrollableController", {
		"s": [
			"size",
			"pixels",
			"isAttached"
		],
		"w": [],
		"o": [],
		"m": [
			"sizeToPixels",
			"pixelsToSize",
			"animateTo",
			"jumpTo",
			"reset"
		],
		"st": []
	});
	w("flutter_DrivenScrollActivity", {
		"s": [],
		"w": [],
		"o": [],
		"m": [
			"resetActivity",
			"dispatchScrollStartNotification",
			"applyNewDimensions"
		],
		"st": []
	});
	w("flutter_ExpansibleController", {
		"s": ["isExpanded"],
		"w": [],
		"o": [],
		"m": [
			"expand",
			"collapse",
			"toggle"
		],
		"st": []
	});
	w("flutter_FixedExtentScrollController", {
		"s": [
			"initialItem",
			"selectedItem",
			"initialScrollOffset",
			"keepScrollOffset",
			"positions",
			"hasClients",
			"position",
			"offset"
		],
		"w": [],
		"o": [],
		"m": [
			"animateToItem",
			"jumpToItem",
			"createScrollPosition",
			"animateTo",
			"jumpTo",
			"attach",
			"detach"
		],
		"st": []
	});
	w("flutter_FocusManager", {
		"s": [
			"highlightStrategy",
			"highlightMode",
			"rootScope",
			"primaryFocus"
		],
		"w": ["highlightStrategy"],
		"o": ["highlightStrategy"],
		"m": ["registerGlobalHandlers", "applyFocusChangesIfNeeded"],
		"st": []
	});
	var $FocusNode = {
		"s": [
			"skipTraversal",
			"canRequestFocus",
			"descendantsAreFocusable",
			"descendantsAreTraversable",
			"parent",
			"children",
			"traversalChildren",
			"descendants",
			"traversalDescendants",
			"ancestors",
			"hasFocus",
			"hasPrimaryFocus",
			"highlightMode",
			"nearestScope",
			"enclosingScope",
			"size",
			"offset",
			"rect"
		],
		"w": [
			"skipTraversal",
			"canRequestFocus",
			"descendantsAreFocusable",
			"descendantsAreTraversable"
		],
		"o": [
			"skipTraversal",
			"canRequestFocus",
			"descendantsAreFocusable",
			"descendantsAreTraversable"
		],
		"m": [
			"unfocus",
			"consumeKeyboardToken",
			"attach",
			"requestFocus",
			"nextFocus",
			"previousFocus",
			"focusInDirection"
		],
		"st": []
	};
	w("flutter_FocusNode", $FocusNode);
	/**
	* An object that can be used by a stateful widget to obtain the keyboard focus and to handle keyboard events.
	* Dart: `FocusNode(...)`. Lives while the calling owner does, and after that while JS still holds it.
	*/
	function createFocusNode(options) {
		return T("flutter_FocusNode", $FocusNode, options, {
			"fns": ["onKey", "onKeyEvent"],
			"live": [
				"skipTraversal",
				"canRequestFocus",
				"descendantsAreFocusable",
				"descendantsAreTraversable"
			],
			"seeds": {
				"skipTraversal": false,
				"canRequestFocus": true,
				"descendantsAreFocusable": true,
				"descendantsAreTraversable": true
			}
		});
	}
	w("flutter_FocusScopeNode", {
		"s": [
			"nearestScope",
			"descendantsAreFocusable",
			"traversalEdgeBehavior",
			"directionalTraversalEdgeBehavior",
			"isFirstFocus",
			"focusedChild",
			"traversalChildren",
			"traversalDescendants",
			"skipTraversal",
			"canRequestFocus",
			"descendantsAreTraversable",
			"parent",
			"children",
			"descendants",
			"ancestors",
			"hasFocus",
			"hasPrimaryFocus",
			"highlightMode",
			"enclosingScope",
			"size",
			"offset",
			"rect"
		],
		"w": [
			"traversalEdgeBehavior",
			"directionalTraversalEdgeBehavior",
			"skipTraversal",
			"canRequestFocus",
			"descendantsAreFocusable",
			"descendantsAreTraversable"
		],
		"o": [
			"traversalEdgeBehavior",
			"directionalTraversalEdgeBehavior",
			"skipTraversal",
			"canRequestFocus",
			"descendantsAreFocusable",
			"descendantsAreTraversable"
		],
		"m": [
			"setFirstFocus",
			"autofocus",
			"requestScopeFocus",
			"unfocus",
			"consumeKeyboardToken",
			"attach",
			"requestFocus",
			"nextFocus",
			"previousFocus",
			"focusInDirection"
		],
		"st": []
	});
	w("flutter_HeroController", {
		"s": [],
		"w": [],
		"o": [],
		"m": [
			"didChangeTop",
			"didStartUserGesture",
			"didStopUserGesture",
			"didPush",
			"didPop",
			"didRemove",
			"didReplace"
		],
		"st": []
	});
	w("flutter_HoldScrollActivity", {
		"s": [],
		"w": [],
		"o": [],
		"m": [
			"cancel",
			"resetActivity",
			"dispatchScrollStartNotification",
			"applyNewDimensions"
		],
		"st": []
	});
	w("flutter_IdleScrollActivity", {
		"s": [],
		"w": [],
		"o": [],
		"m": [
			"applyNewDimensions",
			"resetActivity",
			"dispatchScrollStartNotification"
		],
		"st": []
	});
	w("flutter_InspectorSelection", {
		"s": ["index", "active"],
		"w": ["index"],
		"o": ["index"],
		"m": ["clear", "clearCandidates"],
		"st": []
	});
	w("flutter_KeepAliveHandle", {
		"s": [],
		"w": [],
		"o": [],
		"m": [],
		"st": []
	});
	w("flutter_LiveTextInputStatusNotifier", {
		"s": ["value"],
		"w": ["value"],
		"o": ["value"],
		"m": ["update", "didChangeAppLifecycleState"],
		"st": []
	});
	w("flutter_LocalizationsResolver", {
		"s": ["locale", "supportedLocales"],
		"w": [],
		"o": [],
		"m": ["update", "didChangeLocales"],
		"st": []
	});
	w("flutter_NavigatorObserver", {
		"s": [],
		"w": [],
		"o": [],
		"m": [
			"didPush",
			"didPop",
			"didRemove",
			"didReplace",
			"didChangeTop",
			"didStartUserGesture",
			"didStopUserGesture"
		],
		"st": []
	});
	w("flutter_OverlayEntry", {
		"s": [
			"opaque",
			"maintainState",
			"canSizeOverlay",
			"mounted"
		],
		"w": ["opaque", "maintainState"],
		"o": ["opaque", "maintainState"],
		"m": ["remove", "markNeedsBuild"],
		"st": []
	});
	w("flutter_PageController", {
		"s": [
			"initialPage",
			"keepPage",
			"viewportFraction",
			"page",
			"initialScrollOffset",
			"keepScrollOffset",
			"positions",
			"hasClients",
			"position",
			"offset"
		],
		"w": [],
		"o": [],
		"m": [
			"animateToPage",
			"jumpToPage",
			"nextPage",
			"previousPage",
			"createScrollPosition",
			"attach",
			"animateTo",
			"jumpTo",
			"detach"
		],
		"st": []
	});
	w("flutter_PlatformRouteInformationProvider", {
		"s": ["value"],
		"w": [],
		"o": [],
		"m": ["routerReportsNewRouteInformation", "didPushRouteInformation"],
		"st": []
	});
	w("flutter_ProxyAnimation", {
		"s": [
			"parent",
			"status",
			"value",
			"isDismissed",
			"isCompleted",
			"isAnimating",
			"isForwardOrCompleted"
		],
		"w": ["parent"],
		"o": [],
		"m": ["didStartListening", "didStopListening"],
		"st": []
	});
	w("flutter_RestorableBool", {
		"s": ["value", "enabled"],
		"w": ["value"],
		"o": ["value"],
		"m": [
			"fromPrimitives",
			"toPrimitives",
			"createDefaultValue",
			"didUpdateValue",
			"initWithValue"
		],
		"st": []
	});
	w("flutter_RestorableBoolN", {
		"s": ["value", "enabled"],
		"w": ["value"],
		"o": ["value"],
		"m": [
			"createDefaultValue",
			"didUpdateValue",
			"fromPrimitives",
			"toPrimitives",
			"initWithValue"
		],
		"st": []
	});
	w("flutter_RestorableDateTime", {
		"s": ["value", "enabled"],
		"w": ["value"],
		"o": [],
		"m": [
			"createDefaultValue",
			"didUpdateValue",
			"fromPrimitives",
			"toPrimitives",
			"initWithValue"
		],
		"st": []
	});
	w("flutter_RestorableDateTimeN", {
		"s": ["value", "enabled"],
		"w": ["value"],
		"o": [],
		"m": [
			"createDefaultValue",
			"didUpdateValue",
			"fromPrimitives",
			"toPrimitives",
			"initWithValue"
		],
		"st": []
	});
	w("flutter_RestorableDouble", {
		"s": ["value", "enabled"],
		"w": ["value"],
		"o": ["value"],
		"m": [
			"fromPrimitives",
			"toPrimitives",
			"createDefaultValue",
			"didUpdateValue",
			"initWithValue"
		],
		"st": []
	});
	w("flutter_RestorableDoubleN", {
		"s": ["value", "enabled"],
		"w": ["value"],
		"o": ["value"],
		"m": [
			"createDefaultValue",
			"didUpdateValue",
			"fromPrimitives",
			"toPrimitives",
			"initWithValue"
		],
		"st": []
	});
	w("flutter_RestorableInt", {
		"s": ["value", "enabled"],
		"w": ["value"],
		"o": ["value"],
		"m": [
			"fromPrimitives",
			"toPrimitives",
			"createDefaultValue",
			"didUpdateValue",
			"initWithValue"
		],
		"st": []
	});
	w("flutter_RestorableIntN", {
		"s": ["value", "enabled"],
		"w": ["value"],
		"o": ["value"],
		"m": [
			"createDefaultValue",
			"didUpdateValue",
			"fromPrimitives",
			"toPrimitives",
			"initWithValue"
		],
		"st": []
	});
	w("flutter_RestorableString", {
		"s": ["value", "enabled"],
		"w": ["value"],
		"o": ["value"],
		"m": [
			"fromPrimitives",
			"toPrimitives",
			"createDefaultValue",
			"didUpdateValue",
			"initWithValue"
		],
		"st": []
	});
	w("flutter_RestorableStringN", {
		"s": ["value", "enabled"],
		"w": ["value"],
		"o": ["value"],
		"m": [
			"createDefaultValue",
			"didUpdateValue",
			"fromPrimitives",
			"toPrimitives",
			"initWithValue"
		],
		"st": []
	});
	w("flutter_RestorableTextEditingController", {
		"s": ["value", "enabled"],
		"w": [],
		"o": [],
		"m": [
			"createDefaultValue",
			"fromPrimitives",
			"toPrimitives",
			"initWithValue"
		],
		"st": []
	});
	w("flutter_RestorationBucket", {
		"s": [],
		"w": [],
		"o": [],
		"m": [
			"contains",
			"claimChild",
			"adoptChild",
			"rename"
		],
		"st": []
	});
	w("flutter_ReverseAnimation", {
		"s": [
			"parent",
			"status",
			"value",
			"isDismissed",
			"isCompleted",
			"isAnimating",
			"isForwardOrCompleted"
		],
		"w": [],
		"o": [],
		"m": ["didStartListening", "didStopListening"],
		"st": []
	});
	var $ScrollController = {
		"s": [
			"initialScrollOffset",
			"keepScrollOffset",
			"positions",
			"hasClients",
			"position",
			"offset"
		],
		"w": [],
		"o": [],
		"m": [
			"animateTo",
			"jumpTo",
			"attach",
			"detach",
			"createScrollPosition"
		],
		"st": []
	};
	w("flutter_ScrollController", $ScrollController);
	/**
	* Controls a scrollable widget.
	* Dart: `ScrollController(...)`. Lives while the calling owner does, and after that while JS still holds it.
	*/
	function createScrollController(options) {
		return T("flutter_ScrollController", $ScrollController, options, {
			"fns": ["onAttach", "onDetach"],
			"seeds": {
				"initialScrollOffset": 0,
				"keepScrollOffset": true
			}
		});
	}
	w("flutter_ScrollDragController", {
		"s": [],
		"w": [],
		"o": [],
		"m": [
			"update",
			"end",
			"cancel"
		],
		"st": []
	});
	w("flutter_ScrollPositionWithSingleContext", {
		"s": [
			"axisDirection",
			"userScrollDirection",
			"physics",
			"context",
			"keepScrollOffset",
			"minScrollExtent",
			"maxScrollExtent",
			"hasContentDimensions",
			"pixels",
			"hasPixels",
			"viewportDimension",
			"hasViewportDimension",
			"haveDimensions",
			"shouldIgnorePointer",
			"devicePixelRatio",
			"isScrollingNotifier",
			"allowImplicitScrolling"
		],
		"w": [],
		"o": [],
		"m": [
			"setPixels",
			"absorb",
			"applyNewDimensions",
			"beginActivity",
			"applyUserOffset",
			"goIdle",
			"goBallistic",
			"animateTo",
			"jumpTo",
			"pointerScroll",
			"correctPixels",
			"correctBy",
			"restoreOffset",
			"applyViewportDimension",
			"applyContentDimensions",
			"moveTo",
			"didStartScroll",
			"didUpdateScrollPositionBy",
			"didEndScroll",
			"didOverscrollBy",
			"didUpdateScrollDirection",
			"didUpdateScrollMetrics"
		],
		"st": []
	});
	w("flutter_ScrollbarPainter", {
		"s": [
			"color",
			"trackColor",
			"trackBorderColor",
			"trackRadius",
			"textDirection",
			"thickness",
			"fadeoutOpacityAnimation",
			"mainAxisMargin",
			"crossAxisMargin",
			"radius",
			"shape",
			"padding",
			"minLength",
			"minOverscrollLength",
			"scrollbarOrientation",
			"ignorePointer"
		],
		"w": [
			"trackRadius",
			"textDirection",
			"thickness",
			"mainAxisMargin",
			"crossAxisMargin",
			"radius",
			"padding",
			"minLength",
			"minOverscrollLength",
			"scrollbarOrientation",
			"ignorePointer"
		],
		"o": [
			"textDirection",
			"thickness",
			"mainAxisMargin",
			"crossAxisMargin",
			"minLength",
			"minOverscrollLength",
			"scrollbarOrientation",
			"ignorePointer"
		],
		"m": [
			"update",
			"updateThickness",
			"paint",
			"getTrackToScroll",
			"getThumbScrollOffset",
			"hitTest",
			"hitTestInteractive",
			"hitTestOnlyThumbInteractive",
			"shouldRepaint",
			"shouldRebuildSemantics"
		],
		"st": []
	});
	w("flutter_SelectionListenerNotifier", {
		"s": ["selection", "registered"],
		"w": [],
		"o": [],
		"m": [],
		"st": []
	});
	w("flutter_ShapeBorderClipper", {
		"s": ["shape", "textDirection"],
		"w": [],
		"o": [],
		"m": [
			"getClip",
			"shouldReclip",
			"getApproximateClipRect"
		],
		"st": []
	});
	w("flutter_ShortcutManager", {
		"s": ["modal"],
		"w": ["shortcuts"],
		"o": [],
		"m": [],
		"st": []
	});
	w("flutter_ShortcutRegistry", {
		"s": [],
		"w": [],
		"o": [],
		"m": ["addAll"],
		"st": []
	});
	w("flutter_SliverOverlapAbsorberHandle", {
		"s": ["layoutExtent", "scrollExtent"],
		"w": [],
		"o": [],
		"m": [],
		"st": []
	});
	w("flutter_SnapshotController", {
		"s": ["allowSnapshotting"],
		"w": ["allowSnapshotting"],
		"o": ["allowSnapshotting"],
		"m": ["clear"],
		"st": []
	});
	w("flutter_StaticSelectionContainerDelegate", {
		"s": [
			"selectables",
			"value",
			"contentLength",
			"hasSize",
			"containerSize"
		],
		"w": ["selectables"],
		"o": [],
		"m": [
			"remove",
			"handleSelectAll",
			"handleSelectWord",
			"handleSelectParagraph",
			"handleClearSelection",
			"handleSelectionEdgeUpdate",
			"dispatchSelectionEventToChild",
			"ensureChildUpdated",
			"didChangeSelectables",
			"add",
			"layoutDidChange",
			"pushHandleLayers",
			"getSelectedContent",
			"getSelection",
			"dispatchSelectionEvent",
			"getTransformFrom",
			"getTransformTo"
		],
		"st": []
	});
	w("flutter_TextEditingController", {
		"s": [
			"text",
			"selection",
			"value"
		],
		"w": [
			"text",
			"value",
			"selection"
		],
		"o": ["text"],
		"m": ["clear", "clearComposing"],
		"st": []
	});
	w("flutter_TextPainter", {
		"s": [],
		"w": [
			"textAlign",
			"textDirection",
			"ellipsis",
			"locale",
			"maxLines",
			"textWidthBasis",
			"textHeightBehavior",
			"hyphens"
		],
		"o": [],
		"m": [
			"markNeedsLayout",
			"setPlaceholderDimensions",
			"computeDistanceToActualBaseline",
			"layout",
			"paint",
			"getOffsetAfter",
			"getOffsetBefore",
			"getOffsetForCaret",
			"getFullHeightForCaret",
			"getBoxesForSelection",
			"getClosestGlyphForOffset",
			"getPositionForOffset",
			"getWordBoundary",
			"getLineBoundary",
			"computeLineMetrics"
		],
		"st": []
	});
	w("flutter_TrackingScrollController", {
		"s": [
			"mostRecentlyUpdatedPosition",
			"initialScrollOffset",
			"keepScrollOffset",
			"positions",
			"hasClients",
			"position",
			"offset"
		],
		"w": [],
		"o": [],
		"m": [
			"attach",
			"detach",
			"animateTo",
			"jumpTo",
			"createScrollPosition"
		],
		"st": []
	});
	w("flutter_TrainHoppingAnimation", {
		"s": [
			"currentTrain",
			"status",
			"value",
			"isDismissed",
			"isCompleted",
			"isAnimating",
			"isForwardOrCompleted"
		],
		"w": [],
		"o": [],
		"m": [],
		"st": []
	});
	w("flutter_TransformationController", {
		"s": ["value"],
		"w": ["value"],
		"o": [],
		"m": ["toScene"],
		"st": []
	});
	w("flutter_TwoDimensionalChildBuilderDelegate", {
		"s": [
			"maxXIndex",
			"maxYIndex",
			"addRepaintBoundaries",
			"addAutomaticKeepAlives"
		],
		"w": ["maxXIndex", "maxYIndex"],
		"o": ["maxXIndex", "maxYIndex"],
		"m": ["shouldRebuild"],
		"st": []
	});
	w("flutter_TwoDimensionalChildListDelegate", {
		"s": ["addRepaintBoundaries", "addAutomaticKeepAlives"],
		"w": [],
		"o": [],
		"m": ["shouldRebuild"],
		"st": []
	});
	w("flutter_UndoHistoryController", {
		"s": [
			"onUndo",
			"onRedo",
			"value"
		],
		"w": ["value"],
		"o": [],
		"m": ["undo", "redo"],
		"st": []
	});
	w("flutter_WidgetStatesController", {
		"s": ["value"],
		"w": ["value"],
		"o": [],
		"m": ["update"],
		"st": []
	});
	w("flutter_Selectable", {
		"s": [
			"size",
			"boundingBoxes",
			"contentLength",
			"value"
		],
		"w": [],
		"o": [],
		"m": [
			"getTransformTo",
			"pushHandleLayers",
			"getSelectedContent",
			"getSelection",
			"dispatchSelectionEvent"
		],
		"st": []
	});
	w("flutter_ViewportOffset", {
		"s": [
			"pixels",
			"hasPixels",
			"userScrollDirection",
			"allowImplicitScrolling"
		],
		"w": [],
		"o": [],
		"m": [
			"applyViewportDimension",
			"applyContentDimensions",
			"correctBy",
			"jumpTo",
			"animateTo",
			"moveTo"
		],
		"st": []
	});
	w("flutter_HardwareKeyboard", {
		"s": [],
		"w": [],
		"o": [],
		"m": [
			"lookUpLayout",
			"isLogicalKeyPressed",
			"isPhysicalKeyPressed",
			"syncKeyboardState",
			"handleKeyEvent"
		],
		"st": []
	});
	w("flutter_PlatformViewController", {
		"s": [],
		"w": [],
		"o": [],
		"m": [
			"create",
			"clearFocus",
			"rejectGesture"
		],
		"st": []
	});
	w("flutter_Action", {
		"s": [],
		"w": [],
		"o": [],
		"m": [
			"isEnabled",
			"consumesKey",
			"toKeyEventResult"
		],
		"st": []
	});
	w("flutter_Animation", {
		"s": [
			"status",
			"value",
			"isDismissed",
			"isCompleted",
			"isAnimating",
			"isForwardOrCompleted"
		],
		"w": [],
		"o": [],
		"m": [],
		"st": []
	});
	w("flutter_MagnifierController", {
		"s": [],
		"w": ["animationController"],
		"o": [],
		"m": ["hide"],
		"st": []
	});
	w("flutter_MenuController", {
		"s": [],
		"w": [],
		"o": [],
		"m": [
			"open",
			"close",
			"closeChildren"
		],
		"st": []
	});
	w("flutter_Paint", {
		"s": [],
		"w": [
			"isAntiAlias",
			"blendMode",
			"style",
			"strokeWidth",
			"strokeCap",
			"strokeJoin",
			"strokeMiterLimit",
			"maskFilter",
			"filterQuality",
			"shader",
			"invertColors"
		],
		"o": [],
		"m": [],
		"st": []
	});
	w("flutter_Path", {
		"s": [],
		"w": ["fillType"],
		"o": [],
		"m": [
			"moveTo",
			"relativeMoveTo",
			"lineTo",
			"relativeLineTo",
			"quadraticBezierTo",
			"relativeQuadraticBezierTo",
			"cubicTo",
			"relativeCubicTo",
			"conicTo",
			"relativeConicTo",
			"arcTo",
			"arcToPoint",
			"relativeArcToPoint",
			"addRect",
			"addOval",
			"addArc",
			"addPolygon",
			"addRRect",
			"addRSuperellipse",
			"addPath",
			"extendWithPath",
			"close",
			"reset",
			"contains",
			"shift",
			"transform",
			"getBounds",
			"computeMetrics"
		],
		"st": []
	});
	w("flutter_Route", {
		"s": [],
		"w": [],
		"o": [],
		"m": ["onPopInvokedWithResult", "didPop"],
		"st": []
	});
	w("flutter_ScrollPosition", {
		"s": [
			"physics",
			"context",
			"keepScrollOffset",
			"minScrollExtent",
			"maxScrollExtent",
			"hasContentDimensions",
			"pixels",
			"hasPixels",
			"viewportDimension",
			"hasViewportDimension",
			"haveDimensions",
			"shouldIgnorePointer",
			"devicePixelRatio",
			"isScrollingNotifier",
			"allowImplicitScrolling",
			"userScrollDirection"
		],
		"w": [],
		"o": [],
		"m": [
			"setPixels",
			"correctPixels",
			"correctBy",
			"restoreOffset",
			"applyViewportDimension",
			"applyContentDimensions",
			"animateTo",
			"jumpTo",
			"pointerScroll",
			"moveTo",
			"beginActivity",
			"didStartScroll",
			"didUpdateScrollPositionBy",
			"didEndScroll",
			"didOverscrollBy",
			"didUpdateScrollDirection",
			"didUpdateScrollMetrics"
		],
		"st": []
	});
	w("flutter_ShortcutRegistryEntry", {
		"s": [],
		"w": [],
		"o": [],
		"m": ["replaceAll"],
		"st": []
	});
	w("flutter_TreeSliverNode", {
		"s": [],
		"w": [],
		"o": [],
		"m": [],
		"st": []
	});
	// fuse/cupertino_ui/CupertinoIcons.tsx
	var info$1 = "CupertinoIcons.info";
	var bluetooth = "CupertinoIcons.bluetooth";
	var person$1 = "CupertinoIcons.person";
	var heart$1 = "CupertinoIcons.heart";
	var wifi$1 = "CupertinoIcons.wifi";
	// fuse/cupertino_ui.tsx
	/**
	* Creates an iOS-style action sheet.
	* Dart: `CupertinoActionSheet`
	*/
	function CupertinoActionSheet(props) {
		const $title = v(() => props.title);
		const $message = v(() => props.message);
		const $actions = y(() => props.actions);
		const $cancelButton = v(() => props.cancelButton);
		var _el$ = at$1("cupertino_ui_CupertinoActionSheet");
		vt$1(_el$, [props, {
			get title() {
				return $title();
			},
			get message() {
				return $message();
			},
			get actions() {
				return $actions();
			},
			get cancelButton() {
				return $cancelButton();
			}
		}], false);
		return _el$;
	}
	/**
	* Creates an iOS-style alert dialog.
	* Dart: `CupertinoAlertDialog`
	*/
	function CupertinoAlertDialog(props) {
		const $title = v(() => props.title);
		const $content = v(() => props.content);
		const $actions = y(() => props.actions);
		var _el$9 = at$1("cupertino_ui_CupertinoAlertDialog");
		vt$1(_el$9, [props, {
			get title() {
				return $title();
			},
			get content() {
				return $content();
			},
			get actions() {
				return $actions();
			}
		}], false);
		return _el$9;
	}
	/**
	* Creates an iOS-style button.
	* Dart: `CupertinoButton`
	*/
	function CupertinoButton(props) {
		var _el$12 = at$1("cupertino_ui_CupertinoButton");
		vt$1(_el$12, props, false);
		return _el$12;
	}
	/**
	* Creates an iOS-style button with a tinted background.
	* Dart: `CupertinoButton.tinted`
	*/
	function CupertinoButtonTinted(props) {
		var _el$13 = at$1("cupertino_ui_CupertinoButtonTinted");
		vt$1(_el$13, props, false);
		return _el$13;
	}
	/**
	* Creates an iOS-style button with a filled background.
	* Dart: `CupertinoButton.filled`
	*/
	function CupertinoButtonFilled(props) {
		var _el$14 = at$1("cupertino_ui_CupertinoButtonFilled");
		vt$1(_el$14, props, false);
		return _el$14;
	}
	/**
	* Creates a section that mimics standard iOS forms.
	* Dart: `CupertinoListSection`
	*/
	function CupertinoListSection(props) {
		const $header = v(() => props.header);
		const $footer = v(() => props.footer);
		var _el$34 = at$1("cupertino_ui_CupertinoListSection");
		vt$1(_el$34, [props, {
			get header() {
				return $header();
			},
			get footer() {
				return $footer();
			}
		}], false);
		return _el$34;
	}
	/**
	* Creates a section that mimics standard "Inset Grouped" iOS list section.
	* Dart: `CupertinoListSection.insetGrouped`
	*/
	function CupertinoListSectionInsetGrouped(props) {
		const $header = v(() => props.header);
		const $footer = v(() => props.footer);
		var _el$35 = at$1("cupertino_ui_CupertinoListSectionInsetGrouped");
		vt$1(_el$35, [props, {
			get header() {
				return $header();
			},
			get footer() {
				return $footer();
			}
		}], false);
		return _el$35;
	}
	/**
	* Creates an edge-to-edge iOS-style list tile like the tiles in iOS Settings app.
	* Dart: `CupertinoListTile`
	*/
	function CupertinoListTile(props) {
		const $title = v(() => props.title);
		const $subtitle = v(() => props.subtitle);
		const $additionalInfo = v(() => props.additionalInfo);
		const $leading = v(() => props.leading);
		const $trailing = v(() => props.trailing);
		var _el$36 = at$1("cupertino_ui_CupertinoListTile");
		vt$1(_el$36, [props, {
			get title() {
				return $title();
			},
			get subtitle() {
				return $subtitle();
			},
			get additionalInfo() {
				return $additionalInfo();
			},
			get leading() {
				return $leading();
			},
			get trailing() {
				return $trailing();
			}
		}], false);
		return _el$36;
	}
	/**
	* Creates a static iOS style navigation bar, with a centered [middle] title.
	* Dart: `CupertinoNavigationBar`
	*/
	function CupertinoNavigationBar(props) {
		const $leading = v(() => props.leading);
		const $middle = v(() => props.middle);
		const $trailing = v(() => props.trailing);
		const $bottom = v(() => props.bottom);
		var _el$43 = at$1("cupertino_ui_CupertinoNavigationBar");
		vt$1(_el$43, [props, {
			get leading() {
				return $leading();
			},
			get middle() {
				return $middle();
			},
			get trailing() {
				return $trailing();
			},
			get bottom() {
				return $bottom();
			}
		}], false);
		return _el$43;
	}
	/**
	* Creates a static iOS style navigation bar, with a left aligned [largeTitle].
	* Dart: `CupertinoNavigationBar.large`
	*/
	function CupertinoNavigationBarLarge(props) {
		const $largeTitle = v(() => props.largeTitle);
		const $leading = v(() => props.leading);
		const $trailing = v(() => props.trailing);
		const $bottom = v(() => props.bottom);
		var _el$44 = at$1("cupertino_ui_CupertinoNavigationBarLarge");
		vt$1(_el$44, [props, {
			get largeTitle() {
				return $largeTitle();
			},
			get leading() {
				return $leading();
			},
			get trailing() {
				return $trailing();
			},
			get bottom() {
				return $bottom();
			}
		}], false);
		return _el$44;
	}
	/**
	* Creates a layout for pages with a navigation bar at the top.
	* Dart: `CupertinoPageScaffold`
	*/
	function CupertinoPageScaffold(props) {
		const $navigationBar = v(() => props.navigationBar);
		var _el$46 = at$1("cupertino_ui_CupertinoPageScaffold");
		vt$1(_el$46, [props, { get navigationBar() {
			return $navigationBar();
		} }], false);
		return _el$46;
	}
	w("cupertino_ui_CupertinoTabController", {
		"s": ["index"],
		"w": ["index"],
		"o": ["index"],
		"m": [],
		"st": []
	});
	w("cupertino_ui_RestorableCupertinoTabController", {
		"s": ["value", "enabled"],
		"w": [],
		"o": [],
		"m": [
			"createDefaultValue",
			"fromPrimitives",
			"toPrimitives",
			"initWithValue"
		],
		"st": []
	});
	// ../../packages/cupertino/src/slots.tsx
	function label$1(v) {
		return typeof v === "string" || typeof v === "number" ? (() => {
			var _el$ = at$1("text");
			Q$1(_el$, () => {
				return String(v);
			});
			return _el$;
		})() : v;
	}
	function icon$1(v, size) {
		return typeof v === "string" ? pt$1(kt, {
			icon: v,
			size
		}) : v;
	}
	// ../../packages/cupertino/src/scaffold.tsx
	/** An iOS screen: a navigation bar over the content. */
	function PageScaffold(props) {
		return pt$1(CupertinoPageScaffold, {
			get navigationBar() {
				return props.navigationBar;
			},
			get backgroundColor() {
				return props.backgroundColor;
			},
			get resizeToAvoidBottomInset() {
				return props.resizeToAvoidBottomInset;
			},
			get children() {
				return props.children;
			}
		});
	}
	function NavigationBar$2(props) {
		return pt$1(Oe, {
			get component() {
				return props.large ? CupertinoNavigationBarLarge : CupertinoNavigationBar;
			},
			get largeTitle() {
				return rt$1(() => {
					return !!props.large;
				})() ? label$1(props.title) : void 0;
			},
			get middle() {
				return rt$1(() => {
					return !!props.large;
				})() ? void 0 : label$1(props.title);
			},
			get leading() {
				return icon$1(props.leading);
			},
			get trailing() {
				return icon$1(props.trailing);
			},
			get previousPageTitle() {
				return props.previousPageTitle;
			},
			get backgroundColor() {
				return props.backgroundColor;
			}
		});
	}
	// ../../packages/cupertino/src/controls.tsx
	var _tpl$1$27 = /*@__PURE__*/ Be$1(["view", { "layout": {
		"direction": "horizontal",
		"gap": 6,
		"align": "center"
	} }], 1);
	var buttons = {
		plain: CupertinoButton,
		tinted: CupertinoButtonTinted,
		filled: CupertinoButtonFilled
	};
	/** iOS buttons, one component: pick the look with `variant`. */
	function Button$3(props) {
		return pt$1(Oe, {
			get component() {
				return buttons[props.variant ?? "plain"];
			},
			get sizeStyle() {
				return props.size ?? "large";
			},
			get onPressed() {
				return rt$1(() => {
					return !!props.disabled;
				})() ? null : props.onPress ?? null;
			},
			get onLongPress() {
				return rt$1(() => {
					return !!props.disabled;
				})() ? null : props.onLongPress ?? null;
			},
			get color() {
				return props.color;
			},
			get children() {
				return pt$1(Show, {
					get when() {
						return props.icon !== void 0;
					},
					get fallback() {
						return label$1(props.children);
					},
					get children() {
						return ((_at$1) => (() => {
							var _el$ = at$1("h$view", {
								$t: _at$1,
								$i: 0
							});
							Q$1(_el$, () => {
								return icon$1(props.icon);
							}, null);
							Q$1(_el$, () => {
								return label$1(props.children);
							}, null);
							return _el$;
						})())(Ve$1(_tpl$1$27));
					}
				});
			}
		});
	}
	function Switch$2(props) {
		var _el$2 = at$1("cupertino_ui_CupertinoSwitch");
		nt$1(() => {
			return {
				e: props.value,
				t: props.disabled ? null : props.onChange ?? null,
				a: props.color
			};
		}, ({ e, t, a }, _p$) => {
			e !== _p$?.e && lt$1(_el$2, "value", e, _p$?.e);
			t !== _p$?.t && lt$1(_el$2, "onChanged", t, _p$?.t);
			a !== _p$?.a && lt$1(_el$2, "activeTrackColor", a, _p$?.a);
		});
		return _el$2;
	}
	function Checkbox$2(props) {
		var _el$3 = at$1("cupertino_ui_CupertinoCheckbox");
		nt$1(() => {
			return {
				e: props.value,
				t: props.tristate ?? props.value === null,
				a: props.disabled ? null : props.onChange ?? null,
				o: props.color,
				i: props.semanticLabel
			};
		}, ({ e, t, a, o, i }, _p$) => {
			e !== _p$?.e && lt$1(_el$3, "value", e, _p$?.e);
			t !== _p$?.t && lt$1(_el$3, "tristate", t, _p$?.t);
			a !== _p$?.a && lt$1(_el$3, "onChanged", a, _p$?.a);
			o !== _p$?.o && lt$1(_el$3, "activeColor", o, _p$?.o);
			i !== _p$?.i && lt$1(_el$3, "semanticLabel", i, _p$?.i);
		});
		return _el$3;
	}
	/** A radio button. Put it in a core `<RadioGroup value onChange>`. */
	function Radio$1(props) {
		var _el$4 = at$1("cupertino_ui_CupertinoRadio");
		nt$1(() => {
			return {
				e: props.value,
				t: !props.disabled,
				a: props.toggleable,
				o: props.checkmark,
				i: props.color
			};
		}, ({ e, t, a, o, i }, _p$) => {
			e !== _p$?.e && lt$1(_el$4, "value", e, _p$?.e);
			t !== _p$?.t && lt$1(_el$4, "enabled", t, _p$?.t);
			a !== _p$?.a && lt$1(_el$4, "toggleable", a, _p$?.a);
			o !== _p$?.o && lt$1(_el$4, "useCheckmarkStyle", o, _p$?.o);
			i !== _p$?.i && lt$1(_el$4, "activeColor", i, _p$?.i);
		});
		return _el$4;
	}
	function Slider$2(props) {
		var _el$5 = at$1("cupertino_ui_CupertinoSlider");
		nt$1(() => {
			return {
				e: props.value,
				t: props.disabled ? null : props.onChange ?? null,
				a: props.onChangeEnd ?? null,
				o: props.min,
				i: props.max,
				n: props.steps ?? null,
				s: props.color
			};
		}, ({ e, t, a, o, i, n, s }, _p$) => {
			e !== _p$?.e && lt$1(_el$5, "value", e, _p$?.e);
			t !== _p$?.t && lt$1(_el$5, "onChanged", t, _p$?.t);
			a !== _p$?.a && lt$1(_el$5, "onChangeEnd", a, _p$?.a);
			o !== _p$?.o && lt$1(_el$5, "min", o, _p$?.o);
			i !== _p$?.i && lt$1(_el$5, "max", i, _p$?.i);
			n !== _p$?.n && lt$1(_el$5, "divisions", n, _p$?.n);
			s !== _p$?.s && lt$1(_el$5, "activeColor", s, _p$?.s);
		});
		return _el$5;
	}
	function ActivityIndicator(props) {
		var _el$6 = at$1("cupertino_ui_CupertinoActivityIndicator");
		nt$1(() => {
			return {
				e: props.animating,
				t: props.radius,
				a: props.color
			};
		}, ({ e, t, a }, _p$) => {
			e !== _p$?.e && lt$1(_el$6, "animating", e, _p$?.e);
			t !== _p$?.t && lt$1(_el$6, "radius", t, _p$?.t);
			a !== _p$?.a && lt$1(_el$6, "color", a, _p$?.a);
		});
		return _el$6;
	}
	/** iOS's sliding segmented control. */
	function SegmentedControl(props) {
		var _el$7 = at$1("cupertinoSegmentedControl");
		Q$1(_el$7, pt$1(For, {
			get each() {
				return props.options;
			},
			children: (o) => label$1(o.label)
		}));
		nt$1(() => {
			return {
				e: props.value,
				t: props.onChange,
				a: props.options.map((o) => o.value),
				o: props.options.filter((o) => o.disabled).map((o) => o.value),
				i: props.proportional,
				n: props.backgroundColor,
				s: props.thumbColor
			};
		}, ({ e, t, a, o, i, n, s }, _p$) => {
			e !== _p$?.e && lt$1(_el$7, "value", e, _p$?.e);
			t !== _p$?.t && lt$1(_el$7, "onChange", t, _p$?.t);
			a !== _p$?.a && lt$1(_el$7, "values", a, _p$?.a);
			o !== _p$?.o && lt$1(_el$7, "disabledValues", o, _p$?.o);
			i !== _p$?.i && lt$1(_el$7, "proportionalWidth", i, _p$?.i);
			n !== _p$?.n && lt$1(_el$7, "backgroundColor", n, _p$?.n);
			s !== _p$?.s && lt$1(_el$7, "thumbColor", s, _p$?.s);
		});
		return _el$7;
	}
	// ../../packages/cupertino/src/list.tsx
	function ListSection(props) {
		return pt$1(Oe, {
			get component() {
				return props.insetGrouped ?? true ? CupertinoListSectionInsetGrouped : CupertinoListSection;
			},
			get header() {
				return label$1(props.header);
			},
			get footer() {
				return label$1(props.footer);
			},
			get backgroundColor() {
				return props.backgroundColor;
			},
			get children() {
				return props.children;
			}
		});
	}
	function ListTile$2(props) {
		return pt$1(CupertinoListTile, {
			get title() {
				return label$1(props.title);
			},
			get subtitle() {
				return label$1(props.subtitle);
			},
			get additionalInfo() {
				return label$1(props.additionalInfo);
			},
			get leading() {
				return icon$1(props.leading);
			},
			get trailing() {
				return rt$1(() => {
					return props.trailing !== void 0;
				})() ? icon$1(props.trailing) : rt$1(() => {
					return !!props.onPress;
				})() ? at$1("cupertino_ui_CupertinoListTileChevron") : void 0;
			},
			get onTap() {
				return props.onPress;
			},
			get backgroundColor() {
				return props.backgroundColor;
			}
		});
	}
	// ../../packages/cupertino/src/text-field.tsx
	/** iOS text field. Controlled with `value` + `onChange`. */
	function TextField$2(props) {
		var _el$ = at$1("cupertinoTextField");
		vt$1(_el$, [props, {
			get prefix() {
				return icon$1(props.prefix);
			},
			get suffix() {
				return icon$1(props.suffix);
			}
		}], false);
		return _el$;
	}
	// ../../packages/cupertino/src/overlays.tsx
	/** iOS alert, open while `open` is true. */
	function Dialog$2(props) {
		return pt$1(It, {
			type: "cupertinoDialog",
			get open() {
				return props.open;
			},
			get onOpenChange() {
				return props.onOpenChange;
			},
			get dismissible() {
				return props.dismissible;
			},
			get children() {
				return pt$1(CupertinoAlertDialog, {
					get title() {
						return label$1(props.title);
					},
					get content() {
						return label$1(props.children);
					},
					get actions() {
						return props.actions;
					}
				});
			}
		});
	}
	function DialogAction(props) {
		var _el$ = at$1("cupertino_ui_CupertinoDialogAction");
		Q$1(_el$, () => {
			return label$1(props.children);
		});
		nt$1(() => {
			return {
				e: props.onPress ?? null,
				t: props.default,
				a: props.destructive
			};
		}, ({ e, t, a }, _p$) => {
			e !== _p$?.e && lt$1(_el$, "onPressed", e, _p$?.e);
			t !== _p$?.t && lt$1(_el$, "isDefaultAction", t, _p$?.t);
			a !== _p$?.a && lt$1(_el$, "isDestructiveAction", a, _p$?.a);
		});
		return _el$;
	}
	/** iOS action sheet, sliding up while `open` is true. */
	function ActionSheet(props) {
		return pt$1(It, {
			type: "cupertinoActionSheet",
			get open() {
				return props.open;
			},
			get onOpenChange() {
				return props.onOpenChange;
			},
			get children() {
				return pt$1(CupertinoActionSheet, {
					get title() {
						return label$1(props.title);
					},
					get message() {
						return label$1(props.message);
					},
					get actions() {
						return props.children;
					},
					get cancelButton() {
						return props.cancel;
					}
				});
			}
		});
	}
	function ActionSheetAction(props) {
		var _el$2 = at$1("cupertino_ui_CupertinoActionSheetAction");
		Q$1(_el$2, () => {
			return label$1(props.children);
		});
		nt$1(() => {
			return {
				e: props.onPress,
				t: props.default,
				a: props.destructive
			};
		}, ({ e, t, a }, _p$) => {
			e !== _p$?.e && lt$1(_el$2, "onPressed", e, _p$?.e);
			t !== _p$?.t && lt$1(_el$2, "isDefaultAction", t, _p$?.t);
			a !== _p$?.a && lt$1(_el$2, "isDestructiveAction", a, _p$?.a);
		});
		return _el$2;
	}
	// fuse/material_ui/Icons.tsx
	var add = "Icons.add";
	var arrow_back = "Icons.arrow_back";
	var delete_ = "Icons.delete";
	var email = "Icons.email";
	var favorite = "Icons.favorite";
	var favorite_border = "Icons.favorite_border";
	var home = "Icons.home";
	var home_outlined = "Icons.home_outlined";
	var info = "Icons.info";
	var lock = "Icons.lock";
	var notifications = "Icons.notifications";
	var person = "Icons.person";
	var person_outline = "Icons.person_outline";
	var search = "Icons.search";
	var send = "Icons.send";
	var settings = "Icons.settings";
	var star = "Icons.star";
	var wifi = "Icons.wifi";
	// fuse/material_ui/ThemeData.tsx
	function $ThemeData$from(...a) {
		return m("ThemeData.from", [], a);
	}
	function $ThemeData$light(...a) {
		return m("ThemeData.light", [], a);
	}
	function $ThemeData$dark(...a) {
		return m("ThemeData.dark", [], a);
	}
	function $ThemeData$fallback(...a) {
		return m("ThemeData.fallback", [], a);
	}
	function $ThemeData$call(...a) {
		return m("ThemeData", [], a);
	}
	var ThemeData = /* @__PURE__ */ Object.assign($ThemeData$call, {
		from: $ThemeData$from,
		light: $ThemeData$light,
		dark: $ThemeData$dark,
		fallback: $ThemeData$fallback
	});
	// fuse/material_ui.tsx
	/**
	* Create a chip that acts like a button.
	* Dart: `ActionChip`
	*/
	function ActionChip(props) {
		const $avatar = v(() => props.avatar);
		const $label = v(() => props.label);
		var _el$4 = at$1("material_ui_ActionChip");
		vt$1(_el$4, [props, {
			get avatar() {
				return $avatar();
			},
			get label() {
				return $label();
			}
		}], false);
		return _el$4;
	}
	/**
	* Creates an alert dialog.
	* Dart: `AlertDialog`
	*/
	function AlertDialog(props) {
		const $icon = v(() => props.icon);
		const $title = v(() => props.title);
		const $content = v(() => props.content);
		const $actions = y(() => props.actions);
		var _el$11 = at$1("material_ui_AlertDialog");
		vt$1(_el$11, [props, {
			get icon() {
				return $icon();
			},
			get title() {
				return $title();
			},
			get content() {
				return $content();
			},
			get actions() {
				return $actions();
			}
		}], false);
		return _el$11;
	}
	/**
	* Creates a Material Design app bar.
	* Dart: `AppBar`
	*/
	function AppBar$1(props) {
		const $leading = v(() => props.leading);
		const $title = v(() => props.title);
		const $actions = y(() => props.actions);
		const $flexibleSpace = v(() => props.flexibleSpace);
		const $bottom = v(() => props.bottom);
		var _el$15 = at$1("material_ui_AppBar");
		vt$1(_el$15, [props, {
			get leading() {
				return $leading();
			},
			get title() {
				return $title();
			},
			get actions() {
				return $actions();
			},
			get flexibleSpace() {
				return $flexibleSpace();
			},
			get bottom() {
				return $bottom();
			}
		}], false);
		return _el$15;
	}
	/**
	* Create a Badge that stacks [label] on top of [child].
	* Dart: `Badge`
	*/
	function Badge$1(props) {
		const $label = v(() => props.label);
		var _el$20 = at$1("material_ui_Badge");
		vt$1(_el$20, [props, { get label() {
			return $label();
		} }], false);
		return _el$20;
	}
	/**
	* Creates an elevated variant of Card.
	* Dart: `Card`
	*/
	function Card$1(props) {
		var _el$33 = at$1("material_ui_Card");
		vt$1(_el$33, props, false);
		return _el$33;
	}
	/**
	* Create a filled variant of Card.
	* Dart: `Card.filled`
	*/
	function CardFilled(props) {
		var _el$34 = at$1("material_ui_CardFilled");
		vt$1(_el$34, props, false);
		return _el$34;
	}
	/**
	* Create an outlined variant of Card.
	* Dart: `Card.outlined`
	*/
	function CardOutlined(props) {
		var _el$35 = at$1("material_ui_CardOutlined");
		vt$1(_el$35, props, false);
		return _el$35;
	}
	/**
	* Creates a Material Design chip.
	* Dart: `Chip`
	*/
	function Chip$1(props) {
		const $avatar = v(() => props.avatar);
		const $label = v(() => props.label);
		const $deleteIcon = v(() => props.deleteIcon);
		var _el$49 = at$1("material_ui_Chip");
		vt$1(_el$49, [props, {
			get avatar() {
				return $avatar();
			},
			get label() {
				return $label();
			},
			get deleteIcon() {
				return $deleteIcon();
			}
		}], false);
		return _el$49;
	}
	/**
	* Creates a circular progress indicator.
	* Dart: `CircularProgressIndicator`
	*/
	function CircularProgressIndicator(props) {
		var _el$54 = at$1("material_ui_CircularProgressIndicator");
		vt$1(_el$54, props, false);
		return _el$54;
	}
	/**
	* Creates a Material Design divider.
	* Dart: `Divider`
	*/
	function Divider$1(props) {
		var _el$70 = at$1("material_ui_Divider");
		vt$1(_el$70, props, false);
		return _el$70;
	}
	/**
	* Create an ElevatedButton.
	* Dart: `ElevatedButton`
	*/
	function ElevatedButton(props) {
		var _el$85 = at$1("material_ui_ElevatedButton");
		vt$1(_el$85, props, false);
		return _el$85;
	}
	/**
	* Create an elevated button from a pair of widgets that serve as the button's [icon] and [label].
	* Dart: `ElevatedButton.icon`
	*/
	function ElevatedButtonIcon(props) {
		const $icon = v(() => props.icon);
		const $label = v(() => props.label);
		var _el$86 = at$1("material_ui_ElevatedButtonIcon");
		vt$1(_el$86, [props, {
			get icon() {
				return $icon();
			},
			get label() {
				return $label();
			}
		}], false);
		return _el$86;
	}
	/**
	* Create a FilledButton.
	* Dart: `FilledButton`
	*/
	function FilledButton(props) {
		var _el$95 = at$1("material_ui_FilledButton");
		vt$1(_el$95, props, false);
		return _el$95;
	}
	/**
	* Create a filled button from [icon] and [label].
	* Dart: `FilledButton.icon`
	*/
	function FilledButtonIcon(props) {
		const $icon = v(() => props.icon);
		const $label = v(() => props.label);
		var _el$96 = at$1("material_ui_FilledButtonIcon");
		vt$1(_el$96, [props, {
			get icon() {
				return $icon();
			},
			get label() {
				return $label();
			}
		}], false);
		return _el$96;
	}
	/**
	* Create a tonal variant of FilledButton.
	* Dart: `FilledButton.tonal`
	*/
	function FilledButtonTonal(props) {
		var _el$97 = at$1("material_ui_FilledButtonTonal");
		vt$1(_el$97, props, false);
		return _el$97;
	}
	/**
	* Create a filled tonal button from [icon] and [label].
	* Dart: `FilledButton.tonalIcon`
	*/
	function FilledButtonTonalIcon(props) {
		const $icon = v(() => props.icon);
		const $label = v(() => props.label);
		var _el$98 = at$1("material_ui_FilledButtonTonalIcon");
		vt$1(_el$98, [props, {
			get icon() {
				return $icon();
			},
			get label() {
				return $label();
			}
		}], false);
		return _el$98;
	}
	/**
	* Create a chip that acts like a checkbox.
	* Dart: `FilterChip`
	*/
	function FilterChip(props) {
		const $avatar = v(() => props.avatar);
		const $label = v(() => props.label);
		const $deleteIcon = v(() => props.deleteIcon);
		var _el$100 = at$1("material_ui_FilterChip");
		vt$1(_el$100, [props, {
			get avatar() {
				return $avatar();
			},
			get label() {
				return $label();
			},
			get deleteIcon() {
				return $deleteIcon();
			}
		}], false);
		return _el$100;
	}
	/**
	* Creates a circular floating action button.
	* Dart: `FloatingActionButton`
	*/
	function FloatingActionButton$1(props) {
		var _el$104 = at$1("material_ui_FloatingActionButton");
		vt$1(_el$104, props, false);
		return _el$104;
	}
	/**
	* Creates a small circular floating action button.
	* Dart: `FloatingActionButton.small`
	*/
	function FloatingActionButtonSmall(props) {
		var _el$105 = at$1("material_ui_FloatingActionButtonSmall");
		vt$1(_el$105, props, false);
		return _el$105;
	}
	/**
	* Creates a large circular floating action button.
	* Dart: `FloatingActionButton.large`
	*/
	function FloatingActionButtonLarge(props) {
		var _el$106 = at$1("material_ui_FloatingActionButtonLarge");
		vt$1(_el$106, props, false);
		return _el$106;
	}
	/**
	* Creates a wider [StadiumBorder]-shaped floating action button with an optional [icon] and a [label].
	* Dart: `FloatingActionButton.extended`
	*/
	function FloatingActionButtonExtended(props) {
		const $icon = v(() => props.icon);
		const $label = v(() => props.label);
		var _el$107 = at$1("material_ui_FloatingActionButtonExtended");
		vt$1(_el$107, [props, {
			get icon() {
				return $icon();
			},
			get label() {
				return $label();
			}
		}], false);
		return _el$107;
	}
	/**
	* Creates an icon button.
	* Dart: `IconButton`
	*/
	function IconButton$1(props) {
		const $selectedIcon = v(() => props.selectedIcon);
		const $icon = v(() => props.icon);
		var _el$111 = at$1("material_ui_IconButton");
		vt$1(_el$111, [props, {
			get selectedIcon() {
				return $selectedIcon();
			},
			get icon() {
				return $icon();
			}
		}], false);
		return _el$111;
	}
	/**
	* Create a filled variant of IconButton.
	* Dart: `IconButton.filled`
	*/
	function IconButtonFilled(props) {
		const $selectedIcon = v(() => props.selectedIcon);
		const $icon = v(() => props.icon);
		var _el$112 = at$1("material_ui_IconButtonFilled");
		vt$1(_el$112, [props, {
			get selectedIcon() {
				return $selectedIcon();
			},
			get icon() {
				return $icon();
			}
		}], false);
		return _el$112;
	}
	/**
	* Create a filled tonal variant of IconButton.
	* Dart: `IconButton.filledTonal`
	*/
	function IconButtonFilledTonal(props) {
		const $selectedIcon = v(() => props.selectedIcon);
		const $icon = v(() => props.icon);
		var _el$113 = at$1("material_ui_IconButtonFilledTonal");
		vt$1(_el$113, [props, {
			get selectedIcon() {
				return $selectedIcon();
			},
			get icon() {
				return $icon();
			}
		}], false);
		return _el$113;
	}
	/**
	* Create an outlined variant of IconButton.
	* Dart: `IconButton.outlined`
	*/
	function IconButtonOutlined(props) {
		const $selectedIcon = v(() => props.selectedIcon);
		const $icon = v(() => props.icon);
		var _el$114 = at$1("material_ui_IconButtonOutlined");
		vt$1(_el$114, [props, {
			get selectedIcon() {
				return $selectedIcon();
			},
			get icon() {
				return $icon();
			}
		}], false);
		return _el$114;
	}
	/**
	* Creates a linear progress indicator.
	* Dart: `LinearProgressIndicator`
	*/
	function LinearProgressIndicator(props) {
		var _el$125 = at$1("material_ui_LinearProgressIndicator");
		vt$1(_el$125, props, false);
		return _el$125;
	}
	/**
	* Creates a list tile.
	* Dart: `ListTile`
	*/
	function ListTile$1(props) {
		const $leading = v(() => props.leading);
		const $title = v(() => props.title);
		const $subtitle = v(() => props.subtitle);
		const $trailing = v(() => props.trailing);
		var _el$126 = at$1("material_ui_ListTile");
		vt$1(_el$126, [props, {
			get leading() {
				return $leading();
			},
			get title() {
				return $title();
			},
			get subtitle() {
				return $subtitle();
			},
			get trailing() {
				return $trailing();
			}
		}], false);
		return _el$126;
	}
	/**
	* Creates a MaterialApp.
	* Dart: `MaterialApp`
	*/
	function MaterialApp$1(props) {
		const $home = v(() => props.home);
		var _el$130 = at$1("material_ui_MaterialApp");
		vt$1(_el$130, [props, { get home() {
			return $home();
		} }], false);
		return _el$130;
	}
	/**
	* Creates a Material 3 Navigation Bar component.
	* Dart: `NavigationBar`
	*/
	function NavigationBar$1(props) {
		const $destinations = y(() => props.destinations);
		var _el$145 = at$1("material_ui_NavigationBar");
		vt$1(_el$145, [props, { get destinations() {
			return $destinations();
		} }], false);
		return _el$145;
	}
	/**
	* Creates a navigation bar destination with an icon and a label, to be used in the [NavigationBar.destinations].
	* Dart: `NavigationDestination`
	*/
	function NavigationDestination$1(props) {
		const $icon = v(() => props.icon);
		const $selectedIcon = v(() => props.selectedIcon);
		var _el$147 = at$1("material_ui_NavigationDestination");
		vt$1(_el$147, [props, {
			get icon() {
				return $icon();
			},
			get selectedIcon() {
				return $selectedIcon();
			}
		}], false);
		return _el$147;
	}
	/**
	* Create an OutlinedButton.
	* Dart: `OutlinedButton`
	*/
	function OutlinedButton(props) {
		var _el$154 = at$1("material_ui_OutlinedButton");
		vt$1(_el$154, props, false);
		return _el$154;
	}
	/**
	* Create an outlined button from a pair of widgets that serve as the button's [icon] and [label].
	* Dart: `OutlinedButton.icon`
	*/
	function OutlinedButtonIcon(props) {
		const $icon = v(() => props.icon);
		const $label = v(() => props.label);
		var _el$155 = at$1("material_ui_OutlinedButtonIcon");
		vt$1(_el$155, [props, {
			get icon() {
				return $icon();
			},
			get label() {
				return $label();
			}
		}], false);
		return _el$155;
	}
	/**
	* Creates a visual scaffold for Material Design widgets.
	* Dart: `Scaffold`
	*/
	function Scaffold$1(props) {
		const $appBar = v(() => props.appBar);
		const $body = v(() => props.body);
		const $floatingActionButton = v(() => props.floatingActionButton);
		const $persistentFooterButtons = y(() => props.persistentFooterButtons);
		const $drawer = v(() => props.drawer);
		const $endDrawer = v(() => props.endDrawer);
		const $bottomNavigationBar = v(() => props.bottomNavigationBar);
		const $bottomSheet = v(() => props.bottomSheet);
		var _el$177 = at$1("material_ui_Scaffold");
		vt$1(_el$177, [props, {
			get appBar() {
				return $appBar();
			},
			get body() {
				return $body();
			},
			get floatingActionButton() {
				return $floatingActionButton();
			},
			get persistentFooterButtons() {
				return $persistentFooterButtons();
			},
			get drawer() {
				return $drawer();
			},
			get endDrawer() {
				return $endDrawer();
			},
			get bottomNavigationBar() {
				return $bottomNavigationBar();
			},
			get bottomSheet() {
				return $bottomSheet();
			}
		}], false);
		return _el$177;
	}
	/**
	* Create a [TextButton].
	* Dart: `TextButton`
	*/
	function TextButton(props) {
		var _el$218 = at$1("material_ui_TextButton");
		vt$1(_el$218, props, false);
		return _el$218;
	}
	/**
	* Create a text button from a pair of widgets that serve as the button's [icon] and [label].
	* Dart: `TextButton.icon`
	*/
	function TextButtonIcon(props) {
		const $icon = v(() => props.icon);
		const $label = v(() => props.label);
		var _el$219 = at$1("material_ui_TextButtonIcon");
		vt$1(_el$219, [props, {
			get icon() {
				return $icon();
			},
			get label() {
				return $label();
			}
		}], false);
		return _el$219;
	}
	/**
	* Creates a Material Design vertical divider.
	* Dart: `VerticalDivider`
	*/
	function VerticalDivider(props) {
		var _el$236 = at$1("material_ui_VerticalDivider");
		vt$1(_el$236, props, false);
		return _el$236;
	}
	w("material_ui_CarouselController", {
		"s": [
			"initialItem",
			"leadingItem",
			"initialScrollOffset",
			"keepScrollOffset",
			"positions",
			"hasClients",
			"position",
			"offset"
		],
		"w": [],
		"o": [],
		"m": [
			"animateToItem",
			"createScrollPosition",
			"attach",
			"animateTo",
			"jumpTo",
			"detach"
		],
		"st": []
	});
	w("material_ui_RestorableTimeOfDay", {
		"s": ["value", "enabled"],
		"w": ["value"],
		"o": [],
		"m": [
			"createDefaultValue",
			"didUpdateValue",
			"fromPrimitives",
			"toPrimitives",
			"initWithValue"
		],
		"st": []
	});
	w("material_ui_SearchController", {
		"s": [
			"isAttached",
			"isOpen",
			"text",
			"selection",
			"value"
		],
		"w": [
			"text",
			"value",
			"selection"
		],
		"o": ["text"],
		"m": [
			"openView",
			"closeView",
			"clear",
			"clearComposing"
		],
		"st": []
	});
	w("material_ui_TabBarScrollController", {
		"s": [
			"initialScrollOffset",
			"keepScrollOffset",
			"positions",
			"hasClients",
			"position",
			"offset"
		],
		"w": [],
		"o": [],
		"m": [
			"createScrollPosition",
			"animateTo",
			"jumpTo",
			"attach",
			"detach"
		],
		"st": []
	});
	w("material_ui_TabController", {
		"s": [
			"animation",
			"animationDuration",
			"length",
			"index",
			"previousIndex",
			"indexIsChanging",
			"offset"
		],
		"w": ["index", "offset"],
		"o": ["index", "offset"],
		"m": ["animateTo"],
		"st": []
	});
	// ../../packages/material/src/page.ts
	/** A Material page: the platform's Material transition, on a Material surface. */
	function materialPage({ child, ...props }) {
		return {
			type: "materialPage",
			child,
			props
		};
	}
	// ../../packages/material/src/app.tsx
	function themeOf(t, brightness, platform) {
		if (t == null) {
			if (platform == null) return brightness === "dark" ? ThemeData.dark() : void 0;
			return ThemeData({
				brightness,
				platform
			});
		}
		if (!("$" in t)) {
			const brief = t;
			return ThemeData({
				colorSchemeSeed: brief.seedColor ?? "#6750a4",
				brightness: brief.brightness ?? brightness,
				fontFamily: brief.fontFamily,
				contrastLevel: brief.contrast,
				platform
			});
		}
		return platform == null ? t : withPlatform(t, platform);
	}
	/**
	* The platform has to go into the constructor: ThemeData derives its
	* typography from it, which a later `copyWith` wouldn't redo.
	*/
	function withPlatform(t, platform) {
		const v = t;
		switch (v.$) {
			case "ThemeData": return {
				...v,
				platform
			};
			case "ThemeData.light":
			case "ThemeData.fallback": return ThemeData({
				brightness: "light",
				useMaterial3: v.useMaterial3,
				platform
			});
			case "ThemeData.dark": return ThemeData({
				brightness: "dark",
				useMaterial3: v.useMaterial3,
				platform
			});
			case "ThemeData.from": return ThemeData({
				colorScheme: v.colorScheme,
				textTheme: v.textTheme,
				useMaterial3: v.useMaterial3,
				platform
			});
			default: return t;
		}
	}
	/**
	* The root of a Material app: themes, a root navigator, and pages that
	* are `materialPage()`s.
	*/
	function MaterialApp(props) {
		return pt$1(St, {
			value: (child) => materialPage({ child }),
			get children() {
				return pt$1(MaterialApp$1, {
					get title() {
						return props.title ?? "";
					},
					get theme() {
						return themeOf(props.theme, "light", props.platform);
					},
					get darkTheme() {
						return rt$1(() => {
							return props.darkTheme !== void 0;
						})() ? themeOf(props.darkTheme, "dark", props.platform) : rt$1(() => {
							return !!(props.theme && !("$" in props.theme));
						})() ? themeOf({
							...props.theme,
							brightness: "dark"
						}, "dark", props.platform) : void 0;
					},
					get themeMode() {
						return props.themeMode ?? "system";
					},
					get color() {
						return props.color;
					},
					get debugShowCheckedModeBanner() {
						return props.debugShowCheckedModeBanner ?? false;
					},
					initialRoute: "/",
					get home() {
						return props.children;
					}
				});
			}
		});
	}
	// ../../packages/material/src/slots.tsx
	function label(v) {
		return typeof v === "string" || typeof v === "number" ? (() => {
			var _el$ = at$1("text");
			Q$1(_el$, () => {
				return String(v);
			});
			return _el$;
		})() : v;
	}
	function icon(v, size) {
		return typeof v === "string" ? pt$1(kt, {
			icon: v,
			size
		}) : v;
	}
	// ../../packages/material/src/scaffold.tsx
	/** A Material screen: app bar, body (the children), and the bars around them. */
	function Scaffold(props) {
		return pt$1(Scaffold$1, {
			get appBar() {
				return props.appBar;
			},
			get floatingActionButton() {
				return props.floatingActionButton;
			},
			get bottomNavigationBar() {
				return props.bottomNavigationBar;
			},
			get drawer() {
				return props.drawer;
			},
			get endDrawer() {
				return props.endDrawer;
			},
			get backgroundColor() {
				return props.backgroundColor;
			},
			get extendBodyBehindAppBar() {
				return props.extendBodyBehindAppBar;
			},
			get resizeToAvoidBottomInset() {
				return props.resizeToAvoidBottomInset;
			},
			get body() {
				return props.children;
			}
		});
	}
	function AppBar(props) {
		return pt$1(AppBar$1, {
			get title() {
				return label(props.title);
			},
			get leading() {
				return icon(props.leading);
			},
			get actions() {
				return props.actions;
			},
			get centerTitle() {
				return props.centerTitle;
			},
			get backgroundColor() {
				return props.backgroundColor;
			},
			get foregroundColor() {
				return props.foregroundColor;
			},
			get elevation() {
				return props.elevation;
			},
			get bottom() {
				return props.bottom;
			}
		});
	}
	// ../../packages/material/src/buttons.tsx
	var plain = {
		filled: FilledButton,
		tonal: FilledButtonTonal,
		outlined: OutlinedButton,
		text: TextButton,
		elevated: ElevatedButton
	};
	var withIcon = {
		filled: FilledButtonIcon,
		tonal: FilledButtonTonalIcon,
		outlined: OutlinedButtonIcon,
		text: TextButtonIcon,
		elevated: ElevatedButtonIcon
	};
	/** Material's buttons, one component: pick the look with `variant`. */
	function Button$2(props) {
		const onPressed = () => props.disabled ? null : props.onPress ?? null;
		const onLongPress = () => props.disabled ? null : props.onLongPress ?? null;
		return rt$1(() => {
			return rt$1(() => {
				return props.icon !== void 0;
			})() ? pt$1(Oe, {
				get component() {
					return withIcon[props.variant ?? "filled"];
				},
				get onPressed() {
					return onPressed();
				},
				get onLongPress() {
					return onLongPress();
				},
				get autofocus() {
					return props.autofocus;
				},
				get icon() {
					return icon(props.icon);
				},
				get label() {
					return label(props.children) ?? [];
				}
			}) : pt$1(Oe, {
				get component() {
					return plain[props.variant ?? "filled"];
				},
				get onPressed() {
					return onPressed();
				},
				get onLongPress() {
					return onLongPress();
				},
				get autofocus() {
					return props.autofocus;
				},
				get children() {
					return label(props.children);
				}
			});
		});
	}
	var iconButtons = {
		standard: IconButton$1,
		filled: IconButtonFilled,
		tonal: IconButtonFilledTonal,
		outlined: IconButtonOutlined
	};
	function IconButton(props) {
		return pt$1(Oe, {
			get component() {
				return iconButtons[props.variant ?? "standard"];
			},
			get icon() {
				return icon(props.icon);
			},
			get selectedIcon() {
				return icon(props.selectedIcon);
			},
			get isSelected() {
				return props.selected;
			},
			get onPressed() {
				return rt$1(() => {
					return !!props.disabled;
				})() ? null : props.onPress ?? null;
			},
			get onLongPress() {
				return rt$1(() => {
					return !!props.disabled;
				})() ? null : props.onLongPress ?? null;
			},
			get tooltip() {
				return props.tooltip;
			},
			get color() {
				return props.color;
			},
			get iconSize() {
				return props.size;
			}
		});
	}
	var fabs = {
		small: FloatingActionButtonSmall,
		regular: FloatingActionButton$1,
		large: FloatingActionButtonLarge
	};
	function FloatingActionButton(props) {
		return rt$1(() => {
			return rt$1(() => {
				return props.label !== void 0;
			})() ? pt$1(FloatingActionButtonExtended, {
				get onPressed() {
					return props.onPress ?? null;
				},
				get tooltip() {
					return props.tooltip;
				},
				get backgroundColor() {
					return props.backgroundColor;
				},
				get foregroundColor() {
					return props.foregroundColor;
				},
				get icon() {
					return icon(props.icon);
				},
				get label() {
					return label(props.label);
				}
			}) : pt$1(Oe, {
				get component() {
					return fabs[props.size ?? "regular"];
				},
				get onPressed() {
					return props.onPress ?? null;
				},
				get tooltip() {
					return props.tooltip;
				},
				get backgroundColor() {
					return props.backgroundColor;
				},
				get foregroundColor() {
					return props.foregroundColor;
				},
				get children() {
					return icon(props.icon);
				}
			});
		});
	}
	// ../../packages/material/src/controls.tsx
	function Switch$1(props) {
		var _el$ = at$1("material_ui_Switch");
		nt$1(() => {
			return {
				e: props.value,
				t: props.disabled ? null : props.onChange ?? null,
				a: props.color
			};
		}, ({ e, t, a }, _p$) => {
			e !== _p$?.e && lt$1(_el$, "value", e, _p$?.e);
			t !== _p$?.t && lt$1(_el$, "onChanged", t, _p$?.t);
			a !== _p$?.a && lt$1(_el$, "activeTrackColor", a, _p$?.a);
		});
		return _el$;
	}
	function Checkbox$1(props) {
		var _el$2 = at$1("material_ui_Checkbox");
		nt$1(() => {
			return {
				e: props.value,
				t: props.tristate ?? props.value === null,
				a: props.disabled ? null : props.onChange ?? null,
				o: props.error,
				i: props.color,
				n: props.semanticLabel
			};
		}, ({ e, t, a, o, i, n }, _p$) => {
			e !== _p$?.e && lt$1(_el$2, "value", e, _p$?.e);
			t !== _p$?.t && lt$1(_el$2, "tristate", t, _p$?.t);
			a !== _p$?.a && lt$1(_el$2, "onChanged", a, _p$?.a);
			o !== _p$?.o && lt$1(_el$2, "isError", o, _p$?.o);
			i !== _p$?.i && lt$1(_el$2, "activeColor", i, _p$?.i);
			n !== _p$?.n && lt$1(_el$2, "semanticLabel", n, _p$?.n);
		});
		return _el$2;
	}
	/** A radio button. Put it in a core `<RadioGroup value onChange>`. */
	function Radio(props) {
		var _el$3 = at$1("material_ui_Radio");
		nt$1(() => {
			return {
				e: props.value,
				t: !props.disabled,
				a: props.toggleable,
				o: props.color
			};
		}, ({ e, t, a, o }, _p$) => {
			e !== _p$?.e && lt$1(_el$3, "value", e, _p$?.e);
			t !== _p$?.t && lt$1(_el$3, "enabled", t, _p$?.t);
			a !== _p$?.a && lt$1(_el$3, "toggleable", a, _p$?.a);
			o !== _p$?.o && lt$1(_el$3, "activeColor", o, _p$?.o);
		});
		return _el$3;
	}
	function Slider$1(props) {
		var _el$4 = at$1("material_ui_Slider");
		nt$1(() => {
			return {
				e: props.value,
				t: props.disabled ? null : props.onChange ?? null,
				a: props.onChangeEnd ?? null,
				o: props.min,
				i: props.max,
				n: props.steps ?? null,
				s: props.label ?? null,
				h: props.color
			};
		}, ({ e, t, a, o, i, n, s, h }, _p$) => {
			e !== _p$?.e && lt$1(_el$4, "value", e, _p$?.e);
			t !== _p$?.t && lt$1(_el$4, "onChanged", t, _p$?.t);
			a !== _p$?.a && lt$1(_el$4, "onChangeEnd", a, _p$?.a);
			o !== _p$?.o && lt$1(_el$4, "min", o, _p$?.o);
			i !== _p$?.i && lt$1(_el$4, "max", i, _p$?.i);
			n !== _p$?.n && lt$1(_el$4, "divisions", n, _p$?.n);
			s !== _p$?.s && lt$1(_el$4, "label", s, _p$?.s);
			h !== _p$?.h && lt$1(_el$4, "activeColor", h, _p$?.h);
		});
		return _el$4;
	}
	// ../../packages/material/src/text-field.tsx
	/** Material's text field. Controlled with `value` + `onChange`. */
	function TextField$1(props) {
		var _el$ = at$1("materialTextField");
		vt$1(_el$, [props, {
			get prefixIcon() {
				return icon(props.prefixIcon);
			},
			get suffixIcon() {
				return icon(props.suffixIcon);
			}
		}], false);
		return _el$;
	}
	// ../../packages/material/src/content.tsx
	var cards = {
		elevated: Card$1,
		filled: CardFilled,
		outlined: CardOutlined
	};
	function Card(props) {
		const body = () => (() => {
			var _el$ = at$1("view");
			Q$1(_el$, () => {
				return props.children;
			});
			nt$1(() => props.padding, (_v$, _$p) => {
				lt$1(_el$, "padding", _v$, _$p);
			});
			return _el$;
		})();
		return pt$1(Oe, {
			get component() {
				return cards[props.variant ?? "elevated"];
			},
			get margin() {
				return props.margin;
			},
			get color() {
				return props.color;
			},
			get elevation() {
				return props.elevation;
			},
			clipBehavior: "antiAlias",
			get children() {
				return rt$1(() => {
					return rt$1(() => {
						return !!props.onPress;
					})() ? (() => {
						var _el$2 = at$1("material_ui_InkWell");
						Q$1(_el$2, body);
						nt$1(() => props.onPress, (_v$, _$p) => {
							lt$1(_el$2, "onTap", _v$, _$p);
						});
						return _el$2;
					})() : body();
				});
			}
		});
	}
	function ListTile(props) {
		return pt$1(ListTile$1, {
			get title() {
				return label(props.title);
			},
			get subtitle() {
				return label(props.subtitle);
			},
			get leading() {
				return icon(props.leading);
			},
			get trailing() {
				return icon(props.trailing);
			},
			get onTap() {
				return props.onPress ?? null;
			},
			get onLongPress() {
				return props.onLongPress ?? null;
			},
			get selected() {
				return props.selected;
			},
			get enabled() {
				return !props.disabled;
			},
			get dense() {
				return props.dense;
			},
			get isThreeLine() {
				return props.threeLine;
			}
		});
	}
	function Divider(props) {
		return pt$1(Oe, {
			get component() {
				return props.vertical ? VerticalDivider : Divider$1;
			},
			get thickness() {
				return props.thickness;
			},
			get indent() {
				return props.indent;
			},
			get endIndent() {
				return props.endIndent;
			},
			get color() {
				return props.color;
			},
			get width() {
				return rt$1(() => {
					return !!props.vertical;
				})() ? props.size : void 0;
			},
			get height() {
				return rt$1(() => {
					return !!props.vertical;
				})() ? void 0 : props.size;
			}
		});
	}
	function Chip(props) {
		return rt$1(() => {
			return rt$1(() => {
				return props.selected !== void 0;
			})() ? pt$1(FilterChip, {
				get label() {
					return label(props.label);
				},
				get avatar() {
					return icon(props.icon);
				},
				get selected() {
					return props.selected;
				},
				get onSelected() {
					return rt$1(() => {
						return !!props.disabled;
					})() ? null : props.onSelect ?? null;
				},
				get onDeleted() {
					return props.onDelete ?? null;
				}
			}) : pt$1(Show, {
				get when() {
					return props.onPress;
				},
				get fallback() {
					return pt$1(Chip$1, {
						get label() {
							return label(props.label);
						},
						get avatar() {
							return icon(props.icon);
						},
						get onDeleted() {
							return props.onDelete ?? null;
						}
					});
				},
				get children() {
					return pt$1(ActionChip, {
						get label() {
							return label(props.label);
						},
						get avatar() {
							return icon(props.icon);
						},
						get onPressed() {
							return rt$1(() => {
								return !!props.disabled;
							})() ? null : props.onPress;
						}
					});
				}
			});
		});
	}
	function Badge(props) {
		return rt$1(() => {
			return rt$1(() => {
				return typeof props.label === "number";
			})() ? (() => {
				var _el$3 = at$1("material_ui_BadgeCount");
				Q$1(_el$3, () => {
					return props.children;
				});
				nt$1(() => {
					return {
						e: props.label,
						t: props.max,
						a: props.visible ?? true,
						o: props.color
					};
				}, ({ e, t, a, o }, _p$) => {
					e !== _p$?.e && lt$1(_el$3, "count", e, _p$?.e);
					t !== _p$?.t && lt$1(_el$3, "maxCount", t, _p$?.t);
					a !== _p$?.a && lt$1(_el$3, "isLabelVisible", a, _p$?.a);
					o !== _p$?.o && lt$1(_el$3, "backgroundColor", o, _p$?.o);
				});
				return _el$3;
			})() : pt$1(Badge$1, {
				get label() {
					return label(props.label);
				},
				get isLabelVisible() {
					return props.visible ?? true;
				},
				get backgroundColor() {
					return props.color;
				},
				get children() {
					return props.children;
				}
			});
		});
	}
	function ProgressIndicator$1(props) {
		return pt$1(Oe, {
			get component() {
				return props.variant === "linear" ? LinearProgressIndicator : CircularProgressIndicator;
			},
			get value() {
				return props.value ?? null;
			},
			get color() {
				return props.color;
			},
			get backgroundColor() {
				return props.trackColor;
			}
		});
	}
	// ../../packages/material/src/navigation.tsx
	/** Material's bottom navigation bar. */
	function NavigationBar(props) {
		return pt$1(NavigationBar$1, {
			get selectedIndex() {
				return props.selected;
			},
			get onDestinationSelected() {
				return props.onSelect ?? null;
			},
			get labelBehavior() {
				return props.labels ?? null;
			},
			get backgroundColor() {
				return props.backgroundColor;
			},
			get indicatorColor() {
				return props.indicatorColor;
			},
			get destinations() {
				return props.children;
			}
		});
	}
	function NavigationDestination(props) {
		return pt$1(NavigationDestination$1, {
			get icon() {
				return icon(props.icon);
			},
			get selectedIcon() {
				return icon(props.selectedIcon);
			},
			get label() {
				return props.label;
			},
			get tooltip() {
				return props.tooltip;
			},
			get enabled() {
				return !props.disabled;
			}
		});
	}
	// ../../packages/material/src/overlays.tsx
	/** Material's alert dialog, open while `open` is true. */
	function Dialog$1(props) {
		return pt$1(It, {
			type: "materialDialog",
			get open() {
				return props.open;
			},
			get onOpenChange() {
				return props.onOpenChange;
			},
			get dismissible() {
				return props.dismissible;
			},
			get children() {
				return pt$1(AlertDialog, {
					get title() {
						return label(props.title);
					},
					get icon() {
						return icon(props.icon);
					},
					get content() {
						return label(props.children);
					},
					get actions() {
						return props.actions;
					},
					get scrollable() {
						return props.scrollable;
					}
				});
			}
		});
	}
	/** A modal sheet from the bottom, open while `open` is true. */
	function BottomSheet(props) {
		return pt$1(It, {
			type: "materialBottomSheet",
			get open() {
				return props.open;
			},
			get onOpenChange() {
				return props.onOpenChange;
			},
			get dismissible() {
				return props.dismissible;
			},
			get enableDrag() {
				return props.enableDrag;
			},
			get showDragHandle() {
				return props.showDragHandle;
			},
			get scrollControlled() {
				return props.fullHeight;
			},
			get backgroundColor() {
				return props.backgroundColor;
			},
			get children() {
				return props.children;
			}
		});
	}
	// ../../packages/adaptive/src/components.tsx
	/** Material on one side, Cupertino on the other, picked where it renders. */
	function adapt(material, cupertino) {
		return (props) => {
			const design = useDesign();
			return pt$1(Show, {
				get when() {
					return design() === "cupertino";
				},
				get fallback() {
					return material(props);
				},
				get children() {
					return cupertino(props);
				}
			});
		};
	}
	/**
	* The root of an adaptive app. A Material app on every platform (so either
	* design's widgets work inside, and pages slide the iOS way on iOS); the
	* adaptive components below pick their design from the platform.
	*/
	function AdaptiveApp(props) {
		return pt$1(MaterialApp, ut$1(props, { get children() {
			return pt$1(AdaptiveProvider, {
				get design() {
					return props.design ?? platformDesign(props.platform);
				},
				get children() {
					return props.children;
				}
			});
		} }));
	}
	var Button$1 = adapt((p) => pt$1(Button$2, {
		get variant() {
			return p.variant === "plain" ? "text" : "filled";
		},
		get onPress() {
			return p.onPress;
		},
		get disabled() {
			return p.disabled;
		},
		get children() {
			return p.children;
		}
	}), (p) => pt$1(Button$3, {
		get variant() {
			return p.variant === "plain" ? "plain" : "filled";
		},
		get onPress() {
			return p.onPress;
		},
		get disabled() {
			return p.disabled;
		},
		get children() {
			return p.children;
		}
	}));
	var Switch = adapt((p) => pt$1(Switch$1, p), (p) => pt$1(Switch$2, p));
	var Checkbox = adapt((p) => pt$1(Checkbox$1, p), (p) => pt$1(Checkbox$2, p));
	var Slider = adapt((p) => pt$1(Slider$1, p), (p) => pt$1(Slider$2, p));
	var TextField = adapt((p) => pt$1(TextField$1, ut$1(p, {
		get prefixIcon() {
			return p.prefix;
		},
		get suffixIcon() {
			return p.suffix;
		}
	})), (p) => pt$1(TextField$2, ut$1(p, { get placeholder() {
		return p.placeholder ?? p.label;
	} })));
	/** An indeterminate spinner. */
	var ProgressIndicator = adapt((p) => pt$1(ProgressIndicator$1, { get color() {
		return p.color;
	} }), (p) => pt$1(ActivityIndicator, { get color() {
		return p.color;
	} }));
	/** An alert with a title, a message and buttons. */
	var Dialog = adapt((p) => pt$1(Dialog$1, {
		get open() {
			return p.open;
		},
		get onOpenChange() {
			return p.onOpenChange;
		},
		get title() {
			return p.title;
		},
		get dismissible() {
			return p.dismissible;
		},
		get actions() {
			return (p.actions ?? []).map((a) => pt$1(Button$2, {
				variant: "text",
				get onPress() {
					return a.onPress;
				},
				get children() {
					return a.label;
				}
			}));
		},
		get children() {
			return p.children;
		}
	}), (p) => pt$1(Dialog$2, {
		get open() {
			return p.open;
		},
		get onOpenChange() {
			return p.onOpenChange;
		},
		get title() {
			return p.title;
		},
		get dismissible() {
			return p.dismissible;
		},
		get actions() {
			return (p.actions ?? []).map((a) => pt$1(DialogAction, {
				get onPress() {
					return a.onPress;
				},
				get "default"() {
					return a.default;
				},
				get destructive() {
					return a.destructive;
				},
				get children() {
					return a.label;
				}
			}));
		},
		get children() {
			return p.children;
		}
	}));
	// fuse/heroine.tsx
	/**
	* Creates a new [DragDismissable] widget that will pop the current route when dismissed and respects the current route's `popDisposition` property.
	* Dart: `DragDismissable`
	*/
	function DragDismissable(props) {
		var _el$ = at$1("heroine_DragDismissable");
		vt$1(_el$, props, false);
		return _el$;
	}
	/**
	* Creates a new [Heroine] widget.
	* Dart: `Heroine`
	*/
	function Heroine(props) {
		var _el$3 = at$1("heroine_Heroine");
		vt$1(_el$3, props, false);
		return _el$3;
	}
	var $HeroineController = {
		"s": [],
		"w": [],
		"o": [],
		"m": [
			"didChangeTop",
			"didStartUserGesture",
			"didStopUserGesture",
			"didPush",
			"didPop",
			"didRemove",
			"didReplace"
		],
		"st": []
	};
	w("heroine_HeroineController", $HeroineController);
	/**
	* The controller for [Heroine] transitions.
	* Dart: `HeroineController(...)`. Lives while the calling owner does, and after that while JS still holds it.
	*/
	function createHeroineController(options) {
		return T("heroine_HeroineController", $HeroineController, options, {});
	}
	// fuse/motor/CupertinoMotion.tsx
	function $CupertinoMotion$bouncy(...a) {
		return m("CupertinoMotion.bouncy", [], a);
	}
	function $CupertinoMotion$snappy(...a) {
		return m("CupertinoMotion.snappy", [], a);
	}
	function $CupertinoMotion$smooth(...a) {
		return m("CupertinoMotion.smooth", [], a);
	}
	function $CupertinoMotion$interactive(...a) {
		return m("CupertinoMotion.interactive", [], a);
	}
	function $CupertinoMotion$call(...a) {
		return m("CupertinoMotion", [], a);
	}
	var CupertinoMotion = /* @__PURE__ */ Object.assign($CupertinoMotion$call, {
		bouncy: $CupertinoMotion$bouncy,
		snappy: $CupertinoMotion$snappy,
		smooth: $CupertinoMotion$smooth,
		interactive: $CupertinoMotion$interactive
	});
	// ../../packages/heroine/src/page.ts
	/**
	* A see-through page that fades in while its heroines fly. A
	* `DragDismissable` in it drags it away; `ReactToHeroineDismiss` follows
	* the drag.
	*/
	function heroinePage({ child, transition, ...props }) {
		return {
			type: "heroinePage",
			child,
			props: {
				...props,
				transition: transition && xt(transition)
			}
		};
	}
	// src/platform.ts
	/** The platform the whole demo behaves like. `undefined`: the device's. */
	var [platform, setPlatform] = createSignal(void 0);
	// src/app.tsx
	function App() {
		const heroine = createHeroineController();
		return pt$1(AdaptiveApp, {
			title: "solid-fuse demo",
			theme: { seedColor: "#2563eb" },
			themeMode: "light",
			get platform() {
				return platform();
			},
			get children() {
				return pt$1(Tt, { observers: [heroine] });
			}
		});
	}
	// src/ui.tsx
	var _tpl$1$26 = /*@__PURE__*/ Be$1([
		"view",
		{
			"padding": {
				"horizontal": 16,
				"vertical": 12
			},
			"decoration": {
				"color": "#2563eb",
				"borderRadius": 8
			}
		},
		["text", {
			"color": "#FFFFFF",
			"fontWeight": 600
		}]
	], 2);
	var _tpl$2$11 = /*@__PURE__*/ Be$1([
		"view",
		{
			"padding": 16,
			"decoration": { "border": {
				"$": "Border",
				"bottom": {
					"$": "BorderSide",
					"width": 1,
					"color": "#E5E7EB"
				}
			} }
		},
		["text", { "fontSize": 16 }]
	], 2);
	function Button(props) {
		return pt$1(Pt, {
			get onPress() {
				return props.onTap;
			},
			get children() {
				return ((_at$1) => (() => {
					var _el$ = at$1("h$view", {
						$t: _at$1,
						$i: 0
					});
					var _el$2 = at$1("h$text", {
						$t: _at$1,
						$i: 1
					});
					ht$1(_el$, _el$2);
					Q$1(_el$2, () => {
						return props.children;
					});
					return _el$;
				})())(Ve$1(_tpl$1$26));
			}
		});
	}
	function Row(props) {
		var _el$3 = at$1("view");
		Q$1(_el$3, () => {
			return props.children;
		});
		nt$1(() => ({
			direction: "horizontal",
			gap: props.gap ?? 8,
			align: "center"
		}), (_v$, _$p) => {
			lt$1(_el$3, "layout", _v$, _$p);
		});
		return _el$3;
	}
	function MenuItem(props) {
		return pt$1(Pt, {
			get onPress() {
				return props.onTap;
			},
			get children() {
				return ((_at$2) => (() => {
					var _el$4 = at$1("h$view", {
						$t: _at$2,
						$i: 0
					});
					var _el$5 = at$1("h$text", {
						$t: _at$2,
						$i: 1
					});
					ht$1(_el$4, _el$5);
					Q$1(_el$5, () => {
						return props.label;
					});
					return _el$4;
				})())(Ve$1(_tpl$2$11));
			}
		});
	}
	// src/screens/counter.tsx
	var _tpl$1$25 = /*@__PURE__*/ Be$1([
		"view",
		{
			"layout": {
				"direction": "vertical",
				"align": "center",
				"gap": 32
			},
			"padding": 24
		},
		["text", {
			"testId": "count",
			"fontSize": 96,
			"fontWeight": 700,
			"color": "#2563eb"
		}],
		["view", { "layout": {
			"direction": "horizontal",
			"gap": 16,
			"align": "center"
		} }]
	], 3);
	var _tpl$2$10 = /*@__PURE__*/ Be$1([
		"view",
		{
			"width": 64,
			"height": 64,
			"decoration": {
				"color": "#ef4444",
				"borderRadius": 32
			},
			"layout": {
				"align": "center",
				"justify": "center"
			}
		},
		[
			"text",
			{
				"fontSize": 28,
				"fontWeight": 700,
				"color": "#fff"
			},
			"−"
		]
	], 3);
	var _tpl$3$4 = /*@__PURE__*/ Be$1([
		"view",
		{
			"height": 64,
			"padding": { "horizontal": 24 },
			"decoration": {
				"color": "#6b7280",
				"borderRadius": 32
			},
			"layout": {
				"align": "center",
				"justify": "center"
			}
		},
		[
			"text",
			{
				"fontSize": 15,
				"fontWeight": 600,
				"color": "#fff"
			},
			"Reset"
		]
	], 3);
	var _tpl$4$3 = /*@__PURE__*/ Be$1([
		"view",
		{
			"width": 64,
			"height": 64,
			"decoration": {
				"color": "#22c55e",
				"borderRadius": 32
			},
			"layout": {
				"align": "center",
				"justify": "center"
			}
		},
		[
			"text",
			{
				"fontSize": 28,
				"fontWeight": 700,
				"color": "#fff"
			},
			"+"
		]
	], 3);
	function CounterScreen() {
		const [count, setCount] = createSignal(0);
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0
			});
			var _el$2 = at$1("h$text", {
				$t: _at$1,
				$i: 1
			});
			var _el$3 = at$1("h$view", {
				$t: _at$1,
				$i: 2
			});
			ht$1(_el$, _el$2);
			ht$1(_el$, _el$3);
			Q$1(_el$2, count);
			Q$1(_el$3, pt$1(Pt, {
				testId: "decrement",
				onPress: () => setCount((c) => c - 1),
				get children() {
					return ((_at$2) => at$1("h$view", {
						$t: _at$2,
						$i: 0
					}))(Ve$1(_tpl$2$10));
				}
			}), null);
			Q$1(_el$3, pt$1(Pt, {
				onPress: () => setCount(0),
				get children() {
					return ((_at$3) => at$1("h$view", {
						$t: _at$3,
						$i: 0
					}))(Ve$1(_tpl$3$4));
				}
			}), null);
			Q$1(_el$3, pt$1(Pt, {
				testId: "increment",
				onPress: () => setCount((c) => c + 1),
				get children() {
					return ((_at$4) => at$1("h$view", {
						$t: _at$4,
						$i: 0
					}))(Ve$1(_tpl$4$3));
				}
			}), null);
			return _el$;
		})())(Ve$1(_tpl$1$25));
	}
	// src/screens/text-field.tsx
	var _tpl$1$24 = /*@__PURE__*/ Be$1([
		"scrollView",
		{ "layout": {
			"direction": "vertical",
			"gap": 16
		} },
		[
			"view",
			{ "padding": {
				"horizontal": 16,
				"top": 16,
				"bottom": 8
			} },
			[
				"text",
				{
					"fontSize": 24,
					"fontWeight": 700
				},
				"textField"
			],
			[
				"text",
				{
					"color": "#6B7280",
					"fontSize": 14
				},
				"Reactive value, focus control, filtering"
			]
		],
		[
			"view",
			{
				"padding": { "horizontal": 16 },
				"layout": {
					"direction": "vertical",
					"gap": 24
				}
			},
			[
				"view",
				{ "layout": {
					"direction": "vertical",
					"gap": 6
				} },
				[
					"text",
					{ "fontWeight": 600 },
					"Name"
				],
				[
					"text",
					{
						"color": "#6B7280",
						"fontSize": 13
					},
					"value = \"",
					"\""
				]
			],
			[
				"view",
				{ "layout": {
					"direction": "vertical",
					"gap": 6
				} },
				[
					"text",
					{ "fontWeight": 600 },
					"Focus control"
				],
				[
					"text",
					{
						"color": "#6B7280",
						"fontSize": 13
					},
					"hasFocus = "
				]
			],
			[
				"view",
				{ "layout": {
					"direction": "vertical",
					"gap": 6
				} },
				[
					"text",
					{ "fontWeight": 600 },
					"Digits only"
				]
			],
			[
				"view",
				{ "layout": {
					"direction": "vertical",
					"gap": 6
				} },
				[
					"text",
					{ "fontWeight": 600 },
					"Slot widgets"
				]
			],
			[
				"view",
				{ "layout": {
					"direction": "vertical",
					"gap": 6
				} },
				[
					"text",
					{ "fontWeight": 600 },
					"Autofocus"
				],
				[
					"text",
					{
						"color": "#6B7280",
						"fontSize": 13
					},
					"(would autofocus on mount — disabled here so it doesn't steal focus)"
				]
			]
		],
		["view", { "padding": 16 }]
	], 30);
	function TextFieldScreen() {
		const nav = pt();
		const [name, setName] = createSignal("");
		const [digits, setDigits] = createSignal("");
		const focus = createFocusNode();
		return ((_at$1) => (() => {
			var _el$ = at$1("h$scrollView", {
				$t: _at$1,
				$i: 0
			});
			var _el$2 = at$1("h$view", {
				$t: _at$1,
				$i: 6
			});
			var _el$3 = at$1("h$view", {
				$t: _at$1,
				$i: 7
			});
			var _el$4 = at$1("h$text", {
				$t: _at$1,
				$i: 8
			});
			var _el$5 = at$1("h$text", {
				$t: _at$1,
				$i: 10
			});
			var _el$6 = at$1("h$__text__", {
				$t: _at$1,
				$i: 11
			});
			var _el$7 = at$1("h$__text__", {
				$t: _at$1,
				$i: 12
			});
			var _el$8 = at$1("h$view", {
				$t: _at$1,
				$i: 13
			});
			var _el$9 = at$1("h$text", {
				$t: _at$1,
				$i: 14
			});
			var _el$10 = at$1("h$text", {
				$t: _at$1,
				$i: 16
			});
			var _el$11 = at$1("h$__text__", {
				$t: _at$1,
				$i: 17
			});
			var _el$12 = at$1("h$view", {
				$t: _at$1,
				$i: 18
			});
			var _el$13 = at$1("h$text", {
				$t: _at$1,
				$i: 19
			});
			var _el$14 = at$1("h$view", {
				$t: _at$1,
				$i: 21
			});
			var _el$15 = at$1("h$text", {
				$t: _at$1,
				$i: 22
			});
			var _el$16 = at$1("h$view", {
				$t: _at$1,
				$i: 29
			});
			ht$1(_el$, _el$2);
			ht$1(_el$, _el$16);
			ht$1(_el$2, _el$3);
			ht$1(_el$2, _el$8);
			ht$1(_el$2, _el$12);
			ht$1(_el$2, _el$14);
			ht$1(_el$3, _el$4);
			ht$1(_el$3, _el$5);
			Q$1(_el$3, pt$1(TextField$1, {
				get value() {
					return name();
				},
				onChange: setName,
				label: "Name",
				placeholder: "Your name"
			}), _el$5);
			ht$1(_el$5, _el$6);
			ht$1(_el$5, _el$7);
			Q$1(_el$5, name, _el$7);
			Q$1(_el$3, pt$1(Row, { get children() {
				return [pt$1(Button, {
					onTap: () => setName("Override!"),
					children: "external setName"
				}), pt$1(Button, {
					onTap: () => setName(""),
					children: "clear"
				})];
			} }), null);
			ht$1(_el$8, _el$9);
			ht$1(_el$8, _el$10);
			Q$1(_el$8, pt$1(TextField$1, {
				focusNode: focus,
				placeholder: "Controlled by buttons below"
			}), _el$10);
			ht$1(_el$10, _el$11);
			Q$1(_el$10, () => {
				return focus.hasFocus() ? "true" : "false";
			}, null);
			Q$1(_el$8, pt$1(Row, { get children() {
				return [pt$1(Button, {
					onTap: () => focus.requestFocus(),
					children: "focus"
				}), pt$1(Button, {
					onTap: () => focus.unfocus(),
					children: "unfocus"
				})];
			} }), null);
			ht$1(_el$12, _el$13);
			Q$1(_el$12, pt$1(TextField$1, {
				get value() {
					return digits();
				},
				onChange: setDigits,
				placeholder: "Type letters, they vanish",
				keyboardType: "number",
				allowPattern: "[0-9]"
			}), null);
			ht$1(_el$14, _el$15);
			Q$1(_el$14, pt$1(TextField$1, {
				placeholder: "Search…",
				get prefixIcon() {
					return search;
				}
			}), null);
			Q$1(_el$14, pt$1(TextField$1, {
				placeholder: "Password",
				obscureText: true,
				get prefixIcon() {
					return lock;
				}
			}), null);
			Q$1(_el$16, pt$1(Button, {
				onTap: () => nav.pop(),
				children: "Back"
			}));
			return _el$;
		})())(Ve$1(_tpl$1$24));
	}
	// fuse/flutter_lucide/LucideIcons.tsx
	var git_branch = "LucideIcons.git_branch";
	var heart = "LucideIcons.heart";
	var rocket = "LucideIcons.rocket";
	// src/screens/icon.tsx
	var _tpl$1$23 = /*@__PURE__*/ Be$1([
		"scrollView",
		{ "layout": {
			"direction": "vertical",
			"gap": 16
		} },
		[
			"view",
			{ "padding": {
				"horizontal": 16,
				"top": 16,
				"bottom": 8
			} },
			[
				"text",
				{
					"fontSize": 24,
					"fontWeight": 700
				},
				"icon"
			],
			[
				"text",
				{
					"color": "#6B7280",
					"fontSize": 14
				},
				"Baseline icon rendering + reactive props"
			]
		],
		[
			"view",
			{
				"padding": { "horizontal": 16 },
				"layout": {
					"direction": "vertical",
					"gap": 24
				}
			},
			[
				"view",
				{ "layout": {
					"direction": "vertical",
					"gap": 6
				} },
				[
					"text",
					{ "fontWeight": 600 },
					"Static grid"
				],
				["view", { "layout": {
					"direction": "horizontal",
					"gap": 16,
					"align": "center"
				} }]
			],
			[
				"view",
				{ "layout": {
					"direction": "vertical",
					"gap": 6
				} },
				[
					"text",
					{ "fontWeight": 600 },
					"Lucide"
				],
				["view", { "layout": {
					"direction": "horizontal",
					"gap": 16,
					"align": "center"
				} }]
			],
			[
				"view",
				{ "layout": {
					"direction": "vertical",
					"gap": 6
				} },
				[
					"text",
					{ "fontWeight": 600 },
					"Reactive props"
				],
				[
					"view",
					{
						"layout": {
							"direction": "horizontal",
							"gap": 12,
							"align": "center"
						},
						"padding": 12
					},
					[
						"text",
						{
							"color": "#6B7280",
							"fontSize": 13
						},
						"size = ",
						", color = "
					]
				]
			],
			[
				"view",
				{ "layout": {
					"direction": "vertical",
					"gap": 6
				} },
				[
					"text",
					{ "fontWeight": 600 },
					"Icon + text row"
				],
				[
					"view",
					{
						"layout": {
							"direction": "horizontal",
							"gap": 8,
							"align": "center"
						},
						"padding": 12
					},
					[
						"text",
						0,
						"Inline icon + text composition"
					]
				]
			]
		],
		["view", { "padding": 16 }]
	], 29);
	function IconScreen() {
		const nav = pt();
		const [size, setSize] = createSignal(32);
		const [color, setColor] = createSignal("#111827");
		return ((_at$1) => (() => {
			var _el$ = at$1("h$scrollView", {
				$t: _at$1,
				$i: 0
			});
			var _el$2 = at$1("h$view", {
				$t: _at$1,
				$i: 6
			});
			var _el$3 = at$1("h$view", {
				$t: _at$1,
				$i: 7
			});
			var _el$4 = at$1("h$view", {
				$t: _at$1,
				$i: 10
			});
			var _el$5 = at$1("h$view", {
				$t: _at$1,
				$i: 11
			});
			var _el$6 = at$1("h$view", {
				$t: _at$1,
				$i: 14
			});
			var _el$7 = at$1("h$view", {
				$t: _at$1,
				$i: 15
			});
			var _el$8 = at$1("h$text", {
				$t: _at$1,
				$i: 16
			});
			var _el$9 = at$1("h$view", {
				$t: _at$1,
				$i: 18
			});
			var _el$10 = at$1("h$text", {
				$t: _at$1,
				$i: 19
			});
			var _el$11 = at$1("h$__text__", {
				$t: _at$1,
				$i: 20
			});
			var _el$12 = at$1("h$__text__", {
				$t: _at$1,
				$i: 21
			});
			var _el$13 = at$1("h$view", {
				$t: _at$1,
				$i: 22
			});
			var _el$14 = at$1("h$view", {
				$t: _at$1,
				$i: 25
			});
			var _el$15 = at$1("h$text", {
				$t: _at$1,
				$i: 26
			});
			var _el$16 = at$1("h$view", {
				$t: _at$1,
				$i: 28
			});
			ht$1(_el$, _el$2);
			ht$1(_el$, _el$16);
			ht$1(_el$2, _el$3);
			ht$1(_el$2, _el$5);
			ht$1(_el$2, _el$7);
			ht$1(_el$2, _el$13);
			ht$1(_el$3, _el$4);
			Q$1(_el$4, pt$1(kt, {
				get icon() {
					return search;
				},
				size: 32
			}), null);
			Q$1(_el$4, pt$1(kt, {
				get icon() {
					return lock;
				},
				size: 32
			}), null);
			Q$1(_el$4, pt$1(kt, {
				get icon() {
					return home;
				},
				size: 32
			}), null);
			Q$1(_el$4, pt$1(kt, {
				get icon() {
					return settings;
				},
				size: 32
			}), null);
			Q$1(_el$4, pt$1(kt, {
				get icon() {
					return favorite;
				},
				size: 32,
				color: "#EF4444"
			}), null);
			Q$1(_el$4, pt$1(kt, {
				get icon() {
					return star;
				},
				size: 32,
				color: "#F59E0B"
			}), null);
			ht$1(_el$5, _el$6);
			Q$1(_el$6, pt$1(kt, {
				testId: "lucide-heart",
				get icon() {
					return heart;
				},
				size: 32,
				color: "#EF4444"
			}), null);
			Q$1(_el$6, pt$1(kt, {
				get icon() {
					return rocket;
				},
				size: 32
			}), null);
			Q$1(_el$6, pt$1(kt, {
				get icon() {
					return git_branch;
				},
				size: 32
			}), null);
			ht$1(_el$7, _el$8);
			ht$1(_el$7, _el$9);
			ht$1(_el$9, _el$10);
			Q$1(_el$9, pt$1(kt, {
				get icon() {
					return favorite;
				},
				get size() {
					return size();
				},
				get color() {
					return color();
				}
			}), _el$10);
			ht$1(_el$10, _el$11);
			ht$1(_el$10, _el$12);
			Q$1(_el$10, size, _el$12);
			Q$1(_el$10, color, null);
			Q$1(_el$7, pt$1(Row, { get children() {
				return [
					pt$1(Button, {
						onTap: () => setSize(16),
						children: "16"
					}),
					pt$1(Button, {
						onTap: () => setSize(32),
						children: "32"
					}),
					pt$1(Button, {
						onTap: () => setSize(64),
						children: "64"
					})
				];
			} }), null);
			Q$1(_el$7, pt$1(Row, { get children() {
				return [
					pt$1(Button, {
						onTap: () => setColor("#EF4444"),
						children: "red"
					}),
					pt$1(Button, {
						onTap: () => setColor("#10B981"),
						children: "green"
					}),
					pt$1(Button, {
						onTap: () => setColor("#3B82F6"),
						children: "blue"
					})
				];
			} }), null);
			ht$1(_el$13, _el$14);
			ht$1(_el$14, _el$15);
			Q$1(_el$14, pt$1(kt, {
				get icon() {
					return info;
				},
				size: 20,
				color: "#3B82F6"
			}), _el$15);
			Q$1(_el$16, pt$1(Button, {
				onTap: () => nav.pop(),
				children: "Back"
			}));
			return _el$;
		})())(Ve$1(_tpl$1$23));
	}
	// src/screens/scroll.tsx
	var _tpl$1$22 = /*@__PURE__*/ Be$1([
		"scrollView",
		{ "layout": {
			"direction": "vertical",
			"gap": 12
		} },
		[
			"view",
			{
				"padding": {
					"horizontal": 16,
					"top": 16,
					"bottom": 8
				},
				"layout": {
					"direction": "vertical",
					"gap": 4
				}
			},
			[
				"text",
				{
					"fontSize": 24,
					"fontWeight": 700
				},
				"scrollController"
			],
			[
				"text",
				{
					"color": "#6B7280",
					"fontSize": 14
				},
				"initialScrollOffset, reactive offset, imperative scroll"
			]
		],
		[
			"view",
			{
				"padding": { "horizontal": 16 },
				"layout": {
					"direction": "vertical",
					"gap": 8
				}
			},
			[
				"text",
				{ "fontWeight": 600 },
				"offset = "
			],
			["scrollView", {
				"scrollDirection": "horizontal",
				"layout": {
					"direction": "horizontal",
					"gap": 8,
					"align": "center"
				}
			}]
		],
		["view", {
			"padding": 16,
			"layout": {
				"direction": "vertical",
				"gap": 8
			}
		}],
		["view", { "padding": 16 }]
	], 12);
	var _tpl$2$9 = /*@__PURE__*/ Be$1([
		"view",
		{ "padding": 16 },
		[
			"text",
			0,
			"row "
		]
	], 3);
	function ScrollScreen() {
		const nav = pt();
		const scroll = createScrollController({ initialScrollOffset: 120 });
		return ((_at$1) => (() => {
			var _el$ = at$1("h$scrollView", {
				$t: _at$1,
				$i: 0,
				controller: scroll
			});
			var _el$2 = at$1("h$view", {
				$t: _at$1,
				$i: 6
			});
			var _el$3 = at$1("h$text", {
				$t: _at$1,
				$i: 7
			});
			var _el$4 = at$1("h$__text__", {
				$t: _at$1,
				$i: 8
			});
			var _el$5 = at$1("h$scrollView", {
				$t: _at$1,
				$i: 9
			});
			var _el$6 = at$1("h$view", {
				$t: _at$1,
				$i: 10
			});
			var _el$10 = at$1("h$view", {
				$t: _at$1,
				$i: 11
			});
			ht$1(_el$, _el$2);
			ht$1(_el$, _el$6);
			ht$1(_el$, _el$10);
			ht$1(_el$2, _el$3);
			ht$1(_el$2, _el$5);
			ht$1(_el$3, _el$4);
			Q$1(_el$3, () => {
				return (scroll.offset() ?? 0).toFixed(1);
			}, null);
			Q$1(_el$5, pt$1(Button, {
				onTap: () => scroll.jumpTo(0),
				children: "jumpTo(0)"
			}), null);
			Q$1(_el$5, pt$1(Button, {
				onTap: () => scroll.animateTo(1200, {
					duration: 800,
					curve: easeInOut
				}),
				children: "animateTo(1200)"
			}), null);
			Q$1(_el$6, () => {
				return Array.from({ length: 40 }, (_, i) => ((_at$2) => (() => {
					var _el$7 = at$1("h$view", {
						$t: _at$2,
						$i: 0,
						decoration: {
							color: i % 2 === 0 ? "#F3F4F6" : "#E5E7EB",
							borderRadius: 8
						}
					});
					var _el$8 = at$1("h$text", {
						$t: _at$2,
						$i: 1
					});
					var _el$9 = at$1("h$__text__", {
						$t: _at$2,
						$i: 2
					});
					ht$1(_el$7, _el$8);
					ht$1(_el$8, _el$9);
					Q$1(_el$8, i, null);
					return _el$7;
				})())(Ve$1(_tpl$2$9)));
			});
			Q$1(_el$10, pt$1(Button, {
				onTap: () => nav.pop(),
				children: "Back"
			}));
			return _el$;
		})())(Ve$1(_tpl$1$22));
	}
	// src/screens/list.tsx
	var _tpl$1$21 = /*@__PURE__*/ Be$1(["view", {
		"layout": {
			"direction": "vertical",
			"gap": 12
		},
		"padding": 24
	}], 1);
	var _tpl$2$8 = /*@__PURE__*/ Be$1([
		"view",
		{ "height": 40 },
		["text", { "fontSize": 16 }]
	], 2);
	function ListScreen() {
		const [rows, setRows] = createSignal([
			"cherry",
			"apple",
			"elder",
			"banana",
			"date"
		]);
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0
			});
			Q$1(_el$, pt$1(Row, { get children() {
				return [
					pt$1(Button, {
						onTap: () => setRows((r) => r.slice().reverse()),
						children: "Reverse"
					}),
					pt$1(Button, {
						onTap: () => setRows((r) => r.slice().sort()),
						children: "Sort"
					}),
					pt$1(Button, {
						onTap: () => setRows((r) => r.filter((_, i) => i % 2 === 0)),
						children: "Thin"
					})
				];
			} }), null);
			Q$1(_el$, pt$1(For, {
				get each() {
					return rows();
				},
				children: (row) => ((_at$2) => (() => {
					var _el$2 = at$1("h$view", {
						$t: _at$2,
						$i: 0
					});
					var _el$3 = at$1("h$text", {
						$t: _at$2,
						$i: 1
					});
					ht$1(_el$2, _el$3);
					Q$1(_el$3, row);
					return _el$2;
				})())(Ve$1(_tpl$2$8))
			}), null);
			return _el$;
		})())(Ve$1(_tpl$1$21));
	}
	// src/screens/builder.tsx
	var _tpl$1$20 = /*@__PURE__*/ Be$1([
		"view",
		{ "layout": {
			"direction": "vertical",
			"align": "stretch"
		} },
		[
			"view",
			{ "padding": {
				"horizontal": 16,
				"top": 16,
				"bottom": 8
			} },
			[
				"text",
				{
					"fontSize": 24,
					"fontWeight": 700
				},
				"builder"
			],
			["text", {
				"color": "#6B7280",
				"fontSize": 14
			}],
			["text", {
				"color": "#6B7280",
				"fontSize": 14
			}]
		],
		["view", { "flex": 1 }]
	], 7);
	var _tpl$2$7 = /*@__PURE__*/ Be$1([
		"view",
		{ "padding": {
			"horizontal": 16,
			"vertical": 12
		} },
		["text", 0]
	], 2);
	function BuilderScreen() {
		const [picked, setPicked] = createSignal(-1);
		const scroll = createScrollController();
		const at = () => Math.round(scroll.position()?.pixels() ?? 0);
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0
			});
			var _el$2 = at$1("h$view", {
				$t: _at$1,
				$i: 1
			});
			var _el$3 = at$1("h$text", {
				$t: _at$1,
				$i: 4
			});
			var _el$4 = at$1("h$text", {
				$t: _at$1,
				$i: 5
			});
			var _el$5 = at$1("h$view", {
				$t: _at$1,
				$i: 6
			});
			ht$1(_el$, _el$2);
			ht$1(_el$, _el$5);
			ht$1(_el$2, _el$3);
			ht$1(_el$2, _el$4);
			Q$1(_el$3, (() => {
				var _c$ = rt$1(() => {
					return picked() < 0;
				});
				return () => {
					return _c$() ? "10,000 rows, built as they scroll in" : `Picked row ${picked()}`;
				};
			})());
			Q$1(_el$4, () => {
				return `Scrolled ${at()} px`;
			});
			Q$1(_el$5, pt$1(ListViewBuilder, {
				controller: scroll,
				itemCount: 1e4,
				itemExtent: 48,
				itemBuilder: (index) => pt$1(Pt, {
					onPress: () => setPicked(index),
					get children() {
						return ((_at$2) => (() => {
							var _el$6 = at$1("h$view", {
								$t: _at$2,
								$i: 0
							});
							var _el$7 = at$1("h$text", {
								$t: _at$2,
								$i: 1
							});
							ht$1(_el$6, _el$7);
							Q$1(_el$7, `Row ${index}`);
							nt$1(() => ({ color: picked() === index ? "#DBEAFE" : "#FFFFFF" }), (_v$, _$p) => {
								lt$1(_el$6, "decoration", _v$, _$p);
							});
							return _el$6;
						})())(Ve$1(_tpl$2$7));
					}
				})
			}));
			return _el$;
		})())(Ve$1(_tpl$1$20));
	}
	// src/screens/core.tsx
	var _tpl$1$19 = /*@__PURE__*/ Be$1([
		"scrollView",
		{
			"layout": {
				"direction": "vertical",
				"gap": 20
			},
			"padding": 16
		},
		[
			"text",
			{
				"fontSize": 24,
				"fontWeight": 700
			},
			"core widgets"
		]
	], 3);
	var _tpl$2$6 = /*@__PURE__*/ Be$1([
		"view",
		{ "padding": {
			"horizontal": 16,
			"vertical": 12
		} },
		["text", { "color": "#FFFFFF" }]
	], 2);
	var _tpl$3$3 = /*@__PURE__*/ Be$1([
		"view",
		{
			"padding": 12,
			"decoration": {
				"border": {
					"width": 1,
					"color": "#D1D5DB"
				},
				"borderRadius": 8
			}
		},
		["textInput", { "placeholder": "Type here" }]
	], 2);
	var _tpl$4$2 = /*@__PURE__*/ Be$1(["text", { "color": "#6B7280" }], 1);
	var _tpl$5$1 = /*@__PURE__*/ Be$1([
		"view",
		{
			"padding": 24,
			"width": 280,
			"decoration": {
				"color": "#FFFFFF",
				"borderRadius": 16
			},
			"layout": { "gap": 16 }
		},
		[
			"text",
			{
				"fontSize": 18,
				"fontWeight": 700
			},
			"Core dialog"
		],
		[
			"text",
			0,
			"No design: the content brings its own surface."
		]
	], 5);
	var _tpl$6 = /*@__PURE__*/ Be$1(["view", {
		"width": 160,
		"decoration": {
			"color": "#FFFFFF",
			"borderRadius": 8,
			"boxShadow": [{
				"blurRadius": 8,
				"color": "#00000033"
			}]
		}
	}], 1);
	var _tpl$7 = /*@__PURE__*/ Be$1([
		"view",
		{ "padding": 12 },
		["text", 0]
	], 2);
	var _tpl$8 = /*@__PURE__*/ Be$1([
		"radioGroup",
		0,
		["text", 0]
	], 2);
	var _tpl$9 = /*@__PURE__*/ Be$1([
		"tooltip",
		{ "trigger": "tap" },
		[
			"text",
			{ "color": "#2563eb" },
			"tap for a tooltip"
		]
	], 3);
	var _tpl$10 = /*@__PURE__*/ Be$1([
		"view",
		{
			"padding": 8,
			"decoration": {
				"color": "#111827",
				"borderRadius": 4
			}
		},
		[
			"text",
			{ "color": "#FFFFFF" },
			"A tooltip"
		]
	], 3);
	var _tpl$11 = /*@__PURE__*/ Be$1([
		"expandable",
		0,
		[
			"view",
			{ "padding": 12 },
			[
				"text",
				0,
				"The body, animated in."
			]
		]
	], 4);
	var _tpl$12 = /*@__PURE__*/ Be$1([
		"view",
		{
			"padding": 12,
			"decoration": { "color": "#F3F4F6" }
		},
		[
			"text",
			0,
			"Show more"
		]
	], 3);
	var _tpl$13 = /*@__PURE__*/ Be$1([
		"view",
		{ "layout": {
			"direction": "vertical",
			"gap": 8
		} },
		["text", { "fontWeight": 600 }]
	], 2);
	function CoreScreen() {
		const [presses, setPresses] = createSignal(0);
		const [text, setText] = createSignal("");
		const [open, setOpen] = createSignal(false);
		const [menu, setMenu] = createSignal(false);
		const [fruit, setFruit] = createSignal("apple");
		const [size, setSize] = createSignal("M");
		return ((_at$1) => (() => {
			var _el$ = at$1("h$scrollView", {
				$t: _at$1,
				$i: 0
			});
			ht$1(_el$, at$1("h$text", {
				$t: _at$1,
				$i: 1
			}));
			Q$1(_el$, pt$1(Section, {
				title: "Pressable",
				get children() {
					return pt$1(Pt, {
						onPress: () => setPresses((n) => n + 1),
						semanticLabel: "Press me",
						children: (state) => ((_at$2) => (() => {
							var _el$4 = at$1("h$view", {
								$t: _at$2,
								$i: 0
							});
							var _el$5 = at$1("h$text", {
								$t: _at$2,
								$i: 1
							});
							ht$1(_el$4, _el$5);
							Q$1(_el$5, () => {
								return `Pressed ${presses()} times`;
							});
							nt$1(() => ({
								color: state.pressed() ? "#1e40af" : state.hovered() ? "#1d4ed8" : "#2563eb",
								borderRadius: 8
							}), (_v$, _$p) => {
								lt$1(_el$4, "decoration", _v$, _$p);
							});
							return _el$4;
						})())(Ve$1(_tpl$2$6))
					});
				}
			}), null);
			Q$1(_el$, pt$1(Section, {
				title: "TextInput",
				get children() {
					return [
						rt$1(() => {
							return ((_at$3) => (() => {
								var _el$6 = at$1("h$view", {
									$t: _at$3,
									$i: 0
								});
								var _el$7 = at$1("h$textInput", {
									$t: _at$3,
									$i: 1,
									onChange: setText
								});
								ht$1(_el$6, _el$7);
								nt$1(() => text(), (_v$, _$p) => {
									lt$1(_el$7, "value", _v$, _$p);
								});
								return _el$6;
							})())(Ve$1(_tpl$3$3));
						}),
						rt$1(() => {
							return ((_at$4) => (() => {
								var _el$8 = at$1("h$text", {
									$t: _at$4,
									$i: 0
								});
								Q$1(_el$8, () => {
									return `input = "${text()}"`;
								});
								return _el$8;
							})())(Ve$1(_tpl$4$2));
						}),
						pt$1(Row, { get children() {
							return pt$1(Button, {
								onTap: () => setText("from JS"),
								children: "set from JS"
							});
						} })
					];
				}
			}), null);
			Q$1(_el$, pt$1(Section, {
				title: "Modal",
				get children() {
					return [pt$1(Row, { get children() {
						return pt$1(Button, {
							onTap: () => setOpen(true),
							children: "open dialog"
						});
					} }), pt$1(It, {
						get open() {
							return open();
						},
						onOpenChange: setOpen,
						get children() {
							return ((_at$5) => (() => {
								var _el$9 = at$1("h$view", {
									$t: _at$5,
									$i: 0
								});
								var _el$10 = at$1("h$text", {
									$t: _at$5,
									$i: 1
								});
								var _el$11 = at$1("h$text", {
									$t: _at$5,
									$i: 3
								});
								ht$1(_el$9, _el$10);
								ht$1(_el$9, _el$11);
								Q$1(_el$9, pt$1(Button, {
									onTap: () => setOpen(false),
									children: "close"
								}), null);
								return _el$9;
							})())(Ve$1(_tpl$5$1));
						}
					})];
				}
			}), null);
			Q$1(_el$, pt$1(Section, {
				title: "Menu",
				get children() {
					var _el$3 = at$1("menu", { onOpenChange: setMenu });
					Q$1(_el$3, pt$1(Button, {
						onTap: () => setMenu(!menu()),
						get children() {
							return `fruit: ${fruit()}`;
						}
					}));
					nt$1(() => {
						return {
							e: menu(),
							t: ((_at$6) => (() => {
								var _el$12 = at$1("h$view", {
									$t: _at$6,
									$i: 0
								});
								Q$1(_el$12, pt$1(For, {
									each: [
										"apple",
										"banana",
										"cherry"
									],
									children: (f) => pt$1(Pt, {
										onPress: () => (setFruit(f), setMenu(false)),
										get children() {
											return ((_at$7) => (() => {
												var _el$13 = at$1("h$view", {
													$t: _at$7,
													$i: 0
												});
												var _el$14 = at$1("h$text", {
													$t: _at$7,
													$i: 1
												});
												ht$1(_el$13, _el$14);
												Q$1(_el$14, f);
												return _el$13;
											})())(Ve$1(_tpl$7));
										}
									})
								}));
								return _el$12;
							})())(Ve$1(_tpl$6))
						};
					}, ({ e, t }, _p$) => {
						e !== _p$?.e && lt$1(_el$3, "open", e, _p$?.e);
						t !== _p$?.t && lt$1(_el$3, "content", t, _p$?.t);
					});
					return _el$3;
				}
			}), null);
			Q$1(_el$, pt$1(Section, {
				title: "RadioGroup + Tooltip",
				get children() {
					return [rt$1(() => {
						return ((_at$8) => (() => {
							var _el$15 = at$1("h$radioGroup", {
								$t: _at$8,
								$i: 0,
								onChange: setSize
							});
							var _el$16 = at$1("h$text", {
								$t: _at$8,
								$i: 1
							});
							ht$1(_el$15, _el$16);
							Q$1(_el$16, () => {
								return `size = ${size()}`;
							});
							nt$1(() => size(), (_v$, _$p) => {
								lt$1(_el$15, "value", _v$, _$p);
							});
							return _el$15;
						})())(Ve$1(_tpl$8));
					}), rt$1(() => {
						return ((_at$9) => (() => {
							var _el$17 = at$1("h$tooltip", {
								$t: _at$9,
								$i: 0
							});
							nt$1(() => ((_at$10) => at$1("h$view", {
								$t: _at$10,
								$i: 0
							}))(Ve$1(_tpl$10)), (_v$, _$p) => {
								lt$1(_el$17, "content", _v$, _$p);
							});
							return _el$17;
						})())(Ve$1(_tpl$9));
					})];
				}
			}), null);
			Q$1(_el$, pt$1(Section, {
				title: "Expandable",
				get children() {
					return ((_at$11) => (() => {
						var _el$19 = at$1("h$expandable", {
							$t: _at$11,
							$i: 0
						});
						nt$1(() => ((_at$12) => at$1("h$view", {
							$t: _at$12,
							$i: 0
						}))(Ve$1(_tpl$12)), (_v$, _$p) => {
							lt$1(_el$19, "header", _v$, _$p);
						});
						return _el$19;
					})())(Ve$1(_tpl$11));
				}
			}), null);
			return _el$;
		})())(Ve$1(_tpl$1$19));
	}
	function Section(props) {
		return ((_at$13) => (() => {
			var _el$21 = at$1("h$view", {
				$t: _at$13,
				$i: 0
			});
			var _el$22 = at$1("h$text", {
				$t: _at$13,
				$i: 1
			});
			ht$1(_el$21, _el$22);
			Q$1(_el$22, () => {
				return props.title;
			});
			Q$1(_el$21, () => {
				return props.children;
			}, null);
			return _el$21;
		})())(Ve$1(_tpl$13));
	}
	// src/screens/material.tsx
	var _tpl$1$18 = /*@__PURE__*/ Be$1([
		"scrollView",
		{
			"layout": {
				"direction": "vertical",
				"gap": 16
			},
			"padding": 16
		},
		["text", 0],
		["view", { "layout": {
			"direction": "horizontal",
			"gap": 8
		} }],
		["view", { "layout": {
			"direction": "horizontal",
			"gap": 8
		} }],
		[
			"view",
			{ "layout": {
				"direction": "horizontal",
				"gap": 8,
				"align": "center"
			} },
			["text", 0]
		],
		[
			"radioGroup",
			0,
			[
				"view",
				{ "layout": {
					"direction": "horizontal",
					"align": "center"
				} },
				[
					"text",
					0,
					"Free"
				],
				[
					"text",
					0,
					"Pro"
				]
			]
		],
		["text", 0],
		["view", { "layout": {
			"direction": "horizontal",
			"gap": 8
		} }]
	], 14);
	var _tpl$2$5 = /*@__PURE__*/ Be$1([
		"text",
		0,
		"An outlined card. Tap it."
	], 2);
	var _tpl$3$2 = /*@__PURE__*/ Be$1([
		"view",
		{ "padding": 24 },
		[
			"text",
			0,
			"A modal bottom sheet. Drag it down."
		]
	], 3);
	function MaterialScreen() {
		const nav = pt();
		const [on, setOn] = createSignal(true);
		const [checked, setChecked] = createSignal(false);
		const [volume, setVolume] = createSignal(.4);
		const [plan, setPlan] = createSignal("free");
		const [tab, setTab] = createSignal(0);
		const [dialog, setDialog] = createSignal(false);
		const [sheet, setSheet] = createSignal(false);
		const [email$1, setEmail] = createSignal("");
		const [taps, setTaps] = createSignal(0);
		const [filter, setFilter] = createSignal(false);
		return pt$1(Scaffold, {
			get appBar() {
				return pt$1(AppBar, {
					title: "Material",
					get leading() {
						return pt$1(IconButton, {
							get icon() {
								return arrow_back;
							},
							tooltip: "Back",
							onPress: () => nav.pop()
						});
					},
					get actions() {
						return pt$1(IconButton, {
							get icon() {
								return settings;
							},
							tooltip: "Settings"
						});
					}
				});
			},
			get floatingActionButton() {
				return pt$1(FloatingActionButton, {
					get icon() {
						return add;
					},
					tooltip: "Add",
					onPress: () => setTaps((n) => n + 1)
				});
			},
			get bottomNavigationBar() {
				return pt$1(NavigationBar, {
					get selected() {
						return tab();
					},
					onSelect: setTab,
					get children() {
						return [
							pt$1(NavigationDestination, {
								get icon() {
									return home_outlined;
								},
								get selectedIcon() {
									return home;
								},
								label: "Home"
							}),
							pt$1(NavigationDestination, {
								get icon() {
									return favorite_border;
								},
								get selectedIcon() {
									return favorite;
								},
								label: "Saved"
							}),
							pt$1(NavigationDestination, {
								get icon() {
									return person_outline;
								},
								get selectedIcon() {
									return person;
								},
								label: "Profile"
							})
						];
					}
				});
			},
			get children() {
				return ((_at$1) => (() => {
					var _el$ = at$1("h$scrollView", {
						$t: _at$1,
						$i: 0
					});
					var _el$2 = at$1("h$text", {
						$t: _at$1,
						$i: 1
					});
					var _el$3 = at$1("h$view", {
						$t: _at$1,
						$i: 2
					});
					var _el$4 = at$1("h$view", {
						$t: _at$1,
						$i: 3
					});
					var _el$5 = at$1("h$view", {
						$t: _at$1,
						$i: 4
					});
					var _el$6 = at$1("h$text", {
						$t: _at$1,
						$i: 5
					});
					var _el$7 = at$1("h$radioGroup", {
						$t: _at$1,
						$i: 6,
						onChange: setPlan
					});
					var _el$8 = at$1("h$view", {
						$t: _at$1,
						$i: 7
					});
					var _el$9 = at$1("h$text", {
						$t: _at$1,
						$i: 8
					});
					var _el$10 = at$1("h$text", {
						$t: _at$1,
						$i: 10
					});
					var _el$11 = at$1("h$text", {
						$t: _at$1,
						$i: 12
					});
					var _el$12 = at$1("h$view", {
						$t: _at$1,
						$i: 13
					});
					ht$1(_el$, _el$2);
					ht$1(_el$, _el$3);
					ht$1(_el$, _el$4);
					ht$1(_el$, _el$5);
					ht$1(_el$, _el$7);
					ht$1(_el$, _el$11);
					ht$1(_el$, _el$12);
					Q$1(_el$2, () => {
						return `Tab ${tab()}, FAB pressed ${taps()} times`;
					});
					Q$1(_el$3, pt$1(Button$2, {
						onPress: () => setDialog(true),
						children: "Dialog"
					}), null);
					Q$1(_el$3, pt$1(Button$2, {
						variant: "tonal",
						onPress: () => setSheet(true),
						children: "Sheet"
					}), null);
					Q$1(_el$3, pt$1(Button$2, {
						variant: "outlined",
						get icon() {
							return send;
						},
						children: "Send"
					}), null);
					Q$1(_el$4, pt$1(Button$2, {
						variant: "text",
						children: "Text"
					}), null);
					Q$1(_el$4, pt$1(Button$2, {
						variant: "elevated",
						children: "Elevated"
					}), null);
					Q$1(_el$4, pt$1(Button$2, {
						disabled: true,
						children: "Disabled"
					}), null);
					Q$1(_el$, pt$1(Divider, {}), _el$5);
					ht$1(_el$5, _el$6);
					Q$1(_el$5, pt$1(Switch$1, {
						get value() {
							return on();
						},
						onChange: setOn
					}), _el$6);
					Q$1(_el$5, pt$1(Checkbox$1, {
						get value() {
							return checked();
						},
						onChange: setChecked,
						tristate: true
					}), _el$6);
					Q$1(_el$6, () => {
						return `switch ${on() ? "on" : "off"}, checkbox ${String(checked())}`;
					});
					Q$1(_el$, pt$1(Slider$1, {
						get value() {
							return volume();
						},
						onChange: setVolume
					}), _el$7);
					ht$1(_el$7, _el$8);
					ht$1(_el$8, _el$9);
					ht$1(_el$8, _el$10);
					Q$1(_el$8, pt$1(Radio, { value: "free" }), _el$9);
					Q$1(_el$8, pt$1(Radio, { value: "pro" }), _el$10);
					Q$1(_el$11, () => {
						return `plan = ${plan()}`;
					});
					Q$1(_el$, pt$1(TextField$1, {
						label: "Email",
						get value() {
							return email$1();
						},
						onChange: setEmail,
						keyboardType: "email",
						get prefixIcon() {
							return email;
						}
					}), _el$12);
					Q$1(_el$12, pt$1(Chip, {
						label: "Chip",
						get icon() {
							return star;
						}
					}), null);
					Q$1(_el$12, pt$1(Chip, {
						label: "Filter",
						get selected() {
							return filter();
						},
						onSelect: setFilter
					}), null);
					Q$1(_el$12, pt$1(Badge, {
						label: 3,
						get children() {
							return pt$1(IconButton, { get icon() {
								return notifications;
							} });
						}
					}), null);
					Q$1(_el$, pt$1(Card, {
						variant: "outlined",
						padding: 16,
						onPress: () => setTaps((n) => n + 1),
						get children() {
							return ((_at$2) => at$1("h$text", {
								$t: _at$2,
								$i: 0
							}))(Ve$1(_tpl$2$5));
						}
					}), null);
					Q$1(_el$, pt$1(ListTile, {
						get leading() {
							return wifi;
						},
						title: "Wi-Fi",
						subtitle: "Connected",
						get trailing() {
							return pt$1(Switch$1, {
								get value() {
									return on();
								},
								onChange: setOn
							});
						}
					}), null);
					Q$1(_el$, pt$1(ProgressIndicator$1, {
						variant: "linear",
						get value() {
							return volume();
						}
					}), null);
					Q$1(_el$, pt$1(ProgressIndicator$1, {}), null);
					Q$1(_el$, pt$1(Dialog$1, {
						get open() {
							return dialog();
						},
						onOpenChange: setDialog,
						title: "Discard draft?",
						get icon() {
							return delete_;
						},
						get actions() {
							return [pt$1(Button$2, {
								variant: "text",
								onPress: () => setDialog(false),
								children: "Cancel"
							}), pt$1(Button$2, {
								variant: "text",
								onPress: () => setDialog(false),
								children: "Discard"
							})];
						},
						children: "The draft will be gone."
					}), null);
					Q$1(_el$, pt$1(BottomSheet, {
						get open() {
							return sheet();
						},
						onOpenChange: setSheet,
						showDragHandle: true,
						get children() {
							return ((_at$3) => at$1("h$view", {
								$t: _at$3,
								$i: 0
							}))(Ve$1(_tpl$3$2));
						}
					}), null);
					nt$1(() => plan(), (_v$, _$p) => {
						lt$1(_el$7, "value", _v$, _$p);
					});
					return _el$;
				})())(Ve$1(_tpl$1$18));
			}
		});
	}
	// src/screens/cupertino.tsx
	var _tpl$1$17 = /*@__PURE__*/ Be$1([
		"scrollView",
		{
			"layout": {
				"direction": "vertical",
				"gap": 16
			},
			"padding": {
				"horizontal": 16,
				"top": 110,
				"bottom": 32
			}
		},
		["text", 0],
		["view", { "layout": {
			"direction": "horizontal",
			"gap": 8
		} }],
		["view", { "layout": {
			"direction": "horizontal",
			"gap": 12,
			"align": "center"
		} }],
		[
			"radioGroup",
			0,
			[
				"view",
				{ "layout": {
					"direction": "horizontal",
					"gap": 8,
					"align": "center"
				} },
				[
					"text",
					0,
					"One"
				],
				[
					"text",
					0,
					"Two"
				]
			]
		]
	], 10);
	function CupertinoScreen() {
		const [on, setOn] = createSignal(false);
		const [checked, setChecked] = createSignal(true);
		const [brightness, setBrightness] = createSignal(.7);
		const [view, setView] = createSignal("day");
		const [alert, setAlert] = createSignal(false);
		const [sheet, setSheet] = createSignal(false);
		const [name, setName] = createSignal("");
		const [pick, setPick] = createSignal(1);
		const [last, setLast] = createSignal("nothing yet");
		return pt$1(PageScaffold, {
			get navigationBar() {
				return pt$1(NavigationBar$2, {
					title: "Cupertino",
					get trailing() {
						return info$1;
					}
				});
			},
			get children() {
				return ((_at$1) => (() => {
					var _el$ = at$1("h$scrollView", {
						$t: _at$1,
						$i: 0
					});
					var _el$2 = at$1("h$text", {
						$t: _at$1,
						$i: 1
					});
					var _el$3 = at$1("h$view", {
						$t: _at$1,
						$i: 2
					});
					var _el$4 = at$1("h$view", {
						$t: _at$1,
						$i: 3
					});
					var _el$5 = at$1("h$radioGroup", {
						$t: _at$1,
						$i: 4,
						onChange: setPick
					});
					var _el$6 = at$1("h$view", {
						$t: _at$1,
						$i: 5
					});
					var _el$7 = at$1("h$text", {
						$t: _at$1,
						$i: 6
					});
					var _el$8 = at$1("h$text", {
						$t: _at$1,
						$i: 8
					});
					ht$1(_el$, _el$2);
					ht$1(_el$, _el$3);
					ht$1(_el$, _el$4);
					ht$1(_el$, _el$5);
					Q$1(_el$, pt$1(SegmentedControl, {
						get value() {
							return view();
						},
						onChange: setView,
						options: [
							{
								value: "day",
								label: "Day"
							},
							{
								value: "week",
								label: "Week"
							},
							{
								value: "month",
								label: "Month"
							}
						]
					}), _el$2);
					Q$1(_el$2, () => {
						return `view = ${view()}, last action: ${last()}`;
					});
					Q$1(_el$3, pt$1(Button$3, {
						variant: "filled",
						onPress: () => setAlert(true),
						children: "Alert"
					}), null);
					Q$1(_el$3, pt$1(Button$3, {
						variant: "tinted",
						onPress: () => setSheet(true),
						children: "Sheet"
					}), null);
					Q$1(_el$3, pt$1(Button$3, {
						get icon() {
							return heart$1;
						},
						children: "Like"
					}), null);
					Q$1(_el$, pt$1(TextField$2, {
						get value() {
							return name();
						},
						onChange: setName,
						placeholder: "Name",
						clearButton: true,
						get prefix() {
							return person$1;
						}
					}), _el$4);
					Q$1(_el$4, pt$1(Switch$2, {
						get value() {
							return on();
						},
						onChange: setOn
					}), null);
					Q$1(_el$4, pt$1(Checkbox$2, {
						get value() {
							return checked();
						},
						onChange: setChecked
					}), null);
					Q$1(_el$4, pt$1(ActivityIndicator, { get animating() {
						return on();
					} }), null);
					Q$1(_el$, pt$1(Slider$2, {
						get value() {
							return brightness();
						},
						onChange: setBrightness
					}), _el$5);
					ht$1(_el$5, _el$6);
					ht$1(_el$6, _el$7);
					ht$1(_el$6, _el$8);
					Q$1(_el$6, pt$1(Radio$1, { value: 1 }), _el$7);
					Q$1(_el$6, pt$1(Radio$1, { value: 2 }), _el$8);
					Q$1(_el$, pt$1(ListSection, {
						header: "Settings",
						get children() {
							return [pt$1(ListTile$2, {
								get leading() {
									return wifi$1;
								},
								title: "Wi-Fi",
								additionalInfo: "Home",
								onPress: () => setLast("wi-fi")
							}), pt$1(ListTile$2, {
								get leading() {
									return bluetooth;
								},
								title: "Bluetooth",
								get trailing() {
									return pt$1(Switch$2, {
										get value() {
											return on();
										},
										onChange: setOn
									});
								}
							})];
						}
					}), null);
					Q$1(_el$, pt$1(Dialog$2, {
						get open() {
							return alert();
						},
						onOpenChange: setAlert,
						title: "Allow notifications?",
						get actions() {
							return [pt$1(DialogAction, {
								onPress: () => (setLast("don't allow"), setAlert(false)),
								children: "Don't Allow"
							}), pt$1(DialogAction, {
								default: true,
								onPress: () => (setLast("allow"), setAlert(false)),
								children: "Allow"
							})];
						},
						children: "You can change this in Settings."
					}), null);
					Q$1(_el$, pt$1(ActionSheet, {
						get open() {
							return sheet();
						},
						onOpenChange: setSheet,
						title: "Share photo",
						get cancel() {
							return pt$1(ActionSheetAction, {
								onPress: () => setSheet(false),
								children: "Cancel"
							});
						},
						get children() {
							return [pt$1(ActionSheetAction, {
								onPress: () => (setLast("copy"), setSheet(false)),
								children: "Copy"
							}), pt$1(ActionSheetAction, {
								destructive: true,
								onPress: () => (setLast("delete"), setSheet(false)),
								children: "Delete"
							})];
						}
					}), null);
					nt$1(() => pick(), (_v$, _$p) => {
						lt$1(_el$5, "value", _v$, _$p);
					});
					return _el$;
				})())(Ve$1(_tpl$1$17));
			}
		});
	}
	// src/screens/adaptive.tsx
	var _tpl$1$16 = /*@__PURE__*/ Be$1([
		"scrollView",
		{
			"layout": {
				"direction": "vertical",
				"gap": 16
			},
			"padding": {
				"horizontal": 16,
				"top": 48
			}
		},
		[
			"text",
			{
				"fontSize": 24,
				"fontWeight": 700
			},
			"adaptive"
		]
	], 3);
	var _tpl$2$4 = /*@__PURE__*/ Be$1([
		"view",
		{ "layout": {
			"direction": "vertical",
			"gap": 16
		} },
		["view", { "layout": {
			"direction": "horizontal",
			"gap": 12,
			"align": "center"
		} }],
		["view", { "layout": {
			"direction": "horizontal",
			"gap": 8
		} }]
	], 3);
	function AdaptiveScreen() {
		const design = useDesign();
		return ((_at$1) => (() => {
			var _el$ = at$1("h$scrollView", {
				$t: _at$1,
				$i: 0
			});
			ht$1(_el$, at$1("h$text", {
				$t: _at$1,
				$i: 1
			}));
			Q$1(_el$, pt$1(Button, {
				onTap: () => setPlatform(design() === "material" ? "iOS" : "android"),
				get children() {
					return `design: ${design()}`;
				}
			}), null);
			Q$1(_el$, pt$1(Gallery, {}), null);
			return _el$;
		})())(Ve$1(_tpl$1$16));
	}
	function Gallery() {
		const [on, setOn] = createSignal(true);
		const [checked, setChecked] = createSignal(false);
		const [level, setLevel] = createSignal(.5);
		const [text, setText] = createSignal("");
		const [open, setOpen] = createSignal(false);
		return ((_at$2) => (() => {
			var _el$3 = at$1("h$view", {
				$t: _at$2,
				$i: 0
			});
			var _el$4 = at$1("h$view", {
				$t: _at$2,
				$i: 1
			});
			var _el$5 = at$1("h$view", {
				$t: _at$2,
				$i: 2
			});
			ht$1(_el$3, _el$4);
			ht$1(_el$3, _el$5);
			Q$1(_el$4, pt$1(Switch, {
				get value() {
					return on();
				},
				onChange: setOn
			}), null);
			Q$1(_el$4, pt$1(Checkbox, {
				get value() {
					return checked();
				},
				onChange: setChecked
			}), null);
			Q$1(_el$4, pt$1(ProgressIndicator, {}), null);
			Q$1(_el$3, pt$1(Slider, {
				get value() {
					return level();
				},
				onChange: setLevel
			}), _el$5);
			Q$1(_el$3, pt$1(TextField, {
				label: "Search",
				get value() {
					return text();
				},
				onChange: setText
			}), _el$5);
			Q$1(_el$5, pt$1(Button$1, {
				onPress: () => setOpen(true),
				children: "Delete"
			}), null);
			Q$1(_el$5, pt$1(Button$1, {
				variant: "plain",
				children: "Later"
			}), null);
			Q$1(_el$3, pt$1(Dialog, {
				get open() {
					return open();
				},
				onOpenChange: setOpen,
				title: "Delete item?",
				actions: [{
					label: "Cancel",
					onPress: () => setOpen(false)
				}, {
					label: "Delete",
					destructive: true,
					onPress: () => setOpen(false)
				}],
				children: "This can't be undone."
			}), null);
			return _el$3;
		})())(Ve$1(_tpl$2$4));
	}
	// src/screens/frames.tsx
	var _tpl$1$15 = /*@__PURE__*/ Be$1([
		"view",
		{
			"layout": {
				"direction": "vertical",
				"gap": 2
			},
			"padding": 16
		},
		["text", {
			"testId": "fps",
			"fontSize": 15
		}]
	], 2);
	var _tpl$2$3 = /*@__PURE__*/ Be$1(["view", {
		"width": 24,
		"decoration": {
			"color": "#2563eb",
			"borderRadius": 4
		}
	}], 1);
	function FramesScreen(props) {
		const count = props.count ?? 3;
		const [t, setT] = createSignal(0);
		const [fps, setFps] = createSignal(0);
		let frame = 0;
		let last = 0;
		let frames = 0;
		const loop = (time) => {
			setT(time);
			frames++;
			if (time - last >= 1e3) {
				setFps(Math.round(frames * 1e3 / (time - last)));
				frames = 0;
				last = time;
			}
			frame = requestAnimationFrame(loop);
		};
		frame = requestAnimationFrame((time) => {
			last = time;
			loop(time);
		});
		onCleanup(() => cancelAnimationFrame(frame));
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0
			});
			var _el$2 = at$1("h$text", {
				$t: _at$1,
				$i: 1
			});
			ht$1(_el$, _el$2);
			Q$1(_el$2, () => {
				return `${fps()} fps, ${count} boxes`;
			});
			Q$1(_el$, pt$1(For, {
				get each() {
					return Array.from({ length: count }, (_, i) => i);
				},
				children: (i) => ((_at$2) => (() => {
					var _el$3 = at$1("h$view", {
						$t: _at$2,
						$i: 0,
						height: count > 20 ? 2 : 24
					});
					nt$1(() => ({ translateX: 120 + 100 * Math.sin(t() / 300 + i * .3) }), (_v$, _$p) => {
						lt$1(_el$3, "transform", _v$, _$p);
					});
					return _el$3;
				})())(Ve$1(_tpl$2$3))
			}), null);
			return _el$;
		})())(Ve$1(_tpl$1$15));
	}
	// src/screens/springs.tsx
	var _tpl$1$14 = /*@__PURE__*/ Be$1([
		"view",
		{
			"layout": {
				"direction": "vertical",
				"gap": 24
			},
			"padding": 24
		},
		["view", { "layout": {
			"direction": "horizontal",
			"gap": 8
		} }],
		["text", { "testId": "steps" }],
		["text", { "testId": "view" }]
	], 4);
	var _tpl$2$2 = /*@__PURE__*/ Be$1(["view", {
		"width": 64,
		"height": 64,
		"decoration": {
			"color": "#2563eb",
			"borderRadius": 32
		}
	}], 1);
	var _tpl$3$1 = /*@__PURE__*/ Be$1([
		"view",
		{
			"height": 56,
			"padding": { "horizontal": 16 },
			"layout": { "justify": "center" }
		},
		["text", 0]
	], 2);
	var _tpl$4$1 = /*@__PURE__*/ Be$1(["view", {
		"width": 24,
		"height": 24,
		"decoration": {
			"color": "#f59e0b",
			"borderRadius": 4
		}
	}], 1);
	var _tpl$5 = /*@__PURE__*/ Be$1(["view", {
		"width": 40,
		"height": 40,
		"decoration": {
			"color": "#db2777",
			"borderRadius": 8
		}
	}], 1);
	function SpringsScreen() {
		const [pressed, setPressed] = createSignal(false);
		const [scale] = Yt(() => pressed() ? 1.2 : 1, Kt);
		const [open, setOpen] = createSignal(false);
		const [t] = Yt(() => open() ? 1 : 0);
		const [x, setX] = Yt(0);
		const [steps, setSteps] = createSignal("");
		const run = async () => {
			setSteps("right");
			await setX(160);
			setSteps("back");
			await setX(0);
			setSteps("done");
		};
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0
			});
			var _el$2 = at$1("h$view", {
				$t: _at$1,
				$i: 1
			});
			var _el$3 = at$1("h$text", {
				$t: _at$1,
				$i: 2
			});
			var _el$4 = at$1("h$text", {
				$t: _at$1,
				$i: 3
			});
			ht$1(_el$, _el$2);
			ht$1(_el$, _el$3);
			ht$1(_el$, _el$4);
			Q$1(_el$, pt$1(Pt, {
				testId: "bubble",
				onPressedChange: setPressed,
				get children() {
					return ((_at$2) => (() => {
						var _el$5 = at$1("h$view", {
							$t: _at$2,
							$i: 0
						});
						nt$1(() => ({ scale: scale() }), (_v$, _$p) => {
							lt$1(_el$5, "transform", _v$, _$p);
						});
						return _el$5;
					})())(Ve$1(_tpl$2$2));
				}
			}), _el$2);
			Q$1(_el$, pt$1(Pt, {
				testId: "toggle",
				onPress: () => setOpen((o) => !o),
				get children() {
					return ((_at$3) => (() => {
						var _el$6 = at$1("h$view", {
							$t: _at$3,
							$i: 0
						});
						var _el$7 = at$1("h$text", {
							$t: _at$3,
							$i: 1
						});
						ht$1(_el$6, _el$7);
						Q$1(_el$7, () => {
							return open() ? "On" : "Off";
						});
						nt$1(() => {
							return {
								e: {
									color: nn(t(), "#e5e7eb", "#16a34a"),
									borderRadius: 12
								},
								t: { translateX: $(t(), 0, 40) },
								a: nn(t(), "#111827", "#ffffff")
							};
						}, ({ e, t, a }, _p$) => {
							e !== _p$?.e && lt$1(_el$6, "decoration", e, _p$?.e);
							t !== _p$?.t && lt$1(_el$6, "transform", t, _p$?.t);
							a !== _p$?.a && lt$1(_el$7, "color", a, _p$?.a);
						});
						return _el$6;
					})())(Ve$1(_tpl$3$1));
				}
			}), _el$2);
			Q$1(_el$2, pt$1(For, {
				each: [
					0,
					1,
					2,
					3,
					4
				],
				children: (i) => {
					const [y] = Yt(0, {
						from: 40,
						delay: i * .05
					});
					return ((_at$4) => (() => {
						var _el$8 = at$1("h$view", {
							$t: _at$4,
							$i: 0
						});
						nt$1(() => ({ translateY: y() }), (_v$, _$p) => {
							lt$1(_el$8, "transform", _v$, _$p);
						});
						return _el$8;
					})())(Ve$1(_tpl$4$1));
				}
			}));
			Q$1(_el$, pt$1(Pt, {
				testId: "run",
				onPress: run,
				get children() {
					return ((_at$5) => (() => {
						var _el$9 = at$1("h$view", {
							$t: _at$5,
							$i: 0
						});
						nt$1(() => ({ translateX: x() }), (_v$, _$p) => {
							lt$1(_el$9, "transform", _v$, _$p);
						});
						return _el$9;
					})())(Ve$1(_tpl$5));
				}
			}), _el$3);
			Q$1(_el$3, steps);
			Q$1(_el$4, () => {
				return `${C$1.size().width} x ${C$1.size().height}, ${C$1.orientation()}`;
			});
			return _el$;
		})())(Ve$1(_tpl$1$14));
	}
	// src/screens/heroine.tsx
	var _tpl$1$13 = /*@__PURE__*/ Be$1(["view", { "layout": {
		"justify": "center",
		"align": "center"
	} }], 1);
	var _tpl$2$1 = /*@__PURE__*/ Be$1(["view", {
		"testId": "heroine-big",
		"width": 280,
		"height": 280
	}], 1);
	var _tpl$3 = /*@__PURE__*/ Be$1([
		"view",
		{
			"layout": {
				"direction": "vertical",
				"gap": 16
			},
			"padding": 24
		},
		["view", { "layout": {
			"direction": "horizontal",
			"gap": 16
		} }],
		[
			"text",
			0,
			"Tap a tile, then drag it away."
		]
	], 4);
	var _tpl$4 = /*@__PURE__*/ Be$1(["view", {
		"width": 72,
		"height": 72
	}], 1);
	var colors = [
		"#2563eb",
		"#db2777",
		"#16a34a",
		"#f59e0b"
	];
	function HeroineScreen() {
		const nav = pt();
		const open = (color) => nav.push(heroinePage({ child: () => pt$1(DragDismissable, { get children() {
			return ((_at$1) => (() => {
				var _el$ = at$1("h$view", {
					$t: _at$1,
					$i: 0,
					width: Infinity,
					height: Infinity
				});
				Q$1(_el$, pt$1(Heroine, {
					tag: color,
					get motion() {
						return CupertinoMotion.bouncy();
					},
					get children() {
						return ((_at$2) => at$1("h$view", {
							$t: _at$2,
							$i: 0,
							decoration: {
								color,
								borderRadius: 32
							}
						}))(Ve$1(_tpl$2$1));
					}
				}));
				return _el$;
			})())(Ve$1(_tpl$1$13));
		} }) }));
		return ((_at$3) => (() => {
			var _el$3 = at$1("h$view", {
				$t: _at$3,
				$i: 0
			});
			var _el$4 = at$1("h$view", {
				$t: _at$3,
				$i: 1
			});
			ht$1(_el$3, _el$4);
			Q$1(_el$4, pt$1(For, {
				each: colors,
				children: (color) => pt$1(Pt, {
					testId: `heroine-${color}`,
					onPress: () => open(color),
					get children() {
						return pt$1(Heroine, {
							tag: color,
							get motion() {
								return CupertinoMotion.bouncy();
							},
							get children() {
								return ((_at$4) => at$1("h$view", {
									$t: _at$4,
									$i: 0,
									decoration: {
										color,
										borderRadius: 12
									}
								}))(Ve$1(_tpl$4));
							}
						});
					}
				})
			}));
			return _el$3;
		})())(Ve$1(_tpl$3));
	}
	// src/screens/home.tsx
	var _tpl$1$12 = /*@__PURE__*/ Be$1([
		"scrollView",
		{ "layout": { "direction": "vertical" } },
		[
			"view",
			{ "padding": {
				"horizontal": 16,
				"top": 48,
				"bottom": 12
			} },
			[
				"text",
				{
					"fontSize": 28,
					"fontWeight": 700
				},
				"solid-fuse demos"
			],
			[
				"text",
				{
					"color": "#6B7280",
					"fontSize": 14
				},
				"Playground for widget primitives"
			]
		]
	], 6);
	function HomeScreen() {
		const nav = pt();
		p("benchFrames", ({ count }) => {
			if (count) nav.push(() => pt$1(FramesScreen, { count }));
			else nav.pop();
		});
		p("benchPing", () => Date.now());
		return ((_at$1) => (() => {
			var _el$ = at$1("h$scrollView", {
				$t: _at$1,
				$i: 0
			});
			ht$1(_el$, at$1("h$view", {
				$t: _at$1,
				$i: 1
			}));
			Q$1(_el$, pt$1(MenuItem, {
				label: "counter",
				onTap: () => nav.push(() => pt$1(CounterScreen, {}))
			}), null);
			Q$1(_el$, pt$1(MenuItem, {
				label: "textField",
				onTap: () => nav.push(() => pt$1(TextFieldScreen, {}))
			}), null);
			Q$1(_el$, pt$1(MenuItem, {
				label: "icon",
				onTap: () => nav.push(() => pt$1(IconScreen, {}))
			}), null);
			Q$1(_el$, pt$1(MenuItem, {
				label: "list",
				onTap: () => nav.push(() => pt$1(ListScreen, {}))
			}), null);
			Q$1(_el$, pt$1(MenuItem, {
				label: "builder",
				onTap: () => nav.push(() => pt$1(BuilderScreen, {}))
			}), null);
			Q$1(_el$, pt$1(MenuItem, {
				label: "scrollController",
				onTap: () => nav.push(() => pt$1(ScrollScreen, {}))
			}), null);
			Q$1(_el$, pt$1(MenuItem, {
				label: "core widgets",
				onTap: () => nav.push(() => pt$1(CoreScreen, {}))
			}), null);
			Q$1(_el$, pt$1(MenuItem, {
				label: "material",
				onTap: () => nav.push(() => pt$1(MaterialScreen, {}))
			}), null);
			Q$1(_el$, pt$1(MenuItem, {
				label: "cupertino",
				onTap: () => nav.push(() => pt$1(CupertinoScreen, {}))
			}), null);
			Q$1(_el$, pt$1(MenuItem, {
				label: "adaptive",
				onTap: () => nav.push(() => pt$1(AdaptiveScreen, {}))
			}), null);
			Q$1(_el$, pt$1(MenuItem, {
				label: "animation frames",
				onTap: () => nav.push(() => pt$1(FramesScreen, {}))
			}), null);
			Q$1(_el$, pt$1(MenuItem, {
				label: "springs",
				onTap: () => nav.push(() => pt$1(SpringsScreen, {}))
			}), null);
			Q$1(_el$, pt$1(MenuItem, {
				label: "heroine",
				onTap: () => nav.push(() => pt$1(HeroineScreen, {}))
			}), null);
			Q$1(_el$, pt$1(MenuItem, {
				label: "routes",
				onTap: () => nav.push("/users")
			}), null);
			Q$1(_el$, pt$1(MenuItem, {
				label: "tabs",
				onTap: () => nav.push("/tabs")
			}), null);
			return _el$;
		})())(Ve$1(_tpl$1$12));
	}
	// src/app/settings.tsx
	var _tpl$1$11 = /*@__PURE__*/ Be$1([
		"view",
		{
			"layout": {
				"direction": "vertical",
				"gap": 12
			},
			"padding": {
				"horizontal": 16,
				"top": 48
			},
			"decoration": { "color": "#FFFFFF" }
		},
		[
			"text",
			{
				"fontSize": 24,
				"fontWeight": 700
			},
			"Settings"
		]
	], 3);
	function Settings() {
		const nav = pt();
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0,
				width: Infinity,
				height: Infinity
			});
			ht$1(_el$, at$1("h$text", {
				$t: _at$1,
				$i: 1
			}));
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.pop(),
				children: "Done"
			}), null);
			return _el$;
		})())(Ve$1(_tpl$1$11));
	}
	// src/app/share.tsx
	var _tpl$1$10 = /*@__PURE__*/ Be$1([
		"flutter_FadeTransition",
		0,
		["flutter_ScaleTransition", 0]
	], 2);
	var _tpl$2 = /*@__PURE__*/ Be$1([
		"view",
		{
			"layout": { "direction": "vertical" },
			"decoration": { "color": "#EEF2FF" }
		},
		[
			"view",
			{ "padding": {
				"horizontal": 16,
				"top": 48,
				"bottom": 12
			} },
			[
				"text",
				{
					"fontSize": 20,
					"fontWeight": 700
				},
				"Share flow"
			]
		],
		["view", { "flex": 1 }]
	], 5);
	var page = (child) => Q({
		child,
		transition: (content, { animation }) => ((_at$1) => (() => {
			var _el$ = at$1("h$flutter_FadeTransition", {
				$t: _at$1,
				$i: 0,
				opacity: animation
			});
			var _el$2 = at$1("h$flutter_ScaleTransition", {
				$t: _at$1,
				$i: 1,
				scale: animation
			});
			ht$1(_el$, _el$2);
			Q$1(_el$2, content);
			return _el$;
		})())(Ve$1(_tpl$1$10))
	});
	function Share() {
		return ((_at$2) => (() => {
			var _el$3 = at$1("h$view", {
				$t: _at$2,
				$i: 0,
				width: Infinity,
				height: Infinity
			});
			var _el$4 = at$1("h$view", {
				$t: _at$2,
				$i: 4
			});
			ht$1(_el$3, _el$4);
			Q$1(_el$4, pt$1(Tt, {}));
			return _el$3;
		})())(Ve$1(_tpl$2));
	}
	// src/app/tabs.tsx
	var _tpl$1$9 = /*@__PURE__*/ Be$1([
		"view",
		{ "layout": { "direction": "vertical" } },
		["view", { "flex": 1 }],
		["view", {
			"layout": {
				"direction": "horizontal",
				"justify": "spaceAround"
			},
			"padding": 16,
			"decoration": { "color": "#F3F4F6" }
		}]
	], 3);
	var tabs = [{
		index: "/tabs",
		label: "Feed tab"
	}, {
		index: "/tabs/profile",
		label: "Profile tab"
	}];
	function TabsPage() {
		const page = mt();
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0,
				width: Infinity,
				height: Infinity
			});
			var _el$2 = at$1("h$view", {
				$t: _at$1,
				$i: 1
			});
			var _el$3 = at$1("h$view", {
				$t: _at$1,
				$i: 2
			});
			ht$1(_el$, _el$2);
			ht$1(_el$, _el$3);
			Q$1(_el$2, pt$1(Et, { get children() {
				return pt$1(For, {
					each: tabs,
					children: (t) => pt$1(Tt, { get index() {
						return t.index;
					} })
				});
			} }));
			Q$1(_el$3, pt$1(For, {
				each: tabs,
				children: (t) => pt$1(Pt, {
					onPress: () => page.show(t.index),
					get children() {
						var _el$4 = at$1("text");
						Q$1(_el$4, () => {
							return t.label;
						});
						nt$1(() => page.active() === t.index ? 700 : 400, (_v$, _$p) => {
							lt$1(_el$4, "fontWeight", _v$, _$p);
						});
						return _el$4;
					}
				})
			}));
			return _el$;
		})())(Ve$1(_tpl$1$9));
	}
	// src/app/share/contact.tsx
	var _tpl$1$8 = /*@__PURE__*/ Be$1([
		"view",
		{
			"layout": {
				"direction": "vertical",
				"gap": 12
			},
			"padding": 16,
			"decoration": { "color": "#FFFFFF" }
		},
		[
			"text",
			0,
			"Contact picker"
		]
	], 3);
	function Contact() {
		const nav = pt();
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0,
				width: Infinity,
				height: Infinity
			});
			ht$1(_el$, at$1("h$text", {
				$t: _at$1,
				$i: 1
			}));
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.pop(),
				children: "Back"
			}), null);
			return _el$;
		})())(Ve$1(_tpl$1$8));
	}
	// src/app/share/index.tsx
	var _tpl$1$7 = /*@__PURE__*/ Be$1([
		"view",
		{
			"layout": {
				"direction": "vertical",
				"gap": 12
			},
			"padding": 16,
			"decoration": { "color": "#FFFFFF" }
		},
		[
			"text",
			0,
			"Share home"
		]
	], 3);
	function ShareHome() {
		const nav = pt();
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0,
				width: Infinity,
				height: Infinity
			});
			ht$1(_el$, at$1("h$text", {
				$t: _at$1,
				$i: 1
			}));
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.push("/share/contact"),
				children: "Pick contact"
			}), null);
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.pop(),
				children: "Close"
			}), null);
			return _el$;
		})())(Ve$1(_tpl$1$7));
	}
	// src/app/tabs/index.tsx
	var _tpl$1$6 = /*@__PURE__*/ Be$1([
		"view",
		{
			"layout": {
				"direction": "vertical",
				"gap": 12
			},
			"padding": {
				"horizontal": 16,
				"top": 48
			},
			"decoration": { "color": "#FFFFFF" }
		},
		[
			"text",
			{
				"fontSize": 24,
				"fontWeight": 700
			},
			"Feed"
		]
	], 3);
	function Feed() {
		const nav = pt();
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0,
				width: Infinity,
				height: Infinity
			});
			ht$1(_el$, at$1("h$text", {
				$t: _at$1,
				$i: 1
			}));
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.push("/tabs/post/1"),
				children: "Open post"
			}), null);
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.push("/tabs/video/7"),
				children: "Open video"
			}), null);
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.push("/tabs/profile/edit"),
				children: "Edit profile"
			}), null);
			return _el$;
		})())(Ve$1(_tpl$1$6));
	}
	// src/app/tabs/profile.tsx
	var _tpl$1$5 = /*@__PURE__*/ Be$1([
		"view",
		{
			"layout": {
				"direction": "vertical",
				"gap": 12
			},
			"padding": {
				"horizontal": 16,
				"top": 48
			},
			"decoration": { "color": "#FFFFFF" }
		},
		[
			"text",
			{
				"fontSize": 24,
				"fontWeight": 700
			},
			"Profile"
		]
	], 3);
	function Profile() {
		const nav = pt();
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0,
				width: Infinity,
				height: Infinity
			});
			ht$1(_el$, at$1("h$text", {
				$t: _at$1,
				$i: 1
			}));
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.push("/tabs/video/8"),
				children: "Open video"
			}), null);
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.push("/settings"),
				children: "Settings"
			}), null);
			return _el$;
		})())(Ve$1(_tpl$1$5));
	}
	// src/app/tabs/post/[id].tsx
	var _tpl$1$4 = /*@__PURE__*/ Be$1([
		"view",
		{
			"layout": {
				"direction": "vertical",
				"gap": 12
			},
			"padding": {
				"horizontal": 16,
				"top": 48
			},
			"decoration": { "color": "#FFFFFF" }
		},
		["text", {
			"fontSize": 24,
			"fontWeight": 700
		}]
	], 2);
	function Post(props) {
		const nav = pt();
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0,
				width: Infinity,
				height: Infinity
			});
			var _el$2 = at$1("h$text", {
				$t: _at$1,
				$i: 1
			});
			ht$1(_el$, _el$2);
			Q$1(_el$2, () => {
				return `Post ${props.id}`;
			});
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.pop(),
				children: "Back"
			}), null);
			return _el$;
		})())(Ve$1(_tpl$1$4));
	}
	// src/app/tabs/profile/edit.tsx
	var _tpl$1$3 = /*@__PURE__*/ Be$1([
		"view",
		{
			"layout": {
				"direction": "vertical",
				"gap": 12
			},
			"padding": {
				"horizontal": 16,
				"top": 48
			},
			"decoration": { "color": "#FFFFFF" }
		},
		[
			"text",
			{
				"fontSize": 24,
				"fontWeight": 700
			},
			"Editing profile"
		]
	], 3);
	function EditProfile() {
		const nav = pt();
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0,
				width: Infinity,
				height: Infinity
			});
			ht$1(_el$, at$1("h$text", {
				$t: _at$1,
				$i: 1
			}));
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.pop(),
				children: "Back"
			}), null);
			return _el$;
		})())(Ve$1(_tpl$1$3));
	}
	// src/app/tabs/video/[id].tsx
	var _tpl$1$2 = /*@__PURE__*/ Be$1([
		"view",
		{
			"layout": {
				"direction": "vertical",
				"gap": 12
			},
			"padding": {
				"horizontal": 16,
				"top": 48
			},
			"decoration": { "color": "#FFFFFF" }
		},
		["text", {
			"fontSize": 24,
			"fontWeight": 700
		}]
	], 2);
	function Video(props) {
		const nav = pt();
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0,
				width: Infinity,
				height: Infinity
			});
			var _el$2 = at$1("h$text", {
				$t: _at$1,
				$i: 1
			});
			ht$1(_el$, _el$2);
			Q$1(_el$2, () => {
				return `Video ${props.id}`;
			});
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.push(`/tabs/post/${props.id}`),
				children: "Post about it"
			}), null);
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.push(`/tabs/video/${Number(props.id) + 1}`),
				children: "Next video"
			}), null);
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.pop(),
				children: "Back"
			}), null);
			return _el$;
		})())(Ve$1(_tpl$1$2));
	}
	// src/app/users/_people.ts
	var people = [
		"Ada",
		"Grace",
		"Linus"
	];
	// src/app/users/[id].tsx
	var _tpl$1$1 = /*@__PURE__*/ Be$1([
		"view",
		{
			"layout": {
				"direction": "vertical",
				"gap": 12
			},
			"padding": {
				"horizontal": 16,
				"top": 48
			},
			"decoration": { "color": "#FFFFFF" }
		},
		["text", {
			"fontSize": 24,
			"fontWeight": 700
		}]
	], 2);
	var parse = { id: Number };
	function User(props) {
		const nav = pt();
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0,
				width: Infinity,
				height: Infinity
			});
			var _el$2 = at$1("h$text", {
				$t: _at$1,
				$i: 1
			});
			ht$1(_el$, _el$2);
			Q$1(_el$2, () => {
				return `User ${people[props.id]}`;
			});
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.push("/share"),
				children: "Share"
			}), null);
			Q$1(_el$, pt$1(Button, {
				onTap: () => nav.pop(),
				children: "Back"
			}), null);
			return _el$;
		})())(Ve$1(_tpl$1$1));
	}
	// src/app/users/index.tsx
	var _tpl$1 = /*@__PURE__*/ Be$1([
		"view",
		{
			"layout": { "direction": "vertical" },
			"padding": { "top": 48 },
			"decoration": { "color": "#FFFFFF" }
		},
		[
			"view",
			{ "padding": 16 },
			[
				"text",
				{
					"fontSize": 24,
					"fontWeight": 700
				},
				"People"
			]
		],
		["view", { "padding": 16 }]
	], 5);
	function Users() {
		const nav = pt();
		return ((_at$1) => (() => {
			var _el$ = at$1("h$view", {
				$t: _at$1,
				$i: 0,
				width: Infinity,
				height: Infinity
			});
			var _el$2 = at$1("h$view", {
				$t: _at$1,
				$i: 1
			});
			var _el$3 = at$1("h$view", {
				$t: _at$1,
				$i: 4
			});
			ht$1(_el$, _el$2);
			ht$1(_el$, _el$3);
			Q$1(_el$, pt$1(For, {
				each: people,
				children: (name, i) => pt$1(MenuItem, {
					label: name,
					onTap: () => nav.push(`/users/${i()}`)
				})
			}), _el$3);
			Q$1(_el$3, pt$1(Button, {
				onTap: () => nav.go("/share/contact"),
				children: "Open /share/contact"
			}));
			return _el$;
		})())(Ve$1(_tpl$1));
	}
	ke({
		path: "/",
		component: HomeScreen
	});
	ke({
		path: "/settings",
		component: Settings
	});
	var r2 = ke({
		path: "/share",
		page,
		component: Share
	});
	var r3 = ke({
		path: "/tabs",
		component: TabsPage
	});
	ke({
		path: "/share/contact",
		in: r2,
		component: Contact
	});
	ke({
		path: "/share",
		in: r2,
		component: ShareHome
	});
	ke({
		path: "/tabs",
		in: r3,
		component: Feed
	});
	ke({
		path: "/tabs/profile",
		in: r3,
		component: Profile
	});
	ke({
		path: "/tabs/post/:id",
		in: r3,
		component: Post
	});
	ke({
		path: "/tabs/profile/edit",
		in: r3,
		component: EditProfile
	});
	ke({
		path: "/tabs/video/:id",
		in: r3,
		component: Video
	});
	ke({
		path: "/users/:id",
		parse,
		component: User
	});
	ke({
		path: "/users",
		component: Users
	});
	/** The app: `src/app.tsx`, which draws the app's own stack. */
	function FileRoutes() {
		return pt$1(App, {});
	}
	// src/index.tsx
	mt$1(() => pt$1(FileRoutes, {}));
})();

//# sourceMappingURL=bundle.js.map