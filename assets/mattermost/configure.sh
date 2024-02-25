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

# Mattermost install script for EC2 Instance

# Set Hostname for Mattermost EC2 Instance
sudo hostnamectl set-hostname REPLACE

# Remove old versions if applicable and update the system
sudo rm -rf /opt/mattermost
sudo dnf update -y

# Install and Postgres DB Server and Client
sudo dnf install postgresql15-15.5-1.amzn2023.0.1.x86_64 postgresql15-server-15.5-1.amzn2023.0.1.x86_64 -y

# Install and Configure Mattermost ESR
rm -rf ./mattermost*
wget https://releases.mattermost.com/8.1.9/mattermost-8.1.9-linux-amd64.tar.gz
tar -xf mattermost*.tar.gz
sudo mv mattermost /opt
sudo mkdir /opt/mattermost/data
sudo useradd --system --user-group mattermost
sudo chown -R mattermost:mattermost /opt/mattermost
sudo chmod -R g+w /opt/mattermost

sudo cat << EOF > /lib/systemd/system/mattermost.service
[Unit]
Description=Mattermost
After=network.target

[Service]
Type=notify
ExecStart=/opt/mattermost/bin/mattermost
TimeoutStartSec=3600
KillMode=mixed
Restart=always
RestartSec=10
WorkingDirectory=/opt/mattermost
User=mattermost
Group=mattermost
LimitNOFILE=49152

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo cp /opt/mattermost/config/config.json /opt/mattermost/config/config.defaults.json
sudo setenforce 0
# Configure Postgresql and Mattermost DB connection
sudo /usr/bin/postgresql-setup --initdb
export PASSWORD=$(cat /dev/urandom | tr -dc '[:alnum:]' | head -c 20)

sudo cat << EOF > /tmp/init.sql
REASSIGN OWNED BY mmuser TO postgres;
DROP OWNED BY mmuser;
DROP DATABASE IF EXISTS mattermost;
DROP USER IF EXISTS mmuser;
CREATE DATABASE mattermost WITH ENCODING 'UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8' TEMPLATE=template0;
CREATE USER mmuser WITH PASSWORD 'REPLACE';
GRANT ALL PRIVILEGES ON DATABASE mattermost to mmuser;
ALTER DATABASE mattermost OWNER TO mmuser;
GRANT USAGE, CREATE ON SCHEMA PUBLIC TO mmuser;
EOF

sudo sed -i "s/REPLACE/$PASSWORD/g" /tmp/init.sql
sudo chown postgres /tmp/init.sql
sudo systemctl enable --now postgresql
sudo -u postgres psql -U postgres -a -f /tmp/init.sql
sudo sed -i "s/peer/trust/g" /var/lib/pgsql/data/pg_hba.conf
sudo sed -i "s/ident/trust/g" /var/lib/pgsql/data/pg_hba.conf
sudo systemctl restart postgresql
sudo rm -rf /tmp/init.sql
sudo sed -i "s/\"DataSource\".*/\"DataSource\":\"postgres:\/\/mmuser:$PASSWORD@localhost\/mattermost?sslmode=disable\\\u0026connect_timeout=10\\\u0026binary_parameters=yes\",/g" /opt/mattermost/config/config.json
export SITENAME=$(hostname -f)
sudo sed -i "s/\"SiteURL\".*/\"SiteURL\":\"http:\/\/$SITENAME:8065\",/g" /opt/mattermost/config/config.json

# Start Mattermost Service
sudo systemctl enable --now mattermost

