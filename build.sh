#!/usr/bin/env bash
echo "Compiling typescript to javascript"
tsc -p . --extendedDiagnostics
rm dist/*
echo "Bundling and minifying output"
parcel build --target browser --log-level 2 --detailed-report 10 target/tracker.js
