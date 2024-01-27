# TekPossible - Example Defense Contractor Cloud Deployment

## Architecture Overview
![TekPossible Architecture Overview](./docs/tekpossible-arch-overview.png)

In order to accurately depict a defense contractor network, the network must be compartmenalized. For example, my enterprise environment (development and other corporate networks) will be managed by a different I.T department than one that focuses on a specific project's production network. In order to account for this, I wrote ansible automation do the following things which make deploying a scalable defense contractor platform easier:

1. The TekPossible-Enterprise Repository (this repo) contains the code to deploy the development and internet accessible (NAT, public ELB, etc) networks that are managed by the Enterprise I.T (EIT) department. IAM Identity Center Permission Sets, Users, and Groups are created for the EIT Department and permissi=on boundaries are used to restrict their access to only enterprise resources.

2. CloudFormation templates are created in this repo which are parameterized so that programs run by TekPossible are able to use prevetted security checks for their IaC. 

For a more detailed look at the architecture, see [TekPossible Architecture - Deep Dive](./docs/tekpossible-arch-overview.png).
