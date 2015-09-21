#!/bin/sh

cd `dirname $0`
cd ..

# jobを先頭にすること
cat job/* api/* model/* > tmp/merged.js
