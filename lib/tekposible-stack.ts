import * as cdk from 'aws-cdk-lib';
import { Visibility } from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SamlConsolePrincipal } from 'aws-cdk-lib/aws-iam';
// TODO: Figure out what I need to do here to scale up/down the stack. Do I want the environment size to change what I deploy?
export class TekPossibleEnterpriseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, stack_config: any , props?: cdk.StackProps) {
    super(scope, id, props);
    
  }
}
