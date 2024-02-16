# TekPossible - Enterprise IaC Library

## Purpose 
This repository serves as the main infrastructure as code repository for the following projects: 
1. TekPossible-ES-DevEnv (FUTURE)
2. [TekPossible-Resume](https://github.com/GrifKies/tekpossible-resume)
3. TekPossible-INTERPIL (FUTURE)

This CDK implementation has the following types of stacks:
1. NodeJS Stack - A stack that deploys a PostgreSQL and NodeJS EC2 instance based on the lastest Amazon Linux 2023 AMI (DONE)
2. NodeJS DevOps Stack - A stack that deploys a repo for the nodejs application and a pipeline consisting of codebuild and codedeploy for the application (DONE)
3. DevEnv Stack - A stack that deploys a Mattermost server, a tailscale server for VPN access, and an autoscaling EC2 instance for development (via vscode remote)(IN PROGRESS)
4. IaC DevOps Stack - A stack that deploy a CI/CD Pipeline for my CDK and ansible code. It also deploys a EC2 instance to run the CDK/Ansible resources. (DONE)

More documentation regarding the environment can be found [here](https://github.com/TekPossible-ES/tekpossible-aws)
