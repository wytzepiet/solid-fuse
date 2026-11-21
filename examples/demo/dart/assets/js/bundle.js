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
	var createMemo = (...args) => {
		return (_createMemo || createMemo$1)(...args);
	};
	var createSignal = createSignal$1;
	var createRoot = createRoot$1;
	var createRenderEffect = createRenderEffect$1;
	function createComponent(Comp, props, name, loc) {
		return untrack(() => Comp(props || {}));
	}
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
	// ../../packages/solid-fuse/dist/index.js
	function p(e) {
		let t = globalThis.__fuseDevServer;
		if (!t) console.error(e);
		else try {
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
		let t = /* @__PURE__ */ new Set([e]), n = e;
		for (;;) {
			let e = n.cause;
			if (!(e instanceof Error) || t.has(e)) return n;
			t.add(e), n = e;
		}
	}
	var m = /* @__PURE__ */ new Map();
	var h;
	function g(e, t) {
		m.set(e, t);
	}
	function _(e, t = {}) {
		fjs.bridge_call({
			channel: e,
			...t
		});
	}
	function se(e, t = {}, n) {
		v?.();
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
	function ce(e) {
		h = e;
	}
	var v;
	function le(e) {
		v = e;
	}
	globalThis.__dispatch = async (e, t) => {
		let n = m.get(e);
		try {
			let e = n ? await n(t) : void 0;
			return h?.(), e;
		} catch (e) {
			h?.(), p(e);
		}
	};
	var y = {
		send: _,
		call: se,
		on: g
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
				this.readyState !== 2 && this.readyState !== 3 && (this.readyState = 2, _("_ws", {
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
	var [C, w] = createSignal(S.brightness);
	g("_brightness", (e) => w(e.value));
	var T = {
		brightness: C,
		platform: S.platform,
		mode: S.mode
	};
	var fe = 0;
	var E;
	var D = class {
		constructor(e) {
			x(this, "type", void 0), x(this, "id", fe++), x(this, "props", {}), x(this, "children", []), x(this, "parent", void 0), this.type = e;
		}
	};
	var O = /* @__PURE__ */ new Map();
	g("_functionCall", (e) => {
		let t = `${e.nodeId}:${e.name}`;
		O.get(t)?.(e.value);
	});
	var k = [];
	var A = new D("root");
	var j = !1;
	var M = !1;
	function N() {
		flush(), j = !1, k.length !== 0 && (_("_ops", { json: JSON.stringify(k) }), k.length = 0);
	}
	function P() {
		j || M || (j = !0, Promise.resolve().then(N));
	}
	ce(N), le(N);
	var { render: F, effect: I, memo: L, createComponent: R, createElement: z, createTextNode: B, insertNode: V, insert: H, spread: U, setProp: W, mergeProps: G, ...pe } = createRenderer({
		createElement(e) {
			let t = new D(e), n = {};
			return T.mode !== "release" && E && (n._component = E), k.push({
				op: "create",
				id: t.id,
				type: e,
				props: n
			}), t;
		},
		createTextNode(e) {
			let t = new D("__text__");
			return t.props.text = e, k.push({
				op: "create",
				id: t.id,
				type: "__text__",
				props: { text: e }
			}), t;
		},
		replaceText(e, t) {
			e.props.text = t, k.push({
				op: "setText",
				id: e.id,
				text: t
			}), P();
		},
		isTextNode(e) {
			return e.type === "__text__";
		},
		setProperty(e, t, n) {
			if (typeof n == "function") O.set(`${e.id}:${t}`, n), e.props[t] = !0, k.push({
				op: "setProp",
				id: e.id,
				name: t,
				value: !0
			});
			else {
				let r = n instanceof D ? n : n?.node instanceof D ? n.node : null;
				e.props[t] = n, k.push(r ? {
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
			P();
		},
		insertNode(e, t, n) {
			t.parent = e;
			let r;
			if (n) {
				let i = e.children.indexOf(n);
				i >= 0 ? (e.children.splice(i, 0, t), r = i) : (e.children.push(t), r = e.children.length - 1);
			} else e.children.push(t), r = e.children.length - 1;
			k.push({
				op: "insert",
				parentId: e.id,
				childId: t.id,
				index: r
			}), P();
		},
		removeNode(e, t) {
			let n = e.children.indexOf(t);
			n >= 0 && e.children.splice(n, 1), t.parent = void 0, k.push({
				op: "remove",
				parentId: e.id,
				childId: t.id
			}), P();
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
	function K(e, t) {
		if (T.mode === "release") return R(e, t);
		let n = E;
		E = (e.name || "").replace(/^\[.*?\]/, "") || void 0;
		try {
			return R(e, t);
		} finally {
			E = n;
		}
	}
	function me(e) {
		M = !0;
		let t;
		try {
			t = F(e, A);
		} catch (e) {
			return M = !1, p(e), () => {};
		}
		return M = !1, N(), () => {
			typeof t == "function" && t();
			for (let e of A.children) k.push({
				op: "remove",
				parentId: A.id,
				childId: e.id
			});
			A.children = [], O.clear();
		};
	}
	pe.ref;
	function q(e, t) {
		let n = createMemo(e);
		return createMemo(() => {
			let e = n();
			switch (typeof e) {
				case "function": return untrack(() => e(t));
				case "string": {
					let n = z(e);
					return U(n, t), n;
				}
			}
		});
	}
	function J(e) {
		return q(() => e.component, omit(e, "component"));
	}
	function Y({ child: e, ...t }) {
		return {
			type: "materialPage",
			child: e,
			props: t
		};
	}
	var X = createContext();
	function Z(e = {}) {
		let t = 0, n = untrack(() => {
			let t = e.initialPage;
			return typeof t == "function" ? Y({ child: t }) : t;
		}), [i, a] = createSignal(n ? [{
			id: t++,
			config: n,
			resolve: () => {}
		}] : [], { ownedWrite: !0 });
		function o(e) {
			let n = typeof e == "function" ? Y({ child: e }) : e;
			return new Promise((e) => {
				let r = {
					id: t++,
					config: n,
					resolve: e
				};
				a((e) => [...e, r]);
			});
		}
		function s(e, t) {
			let n;
			a((t) => t.filter((t) => t.id !== e || (n = t, !1))), n?.resolve(t);
		}
		return getOwner() && onCleanup(() => {
			for (let e of i()) e.resolve(null);
			a([]);
		}), {
			pages: i,
			stackDepth: () => i().length,
			push: (e) => o(e),
			pop: (e) => {
				let t = i();
				t.length <= 1 ? console.warn("[Fuse] nav.pop() ignored — cannot pop the root page") : s(t[t.length - 1].id, e);
			},
			pushReplacement: (e, t) => {
				let n = i();
				return n.length > 0 && s(n[n.length - 1].id, t), o(e);
			},
			popUntil: (e) => {
				let t = i();
				if (e) {
					let n = t.findLastIndex((t) => t.config.props.name === e);
					if (n < 0) {
						console.warn(`[Fuse] nav.popUntil(${JSON.stringify(e)}) ignored — no page with that name on the stack`);
						return;
					}
					let r = t.slice(n + 1);
					a(t.slice(0, n + 1));
					for (let e of r) e.resolve(null);
				} else {
					let e = t.slice(1);
					a(t.slice(0, 1));
					for (let t of e) t.resolve(null);
				}
			},
			replaceAll: (e) => {
				if (e.length === 0) return console.warn("[Fuse] nav.replaceAll([]) ignored — would leave the navigator empty"), [];
				let t = i();
				a([]);
				for (let e of t) e.resolve(null);
				return e.map((e) => o(e));
			},
			onDidRemovePage: (e) => s(e, null)
		};
	}
	function ge() {
		let e = useContext(X);
		if (!e) throw Error("useNavigation must be called inside a <Navigator>");
		return e;
	}
	function _e(e) {
		let t = untrack(() => e.controller ?? Z({ initialPage: e.initialPage }));
		return K(X, {
			value: t,
			get children() {
				var e = z("navigator", { onDidRemovePage: (e) => t.onDidRemovePage(e.id) });
				return H(e, K(For, {
					get each() {
						return t.pages();
					},
					keyed: (e) => e.id,
					children: (e) => K(J, G({
						get component() {
							return e().config.type;
						},
						get _pageId() {
							return e().id;
						}
					}, () => e().config.props, { get children() {
						return e().config.child();
					} }))
				})), e;
			}
		});
	}
	function ve(e) {
		var t = z("view");
		return U(t, e, !1), t;
	}
	function ye(e) {
		var t = z("text");
		return U(t, e, !1), t;
	}
	function be(e) {
		var t = z("icon");
		return U(t, e, !1), t;
	}
	function Q(e) {
		var t = z("gestureDetector");
		return U(t, e, !1), t;
	}
	function xe(e) {
		var t = z("scrollView");
		return U(t, e, !1), t;
	}
	function we(e) {
		var t = z("textField");
		return U(t, e, !1), t;
	}
	function $(e, t = {}) {
		let n = new D(e), r = {}, i = [];
		for (let [e, a] of Object.entries(t)) typeof a == "function" || a instanceof D || a?.node instanceof D ? i.push([e, a]) : (r[e] = a, n.props[e] = a);
		k.push({
			op: "create",
			id: n.id,
			type: e,
			props: r
		});
		for (let [e, t] of i) W(n, e, t);
		P();
		let a = !1, o = () => {
			a || (a = !0, k.push({
				op: "dispose",
				id: n.id
			}), P());
		};
		return getOwner() && onCleanup(o), {
			node: n,
			call: (e, t, r) => y.call("_handleCall", {
				node: n.id,
				method: e,
				value: t
			}, r),
			dispose: o
		};
	}
	function Te(e = {}) {
		let [t, n] = createSignal(e.initialScrollOffset ?? 0), { node: r, call: i, dispose: a } = $("scrollController", {
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
	function Ee() {
		let [e, t] = createSignal(!1), { node: n, call: r, dispose: i } = $("focusNode", { setHasFocus: t });
		return {
			node: n,
			hasFocus: e,
			focus: () => r("focus"),
			unfocus: () => r("unfocus"),
			dispose: i
		};
	}
	// src/ui.tsx
	function Button(props) {
		return K(Q, {
			get onTap() {
				return props.onTap;
			},
			get children() {
				return K(ve, {
					padding: {
						horizontal: 16,
						vertical: 12
					},
					decoration: {
						color: "#2563eb",
						borderRadius: 8
					},
					get children() {
						return K(ye, {
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
		return K(ve, {
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
		return K(Q, {
			get onTap() {
				return props.onTap;
			},
			get children() {
				return K(ve, {
					padding: 16,
					decoration: { border: { bottom: {
						width: 1,
						color: "#E5E7EB"
					} } },
					get children() {
						return K(ye, {
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
	// src/screens/counter.tsx
	function CounterScreen() {
		const [count, setCount] = createSignal(0);
		return K(ve, {
			flex: {
				direction: "vertical",
				align: "center",
				gap: 32
			},
			padding: 24,
			get children() {
				return [K(ye, {
					fontSize: 96,
					fontWeight: "bold",
					color: "#2563eb",
					get children() {
						return count();
					}
				}), K(ve, {
					flex: {
						direction: "horizontal",
						gap: 16,
						align: "center"
					},
					get children() {
						return [
							K(Q, {
								onTap: () => setCount((c) => c - 1),
								get children() {
									return K(ve, {
										width: 64,
										height: 64,
										decoration: {
											color: "#ef4444",
											borderRadius: 32
										},
										flex: {
											align: "center",
											justify: "center"
										},
										get children() {
											return K(ye, {
												fontSize: 28,
												fontWeight: "bold",
												color: "#fff",
												children: "−"
											});
										}
									});
								}
							}),
							K(Q, {
								onTap: () => setCount(0),
								get children() {
									return K(ve, {
										height: 64,
										padding: { horizontal: 24 },
										decoration: {
											color: "#6b7280",
											borderRadius: 32
										},
										flex: {
											align: "center",
											justify: "center"
										},
										get children() {
											return K(ye, {
												fontSize: 15,
												fontWeight: "semiBold",
												color: "#fff",
												children: "Reset"
											});
										}
									});
								}
							}),
							K(Q, {
								onTap: () => setCount((c) => c + 1),
								get children() {
									return K(ve, {
										width: 64,
										height: 64,
										decoration: {
											color: "#22c55e",
											borderRadius: 32
										},
										flex: {
											align: "center",
											justify: "center"
										},
										get children() {
											return K(ye, {
												fontSize: 28,
												fontWeight: "bold",
												color: "#fff",
												children: "+"
											});
										}
									});
								}
							})
						];
					}
				})];
			}
		});
	}
	// ../../packages/solid-fuse/dist/icons/material.js
	var e = (e, t = !1) => ({
		codePoint: e,
		fontFamily: "MaterialIcons",
		...t && { matchTextDirection: !0 }
	});
	var EY = /*#__PURE__*/ e(57947);
	var lre = /*#__PURE__*/ e(58136);
	var coe = /*#__PURE__*/ e(58172);
	var Bge = /*#__PURE__*/ e(58286);
	var x4e = /*#__PURE__*/ e(58727);
	var _6e = /*#__PURE__*/ e(58751);
	var est = /*#__PURE__*/ e(58873);
	// src/screens/text-field.tsx
	function TextFieldScreen() {
		const nav = ge();
		const [name, setName] = createSignal("");
		const [digits, setDigits] = createSignal("");
		const focus = Ee();
		return K(xe, {
			flex: {
				direction: "vertical",
				gap: 16
			},
			get children() {
				return [
					K(ve, {
						padding: {
							horizontal: 16,
							top: 16,
							bottom: 8
						},
						get children() {
							return [K(ye, {
								fontSize: 24,
								fontWeight: "bold",
								children: "textField"
							}), K(ye, {
								color: "#6B7280",
								fontSize: 14,
								children: "Reactive value, focus control, filtering"
							})];
						}
					}),
					K(ve, {
						padding: { horizontal: 16 },
						flex: {
							direction: "vertical",
							gap: 24
						},
						get children() {
							return [
								K(ve, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [
											K(ye, {
												fontWeight: "semiBold",
												children: "Name"
											}),
											K(we, {
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
											K(ye, {
												color: "#6B7280",
												fontSize: 13,
												get children() {
													return [
														"value = \"",
														L(() => {
															return name();
														}),
														"\""
													];
												}
											}),
											K(Row, { get children() {
												return [K(Button, {
													onTap: () => setName("Override!"),
													children: "external setName"
												}), K(Button, {
													onTap: () => setName(""),
													children: "clear"
												})];
											} })
										];
									}
								}),
								K(ve, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [
											K(ye, {
												fontWeight: "semiBold",
												children: "Focus control"
											}),
											K(we, {
												focusNode: focus,
												placeholder: "Controlled by buttons below",
												decoration: {
													border: "outline",
													contentPadding: 12
												}
											}),
											K(ye, {
												color: "#6B7280",
												fontSize: 13,
												get children() {
													return ["hasFocus = ", L(() => {
														return focus.hasFocus() ? "true" : "false";
													})];
												}
											}),
											K(Row, { get children() {
												return [K(Button, {
													onTap: () => focus.focus(),
													children: "focus"
												}), K(Button, {
													onTap: () => focus.unfocus(),
													children: "unfocus"
												})];
											} })
										];
									}
								}),
								K(ve, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [K(ye, {
											fontWeight: "semiBold",
											children: "Digits only"
										}), K(we, {
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
								K(ve, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [
											K(ye, {
												fontWeight: "semiBold",
												children: "Slot widgets"
											}),
											K(we, {
												placeholder: "Search…",
												get prefixIcon() {
													return K(be, {
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
											K(we, {
												placeholder: "Password",
												obscureText: true,
												get prefixIcon() {
													return K(be, {
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
								K(ve, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [K(ye, {
											fontWeight: "semiBold",
											children: "Autofocus"
										}), K(ye, {
											color: "#6B7280",
											fontSize: 13,
											children: "(would autofocus on mount — disabled here so it doesn't steal focus)"
										})];
									}
								})
							];
						}
					}),
					K(ve, {
						padding: 16,
						get children() {
							return K(Button, {
								onTap: () => nav.pop(),
								children: "Back"
							});
						}
					})
				];
			}
		});
	}
	// src/screens/icon.tsx
	function IconScreen() {
		const nav = ge();
		const [size, setSize] = createSignal(32);
		const [color, setColor] = createSignal("#111827");
		return K(xe, {
			flex: {
				direction: "vertical",
				gap: 16
			},
			get children() {
				return [
					K(ve, {
						padding: {
							horizontal: 16,
							top: 16,
							bottom: 8
						},
						get children() {
							return [K(ye, {
								fontSize: 24,
								fontWeight: "bold",
								children: "icon"
							}), K(ye, {
								color: "#6B7280",
								fontSize: 14,
								children: "Baseline icon rendering + reactive props"
							})];
						}
					}),
					K(ve, {
						padding: { horizontal: 16 },
						flex: {
							direction: "vertical",
							gap: 24
						},
						get children() {
							return [
								K(ve, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [K(ye, {
											fontWeight: "semiBold",
											children: "Static grid"
										}), K(ve, {
											flex: {
												direction: "horizontal",
												gap: 16,
												align: "center"
											},
											get children() {
												return [
													K(be, {
														data: x4e,
														size: 32
													}),
													K(be, {
														data: Bge,
														size: 32
													}),
													K(be, {
														data: lre,
														size: 32
													}),
													K(be, {
														data: _6e,
														size: 32
													}),
													K(be, {
														data: EY,
														size: 32,
														color: "#EF4444"
													}),
													K(be, {
														data: est,
														size: 32,
														color: "#F59E0B"
													})
												];
											}
										})];
									}
								}),
								K(ve, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [
											K(ye, {
												fontWeight: "semiBold",
												children: "Reactive props"
											}),
											K(ve, {
												flex: {
													direction: "horizontal",
													gap: 12,
													align: "center"
												},
												padding: 12,
												get children() {
													return [K(be, {
														data: EY,
														get size() {
															return size();
														},
														get color() {
															return color();
														}
													}), K(ye, {
														color: "#6B7280",
														fontSize: 13,
														get children() {
															return [
																"size = ",
																L(() => {
																	return size();
																}),
																", color = ",
																L(() => {
																	return color();
																})
															];
														}
													})];
												}
											}),
											K(Row, { get children() {
												return [
													K(Button, {
														onTap: () => setSize(16),
														children: "16"
													}),
													K(Button, {
														onTap: () => setSize(32),
														children: "32"
													}),
													K(Button, {
														onTap: () => setSize(64),
														children: "64"
													})
												];
											} }),
											K(Row, { get children() {
												return [
													K(Button, {
														onTap: () => setColor("#EF4444"),
														children: "red"
													}),
													K(Button, {
														onTap: () => setColor("#10B981"),
														children: "green"
													}),
													K(Button, {
														onTap: () => setColor("#3B82F6"),
														children: "blue"
													})
												];
											} })
										];
									}
								}),
								K(ve, {
									flex: {
										direction: "vertical",
										gap: 6
									},
									get children() {
										return [K(ye, {
											fontWeight: "semiBold",
											children: "Icon + text row"
										}), K(ve, {
											flex: {
												direction: "horizontal",
												gap: 8,
												align: "center"
											},
											padding: 12,
											get children() {
												return [K(be, {
													data: coe,
													size: 20,
													color: "#3B82F6"
												}), K(ye, { children: "Inline icon + text composition" })];
											}
										})];
									}
								})
							];
						}
					}),
					K(ve, {
						padding: 16,
						get children() {
							return K(Button, {
								onTap: () => nav.pop(),
								children: "Back"
							});
						}
					})
				];
			}
		});
	}
	// src/screens/scroll.tsx
	function ScrollScreen() {
		const nav = ge();
		const scroll = Te({ initialScrollOffset: 120 });
		return K(xe, {
			controller: scroll,
			flex: {
				direction: "vertical",
				gap: 12
			},
			get children() {
				return [
					K(ve, {
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
							return [K(ye, {
								fontSize: 24,
								fontWeight: "bold",
								children: "scrollController"
							}), K(ye, {
								color: "#6B7280",
								fontSize: 14,
								children: "initialScrollOffset, reactive offset, imperative scroll"
							})];
						}
					}),
					K(ve, {
						padding: { horizontal: 16 },
						flex: {
							direction: "vertical",
							gap: 8
						},
						get children() {
							return [K(ye, {
								fontWeight: "semiBold",
								get children() {
									return ["scrollOffset = ", L(() => {
										return scroll.scrollOffset().toFixed(1);
									})];
								}
							}), K(xe, {
								scrollDirection: "horizontal",
								flex: {
									direction: "horizontal",
									gap: 8,
									align: "center"
								},
								get children() {
									return [K(Button, {
										onTap: () => scroll.jumpTo(0),
										children: "jumpTo(0)"
									}), K(Button, {
										onTap: () => scroll.animateTo(1200, { duration: 800 }),
										children: "animateTo(1200)"
									})];
								}
							})];
						}
					}),
					K(ve, {
						padding: 16,
						flex: {
							direction: "vertical",
							gap: 8
						},
						get children() {
							return Array.from({ length: 40 }, (_, i) => K(ve, {
								padding: 16,
								decoration: {
									color: i % 2 === 0 ? "#F3F4F6" : "#E5E7EB",
									borderRadius: 8
								},
								get children() {
									return K(ye, { get children() {
										return ["row ", i];
									} });
								}
							}));
						}
					}),
					K(ve, {
						padding: 16,
						get children() {
							return K(Button, {
								onTap: () => nav.pop(),
								children: "Back"
							});
						}
					})
				];
			}
		});
	}
	// src/screens/home.tsx
	function HomeScreen() {
		const nav = ge();
		return K(ve, {
			flex: { direction: "vertical" },
			get children() {
				return [
					K(ve, {
						padding: {
							horizontal: 16,
							top: 24,
							bottom: 12
						},
						get children() {
							return [K(ye, {
								fontSize: 28,
								fontWeight: "bold",
								children: "solid-fuse demos"
							}), K(ye, {
								color: "#6B7280",
								fontSize: 14,
								children: "Playground for widget primitives"
							})];
						}
					}),
					K(MenuItem, {
						label: "counter",
						onTap: () => nav.push(() => K(CounterScreen, {}))
					}),
					K(MenuItem, {
						label: "textField",
						onTap: () => nav.push(() => K(TextFieldScreen, {}))
					}),
					K(MenuItem, {
						label: "icon",
						onTap: () => nav.push(() => K(IconScreen, {}))
					}),
					K(MenuItem, {
						label: "scrollController",
						onTap: () => nav.push(() => K(ScrollScreen, {}))
					})
				];
			}
		});
	}
	// src/index.tsx
	var App = () => K(_e, { initialPage: () => K(HomeScreen, {}) });
	me(App);
})();

//# sourceMappingURL=bundle.js.map