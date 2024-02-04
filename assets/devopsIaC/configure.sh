#!/bin/bash
# THIS IS HERE FOR DOCUMENTATION - WILL BE RUN BEFORE CODEDEPLOY STEP IS RAN
cd /home/ec2-user
sudo dnf install ruby -y
wget https://aws-codedeploy-us-west-2.s3.us-west-2.amazonaws.com/latest/install
chmod +x ./install
sudo ./install auto
sudo dnf install -y ansible-core nodejs
# The rest of this should be handled by codebuild or the codedeploy