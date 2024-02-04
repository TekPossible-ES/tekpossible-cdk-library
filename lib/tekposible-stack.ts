import * as cdk from 'aws-cdk-lib';
import { Visibility } from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import { SamlConsolePrincipal } from 'aws-cdk-lib/aws-iam';
import { readFileSync } from 'fs';

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
  const devops_node_s3_bucket = new s3.Bucket(scope, stack.name + "-pipeline-storage", {
    versioned: true, 
    bucketName: stack.name.toLowerCase( ) + "-pipeline-storage-" + stack.repo_name
  });

  // now we need our notification for deployment approvals - for the pipelines an additional parameter sns_email will be needed
  const codepipeline_sns_topic = new sns.Topic(scope, stack.name + '-codepipeline-sns-topic', {
    topicName: stack.name + '-codepipeline-sns-topic',
    displayName: stack.name + "CodePipeline SNS Approval"
  });
  const codepipeline_sns_subscription = new sns.Subscription(scope, stack.name + "-codepipeline-sns-subscr", {
    topic: codepipeline_sns_topic,
    protocol: sns.SubscriptionProtocol.EMAIL,
    endpoint: stack.sns_email
  });

  // now to make the codecommit repository...
  const devops_node_repo = new codecommit.Repository(scope, stack.repo_name, {
    repositoryName: stack.repo_name,
    description: stack.name + " NodeJS Source Code Repo"
  });

  const devops_node_pipeline = new codepipeline.Pipeline(scope, stack.name + "Pipeline", {
    pipelineName: stack.name + "Pipeline",
    artifactBucket: devops_node_s3_bucket,
    restartExecutionOnUpdate: false,
    role: codepipeline_iam_role
  });
  
  const devops_node_pipeline_artifact_src = new codepipeline.Artifact(stack.name + "PipelineArtifactSource")
  const devops_node_pipeline_artifact_out = new codepipeline.Artifact(stack.name + "PipelineArtifactOutput")
  
  const devops_node_pipeline_src_action = new codepipeline_actions.CodeCommitSourceAction({
    repository: devops_node_repo,
    actionName: "SourceAction",
    output: devops_node_pipeline_artifact_src
  });

  const devops_node_pipeline_src = devops_node_pipeline.addStage({
    stageName: "Source",
    actions: [devops_node_pipeline_src_action]
  });

  const devops_node_pipeline_build_codebuild = new codepipeline_actions.CodeBuildAction({
    input: devops_node_pipeline_artifact_src,
    actionName: "CodeBuild",
    project: new codebuild.PipelineProject(scope, stack.name + "codebuild-project", {
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
        computeType: codebuild.ComputeType.SMALL
      }
    }),
    outputs: [devops_node_pipeline_artifact_out]
  });

  const devops_node_pipeline_build = devops_node_pipeline.addStage({
    stageName: "Build",
    actions: [devops_node_pipeline_build_codebuild]
  });

  const devops_codedeploy_application  = new codedeploy.ServerApplication(scope, stack.name + "-CodeDeployApp", {
    applicationName: stack.name + "-CodeDeployApp"
    
  });

  const devops_node_pipeline_approval_action = new codepipeline_actions.ManualApprovalAction({
    actionName: "DeployApproval",
    notificationTopic: codepipeline_sns_topic
  });

  const devops_node_pipeline_approval_stage = devops_node_pipeline.addStage({
    stageName: "DeployApproval",
    actions: [devops_node_pipeline_approval_action]
  });

  const devops_node_pipeline_deploy_codedeploy = new codepipeline_actions.CodeDeployServerDeployAction({
    actionName: "CodeDeploy",
    input: devops_node_pipeline_artifact_out,
    deploymentGroup: new codedeploy.ServerDeploymentGroup(scope, stack.name + "-CodeDeployAppDG",  {
      ec2InstanceTags: new codedeploy.InstanceTagSet({
        "application_group": [stack.name + "-CodeDeployApp"]
      }),
      deploymentConfig: codedeploy.ServerDeploymentConfig.ALL_AT_ONCE, // kinda canary
      application: devops_codedeploy_application,
      deploymentGroupName: stack.name + "-CodeDeployAppDG",
      role: codepipeline_iam_role
    })
  });

  const devops_node_pipeline_deploy = devops_node_pipeline.addStage({
    stageName: "Deploy",
    actions: [devops_node_pipeline_deploy_codedeploy]
  });

}

