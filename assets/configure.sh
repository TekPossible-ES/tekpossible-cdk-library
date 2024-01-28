#!/bin/bash

cd /home/ec2-user
wget https://aws-codedeploy-us-west-2.s3.us-west-2.amazonaws.com/latest/install
chmod +x ./install
./install auto
sudo dnf install httpd mod_ssl nodejs -y
sudo systemctl enable --now httpd
sudo dnf install postgresql15-server postgresql15 -y
sudo /usr/bin/postgresql-setup --initdb
sudo systemctl enable --now postgresql