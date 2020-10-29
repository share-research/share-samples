#!/bin/bash
input="./SHARE_2.csv"
COUNTER=0
while IFS= read -r line
do
  COUNTER=`expr $COUNTER + 1`
  wkhtmltopdf "$line" $COUNTER.pdf
done < "$input"