// will implement at a later date
// function stackDevEnv(scope: Construct, stack: any){ // Development Environment Stack (development)
// }

function stackNode(scope: Construct, stack: any){ // Nodejs application stack (node)
  // Create Role for Codedeploy
  const codedeploy_iam_role = new iam.Role(scope, stack.name + 'CodeDeployRole', {
    roleName: stack.name + 'CodeDeployRole',
    assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com")
  });
  // Create VPC/Subnet
  codedeploy_iam_role.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(scope, stack.name + "CDROLE", "arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforAWSCodeDeploy"));
  const node_vpc = new ec2.Vpc(scope, stack.name + "-VPC",{
    ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
    createInternetGateway: true,
    enableDnsHostnames: true,
    enableDnsSupport: true,
    maxAzs: 1,
    vpcName: stack.name + "-VPC",
    subnetConfiguration: [{
      cidrMask: 24,
      subnetType: ec2.SubnetType.PUBLIC,
      name: stack.name + "VPC-PublicSubnet",
      mapPublicIpOnLaunch: true
    }]
  });

  node_vpc.addFlowLog(stack.name + 'VPCFlowLogs', {
    trafficType: ec2.FlowLogTrafficType.ALL,
    maxAggregationInterval: ec2.FlowLogMaxAggregationInterval.TEN_MINUTES,
  });

  // Create SecurityGroup
  const node_sg = new ec2.SecurityGroup(scope, stack.name + "-Node-SG", {
    vpc: node_vpc,
    allowAllOutbound: true, 
    securityGroupName: stack.name + "-Node-SG",

  });

  // Add Rules to Security Group
  node_sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));
  node_sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
  node_sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));

  // Create EC2 instance  
  const node_ec2 = new ec2.Instance(scope, stack.name + 'Node-Server', {
    vpc: node_vpc,
    machineImage: ec2.MachineImage.latestAmazonLinux2023(),
    instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
    vpcSubnets: node_vpc.selectSubnets({
      subnetType: ec2.SubnetType.PUBLIC
    }),
    role: codedeploy_iam_role,
    securityGroup: node_sg,
    keyPair: ec2.KeyPair.fromKeyPairName(scope, stack.name  + "keypair", "ansible-keypair")
  });
  const commands = readFileSync("./assets/stackNode/configure.sh", "utf-8");
  node_ec2.addUserData(commands);
  cdk.Tags.of(node_ec2).add('application_group', stack.codedeploy_app);
  const node_eip = new ec2.CfnEIP(scope, stack.name + "-EIP", {
    instanceId: node_ec2.instanceId
  });
}


