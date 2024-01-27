import * as cdk from 'aws-cdk-lib';
import { Visibility } from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { SamlConsolePrincipal } from 'aws-cdk-lib/aws-iam';

// There are four types of stacks we will create, all of which are determined via the environmentType parameter in config.json
// 1. devops-node
// 2. devops-iac
// 3. node
// 4. development
// The first two are the pipeline stacks, the second two are the infrastructure stacks
// For the moment, my development will focus on node and devops-node for my resume site.

function devopsNode(scope: Construct, stack: any) { // nodejs application pipeline and repo (devops-node)
  // In order to use codepipeline codecommit and codedeploy, we need a role which can access those things
  const codepipeline_iam_role = new iam.Role(scope, stack.name + '-CodePipelineRole', {
    assumedBy: new iam.CompositePrincipal(
      new iam.ServicePrincipal("ec2.amazonaws.com"),
      new iam.ServicePrincipal("codebuild.amazonaws.com"),
      new iam.ServicePrincipal("codedeploy.amazonaws.com"), 
      new iam.ServicePrincipal("codecommit.amazonaws.com"),
      new iam.ServicePrincipal("cloudformation.amazonaws.com"),
      new iam.ServicePrincipal("sns.amazonaws.com"),
      new iam.ServicePrincipal("codepipeline.amazonaws.com"),
      new iam.ServicePrincipal("s3.amazonaws.com") 
    ),
    roleName: stack.name + '-CodePipelineRole'

  });
  codepipeline_iam_role.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(scope, stack.name + "-CodePipelineMP1", "arn:aws:iam::aws:policy/service-role/AWSCodeStarServiceRole"));
  codepipeline_iam_role.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(scope, stack.name + "-CodePipelineMP2", "arn:aws:iam::aws:policy/AmazonS3FullAccess"));
  
  // Now that we have the policies set up, its time to create a s3 bucket for our code
  const devops_node_s3_bucket = new s3.Bucket(scope, stack.name + "pipeline-storage", {
    versioned: true, 
    bucketName: stack.name + "pipeline-storage"
  })

  // now we need our notification for deployment approvals - for the pipelines an additional parameter sns_email will be needed

}

function devopsIaC(scope: Construct, stack: any){ // Infrastructure as code pipeline and repo (devops-iac)

}

function stackNode(scope: Construct, stack: any){ // Nodejs application stack (node)

}

function stackDevEnv(scope: Construct, stack: any){ // Development Environment Stack (development)

}

// TODO: Figure out what I need to do here to scale up/down the stack. Do I want the environment size to change what I deploy?
export class TekPossibleEnterpriseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, stack_config: any , props?: cdk.StackProps) {
    super(scope, id, props);
    if( stack_config.environmentType == "devops-node" ) {
      devopsNode(this, stack_config);
    } 
    else if ( stack_config.environmentType == "node" ){
      stackNode(this, stack_config);
    }
    else if ( stack_config.environmentType == "devops-iac" ){
      devopsIaC(this, stack_config);
    } else if ( stack_config.environmentType == "development" ) {
      stackDevEnv(this, stack_config);
    }
    else {
      console.log("The specfied environmentType of " + stack_config.environmentType + " does not exist. Please check your configuration!");
      return;
    }

  }
}
