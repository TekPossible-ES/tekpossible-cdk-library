#!/bin/bash
sudo chown -R ec2-user /home/ec2-user/cdk
cd /home/ec2-user/cdk/
npm install 
npm update
sudo npm install -g typescript ts-node aws-cdk
npm install --save-dev @types/node
npx cdk bootstrap