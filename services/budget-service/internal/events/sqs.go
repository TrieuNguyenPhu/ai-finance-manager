package events

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
)

type Handler func(context.Context, string, string) error

type envelope struct {
	EventID string `json:"eventId"`
	Payload string `json:"payload"`
}

type Consumer struct {
	client            *sqs.Client
	queueURL          string
	handler           Handler
	visibilityTimeout int32
	logger            *log.Logger
}

func NewConsumer(
	ctx context.Context,
	queueURL, endpoint, region, accessKey, secretKey string,
	visibilityTimeout int32,
	handler Handler,
) (*Consumer, error) {
	loadOptions := []func(*awsconfig.LoadOptions) error{awsconfig.WithRegion(region)}
	if accessKey != "" && secretKey != "" {
		loadOptions = append(loadOptions,
			awsconfig.WithCredentialsProvider(
				credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")))
	}
	cfg, err := awsconfig.LoadDefaultConfig(ctx, loadOptions...)
	if err != nil {
		return nil, err
	}
	client := sqs.NewFromConfig(cfg, func(options *sqs.Options) {
		if endpoint != "" {
			options.BaseEndpoint = aws.String(endpoint)
		}
	})
	return &Consumer{
		client:            client,
		queueURL:          queueURL,
		handler:           handler,
		visibilityTimeout: visibilityTimeout,
		logger:            log.Default(),
	}, nil
}

func (c *Consumer) Run(ctx context.Context) {
	for ctx.Err() == nil {
		output, err := c.client.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
			QueueUrl:            aws.String(c.queueURL),
			MaxNumberOfMessages: 10,
			WaitTimeSeconds:     20,
			VisibilityTimeout:   c.visibilityTimeout,
		})
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			c.logger.Printf("SQS receive failed: %v", err)
			select {
			case <-ctx.Done():
				return
			case <-time.After(2 * time.Second):
			}
			continue
		}

		for _, message := range output.Messages {
			var event envelope
			if err := json.Unmarshal([]byte(aws.ToString(message.Body)), &event); err != nil {
				c.logger.Printf("SQS message decode failed: %v", err)
				continue
			}
			if err := c.handler(ctx, event.EventID, event.Payload); err != nil {
				c.logger.Printf("SQS event handling failed for %s: %v", event.EventID, err)
				continue
			}
			if _, err := c.client.DeleteMessage(ctx, &sqs.DeleteMessageInput{
				QueueUrl:      aws.String(c.queueURL),
				ReceiptHandle: message.ReceiptHandle,
			}); err != nil {
				c.logger.Printf("SQS message delete failed for %s: %v", event.EventID, err)
			}
		}
	}
}
