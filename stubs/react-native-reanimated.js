const noop = (...args) => (args.length ? args[0] : undefined);

const makeMutable = (value) => ({ value });
const withRepeat = (animation) => animation;
const withSequence = (...animations) => animations[animations.length - 1];
const withTiming = (value, _config, callback) => {
  if (typeof callback === 'function') callback(true);
  return value;
};
const runOnJS = (fn) => fn;
const cancelAnimation = () => {};
const Easing = {
  linear: (t) => t,
  in: (fn) => fn,
  out: (fn) => fn,
  inOut: (fn) => fn,
};

const ReanimatedStub = {
  makeMutable,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
  cancelAnimation,
  Easing,
};

const proxy = new Proxy(ReanimatedStub, {
  get: (target, prop) => (prop in target ? target[prop] : noop),
});

module.exports = proxy;
module.exports.default = proxy;
