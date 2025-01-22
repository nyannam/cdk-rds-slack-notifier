import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';


export class CdkRdsSlackStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const slackWebhookSecret = new secretsmanager.Secret(this, 'SlackWebhookSecret', {
      description: 'Slack webhook URL for RDS notifications',
    });

    const notifierFunction = new lambda.Function(this, 'NotifierFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        SLACK_WEBHOOK_SECRET_NAME: slackWebhookSecret.secretName,
      },
    });

    // Grant the lambda function to read the slack webhook from secrets manager
    slackWebhookSecret.grantRead(notifierFunction);

    const rdsEventSubscription = new rds.CfnEventSubscription(this, 'rdsEventSubscription', {
      snsTopicArn: notifierFunction.functionArn,
      sourceType: 'db-instance',
      eventCategories: ['creation', 'deletion'],
      enabled: true
    });

    notifierFunction.addPermission('rdsEventSubscription', {
      principal: new cdk.aws_iam.ServicePrincipal('rds.amazonaws.com'),
      action: 'lambda:InvokeFunction',
    });


  }
}
