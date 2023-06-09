#!/bin/bash
delete_node_modules() {
  if [ -d "node_modules" ]; then
    rm -rf "node_modules"
    sleep 1
    delete_node_modules
  fi
}

delete_src() {
  if [ -d "src" ]; then
    rm -rf "src"
    sleep 1
    delete_src
  fi
}

delete_node_modules
delete_src
rm -rf package.json

mv tmp/node_modules node_modules
mv tmp/src src
mv tmp/package.json package.json

open ../../../
exit