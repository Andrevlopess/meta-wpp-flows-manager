#!/usr/bin/env pwsh
# Builds the app and deploys dist/ to S3 + invalidates CloudFront.
# Requires: AWS CLI configured with credentials that can write to the bucket
# and create CloudFront invalidations.

$ErrorActionPreference = "Stop"

$BucketName = "flows-manager-app"
$DistributionId = "E35FF5NXMM29GP"
$DistDir = Join-Path $PSScriptRoot "..\dist"

Write-Host "Building app..."
pnpm build

Write-Host "Syncing hashed assets with long-lived cache headers..."
aws s3 sync $DistDir "s3://$BucketName" `
  --delete `
  --cache-control "public, max-age=31536000, immutable" `
  --exclude "index.html"

Write-Host "Uploading index.html with no-cache..."
aws s3 cp (Join-Path $DistDir "index.html") "s3://$BucketName/index.html" `
  --cache-control "public, max-age=0, must-revalidate"

Write-Host "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*" | Out-Null

Write-Host "Deployed: https://dd7m1u7odan6m.cloudfront.net"
