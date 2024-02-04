#!/bin/bash
cd /home/ec2-user/cdk
sudo dnf install -y ansible-core node
sudo npm install -g typescript aws-cdk
cdk bootstrap
