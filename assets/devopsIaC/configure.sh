#!/bin/bash
cd /home/ec2-user
sudo dnf install ruby -y
wget https://aws-codedeploy-us-west-2.s3.us-west-2.amazonaws.com/latest/install
chmod +x ./install
sudo ./install auto
sudo dnf install -y ansible-core node
sudo npm install -g typescript aws-cdk