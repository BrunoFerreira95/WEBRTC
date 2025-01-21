#!/bin/bash

/home/desenvolvimento/.nvm/versions/node/v20.15.1/bin/npm run dev -- -p 3025

[Unit]
Description=Next.js Application Service
After=network.target

[Service]
Type=simple
ExecStart=/bin/bash /home/desenvolvimento/Documentos/2025/WEBRTC/startup.sh
TimeoutStartSec=30
WantedBy=multi-user.target
User=root
WorkingDirectory=/home/desenvolvimento/Documentos/2025/WEBRTC
Environment=PATH=/home/desenvolvimento/.nvm/versions/node/v20.15.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Ensure permissions and resource limits are appropriate

[Install]
WantedBy=multi-user.target
