#!/bin/sh

sed -i "s/mergle_build_version=[0-9]*/mergle_build_version=`date +%s`/" client/index.html
