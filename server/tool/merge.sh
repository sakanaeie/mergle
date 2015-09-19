#!/bin/sh

cd `dirname $0`
cd ..

cat api/* job/* model/* > tmp/merged.js
