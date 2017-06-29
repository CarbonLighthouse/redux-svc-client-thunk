describe('lib/reduxSvcClientThunk', () => {
  it('should manage successful service method call as an asynchronous redux thunk action');
  it('should dispatch GENERIC_SERVICE_FAILURE_ACTION by default on failed service method call');
  it('should dispatch custom serviceFailureActionType on failed service method call');
  it('should take actions as functions');
  it('should build action functions from "type" strings');
});
