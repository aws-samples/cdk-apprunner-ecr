## Build, Run and Deploy your containerized Web Application using Docker, AWS App Runner and Elastic Container Registry

In this lab, you will learn 2 different options to deploy a containerized web application in any language (Flutter as example in this lab) with AWS App Runner. You will also learn how to provision necessary resources and permissions with Infrastructure as a Code using AWS CDK. The docker image will be stored in AWS Elastic Containers Registry.

Sample Flutter app reference: https://docs.flutter.dev/get-started/install

Estimated time: 15 minutes

(Additional optional part) 30 minutes

Lab level: 200

## Learning Outcomes:
* Learn how App Runner can help developers to deploy applications easily hosted on cloud.
* Learn how App Runner can automatically trigger deployment for new update pushed to their application code.
* Learn multiple approaches you can use to deploy a containerized application
* Learn about infrastructure as a code with AWS CDK

## Before we start, prerequisites
1. Clean up any residual activities to return to a clean state.
```
cd ~/environment/cdk-apprunner-ecr/cdk-apprunner-existing-repo
cdk destroy -f
cd ~/environment/cdk-apprunner-ecr/cdk-apprunner-asset
cdk destroy -f
```
* There should be a Cloud9 Instance provisioned for you in the account for this lab. Follow this [link](https://us-west-2.console.aws.amazon.com/cloud9/home?region=us-west-2#) to go to your Cloud9 instance. Click the ‘IDE’ button to launch your Cloud9 instance.

2. Check if the correct IAM role has been attached to your Cloud9 instance

* Click the grey circle button (in top right corner) and select Manage EC2 Instance.

<img src="https://github.com/aws-samples/cdk-apprunner-ecr/blob/main/assets/ec2-iam-1.png?raw=true"/>

Click on the instance, check under ‘IAM Role’ to make sure the role shows as `apprunnerworkshop-admin`

<img src="https://github.com/aws-samples/cdk-apprunner-ecr/blob/main/assets/ec2-iam-2.png?raw=true"/>

* (If it is not `apprunnerworkshop-admin` ) Select the instance, then choose Actions / Security / Modify IAM Role

<img src="https://github.com/aws-samples/cdk-apprunner-ecr/blob/main/assets/ec2-iam-3.png?raw=true"/>

* Choose apprunnerworkshop-admin from the *IAM Role* drop down, and select *Save*

<img src="https://github.com/aws-samples/cdk-apprunner-ecr/blob/main/assets/ec2-iam-4.png?raw=true"/>

3. Increase the disk size on the Cloud9 instance
```
pip3 install --user --upgrade boto3
export instance_id=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
python3 -c "import boto3
import os
from botocore.exceptions import ClientError 
ec2 = boto3.client('ec2')
volume_info = ec2.describe_volumes(
    Filters=[
        {
            'Name': 'attachment.instance-id',
            'Values': [
                os.getenv('instance_id')
            ]
        }
    ]
)
volume_id = volume_info['Volumes'][0]['VolumeId']
try:
    resize = ec2.modify_volume(    
            VolumeId=volume_id,    
            Size=30
    )
    print(resize)
except ClientError as e:
    if e.response['Error']['Code'] == 'InvalidParameterValue':
        print('ERROR MESSAGE: {}'.format(e))"
if [ $? -eq 0 ]; then
    sudo reboot
fi
```

4. Install relevant packages
```
cd ~/environment/cdk-apprunner-ecr/cdk-apprunner-asset
npm install
npm upgrade
cd ~/environment/cdk-apprunner-ecr/cdk-apprunner-existing-repo
npm install
npm upgrade

# Install prerequisite packages
sudo yum -y install jq gettext
```
* `jq` is a tool that can be used to extract and transform data held in JSON files.
* The `gettext` package includes the envsubst utility, which can be used to substitute the values of environment variables into an input stream.
* We will use these tools, along with the Linux utility `sed`, to insert or replace attribute values in various files throughout the workshop. This avoids the need for manual text editing wherever possible.

5. Setting environment variables required to communicate with AWS API's via the cli tools
```
echo "export AWS_DEFAULT_REGION=$(curl -s 169.254.169.254/latest/dynamic/instance-identity/document | jq -r .region)" >> ~/.bashrc
echo "export AWS_REGION=\$AWS_DEFAULT_REGION" >> ~/.bashrc
echo "export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)" >> ~/.bashrc
source ~/.bashrc
```

6. Your account might already have the Toolkit installed. If it is not, run the following before you are able to use CDK:
```
cdk bootstrap
```
* Deploying AWS CDK apps into an AWS environment (a combination of an AWS account and region) may require that you provision resources the AWS CDK needs to perform the deployment. These resources include an Amazon S3 bucket for storing files and IAM roles that grant permissions needed to perform deployments. The process of provisioning these initial resources is called bootstrapping.

* The required resources are defined in a AWS CloudFormation stack, called the bootstrap stack, which is usually named CDKToolkit. Like any AWS CloudFormation stack, it appears in the AWS CloudFormation console once it has been deployed.
More details here (https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html).

## Now that we have everything ready, Let's get started!
### Full deployment via AWS CDK - CDK Deploy
1. Confirm that the cdk can synthesize the assembly CloudFormation templates
```
cd ~/environment/cdk-apprunner-ecr/cdk-apprunner-asset
cdk synth
```
2. View proposed changes to the environment
```
cdk diff
```
3. Deploy the changes to the environment
```
cdk deploy --require-approval never
```
***It could take up to 10 minutes for the deployment to complete. Proceed to the next segment to understand the code in the meantime.***

### CDK Code Review
Deployment might take up to 10 minutes to complete. Let’s review what is happening in the meantime.

You may notice that everything defined in the stack is 100% written as TypeScript code. We also benefit from the opinionated nature of cdk by letting it build out components based on well architected practices. This also means that we don’t have to think about all of the underlying components to create and connect resources (ie, subnets, nat gateways, etc). Once we deploy the cdk code, the cdk will generate the underlying Cloudformation templates and deploy it.

For more information about how you can get started with CDK to build your own app, you can refer [here](https://docs.aws.amazon.com/cdk/v2/guide/hello_world.html).

With this approach, we are provisioning required resources with AWS CDK - App Runner service Elastic Container Registry repository, followed by building the images automatically and pushing them to the ECR repository. The App Runner will pull the image from the repository and automatically deploy the service.

You can view the source code under the repo `cdk-apprunner-ecr/cdk-apprunner-existing-repo/lib/cdk-apprunner-stack.ts`

***Below are for code explanation only***
```
## Images are built from a local Docker context directory (with a Dockerfile), 
## uploaded to Amazon Elastic Container Registry (ECR) by the CDK toolkit and/or your app's CI/CD pipeline, 
## and can be naturally referenced in your CDK app.
## https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecr_assets-readme.html#images-from-dockerfile
## The directory 'fluttersampleapp' includes a Dockerfile.

    const imageAsset = new assets.DockerImageAsset(this, 'ImageAssets', {
      directory: path.join(__dirname, '../fluttersampleapp'),
    });
```
Below shows that we configure App Runner service on port 8080. We use `apprunner.Source.fromAsset` to create a service from a local Docker image asset directory built and pushed to Amazon ECR.
```
## To create a Service from local docker image asset directory built and pushed to Amazon ECR
## https://docs.aws.amazon.com/cdk/api/v2/docs/aws-apprunner-alpha-readme.html#ecr
    const service = new apprunner.Service(this, 'AppRunnerService', {
      source: apprunner.Source.fromAsset({
        imageConfiguration: { port: 8080 },
        asset: imageAsset,
      }),
    });
```
### Observation during deployment
During CDK deployment, you will notice the process includes image building, pushing them to the ECR repository, as well as resource provisioning.

Upon completion, you will find the deployed app URL as ‘Outputs’ in the terminal. Click the URL to open in browser, you will see the sample Flutter app with sign up form is now deployed!
```
Outputs:
CdkApprunnerEcrStack.url = https://xxxxxx123x.us-west-2.awsapprunner.com
```
The app is a basic sign up page without much functionality. The sign up button is not functional. 



## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## Feedback
*Feedback link*
Thanks for completing a lab, hope you had fun!
We really appreciate your feedback and would love to hear about what you loved and what we can improve.
Please give us feedback so we can improve these labs.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

