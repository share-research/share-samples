#!/bin/bash
input="./share_schema_links.csv"
COUNTER=0
PDFString="share_schema_home.pdf"
foldername="$(date +%Y%m%d%H%M%S)"
mkdir -p  ./"$foldername"
while IFS= read -r line
do
    PREV_COUNTER=$COUNTER
    COUNTER=`expr $COUNTER + 1`
    
    wkhtmltopdf "$line" "./$foldername/$COUNTER.pdf"
	PDFString+=" ./$foldername/${COUNTER}.pdf"
	echo $PDFString
done < "$input"

echo "Concatenating the PDF files..."
pdftk $PDFString cat output ./$foldername/share_schema.pdf
