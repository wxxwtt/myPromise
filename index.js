const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

/** 
 * 判断是不是一个 Promise
 * @param {any} obj - 要判断的对象
 * @returns {boolean} - 如果 obj 是一个 Promise 实例，返回 true；否则返回 false
 */
function isPromise (obj) {
  return !!(obj && typeof obj === 'object' && typeof obj.then === 'function');
}


/**
 * 微任务 - 优化版本：提前检测环境，缓存实例
 */
let microtaskImpl;

if (typeof process === 'object' && typeof process.nextTick === 'function') {
  microtaskImpl = (fn) => process.nextTick(fn);
} else if (typeof MutationObserver !== 'undefined') {
  // 只创建一次 MutationObserver 和 TextNode，复用它们
  const callbacks = [];
  const observer = new MutationObserver(() => {
    const cbs = callbacks.splice(0);
    cbs.forEach(fn => fn());
  });
  const textNode = document.createTextNode('');
  observer.observe(textNode, { characterData: true });
  let counter = 0;

  microtaskImpl = (fn) => {
    callbacks.push(fn);
    textNode.data = String(++counter);
  };
} else {
  microtaskImpl = (fn) => setTimeout(fn, 0);
}

function microtask (fn) {
  // 未优化版：
  //   if (typeof process === 'object' && typeof process.nextTick === 'function') {
  //     process.nextTick(fn);
  //   } else if (typeof MutationObserver !== 'undefined') {
  //     const observer = new MutationObserver(fn);
  //     const textNode = document.createTextNode('');
  //     observer.observe(textNode, { characterData: true });
  //     textNode.data = String(Math.random());
  //   } else {
  //     setTimeout(fn, 0);
  //   } 

  microtaskImpl(fn);
}

// 1. Promise 是一个类，构造函数接受一个 executor 函数作为参数，executor 函数会立即执行，并且接受 resolve 和 reject 两个函数作为参数
class MyPromise {
  constructor (executor) {
    this.status = PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.handles = [];
    try {
      executor(this._resolve.bind(this), this._reject.bind(this));
    } catch (error) {
      this._reject(error);
    }
  }
  _changeStatus (status, value) {
    if (this.status !== PENDING) {
      return;
    }
    this.status = status;
    this.value = value;
    this._runHandles();
  }
  _resolve (value) {
    this._changeStatus(FULFILLED, value);
    // console.log('resolve', value);
    // this.onResolvedCallbacks.forEach(fn => fn());
  }
  _reject (reason) {
    this._changeStatus(REJECTED, reason);
    // console.log('reject', reason);
    // this.onRejectedCallbacks.forEach(fn => fn());
  }

  /**
   * Pushes a handler descriptor onto the instance's internal handles array.
   *
   * @private
   * @param {Function} executor - 要执行的处理函数.
   * @param {string} state - 该函数在什么状态下执行.
   * @param {Function} resolve - 让then函数的返回的promise resolve回调执行.
   * @param {Function} reject - 让then函数的返回的promise reject回调执行.
   * @returns {void}
   */
  _pushHandle (executor, state, resolve, reject) {
    this.handles.push({
      executor,
      state,
      resolve,
      reject
    });
  }

  /**
   * 执行任务队列
   */
  _runHandles () {
    if (this.status === PENDING) {
      return;
    }
    // console.log(this.handles);
    while (this.handles[0]) {
      const handle = this.handles[0];
      this._runOneHandle(handle);
      this.handles.shift();
    }
  }
  /**
   * 执行单个任务
   */
  _runOneHandle (handle) {
    
    microtask(() => {
      const { executor, state, resolve, reject } = handle;
      if (this.status !== state) {
        return;
      }
      // 判断executor是否为函数，如果不是函数，直接将当前promise的value传递给下一个promise
      if (typeof executor !== 'function') {
        if (state === FULFILLED) {
          resolve(this.value);
        } else {
          reject(this.value);
        }
        return;
      }
      try {
        
        const x = executor(this.value);
        // 如果executor执行的结果是一个promise，那么需要等待这个promise的状态改变后再执行下一个promise的回调函数
        if (isPromise(x)) {
          x.then(resolve, reject);
          return;
        } 
        resolve(x);
      } catch (error) {
        reject(error);
      }
    });
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      this._pushHandle(onFulfilled, FULFILLED, resolve, reject);
      this._pushHandle(onRejected, REJECTED, resolve, reject);
      this._runHandles();
    });

  }
}
const p1 = new MyPromise((resolve, reject) => {
  resolve(123);
})
p1.then(function A (data) {
  console.log(data);
  return new Promise((resolve, reject) => {
    resolve(456);
  });
}).then(data => {
  console.log(data);
});

// console.log(p1);
// microtask(() => {
//   console.log('microtask');
// });
// console.log('script end');
// setTimeout(() => {
//   console.log('setTimeout');
// }, 0);
