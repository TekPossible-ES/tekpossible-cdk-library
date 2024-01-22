#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TekPossibleEnterpriseStack } from '../lib/tekposible-stack';
import stack_config from '../config/config.json';
const app = new cdk.App();

function defineStacks(stacks_list: any, cdk_app: any){
  stacks_list.forEach(function (stack: any) {
    if (stack.name.includes("<<TIME>>")){
      var seconds_stack_generated = new Date().getTime();
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

defineStacks(stack_config, app);