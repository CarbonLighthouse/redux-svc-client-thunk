module.exports = serviceName => methodName => params => (dispatch, getState, services) => {
  const {phases, svcClient, serviceFailureAction} = services[serviceName];
  const {requestAction, successAction, failureAction} = phases[methodName];

  dispatch(requestAction(params));

  return svcClient(methodName, params)
    .then(data => dispatch(successAction(data)))
    .catch(err => {
      dispatch(failureAction(err));

      if (serviceFailureAction) {
        dispatch(serviceFailureAction(err));
      }

      throw err;
    });
};
