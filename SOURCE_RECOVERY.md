# Proofline source recovery

Recovered 227 of 227 files listed by Base44's ordinary Code files UI on 2026-10-26. Source was copied file-by-file from the read-only editor through normal Select All/Copy. No paid ZIP export, hidden API, compiled bundle, app mutation, publish, AI call, or OAuth grant used.

Source directory: `/workspace/shared/proofline-source`. Original tree inventory and SHA-256 manifest are adjacent.

Static validation: no missing local relative/@ imports detected; no duplicate file contents; no empty or copied UI text files; all `.json` files parse. No common private-key/GitHub/AWS/OpenAI-token patterns or quoted hardcoded secret assignments found. This is pattern scanning, not a formal security audit.

Not included because not present in the visible source tree: node_modules, lockfile, local environment files, Base44 app-link metadata, server runtime/service implementation, database records/user library data, or downloaded copies of remotely linked assets. Source refers to Google Fonts and Wix static resources; links remain unchanged. Base44 entity schemas are included. No `base44/functions` folder was exposed in the tree.

Environment references preserved: VITE_BASE44_APP_ID, VITE_BASE44_APP_BASE_URL, VITE_BASE44_FUNCTIONS_VERSION, BASE44_LEGACY_SDK_IMPORTS; legacy code also mentions EXA_API_KEY, NEXT_PUBLIC_SITE_URL, VERCEL_PROJECT_PRODUCTION_URL. No values/credentials were extracted.

No dependency install, build, deployment or live integration tests run in this recovery. Repository README is the original Base44 template; its statements about GitHub sync do NOT establish an actual connection. The inspected Base44 GitHub feature was plan-locked, so a separately created backup repository will not automatically sync or detach the backend. Preserve original source and document any later migration changes separately.
