#!/bin/bash
# Mattermost install script for EC2 Instance

# Remove old versions if applicable and update the system
sudo rm -rf /opt/mattermost
sudo dnf update -y

# Install and Postgres DB Server and Client
sudo dnf install postgresql-15.4-1.fc39 postgresql-server-15.4-1.fc39 -y

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
export SITENAME=$(hostname -I | cut -d ' ' -f1)
sudo sed -i "s/\"SiteURL\".*/\"SiteURL\":\"http:\/\/$SITENAME:8065\",/g" /opt/mattermost/config/config.json

# Start Mattermost Service
sudo systemctl enable --now mattermost

