const _ = require('lodash');
const makeSvcClient = require('svc-client').makeSvcClient;
const createAction = require('redux-actions').createAction;
const GENERIC_SERVICE_FAILURE_ACTION = 'redux-svc-client-thunk/SERVICE_FAILURE';

const metaCreator = (data, params) => ({params});

function createMetaAction(action) {
  if (_.isFunction(action)) {
    return action;
  }

  if (_.isString(action)) {
    return createAction(action, undefined, metaCreator);
  }

  throw new TypeError('action is unexpected type, must be strings or function');
}

const makeThunk = (service, method, customActions = {}) => params => (dispatch, getState, services) => {
  const {
    actions,
    client,
    serviceFailureActionType = GENERIC_SERVICE_FAILURE_ACTION
  } = services[service];
  const {request, success, failure} = Object.assign({}, _.get(actions, method), customActions);

  const requestAction = createMetaAction(request);
  const successAction = createMetaAction(success);
  const failureAction = createMetaAction(failure);
  const serviceFailureAction = createMetaAction(serviceFailureActionType);
  const clientMethod = _.get(client, method);

  dispatch(requestAction(undefined, params));

  return clientMethod(params)
    .then(data => dispatch(successAction(data, params)))
    .catch(err => {
      dispatch(failureAction(err, params));
      dispatch(serviceFailureAction(err, params));

      throw err;
    });
};

function makeThunks(service, methods) {
  return methods.reduce((thunks, method) => {
    if (_.isPlainObject(method)) {
      return _.set(thunks, method.method, makeThunk(service, method.method, method.actions));
    }

    if (_.isString(method)) {
      return _.set(thunks, method, makeThunk(service, method));
    }

    throw new TypeError('method is unexpected type, must be strings or object {method, actions}');
  }, {});
}

function getSvcDefinitionActions(svcDefinition) {
  return _.mapValues(svcDefinition, obj => {
    if (_.has(obj, 'endpoint')) {
      return obj.actions;
    }

    return _.mapValues(obj, subObj => subObj.actions);
  });
}

function validateSvcDefinition(svcDefinition) {
  if (!_.isPlainObject(svcDefinition) || _.isEmpty(svcDefinition)) {
    throw new TypeError('svcDefinition must be an object');
  }

  _.forEach(svcDefinition, (value, key) => {
    if (!_.isPlainObject(value) || _.isEmpty(value)) {
      throw new TypeError(`svcDefinition invalid at ${key}`);
    }

    if (!_.has(value, 'endpoint')) {
      _.forEach(value, (subObj, subKey) => {
        if (!_.isPlainObject(subObj) || !_.has(subObj, 'endpoint')) {
          throw new TypeError(`svcDefinition invalid at ${key}.${subKey}`);
        }
      });
    }
  });
}

function makeSvc(baseUrl, svcDefinition, serviceFailureActionType) {
  validateSvcDefinition(svcDefinition);
  const actions = getSvcDefinitionActions(svcDefinition);
  return {
    actions,
    client: makeSvcClient(baseUrl, svcDefinition),
    serviceFailureActionType
  };
}

module.exports = {makeThunks, makeSvc};
