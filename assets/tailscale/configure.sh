#!/bin/bash

# Tailscale Server Silent Install
sudo curl -fsSL https://tailscale.com/install.sh | sh

# Configure Security Settings for Traffic Forwarding
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p /etc/sysctl.conf
firewall-cmd --permanent --add-masquerade
sudo tailscale up --advertise-routes=10.0.0.0/16 --authkey REPLACE
