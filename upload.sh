#!/bin/bash

rsync -a . --exclude 'node_modules' root@142.93.119.24:/home/analytics/
