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
                                                "file_path": "/var/log/messages",
                                                "log_group_class": "STANDARD",
                                                "log_group_name": "var-log-messages",
                                                "log_stream_name": "{instance_id}",
                                                "retention_in_days": 7
                                        },
                                        {
                                                "file_path": "/var/log/httpd/ssl_access_log",
                                                "log_group_class": "STANDARD",
                                                "log_group_name": "httpd-ssl-access-log",
                                                "log_stream_name": "{instance_id}",
                                                "retention_in_days": 7
                                        },
                                        {
                                                "file_path": "/var/log/httpd/ssl_error_log",
                                                "log_group_class": "STANDARD",
                                                "log_group_name": "httpd-ssl-erorr-log",
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


cd /home/ec2-user
sudo dnf install ruby -y
wget https://aws-codedeploy-us-west-2.s3.us-west-2.amazonaws.com/latest/install
chmod +x ./install
sudo ./install auto
sudo dnf install httpd mod_ssl nodejs -y
sudo systemctl enable --now httpd
sudo dnf install postgresql15-server postgresql15 -y
sudo /usr/bin/postgresql-setup --initdb
sudo systemctl enable --now postgresql