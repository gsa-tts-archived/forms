import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as apprunner from '@aws-cdk/aws-apprunner-alpha';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as changeCase from 'change-case';
import { Duration } from 'aws-cdk-lib';

export class FormsPlatformStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cloudformation configuration parameters
    const environment = new cdk.CfnParameter(this, 'Environment', {
      type: 'String',
      description: 'The environment for the stack (e.g., dev, prod)',
    });
    const dockerImagePath = new cdk.CfnParameter(this, 'DockerImagePath', {
      type: 'String',
      description: 'The Docker image url for the App Runner service',
    });

    // Networking configuration
    const vpc = new ec2.Vpc(this, `${id}-vpc`, {
      maxAzs: 2,
    });

    // Security group for RDS
    const rdsSecurityGroup = new ec2.SecurityGroup(this, `${id}-rds-sg`, {
      vpc,
      description: 'Allow postgres access',
      allowAllOutbound: true,
    });

    // Security group for App Runner
    const appRunnerSecurityGroup = new ec2.SecurityGroup(this, `${id}-apprunner-sg`, {
      vpc,
      description: 'Security group for App Runner service',
      allowAllOutbound: true,
    });

    // Allow App Runner security group to access RDS security group
    rdsSecurityGroup.addIngressRule(
      appRunnerSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow postgres access from App Runner'
    );

    // RDS database configuration
    const databaseName = `${changeCase.snakeCase(environment.valueAsString)}_database`;
    new rds.DatabaseInstance(this, `${id}-db`, {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      vpc,
      securityGroups: [rdsSecurityGroup],
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO
      ),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      databaseName,
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const appRunnerService = new apprunner.Service(this, `${id}-app-runner`, {
      source: apprunner.Source.fromEcrPublic({
        imageConfiguration: { port: 4321 },
        imageIdentifier: dockerImagePath.valueAsString,
      }),
      healthCheck: apprunner.HealthCheck.http({
        healthyThreshold: 5,
        interval: Duration.seconds(10),
        path: '/',
        timeout: Duration.seconds(10),
        unhealthyThreshold: 10,
      }),
      observabilityConfiguration: new apprunner.ObservabilityConfiguration(
        this,
        `${id}-observability-configuration`,
        {
          observabilityConfigurationName: `${id}-observability-configuration`,
          traceConfigurationVendor: apprunner.TraceConfigurationVendor.AWSXRAY,
        }
      ),
      serviceName: `${environment.valueAsString}-app-runner-service`,
      vpcConnector: new apprunner.VpcConnector(this, `${id}-vpc-connector`, {
        vpc,
        vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
        securityGroups: [appRunnerSecurityGroup],
        vpcConnectorName: `${id}-vpc-connector`,
      }),
    });

    // Export a publicly-accessible URL for the App Runner service
    new cdk.CfnOutput(this, 'FormsPlatformUrl', {
      value: appRunnerService.serviceUrl,
      description: 'URL for the Forms Platform',
    });
  }
}
