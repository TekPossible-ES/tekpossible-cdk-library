#!/bin/bash
sudo yum install -y nodejs ruby
sudo chown -R ec2-user /home/ec2-user/cdk
cd /home/ec2-user/cdk/
npm install sarif-junit@latest typescript cdk aws-cdk aws-cdk-lib util fs
