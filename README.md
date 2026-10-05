<div align="center">
  <img src="https://raw.githubusercontent.com/ia-toki/judgels/master/judgels-client/src/assets/images/logo.png" height="65" />

  <h1>Judgels</h1>

  A modern programming contest system.
 
  <img alt="CI" src="https://github.com/ia-toki/judgels/workflows/ci/badge.svg"/>
  <a href="https://github.com/ia-toki/judgels/blob/master/LICENSE.txt"><img alt="License" src="https://img.shields.io/github/license/ia-toki/judgels.svg"/></a>
</div>

## Usage

Judgels has been used for:

- [TLX](https://tlx.toki.id), :indonesia: Indonesia's largest competitive programming training website.
- Indonesian National Olympiad in Informatics since 2015.
- Asia-Pacific Informatics Olympiad 2015 & 2020, hosted by Indonesia.

## Features

This is a non-exhaustive list of Judgels's features:

**Problem management**
  - multilanguage problem statements
  - batch, interactive, output-only, and functional (like IOI 2010 and above) problem types
  - custom checker (scorer)
  - subtasks with different points
  - version control

**Contest management**
  - IOI- and ICPC-style contests
  - virtual contests, where contestants can start at different times
  - announcements, clarifications, scoreboards
  - various user roles: contestants, supervisors, and managers

## 🚀 Enhancements in This Fork

This repository is an optimized and modernized edition of the original [ia-toki/judgels](https://github.com/ia-toki/judgels), featuring:

- **Complete Modern Problem Management SPA:** Full REST API (`/problems/api`) and React interfaces for creating and editing statements, test data, grading configs, and permissions without legacy server-side rendering.
- **Resilient Submission & Container Routing:** Eliminates broken or unclickable problem links when problemsets or course chapters are reorganized or deleted through automatic fallback resolution.
- **Crash-Resistant Frontend Initialization:** Defensive client bootstrapping and synchronous configuration execution preventing blank white screen issues.
- **High-Concurrency Performance & Capacity Tuning:** Multi-threaded sandboxed grading (4 workers = 80 submissions/minute), MySQL 8.4 buffer pool and connection optimizations, G1GC tuning, and Nginx HTTP keepalive caching.
- **Security Hardened Deployments:** Internal daemon port isolation and clean environment separation.

For full technical specifications and code breakdown, see [CHANGELOG_ENHANCEMENTS.md](./CHANGELOG_ENHANCEMENTS.md).

## Docs

For user guide, visit the Judgels website at [judgels.toki.id](https://judgels.toki.id).

For dev guide, visit the [wiki](https://github.com/ia-toki/judgels/wiki).

## Credit

Judgels was initiated based on an IOI 2014 paper: [Components and Architectural Design
of an Autograder System Family](http://www.ioinformatics.org/oi/pdf/v8_2014_69_80.pdf), 
by Jordan Fernando and Inggriani Liem.

## License

GNU GPL version 2. 

