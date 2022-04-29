import * as apprunner from '@aws-cdk/aws-apprunner-alpha';
import { Stack, CfnOutput, StackProps } from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export class CdkApprunnerEcrStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // To create a Service from an existing ECR repository.
    // An ECR repository 'apprunner-counterapp-repo' has been created from the CloudFormation template 'apprunnercfn.json' for the lab usage.
    const service = new apprunner.Service(this, 'CounterAppService', {
      source: apprunner.Source.fromEcr({
        imageConfiguration: { port: 8080 },
        repository: ecr.Repository.fromRepositoryName(this, 'AppRunnerCounterAppRepo', 'apprunner-counterapp-repo'),
        tag: 'latest',
      }),
    });

    new CfnOutput(this, 'url', {
      value: 'https://' + service.serviceUrl,
    });
  }
}
