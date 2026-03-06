#!/usr/bin/env sh
set -eu

mkdir -p output

for file in project-proposal zeroth-review review-1-report review-2-report review-3-report final-report; do
  pandoc "${file}.md" -o "output/${file}.pdf"
done

echo "PDF files generated in docs/reports/output/"
