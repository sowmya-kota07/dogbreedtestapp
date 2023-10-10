import { Backend } from '@aws-amplify/backend';
import { AmplifyCustomData } from './data/resource.js';
import { auth } from './auth/resource.js';

try {
  const backend = new Backend({
    auth
  });

  const stack = backend.getOrCreateStack('amplify-data');
  const backendId = stack.node.getContext('backend-id');
  const branchName = stack.node.tryGetContext('branch-name') || 'sandbox';

  const authResources = backend.resources.auth.resources;
  const { authenticatedUserIamRole, unauthenticatedUserIamRole, cfnResources, userPool } = authResources;

  new AmplifyCustomData(stack, 'AmplifyCustomData', {
    authRole: authenticatedUserIamRole!,
    unauthRole: unauthenticatedUserIamRole!,
    identityPoolId: cfnResources.identityPool.
      logicalId, userPool,
    backendId,
    branchName
  });
} catch (e) {
  console.log(e);
}


