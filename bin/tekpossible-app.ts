#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TekPossibleEnterpriseStack } from '../lib/tekposible-stack';
//import stack_config from '../config/config.json'; // This will exist after running the ansible
const app = new cdk.App();
// The point of this function is to make multiple stacks and to insert the 
// time into the stack name so they are unique and managable.
function defineStacks(stacks_list: any, cdk_app: any){
  stacks_list.forEach(function (stack: any) {
    if (stack.name.includes("<<TIME>>")){
      var seconds_stack_generated = new Date().getTime(); // should I condense this into a one-liner?
      var stack_name = stack.name.replace("<<TIME>>", String(seconds_stack_generated));
    }
    else {
      stack_name = stack.name;
    }
    new TekPossibleEnterpriseStack(app, stack_name, stack, {
      env: {
        account: stack.account,
        region: stack.region
      }
    });
  }); 
}
// The multi stack part isn't really ready yet. Need to think about switching green to blue more
// defineStacks(stack_config, app);

// Create CI/CD Pipeline for Resume
new TekPossibleEnterpriseStack(app, 'TekPossible-Resume-DevOps', {
  environmentType: "devops-node",
  name: "TekPossible-Resume-DevOps",
  sns_email: "resume-notifications@tekpossible.com",
  repo_name: "tekpossible-resume"
});

// Create Infrastructure for Resume
new TekPossibleEnterpriseStack(app, 'TekPossible-Resume', {
  environmentType: "node",
  name: "TekPossible-Resume",
  codedeploy_app: "TekPossible-Resume-DevOps-CodeDeployApp",
  ssh_keypair: "tekp-keypair"
});

// Create CI/CD Pipeline for this code repository
new TekPossibleEnterpriseStack(app, 'TekPossible-IaC-DevOps', {
  environmentType: "devops-iac",
  name: "TekPossible-IaC-DevOps",
  sns_email: "iac-notifications@tekpossible.com",
  repo_name: "tekpossible-iac-library"
});

// Create Development Environment for TekPossible Engineering Teams
new TekPossibleEnterpriseStack(app, 'TekPossible-Development', {
  environmentType: "development",
  name: "TekPossible-Development",
  ssh_keypair: "tekp-keypair", 
  mattermost_dns: "mattermost.tekp.development",
  tailscale_secret_arn: "arn:aws:secretsmanager:us-east-2:383009235696:secret:tekpossible-esdevelopment-tailscale-dj2A5b"
});