const assert = require('assert');
const sinon = require('sinon');
const noCallThru = require('proxyquire').noCallThru;
const withData = require('leche').withData;

const proxyquireStrict = noCallThru();

const makeSvcClientStub = sinon.stub();
const reduxSvc = proxyquireStrict('../lib/reduxSvcClientThunk', {
  'svc-client': {makeSvcClient: makeSvcClientStub}
});

describe('makeThunks', () => {
  it('should return tree of thunks', () => {
    const service = 'test';
    const methods = ['todos.show', 'todos.list', 'healthcheck'];

    const actual = reduxSvc.makeThunks(service, methods);

    assert.ok(typeof actual.healthcheck === 'function');
    assert.ok(typeof actual.todos.show === 'function');
    assert.ok(typeof actual.todos.list === 'function');
  });

  it('should manage successful service endpoint call as async redux thunk action', () => {
    const services = {
      test: {
        client: {
          myMethod: sinon.stub().returns(Promise.resolve({result: 'test.result'}))
        },
        actions: {
          myMethod: {
            request: 'test/REQUEST',
            success: 'test/SUCCESS',
            failure: 'test/FAILURE'
          }
        }
      }
    };
    const params = {param: 'test.param'};
    const dispatch = sinon.spy();

    const thunks = reduxSvc.makeThunks('test', ['myMethod']);

    return thunks.myMethod(params)(dispatch, null, services)
      .then(() => {
        assert(dispatch.calledTwice, 'dispatch is called twice');

        const expectedRequestAction = {type: 'test/REQUEST', meta: {params}};
        assert.deepEqual(dispatch.args[0][0], expectedRequestAction, 'dispatches request action');

        const expectedSuccessAction = {
          type: 'test/SUCCESS',
          payload: {result: 'test.result'},
          meta: {params}
        };
        assert.deepEqual(dispatch.args[1][0], expectedSuccessAction, 'dispatches success action');
      });
  });

  it('should create nested thunks and connect with actions of same structure', () => {
    const services = {
      test: {
        client: {
          group: {
            myMethod: sinon.stub().returns(Promise.resolve({result: 'test.result'}))
          }
        },
        actions: {
          group: {
            myMethod: {
              request: 'test/REQUEST',
              success: 'test/SUCCESS',
              failure: 'test/FAILURE'
            }
          }
        }
      }
    };
    const params = {param: 'test.param'};
    const dispatch = sinon.spy();

    const thunks = reduxSvc.makeThunks('test', ['group.myMethod']);

    return thunks.group.myMethod(params)(dispatch, null, services)
      .then(() => {
        assert(dispatch.calledTwice, 'dispatch is called twice');

        const expectedRequestAction = {type: 'test/REQUEST', meta: {params}};
        assert.deepEqual(dispatch.args[0][0], expectedRequestAction, 'dispatches request action');

        const expectedSuccessAction = {
          type: 'test/SUCCESS',
          payload: {result: 'test.result'},
          meta: {params}
        };
        assert.deepEqual(dispatch.args[1][0], expectedSuccessAction, 'dispatches success action');
      });
  });

  it('should dispatch GENERIC_SERVICE_FAILURE_ACTION by default on failed service method call', () => {
    const err = new Error('test.message');
    const services = {
      test: {
        client: {
          myMethod: sinon.stub().returns(Promise.reject(err))
        },
        actions: {
          myMethod: {
            request: 'test/REQUEST',
            success: 'test/SUCCESS',
            failure: 'test/FAILURE'
          }
        }
      }
    };
    const params = {param: 'test.param'};
    const dispatch = sinon.spy();

    const thunks = reduxSvc.makeThunks('test', ['myMethod']);

    return thunks.myMethod(params)(dispatch, null, services)
      .catch(err => {
        assert(dispatch.calledThrice, 'dispatch is called three times');

        const expectedRequestAction = {type: 'test/REQUEST', meta: {params}};
        assert.deepEqual(dispatch.args[0][0], expectedRequestAction, 'dispatches request action');

        const expectedFailureAction = {
          type: 'test/FAILURE',
          error: true,
          payload: err,
          meta: {params}
        };
        assert.deepEqual(dispatch.args[1][0], expectedFailureAction, 'dispatches failure action');

        const expectedGenericFailureAction = {
          type: 'redux-svc-client-thunk/SERVICE_FAILURE',
          error: true,
          payload: err,
          meta: {params}
        };
        assert.deepEqual(
          dispatch.args[2][0],
          expectedGenericFailureAction,
          'dispatches generic failure'
        );
      });
  });

  it('should dispatch custom serviceFailureActionType on failed service method call', () => {
    const err = new Error('test.message');
    const services = {
      test: {
        client: {
          myMethod: sinon.stub().returns(Promise.reject(err))
        },
        actions: {
          myMethod: {
            request: 'test/REQUEST',
            success: 'test/SUCCESS',
            failure: 'test/FAILURE'
          }
        },
        serviceFailureActionType: 'test/CUSTOM_SERVICE_FAILURE'
      }
    };
    const params = {param: 'test.param'};
    const dispatch = sinon.spy();

    const thunks = reduxSvc.makeThunks('test', ['myMethod']);

    return thunks.myMethod(params)(dispatch, null, services)
      .catch(err => {
        assert(dispatch.calledThrice, 'dispatch is called three times');

        const expectedRequestAction = {type: 'test/REQUEST', meta: {params}};
        assert.deepEqual(dispatch.args[0][0], expectedRequestAction, 'dispatches request action');

        const expectedFailureAction = {
          type: 'test/FAILURE',
          error: true,
          payload: err,
          meta: {params}
        };
        assert.deepEqual(dispatch.args[1][0], expectedFailureAction, 'dispatches failure action');

        const expectedGenericFailureAction = {
          type: 'test/CUSTOM_SERVICE_FAILURE',
          error: true,
          payload: err,
          meta: {params}
        };
        assert.deepEqual(
          dispatch.args[2][0],
          expectedGenericFailureAction,
          'dispatches custom serviceFailureActionType failure'
        );
      });
  });

  it('should take custom actions to override actions', () => {
    const services = {
      test: {
        client: {
          myMethod: sinon.stub().returns(Promise.resolve({result: 'test.result'}))
        },
        actions: {
          myMethod: {
            request: 'test/REQUEST',
            success: 'test/SUCCESS',
            failure: 'test/FAILURE'
          }
        }
      }
    };

    const params = {param: 'test.param'};
    const dispatch = sinon.spy();

    const method = {method: 'myMethod', actions: {success: 'custom/SUCCESS'}};
    const thunks = reduxSvc.makeThunks('test', [method]);

    return thunks.myMethod(params)(dispatch, null, services)
      .then(() => {
        assert(dispatch.calledTwice, 'dispatch is called twice');

        const expectedRequestAction = {type: 'test/REQUEST', meta: {params}};
        assert.deepEqual(dispatch.args[0][0], expectedRequestAction, 'dispatches request action');

        const expectedSuccessAction = {
          type: 'custom/SUCCESS',
          payload: {result: 'test.result'},
          meta: {params}
        };
        assert.deepEqual(dispatch.args[1][0], expectedSuccessAction, 'dispatches success action');
      });
  });

  it('should take actions functions', () => {
    const services = {
      test: {
        client: {
          myMethod: sinon.stub().returns(Promise.resolve({result: 'test.result'}))
        },
        actions: {
          myMethod: {
            request: () => ({type: 'func/REQUEST'}),
            success: data => ({type: 'func/SUCCESS', payload: data}),
            failure: 'test/FAILURE'
          }
        }
      }
    };
    const params = {param: 'test.param'};
    const dispatch = sinon.spy();

    const thunks = reduxSvc.makeThunks('test', ['myMethod']);

    return thunks.myMethod(params)(dispatch, null, services)
      .then(() => {
        assert(dispatch.calledTwice, 'dispatch is called twice');

        const expectedRequestAction = {type: 'func/REQUEST'};
        assert.deepEqual(dispatch.args[0][0], expectedRequestAction, 'dispatches request action');

        const expectedSuccessAction = {
          type: 'func/SUCCESS',
          payload: {result: 'test.result'}
        };
        assert.deepEqual(dispatch.args[1][0], expectedSuccessAction, 'dispatches success action');
      });
  });

  it('should throw exception if action is not function or string', () => {
    const services = {
      test: {
        client: {
          myMethod: sinon.stub().returns(Promise.resolve({result: 'test.result'}))
        },
        actions: {
          request: 'test/REQUEST',
          // An undefined action is invalid, throws error
          success: undefined,
          failure: 'test/FAILURE'
        }
      }
    };
    const params = {param: 'test.param'};
    const dispatch = sinon.spy();

    const thunks = reduxSvc.makeThunks('test', ['myMethod']);

    function harness() {
      thunks.myMethod(params)(dispatch, null, services);
    }

    assert.throws(harness, TypeError, 'methodAction is unexpected type, must be strings or function');
  });
});

