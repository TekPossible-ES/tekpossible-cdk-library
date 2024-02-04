#!/bin/bash
sudo chown -R ec2-user /home/ec2-user/cdk
cd /home/ec2-user/cdk/
npm install 
npx cdk bootstrap