#!/bin/bash

for file in *.gz; do
dir=$(echo ${file} | sed 's/\./_/g')
dir2=$(echo ${dir} | sed 's/_json-list_gz//g')
mkdir $dir2
newfile=$(echo ${file} | sed 's/\.gz/_6\.gz/g')
mv $file $newfile
mv $newfile $dir2
done
