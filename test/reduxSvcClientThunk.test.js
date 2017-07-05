const assert = require('assert');
const sinon = require('sinon');
const createServiceClientThunk = require('../lib/reduxSvcClientThunk');

describe('lib/reduxSvcClientThunk', () => {
  it('should manage successful service method call as an asynchronous redux thunk action', () => {
    const services = {
      testService: {
        svcClient: {
          myMethod: sinon.stub().returns(Promise.resolve({result: 'test.result'}))
        },
        methodActions: {
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

    return createServiceClientThunk('testService')('myMethod')(params)(dispatch, null, services)
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

  it('should access methodActions and svc method via an object path', () => {
    const services = {
      testService: {
        svcClient: {
          group: {
            myMethod: sinon.stub().returns(Promise.resolve({result: 'test.result'}))
          }
        },
        methodActions: {
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

    const path = 'group.myMethod';
    return createServiceClientThunk('testService')(path)(params)(dispatch, null, services)
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
      testService: {
        svcClient: {
          myMethod: sinon.stub().returns(Promise.reject(err))
        },
        methodActions: {
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

    return createServiceClientThunk('testService')('myMethod')(params)(dispatch, null, services)
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
      testService: {
        svcClient: {
          myMethod: sinon.stub().returns(Promise.reject(err))
        },
        methodActions: {
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

    return createServiceClientThunk('testService')('myMethod')(params)(dispatch, null, services)
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

  it('should take custom actions to override methodActions', () => {
    const services = {
      testService: {
        svcClient: {
          myMethod: sinon.stub().returns(Promise.resolve({result: 'test.result'}))
        },
        methodActions: {
          myMethod: {
            request: 'test/REQUEST',
            success: 'test/SUCCESS',
            failure: 'test/FAILURE'
          }
        }
      }
    };
    const customActions = {success: 'custom/SUCCESS'};
    const params = {param: 'test.param'};
    const dispatch = sinon.spy();

    return createServiceClientThunk('testService')('myMethod', customActions)(params)(dispatch, null, services)
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
      testService: {
        svcClient: {
          myMethod: sinon.stub().returns(Promise.resolve({result: 'test.result'}))
        },
        methodActions: {
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

    return createServiceClientThunk('testService')('myMethod')(params)(dispatch, null, services)
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
      testService: {
        svcClient: {
          myMethod: sinon.stub().returns(Promise.resolve({result: 'test.result'}))
        },
        methodActions: {
          request: 'test/REQUEST',
          // An undefined action is invalid, throws error
          success: undefined,
          failure: 'test/FAILURE'
        }
      }
    };
    const params = {param: 'test.param'};
    const dispatch = sinon.spy();

    function harness() {
      createServiceClientThunk('testService')('myMethod')(params)(dispatch, null, services);
    }

    assert.throws(harness, TypeError, 'methodAction is unexpected type, must be strings or function');
  });
});
