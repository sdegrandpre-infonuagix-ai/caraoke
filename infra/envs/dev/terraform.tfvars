region      = "ca-central-1"
project     = "caraoke"
environment = "dev"

vpc_cidr             = "10.10.0.0/16"
azs                  = ["ca-central-1a", "ca-central-1b"]
public_subnet_cidrs  = ["10.10.0.0/24", "10.10.1.0/24"]
private_subnet_cidrs = ["10.10.10.0/24", "10.10.11.0/24"]
