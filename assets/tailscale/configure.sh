#!/bin/bash

# Cloudwatch Agent installation and configuration...
# Note for Amazon Linux, the AWS SSM agent is already installed so we don't need to do that.
sudo dnf install -y https://amazoncloudwatch-agent.s3.amazonaws.com/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm collectd rsyslog
sudo systemctl enable --now rsyslog
cat << EOF > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
{
        "agent": {
                "metrics_collection_interval": 60,
                "run_as_user": "root" 
        },
        "logs": {
                "logs_collected": {
                        "files": {
                                "collect_list": [
                                        {
                                                "file_path": "/var/log/messages,
                                                "log_group_class": "STANDARD",
                                                "log_group_name": "var-log-messages",
                                                "log_stream_name": "{instance_id}",
                                                "retention_in_days": 7
                                        },
                                ]
                        }
                }
        },
        "metrics": {
                "aggregation_dimensions": [
                        [
                                "InstanceId"
                        ]
                ],
                "append_dimensions": {
                        "AutoScalingGroupName": "${aws:AutoScalingGroupName}",
                        "ImageId": "${aws:ImageId}",
                        "InstanceId": "${aws:InstanceId}",
                        "InstanceType": "${aws:InstanceType}"
                },
                "metrics_collected": {
                        "collectd": {
                                "metrics_aggregation_interval": 60
                        },
                        "cpu": {
                                "measurement": [
                                        "cpu_usage_idle",
                                        "cpu_usage_iowait",
                                        "cpu_usage_user",
                                        "cpu_usage_system"
                                ],
                                "metrics_collection_interval": 60,
                                "resources": [
                                        "*"
                                ],
                                "totalcpu": false
                        },
                        "disk": {
                                "measurement": [
                                        "used_percent",
                                        "inodes_free"
                                ],
                                "metrics_collection_interval": 60,
                                "resources": [
                                        "*"
                                ]
                        },
                        "diskio": {
                                "measurement": [
                                        "io_time",
                                        "write_bytes",
                                        "read_bytes",
                                        "writes",
                                        "reads"
                                ],
                                "metrics_collection_interval": 60,
                                "resources": [
                                        "*"
                                ]
                        },
                        "mem": {
                                "measurement": [
                                        "mem_used_percent"
                                ],
                                "metrics_collection_interval": 60
                        },
                        "netstat": {
                                "measurement": [
                                        "tcp_established",
                                        "tcp_time_wait"
                                ],
                                "metrics_collection_interval": 60
                        },
                        "statsd": {
                                "metrics_aggregation_interval": 60,
                                "metrics_collection_interval": 10,
                                "service_address": ":8125"
                        },
                        "swap": {
                                "measurement": [
                                        "swap_used_percent"
                                ],
                                "metrics_collection_interval": 60
                        }
                }
        }
}
EOF
amazon-cloudwatch-agent-ctl -a start

# Tailscale Server Silent Install
sudo curl -fsSL https://tailscale.com/install.sh | sh

# Configure Security Settings for Traffic Forwarding
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p /etc/sysctl.conf
sudo tailscale up --advertise-routes=10.75.0.0/16 --authkey $(aws secretsmanager get-secret-value --secret-id=REPLACE | grep SecretString | cut -d ':' -f2 | sed 's/ //g' | sed 's/\"//g' | sed 's/,//g')
