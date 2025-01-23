import { readFileSync } from 'fs';
import * as path from 'path';
import { Construct } from 'constructs';
import { TerraformStack } from 'cdktf';
import { CloudformationStack } from '../../.gen/providers/aws/cloudformation-stack';
import { AwsProvider } from '../../.gen/providers/aws/provider';

const relativePath = '../../../aws-cdk/cdk.out/AwsCdkStack.template.json';

export class CloudFormationStack extends TerraformStack {
  constructor(
    scope: Construct,
    id: string,
    props: { environment: string; dockerImageTag: string }
  ) {
    super(scope, id);

    const awsProvider = new AwsProvider(this, 'AWS', {
      region: 'us-east-2',
    });

    const absPath = path.resolve(__dirname, relativePath);
    new CloudformationStack(this, 'CloudFormationStack', {
      name: id,
      templateBody: readFileSync(absPath, 'utf8'),
      provider: awsProvider,
      parameters: {
        Environment: props.environment,
        DockerImageTag: props.dockerImageTag,
      },
    });
  }
}
