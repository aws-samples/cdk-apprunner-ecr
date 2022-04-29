import * as path from 'path';
import * as apprunner from '@aws-cdk/aws-apprunner-alpha';
import * as assets from 'aws-cdk-lib/aws-ecr-assets';
import { Stack, CfnOutput, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CdkAppRunnerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Images are built from a local Docker context directory (with a Dockerfile), 
    // uploaded to Amazon Elastic Container Registry (ECR) by the CDK toolkit and/or your app's CI/CD pipeline, 
    // and can be naturally referenced in your CDK app.
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecr_assets-readme.html#images-from-dockerfile
    // The directory 'fluttersampleapp' includes a Dockerfile.
    const imageAsset = new assets.DockerImageAsset(this, 'ImageAssets', {
      directory: path.join(__dirname, '../fluttersampleapp'),
    });

    // To create a Service from local docker image asset directory built and pushed to Amazon ECR
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-apprunner-alpha-readme.html#ecr
    const service = new apprunner.Service(this, 'AppRunnerService', {
      source: apprunner.Source.fromAsset({
        imageConfiguration: { port: 8080 },
        asset: imageAsset,
      }),
    });
    new CfnOutput(this, 'url', {
      value: 'https://' + service.serviceUrl,
    });
  }
}
