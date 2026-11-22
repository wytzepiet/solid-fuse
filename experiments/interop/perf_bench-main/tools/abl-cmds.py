#!/usr/bin/env python3
"""Writes the command list for the ablation run (tools/harness.sh) to stdout."""
import json
V = ["card_for","card_map","card_nocomp","card_intrinsic","card_compiled","card_static","raw","objonly","objonly_json","objonly_nosend"]
M = ["loop","call","obj4","obj4_push","flat4_push","closure","getterObj","node_fields","node_plain","createElement","createTextNode",
     "setProp_num","setProp_fn","insertNode","promiseThen","mapSetKey","signal","memo","effect_static","effect_tracking",
     "createComponent","untrack","merge_static2","merge_fnsource","mergeProps_renderer","omit1of4","read_plain4","read_mergedProxy4",
     "read_omitted4","forin4_copy","spread0","spread4","spread4_children","spread4_textchild","elem4_direct","insert_static_text",
     "insert_dynamic_text","View4","view4_intrinsic","view4_intrinsic_dyn","Text_child","text_intrinsic_child"]
for i in range(3):
    print(json.dumps({"cmd": "mount", "nodes": 1000})); print(json.dumps({"cmd": "clear"}))
for v in V:
    print(json.dumps({"cmd": "abl", "v": v, "cards": 91, "reps": 11}))
for v in ["card_for", "card_intrinsic", "raw"]:
    print(json.dumps({"cmd": "abl", "v": v, "cards": 454, "reps": 7}))
for m in M:
    print(json.dumps({"cmd": "micro", "m": m, "n": 5000, "reps": 9}))
for i in range(7):
    print(json.dumps({"cmd": "mount", "nodes": 1000})); print(json.dumps({"cmd": "clear"}))
for i in range(5):
    print(json.dumps({"cmd": "mount", "nodes": 5000})); print(json.dumps({"cmd": "clear"}))
