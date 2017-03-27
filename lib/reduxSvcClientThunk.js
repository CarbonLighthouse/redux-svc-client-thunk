const createAction = require('redux-actions').createAction;
const GENERIC_SERVICE_FAILURE_ACTION = 'redux-svc-client-thunk/SERVICE_FAILURE';

const metaCreator = (data, params) => ({params});

function createServiceFailureAction(serviceFailureActionType) {
  if (serviceFailureActionType) {
    return createAction(serviceFailureActionType, undefined, metaCreator);
  }

  return createAction(GENERIC_SERVICE_FAILURE_ACTION, undefined, metaCreator);
}

function createMethodAction(action) {
  if (typeof action === 'function') {
    return action;
  }

  if (typeof action === 'string') {
    return createAction(action, undefined, metaCreator);
  }

  throw new TypeError('methodAction is unexpected type, must be strings or function');
}

module.exports = serviceName => methodName => params => (dispatch, getState, services) => {
  const {methodActions, svcClient, serviceFailureActionType} = services[serviceName];
  const {request, success, failure} = methodActions[methodName];

  const requestAction = createMethodAction(request);
  const successAction = createMethodAction(success);
  const failureAction = createMethodAction(failure);
  const serviceFailureAction = createServiceFailureAction(serviceFailureActionType);

  dispatch(requestAction(undefined, params));

  return svcClient(methodName, params)
    .then(data => dispatch(successAction(data, params)))
    .catch(err => {
      dispatch(failureAction(err, params));

      if (serviceFailureAction) {
        dispatch(serviceFailureAction(err, params));
      }

      throw err;
    });
};
