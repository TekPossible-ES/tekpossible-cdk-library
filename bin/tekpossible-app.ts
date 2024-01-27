#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TekPossibleEnterpriseStack } from '../lib/tekposible-stack';
import stack_config from '../config/config.json'; // This will exist after running the ansible
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

// defineStacks(stack_config, app);
// TESTING of cloudformation outputs
new TekPossibleEnterpriseStack(app, 'TEST', {
  environmentType: "devops-node",
  name: "TEST",
  canary: false,
  sns_email: "test-notifications@tekpossible.com"
});