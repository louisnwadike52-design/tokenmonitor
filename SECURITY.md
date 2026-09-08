# Security Policy

## Scope

`tokenmonitor` is a local, read-only command-line tool. It:

- only **reads** log files that AI CLIs write under your home directory;
- makes **no** network requests and has **no** runtime dependencies;
- never transmits, uploads, or stores your data anywhere.

The realistic attack surface is therefore small: parsing untrusted local JSON.
Parsing is deliberately fault-tolerant (corrupt lines are skipped) and never
executes log content.

## Supported versions

The latest published `0.x` release receives fixes. Pin a version if you need
stability while `0.x` evolves.

## Reporting a vulnerability

Please email **thenwadikelouis@gmail.com** with details and steps to reproduce.
Do not open a public issue for a security report. You can expect an initial
response within a few days. Once a fix ships, credit is offered unless you
prefer to remain anonymous.
