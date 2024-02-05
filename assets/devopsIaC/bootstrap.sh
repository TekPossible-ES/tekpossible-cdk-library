#!/bin/bash
sudo chown -R ec2-user /home/ec2-user/cdk
cd /home/ec2-user/cdk/
rm -rf ./node_modules
rm -rf ./package*.json
npm install 
npm update
sudo npm install -g typescript ts-node aws-cdk
npm install aws-cdk-lib 
npm install --save-dev @types/node
npx cdk bootstrap