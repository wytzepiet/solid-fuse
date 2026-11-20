You are reviewing UI code for correctness against a written brief. The code is for solid-fuse: SolidJS 2.0 JSX that renders real Flutter widgets. Ignore type errors (they are scored separately); judge only whether the component, as written, would lay out, look and behave as the brief asks when run.

The API the code is written against (primer):
{{PRIMER}}

{{NOTES}}

The full type definitions are under {{REF}}/lib/solid-fuse if you need to check what a prop means (search, do not read the icons files).

The brief the code was written for:
{{TASK}}

Criteria (index starting at 1):
{{CRITERIA}}

Review each of these files independently: {{FILES}}

For each file and each criterion give a verdict: "pass" (does what is asked), "partial" (roughly right but visibly off in a detail), or "fail" (missing, or would not work/lay out as asked). Be strict and concrete: trace the actual widget tree and constraints rather than trusting names or comments. Also judge "runtime": "ok", or "throws" if the code as written would hit a Flutter layout exception or assertion (say which), or "risky" if that depends on the parent.

Write exactly one file, {{OUT}}, containing only JSON of this shape, then reply "done":
{"<file name>": {"criteria": [{"n": 1, "v": "pass|partial|fail", "why": "<one short sentence, required unless pass>", "tags": []}], "runtime": {"v": "ok|risky|throws", "why": ""}, "notes": "<optional one sentence on the most notable mistake>"}}
Do not run commands and do not modify any other file.