function devopsIaC(scope: Construct, stack: any) { // Implements an CI/CD Pipeline for IaC Repositories
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
  const devops_iac_s3_bucket = new s3.Bucket(scope, stack.name + "-pipeline-storage", {
    versioned: true, 
    bucketName: stack.name.toLowerCase( ) + "-pipeline-storage-" + stack.repo_name
  });

  // now we need our notification for deployment approvals - for the pipelines an additional parameter sns_email will be needed
  const codepipeline_sns_topic = new sns.Topic(scope, stack.name + '-codepipeline-sns-topic', {
    topicName: stack.name + '-codepipeline-sns-topic',
    displayName: stack.name + "CodePipeline SNS Approval"
  });
  const codepipeline_sns_subscription = new sns.Subscription(scope, stack.name + "-codepipeline-sns-subscr", {
    topic: codepipeline_sns_topic,
    protocol: sns.SubscriptionProtocol.EMAIL,
    endpoint: stack.sns_email
  });

  // now to make the codecommit repository...
  const devops_iac_repo = new codecommit.Repository(scope, stack.repo_name, {
    repositoryName: stack.repo_name,
    description: stack.name + " Infrastructure as Code Repo"
  });

  const devops_iac_pipeline = new codepipeline.Pipeline(scope, stack.name + "Pipeline", {
    pipelineName: stack.name + "Pipeline",
    artifactBucket: devops_iac_s3_bucket,
    restartExecutionOnUpdate: false,
    role: codepipeline_iam_role
  });
  
  const devops_iac_pipeline_artifact_src = new codepipeline.Artifact(stack.name + "PipelineArtifactSource")
  const devops_iac_pipeline_artifact_out = new codepipeline.Artifact(stack.name + "PipelineArtifactOutput")
  
  const devops_iac_pipeline_src_action = new codepipeline_actions.CodeCommitSourceAction({
    repository: devops_iac_repo,
    actionName: "SourceAction",
    output: devops_iac_pipeline_artifact_src
  });

  const devops_iac_pipeline_src = devops_iac_pipeline.addStage({
    stageName: "Source",
    actions: [devops_iac_pipeline_src_action]
  });

  const devops_iac_pipeline_build_codebuild = new codepipeline_actions.CodeBuildAction({
    input: devops_iac_pipeline_artifact_src,
    actionName: "CodeBuild",
    project: new codebuild.PipelineProject(scope, stack.name + "codebuild-project", {
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
        computeType: codebuild.ComputeType.SMALL
      }
    }),
    outputs: [devops_iac_pipeline_artifact_out]
  });

  const devops_iac_pipeline_build = devops_iac_pipeline.addStage({
    stageName: "Build",
    actions: [devops_iac_pipeline_build_codebuild]
  });

  const devops_codedeploy_application  = new codedeploy.ServerApplication(scope, stack.name + "-CodeDeployApp", {
    applicationName: stack.name + "-CodeDeployApp"
    
  });

  const devops_iac_pipeline_approval_action = new codepipeline_actions.ManualApprovalAction({
    actionName: "DeployApproval",
    notificationTopic: codepipeline_sns_topic
  });

  const devops_iac_pipeline_approval_stage = devops_iac_pipeline.addStage({
    stageName: "DeployApproval",
    actions: [devops_iac_pipeline_approval_action]
  });

  const devops_iac_pipeline_deploy_codedeploy = new codepipeline_actions.CodeDeployServerDeployAction({
    actionName: "CodeDeploy",
    input: devops_iac_pipeline_artifact_out,
    deploymentGroup: new codedeploy.ServerDeploymentGroup(scope, stack.name + "-CodeDeployAppDG",  {
      ec2InstanceTags: new codedeploy.InstanceTagSet({
        "application_group": [stack.name + "-CodeDeployApp"]
      }),
      deploymentConfig: codedeploy.ServerDeploymentConfig.ALL_AT_ONCE,
      application: devops_codedeploy_application,
      deploymentGroupName: stack.name + "-CodeDeployAppDG",
      role: codepipeline_iam_role
    })      
  });

  const devops_iac_pipeline_deploy = devops_iac_pipeline.addStage({
    stageName: "Deploy",
    actions: [devops_iac_pipeline_deploy_codedeploy]
  });

  // Create Role for Codedeploy
  const codedeploy_iam_role = new iam.Role(scope, stack.name + 'CodeDeployRole', {
    roleName: stack.name + 'CodeDeployRole',
    assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com")
  });
  const iac_message = "You are almost done deploying this stack. In order to avoid a chicken and the egg scenario (Using CDK to deploy the EC2 instance that deploys the CDK), you need to manually deploy the EC2 instance prior to the intial push to the codecommit repo. If you have already done this, then please disregard this message. If you have not, please make sure to sure the following tag: \n\"application_group\":\"" + stack.name + "-CodeDeployApp" +  "\"\n"
  console.log(iac_message);
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
    
    // Will implement at a later date
    else if ( stack_config.environmentType == "devops-iac" ){
      devopsIaC(this, stack_config);
    // } else if ( stack_config.environmentType == "development" ) {
    //   stackDevEnv(this, stack_config);
    }

    else {
      console.log("The specfied environmentType of " + stack_config.environmentType + " does not exist. Please check your configuration!");
      return;
    }
  }
}
