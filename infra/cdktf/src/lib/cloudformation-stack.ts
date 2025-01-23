import { readFileSync } from 'fs';
import * as path from 'path';
import { Construct } from 'constructs';
import { TerraformStack } from 'cdktf';
import { CloudformationStack } from '../../.gen/providers/aws/cloudformation-stack';

const relativePath = '../../../aws-cdk/cdk.out/AwsCdkStack.template.json';

export class CloudFormationStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const absPath = path.resolve(__dirname, relativePath);
    new CloudformationStack(this, 'CloudFormationStack', {
      name: id,
      templateBody: readFileSync(absPath, 'utf8'),
    });
  }
}