describe('makeSvc', () => {
  afterEach(() => {
    makeSvcClientStub.reset();
  });

  it('should build service object from svcDefinition', () => {
    const baseUrl = 'www.example.com';
    const svcDefinition = {
      healthcheck: {endpoint: '/healthcheck'},
      todos: {
        list: {
          endpoint: '/todos',
          actions: {
            request: 'todos/LIST_REQUEST',
            success: 'todos/LIST_SUCCESS',
            failure: 'todos/LIST_FAILURE'
          }
        },
        show: {
          endpoint: '/todos/<%- id %>',
          actions: {
            request: 'todos/SHOW_REQUEST',
            success: 'todos/SHOW_SUCCESS',
            failure: 'todos/SHOW_FAILURE'
          }
        }
      }
    };
    const serviceFailureActionType = 'todos/SERVICE_FAILURE';

    makeSvcClientStub.returns('test.client');

    const actual = reduxSvc.makeSvc(baseUrl, svcDefinition, serviceFailureActionType);
    const expected = {
      actions: {
        healthcheck: undefined,
        todos: {
          list: {
            request: 'todos/LIST_REQUEST',
            success: 'todos/LIST_SUCCESS',
            failure: 'todos/LIST_FAILURE'
          },
          show: {
            request: 'todos/SHOW_REQUEST',
            success: 'todos/SHOW_SUCCESS',
            failure: 'todos/SHOW_FAILURE'
          }
        }
      },
      client: 'test.client',
      serviceFailureActionType
    };

    assert.deepEqual(actual, expected);

    assert(makeSvcClientStub.calledOnce);
    assert.deepEqual(makeSvcClientStub.args[0], [baseUrl, svcDefinition]);
  });

  withData({
    'a string': ['foo', /svcDefinition must be an object/],
    'an empty object': [{}, /svcDefinition must be an object/],
    'a top level method that is not an object': [{myMethod: 'broken'}, /svcDefinition invalid at myMethod/],
    'an empty top level method': [{myMethod: {}}, /svcDefinition invalid at myMethod/],
    'a top level method missing typo endpoint': [{myMethod: {enpt: 'bar'}}, /svcDefinition invalid at myMethod/],
    'an empty nested method': [
      {group: {myMethod: {}}},
      /svcDefinition invalid at group.myMethod/
    ],
    'a string nested method': [
      {group: {myMethod: 'foo'}},
      /svcDefinition invalid at group.myMethod/
    ],
    'a nested method with typo on endpoint': [
      {group: {myMethod: {enpt: 'bar'}}},
      /svcDefinition invalid at group.myMethod/
    ]
  }, (svcDefinition, errMessage) => {
    it('should throw a TypeError on svcDefinition validation', () => {
      const baseUrl = 'www.example.com';

      function harness() {
        reduxSvc.makeSvc(baseUrl, svcDefinition);
      }

      assert.throws(harness, errMessage);
    });
  });
});
