#!/bin/bash
yum install -y nodejs ruby
cd /home/ec2-user/cdk/
npm install sarif-junit@latest typescript cdk aws-cdk aws-cdk-lib
