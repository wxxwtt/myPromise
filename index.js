const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';
class MyPromise {
  constructor (executor) {
    this.status = PENDING;
    this.value = undefined;
    this.reason = undefined;
    try {
      executor(this._resolve.bind(this), this._reject.bind(this));
    } catch (error) {
      this._reject(error);
    }
  }
  _changeStatus (status, value) {
    console.log(status);
    if (this.status !== PENDING) {
      return;
    }
    this.status = status;
    this.value = value;
  }
  _resolve (value) {
    this._changeStatus(FULFILLED, value);
    console.log('resolve', value);
    // this.onResolvedCallbacks.forEach(fn => fn());
  }
  _reject (reason) {
    this._changeStatus(REJECTED, reason);
    console.log('reject', reason);
    // this.onRejectedCallbacks.forEach(fn => fn());
  }
}
new MyPromise((resolve, reject) => {
  resolve('success');
  resolve('success');
  resolve('success');
})