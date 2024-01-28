#!/bin/bash

cd /home/ec2-user
wget https://aws-codedeploy-us-west-2.s3.us-west-2.amazonaws.com/latest/install
chmod +x ./install
./install auto
sudo dnf install httpd mod_ssl nodejs -y
systemctl enable --now httpd