// import { defineData } from '@aws-amplify/backend-graphql';
import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct'
import { Stack } from 'aws-cdk-lib';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { AccountPrincipal, Role, Policy, PolicyStatement, Effect, IRole } from 'aws-cdk-lib/aws-iam';
import { Bucket, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

const schema = `
  type Todo @model @auth(rules: [{ allow: private }]) {
    id: ID!
    name: String!
  }
`;

interface Props {
  authRole: IRole;
  unauthRole: IRole;
  identityPoolId: string;
  userPool: IUserPool;
  backendId: string;
  branchName: string;
}

export class AmplifyCustomData extends Construct {
  constructor(scope: Construct, name: string, props: Props) {
    const { authRole, unauthRole, identityPoolId, userPool, backendId, branchName } = props;
    super(scope, name);

    const account = Stack.of(scope).account;
    const region = Stack.of(scope).region;
    const principal = new AccountPrincipal(account);

    const roleName = `amplify-cms-manage-role-${backendId}-${branchName}`;
    const cmsManageRole = new Role(scope, 'AmplifyCMSManageRole', {
      roleName,
      assumedBy: principal,
    });
    const inlineApiPolicy = new Policy(scope, 'AmplifyCMSManageRolePolicy');
    inlineApiPolicy.addStatements(new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:aws:appsync:${region}:*:apis/*`],
      actions: ['appsync:GraphQL']
    }));
    cmsManageRole.attachInlinePolicy(inlineApiPolicy);
    const roleArn = `arn:aws:iam::${account}:role/${roleName}`;

    const api = new AmplifyGraphqlApi(scope, 'AmplifyGraphqlApi', {
      definition: {
        schema,
        functionSlots: [],
      },
      authorizationModes: {
        adminRoles: [Role.fromRoleArn(scope, 'AmplifyCMSRole', roleArn)],
        defaultAuthorizationMode: 'AWS_IAM',
        iamConfig: {
          authenticatedUserRole: authRole,
          unauthenticatedUserRole: unauthRole,
          identityPoolId,
        },
        userPoolConfig: {
          userPool
        }
      }
    })
    const codegenAssetsBucket = api.node.findChild('AmplifyCodegenAssets').node.findChild('AmplifyCodegenAssetsBucket') as Bucket;
    codegenAssetsBucket.addCorsRule({
      allowedMethods: [HttpMethods.GET],
      allowedHeaders: ['*'],
      allowedOrigins: ['https://localhost.console.aws.amazon.com:3000',
        'https://*.console.aws.amazon.com/amplify/home']
    });

  }
}

// export const data = defineData({ schema });
