#!/bin/sh
set -eu

region="${AWS_DEFAULT_REGION:-ap-southeast-1}"

for queue in budget analytics notification; do
  dlq="${queue}-events-dlq"
  main="${queue}-events"
  awslocal sqs create-queue --queue-name "$dlq" --region "$region" >/dev/null
  dlq_url="$(awslocal sqs get-queue-url --queue-name "$dlq" --region "$region" --query QueueUrl --output text)"
  redrive_policy="{\"deadLetterTargetArn\":\"arn:aws:sqs:${region}:000000000000:${dlq}\",\"maxReceiveCount\":\"5\"}"
  awslocal sqs create-queue \
    --queue-name "$main" \
    --attributes "RedrivePolicy=${redrive_policy}" \
    --region "$region" >/dev/null
  echo "created $main and $dlq ($dlq_url)"
done
