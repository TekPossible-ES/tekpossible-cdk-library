import * as cdk from 'aws-cdk-lib';
import { Visibility } from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class ResumeAwsDevOpsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, stack_config: any , props?: cdk.StackProps) {
    super(scope, id, props);
    const development_vpc = new ec2.Vpc(this, 'DevelopmentVPC', {
      cidr: "10.0.0.0/16",
      enableDnsSupport: true,
      enableDnsHostnames: true,
      maxAzs: 4,
      createInternetGateway: true // We want to ensure that this boi can access the internet

    });
    const ec2_instance = new ec2.Instance(this, 'ResumeDevOpsEc2Instance', {
      vpc: development_vpc, 
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023()

    });
    const queue = new sqs.Queue(this, 'ResumeAwsDevOpsQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });
  }
}
