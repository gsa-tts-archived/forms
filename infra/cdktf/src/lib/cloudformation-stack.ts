import * as path from 'path';
import { Construct } from 'constructs';
import { CloudformationStack } from '../../.gen/providers/aws/cloudformation-stack';
import { AwsProvider } from '../../.gen/providers/aws/provider';

const relativePath = '../../../aws-cdk/AwsCdkStack/AwsCdkStack.template.json';

interface FormsCloudformationStackProps {
  environment: string;
  dockerImageTag: string;
  provider: AwsProvider;
}

export class FormsCloudformationStack extends Construct {
  constructor(
    scope: Construct,
    id: string,
    { environment, dockerImageTag, provider }: FormsCloudformationStackProps
  ) {
    super(scope, id);

    const absPath = path.resolve(__dirname, relativePath);
    new CloudformationStack(this, id, {
      name: id,
      templateBody: `$\{file("${absPath}")}`,
      provider: provider,
      parameters: {
        Environment: environment,
        DockerImagePath: `ghcr.io/gsa-tts/forms/server-doj:${dockerImageTag}`,
      },
      capabilities: ['CAPABILITY_IAM'],
    });
  }
}
